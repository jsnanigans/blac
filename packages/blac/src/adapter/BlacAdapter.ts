import { Blac } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateInstanceIdFromProps } from '../utils/generateInstanceId';
import { ProxyFactory } from './ProxyFactory';

export interface AdapterOptions<B extends BlocBase<any>> {
  instanceId?: string;
  dependencies?: (bloc: B) => unknown[] | Generator<unknown, void, unknown>;
  staticProps?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}

/**
 * Helper function to check if a value is a generator
 */
function isGenerator(value: unknown): value is Generator<unknown, void, unknown> {
  return value != null &&
         typeof value === 'object' &&
         Symbol.iterator in value &&
         typeof (value as any).next === 'function';
}

/**
 * Helper function to normalize dependencies (convert generators to arrays)
 */
function normalizeDependencies(result: unknown[] | Generator<unknown, void, unknown>): unknown[] {
  if (isGenerator(result)) {
    return Array.from(result);
  }
  return result as unknown[];
}

/**
 * Efficiently compare dependencies with early exit for generators
 * Returns true if values have changed, false if they're the same
 */
function compareDependencies(
  oldValues: unknown[] | undefined,
  newResult: unknown[] | Generator<unknown, void, unknown>,
): boolean {
  // If no old values, it's a change
  if (!oldValues) return true;

  // If new result is a generator, compare item-by-item with early exit
  if (isGenerator(newResult)) {
    let index = 0;
    for (const newValue of newResult) {
      // If we've exhausted old values but generator has more, it's a change
      if (index >= oldValues.length) {
        return true;
      }

      // If values don't match, it's a change (early exit!)
      if (!Object.is(oldValues[index], newValue)) {
        return true;
      }

      index++;
    }

    // If old values had more items than generator, it's a change
    if (index < oldValues.length) {
      return true;
    }

    // All items matched
    return false;
  }

  // Array comparison (existing logic)
  const newValues = newResult as unknown[];
  if (oldValues.length !== newValues.length) return true;

  for (let i = 0; i < oldValues.length; i++) {
    if (!Object.is(oldValues[i], newValues[i])) {
      return true;
    }
  }

  return false;
}

/**
 * BlacAdapter orchestrates the connection between Bloc instances and React components.
 * It manages dependency tracking, lifecycle hooks, and proxy creation.
 */
export class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  public readonly blocConstructor: B;
  public readonly componentRef: { current: object & { __blocInstanceId?: string } } = { current: {} };
  public blocInstance!: InstanceType<B>;
  public readonly id: string;

  unmountTime: number = 0;
  mountTime: number = 0;

  // Subscription management
  private subscriptionId?: string;
  private unsubscribe?: () => void;

  // Dependency tracking
  private dependencyValues?: unknown[];
  private isUsingDependencies: boolean = false;
  private trackedPaths = new Set<string>();
  private pendingTrackedPaths = new Set<string>(); // Paths tracked before subscription exists

  // State snapshot for dependencies mode - only updates when dependencies change
  private stateSnapshot?: BlocState<InstanceType<B>>;

  // V2: Two-phase tracking for atomic dependency updates
  private pendingDependencies = new Set<string>(); // Collected during render
  private isTrackingActive = false; // Controls when tracking is enabled

  // Proxy caching
  private cachedStateProxy?: BlocState<InstanceType<B>>;
  private cachedBlocProxy?: InstanceType<B>;
  private lastProxiedState?: BlocState<InstanceType<B>>;

  // Lifecycle state
  private _hasMounted = false;
  private mountCount = 0;

  // Rerender tracking
  private lastState?: BlocState<InstanceType<B>>;
  private lastDependencyValues?: unknown[];
  private componentName?: string;
  private renderCount = 0;

  options?: AdapterOptions<InstanceType<B>>;

  constructor(
    instanceProps: { componentRef: { current: object & { __blocInstanceId?: string } }; blocConstructor: B },
    options?: AdapterOptions<InstanceType<B>>,
  ) {
    this.options = options;
    this.blocConstructor = instanceProps.blocConstructor;
    this.componentRef = instanceProps.componentRef;
    this.isUsingDependencies = !!options?.dependencies;

    // Use stable ID from componentRef if available (for isolated blocs in React strict mode)
    // Otherwise generate a new adapter-specific UUID
    this.id = instanceProps.componentRef.current.__blocInstanceId || `adapter-${generateUUID()}`;

    // Initialize bloc instance
    this.updateBlocInstance();

    // Initialize dependency values if using dependencies
    if (this.isUsingDependencies && options?.dependencies) {
      const result = options.dependencies(this.blocInstance);
      this.dependencyValues = normalizeDependencies(result);
      // Take initial snapshot of state
      this.stateSnapshot = this.blocInstance.state;
    }

    // Notify plugins
    const metadata = this.getAdapterMetadata();
    Blac.getInstance().plugins.notifyAdapterCreated(this, metadata);
  }

  trackAccess(
    _consumerRef: object,
    type: 'state' | 'class',
    path: string,
    value?: any,
  ): void {
    // V2: Only track if tracking is active (during render)
    if (!this.isTrackingActive) {
      return;
    }

    const fullPath = type === 'class' ? `_class.${path}` : path;

    // V2: Collect in pending dependencies during render
    this.pendingDependencies.add(fullPath);
    this.trackedPaths.add(fullPath);

    if (!this.subscriptionId) {
      // No subscription ID yet - store for later
      this.pendingTrackedPaths.add(fullPath);
      if ((Blac.config as any).logLevel === 'debug') {
        Blac.log(`[BlacAdapter] trackAccess storing pending path: ${path}`);
      }
    } else {
      // V2: Immediately apply to subscription for backwards compatibility
      // In React useBloc hook, this will be properly managed with commitTracking()
      this.blocInstance.trackAccess(this.subscriptionId, fullPath, value);
    }
  }

  updateBlocInstance(): InstanceType<B> {
    // Determine the instance ID
    let instanceId = this.options?.instanceId;

    // If no explicit instanceId provided but staticProps exist, generate from them
    if (!instanceId && this.options?.staticProps) {
      const generatedId = generateInstanceIdFromProps(this.options.staticProps);
      if (generatedId) {
        instanceId = generatedId;
      }
    }

    this.blocInstance = Blac.instance.getBloc<B>(this.blocConstructor, {
      constructorParams: this.options?.staticProps,
      id: instanceId,
      instanceRef: this.id,
    });
    return this.blocInstance;
  }

  createSubscription = (options: { onChange: () => void }) => {
    // If using manual dependencies, create a selector-based subscription
    if (this.isUsingDependencies && this.options?.dependencies) {
      const result = this.blocInstance.subscribeWithSelector(
        (_state) => {
          // Call the dependencies function - returns generator or array
          // NOTE: This selector is called on EVERY state change by subscribeWithSelector
          const depResult = this.options!.dependencies!(this.blocInstance);

          // Use early-exit comparison for generators
          // If no change detected, return old dependencyValues to prevent re-render
          // Otherwise, normalize and cache the new values
          if (compareDependencies(this.dependencyValues, depResult)) {
            // Changed - normalize and cache
            const normalized = normalizeDependencies(depResult);
            this.dependencyValues = normalized;
            // Update state snapshot when dependencies change
            this.stateSnapshot = this.blocInstance.state;
            return normalized;
          }

          // No change - return cached values (state snapshot stays the same)
          return this.dependencyValues!;
        },
        (newValues) => {
          // Only called if selector returned different value
          options.onChange();
        },
        // Use custom equality function - check object identity first (fast path)
        (oldValues, newValues) => {
          // If they're the same object reference, they're equal (no change)
          return oldValues === newValues;
        },
      );
      this.unsubscribe = result.unsubscribe;
      // Note: subscriptionId not needed for selector-based subscriptions
    } else {
      // Create a component subscription with weak reference
      const weakRef = new WeakRef(this.componentRef.current);
      const result = this.blocInstance.subscribeComponent(
        weakRef,
        options.onChange,
      );

      // Get the subscription ID directly from the result (type-safe, race-free)
      this.unsubscribe = result.unsubscribe;
      this.subscriptionId = result.id;

      // V2: Enable tracking when subscription is created
      this.isTrackingActive = true;

      // Apply any pending tracked paths
      if (this.subscriptionId && this.pendingTrackedPaths.size > 0) {
        for (const path of this.pendingTrackedPaths) {
          this.blocInstance.trackAccess(this.subscriptionId, path);
        }
        this.pendingTrackedPaths.clear();
      }
    }

    // Don't call onChange initially - let React handle the initial render

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
        this.subscriptionId = undefined;
      }
    };
  };

  hasDependencyValuesChanged = (
    oldValues: unknown[] | undefined,
    newValues: unknown[],
  ): boolean => {
    if (!oldValues) return true;
    if (oldValues.length !== newValues.length) return true;

    for (let i = 0; i < oldValues.length; i++) {
      if (!Object.is(oldValues[i], newValues[i])) {
        return true;
      }
    }

    return false;
  };

  getStateProxy = (): BlocState<InstanceType<B>> => {
    // If using manual dependencies or proxy tracking is disabled, return raw state
    if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
      return this.blocInstance.state;
    }

    // Return cached proxy if state hasn't changed
    const currentState = this.blocInstance.state;
    if (this.cachedStateProxy && this.lastProxiedState === currentState) {
      return this.cachedStateProxy;
    }

    // Create new proxy for new state
    this.lastProxiedState = currentState;
    this.cachedStateProxy = this.createStateProxy({ target: currentState });
    return this.cachedStateProxy!;
  };

  getBlocProxy = (): InstanceType<B> => {
    // If using manual dependencies or proxy tracking is disabled, return raw bloc
    if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
      return this.blocInstance;
    }

    // Return cached proxy if bloc instance hasn't changed
    if (this.cachedBlocProxy) {
      return this.cachedBlocProxy;
    }

    // Create and cache proxy
    this.cachedBlocProxy = this.createClassProxy({ target: this.blocInstance });
    return this.cachedBlocProxy;
  };

  createStateProxy = <T extends object>(props: { target: T }): T => {
    return ProxyFactory.createStateProxy({
      target: props.target,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
      maxDepth: Blac.config.proxyMaxDepth,
    });
  };

  createClassProxy = <T extends object>(props: { target: T }): T => {
    return ProxyFactory.createClassProxy({
      target: props.target,
      consumerRef: this.componentRef.current,
      consumerTracker: this as any,
    });
  };

  // Lifecycle methods
  mount = () => {
    this._hasMounted = true;
    this.mountCount++;
    this.mountTime = Date.now();

    // Call onMount hook
    if (this.options?.onMount) {
      this.options.onMount(this.blocInstance);
    }

    // Refresh dependencies if using manual tracking
    if (this.isUsingDependencies && this.options?.dependencies) {
      const result = this.options.dependencies(this.blocInstance);
      this.dependencyValues = normalizeDependencies(result);
    }

    // Notify plugins
    const metadata = this.getAdapterMetadata();
    Blac.getInstance().plugins.notifyAdapterMount(this, metadata);
  };

  unmount = () => {
    this.unmountTime = Date.now();

    // Cancel subscription
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
      this.subscriptionId = undefined;
    }

    // Call onUnmount hook
    if (this.options?.onUnmount) {
      try {
        this.options.onUnmount(this.blocInstance);
      } catch (error) {
        console.error('Error in onUnmount hook:', error);
      }
    }

    // Notify plugins
    const metadata = this.getAdapterMetadata();
    Blac.getInstance().plugins.notifyAdapterUnmount(this, metadata);
  };

  // Reset tracking for next render
  // V2: Two-phase tracking - start collecting new dependencies without clearing active ones
  resetTracking(): void {
    // Clear pending dependencies to start fresh for this render
    this.pendingDependencies.clear();
    this.trackedPaths.clear();

    // Enable tracking for this render
    this.isTrackingActive = true;

    // Note: We do NOT clear subscription dependencies here
    // They will be atomically replaced in commitTracking()
  }

  // V2: Commit tracked dependencies after render completes
  commitTracking(): void {
    // Disable tracking until next render
    this.isTrackingActive = false;

    // V3: Filter out intermediate paths, keep only leaf paths
    // This ensures precise tracking - only the deepest accessed paths are tracked
    const leafPaths = this.filterLeafPaths(this.pendingDependencies);

    // Atomically swap pending dependencies into subscription
    if (this.subscriptionId) {
      const subscription = (
        this.blocInstance._subscriptionManager as any
      ).subscriptions.get(this.subscriptionId);

      if (subscription) {
        // Remove old path-to-subscription mappings
        if (subscription.dependencies) {
          for (const oldPath of subscription.dependencies) {
            const subs = (this.blocInstance._subscriptionManager as any)
              .pathToSubscriptions.get(oldPath);
            if (subs) {
              subs.delete(this.subscriptionId);
              if (subs.size === 0) {
                (this.blocInstance._subscriptionManager as any)
                  .pathToSubscriptions.delete(oldPath);
              }
            }
          }
        }

        // Atomic swap: replace old dependencies with filtered leaf paths
        subscription.dependencies = new Set(leafPaths);

        // Add new path-to-subscription mappings
        for (const newPath of leafPaths) {
          let subs = (this.blocInstance._subscriptionManager as any)
            .pathToSubscriptions.get(newPath);
          if (!subs) {
            subs = new Set();
            (this.blocInstance._subscriptionManager as any)
              .pathToSubscriptions.set(newPath, subs);
          }
          subs.add(this.subscriptionId);
        }
      }
    }
  }

  /**
   * Filter out intermediate paths, keeping only the most specific (leaf) paths.
   * For example, if we tracked ['user', 'user.settings', 'user.settings.theme'],
   * we only keep ['user.settings.theme'].
   *
   * Special handling for array/object metadata:
   * - Array methods (map, filter, join, etc.) and properties (length) are replaced with parent path
   * - This ensures tracking 'items.map' becomes tracking 'items'
   *
   * This enables precise dependency tracking - components only re-render when
   * the specific properties they access change, not when sibling properties change.
   */
  private filterLeafPaths(paths: Set<string>): Set<string> {
    // Array/Object methods and properties that indicate the parent should be tracked
    const metaProperties = new Set([
      // Array methods
      'map', 'filter', 'reduce', 'forEach', 'some', 'every', 'find', 'findIndex',
      'includes', 'indexOf', 'lastIndexOf', 'join', 'slice', 'concat', 'flat', 'flatMap',
      // Array properties
      'length',
      // Object methods that might be accessed
      'toString', 'valueOf', 'hasOwnProperty', 'propertyIsEnumerable',
    ]);

    const pathArray = Array.from(paths);
    const normalizedPaths = new Set<string>();
    const metaNormalizedPaths = new Set<string>(); // Track paths that came from meta-properties

    // First pass: Normalize paths (replace meta-property paths with parent paths)
    for (const path of pathArray) {
      const lastDot = path.lastIndexOf('.');
      if (lastDot !== -1) {
        const lastSegment = path.substring(lastDot + 1);
        if (metaProperties.has(lastSegment)) {
          // This is a meta-property - track the parent instead
          const parentPath = path.substring(0, lastDot);
          normalizedPaths.add(parentPath);
          metaNormalizedPaths.add(parentPath); // Mark as coming from meta-property
          continue;
        }
      }
      normalizedPaths.add(path);
    }

    // Second pass: Filter out intermediate paths, but preserve meta-normalized paths
    const normalizedArray = Array.from(normalizedPaths);
    const leafPaths = new Set<string>();

    for (const path of normalizedArray) {
      // If this path came from a meta-property normalization, always keep it
      if (metaNormalizedPaths.has(path)) {
        leafPaths.add(path);
        continue;
      }

      // Otherwise, check if any other path is a child of this path
      let hasChild = false;
      for (const otherPath of normalizedArray) {
        if (otherPath !== path && otherPath.startsWith(path + '.')) {
          // Another path is more specific (child of this path)
          hasChild = true;
          break;
        }
      }

      // If no child found, this is a leaf path
      if (!hasChild) {
        leafPaths.add(path);
      }
    }

    return leafPaths;
  }

  // Set component name for rerender logging
  setComponentName(name: string): void {
    this.componentName = name;
  }

  // Notify plugins about render
  notifyRender(): void {
    this.renderCount++;

    // Update dependency values if using manual tracking
    if (this.isUsingDependencies && this.options?.dependencies) {
      this.lastDependencyValues = this.dependencyValues;
      const result = this.options.dependencies(this.blocInstance);
      this.dependencyValues = normalizeDependencies(result);
    }

    const metadata = this.getAdapterMetadata();
    Blac.getInstance().plugins.notifyAdapterRender(this, metadata);
  }

  // Get adapter metadata for plugins
  private getAdapterMetadata(): any {
    return {
      componentName: this.componentName,
      blocInstance: this.blocInstance,
      renderCount: this.renderCount,
      trackedPaths: Array.from(this.trackedPaths),
      isUsingDependencies: this.isUsingDependencies,
      lastState: this.lastState,
      lastDependencyValues: this.lastDependencyValues,
      currentDependencyValues: this.dependencyValues,
    };
  }

  // Get last rerender reason
  getLastRerenderReason(): any {
    // This method is deprecated - render reason is now handled by the RenderLoggingPlugin
    return undefined;
  }

  // Check if any dependencies have been tracked
  hasDependencies(): boolean {
    return this.pendingDependencies.size > 0;
  }

  // useSyncExternalStore integration methods
  // These methods provide a clean interface for React's useSyncExternalStore hook

  /**
   * Returns a subscribe function compatible with useSyncExternalStore
   * This encapsulates the subscription logic within the adapter
   */
  getSubscribe = () => {
    return (onStoreChange: () => void) => {
      return this.createSubscription({ onChange: onStoreChange });
    };
  };

  /**
   * Returns the current state snapshot for useSyncExternalStore
   * When using dependencies, returns the cached snapshot that only updates when dependencies change
   * Otherwise, returns the current state directly
   */
  getSnapshot = (): BlocState<InstanceType<B>> => {
    if (this.options?.dependencies) {
      return this.stateSnapshot ?? this.blocInstance.state;
    }
    return this.blocInstance.state;
  };

  /**
   * Returns the server-side rendering snapshot for useSyncExternalStore
   * Same behavior as getSnapshot for consistency
   */
  getServerSnapshot = (): BlocState<InstanceType<B>> => {
    if (this.options?.dependencies) {
      return this.stateSnapshot ?? this.blocInstance.state;
    }
    return this.blocInstance.state;
  };
}

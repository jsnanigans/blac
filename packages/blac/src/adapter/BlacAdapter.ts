import { Blac } from '../Blac';
import { BlocBase } from '../BlocBase';
import { BlocConstructor, BlocState } from '../types';
import { generateUUID } from '../utils/uuid';
import { generateInstanceIdFromProps } from '../utils/generateInstanceId';
import { ProxyFactory } from './ProxyFactory';

export interface AdapterOptions<B extends BlocBase<any>> {
  instanceId?: string;
  dependencies?: (bloc: B) => unknown[];
  staticProps?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
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
    options?: typeof this.options,
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
      this.dependencyValues = options.dependencies(this.blocInstance);
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
      this.unsubscribe = this.blocInstance.subscribeWithSelector(
        (_state) => this.options!.dependencies!(this.blocInstance),
        (newValues) => {
          const hasChanged = this.hasDependencyValuesChanged(
            this.dependencyValues,
            newValues as unknown[],
          );

          if (hasChanged) {
            this.dependencyValues = newValues as unknown[];
            options.onChange();
          }
        },
      );
    } else {
      // Create a component subscription with weak reference
      const weakRef = new WeakRef(this.componentRef.current);
      this.unsubscribe = this.blocInstance.subscribeComponent(
        weakRef,
        options.onChange,
      );

      // Get the subscription ID for tracking
      const subscriptions = (this.blocInstance._subscriptionManager as any)
        .subscriptions as Map<string, any>;
      this.subscriptionId = Array.from(subscriptions.keys()).pop();

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
      this.dependencyValues = this.options.dependencies(this.blocInstance);
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

        // Atomic swap: replace old dependencies with new ones
        subscription.dependencies = new Set(this.pendingDependencies);

        // Add new path-to-subscription mappings
        for (const newPath of this.pendingDependencies) {
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
      this.dependencyValues = this.options.dependencies(this.blocInstance);
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
}

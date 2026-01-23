import type { StateContainer, StateContainerConfig } from './StateContainer';
import { createPluginManager } from '../plugin/PluginManager';
import { getGetterExecutionContext } from '../tracking/tracking-proxy';
import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';
import { isIsolatedClass, isKeepAliveClass } from '../utils/static-props';
import {
  ExtractProps,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Internal configuration for registered types
 * @internal
 */
interface TypeConfig {
  isolated: boolean;
}

/**
 * Entry in the instance registry, tracking the instance and its reference count
 * @template T - Instance type
 */
export interface InstanceEntry<T = any> {
  /** The state container instance */
  instance: T;
  /** Number of active references to this instance */
  refCount: number;
}

/**
 * Lifecycle events emitted by the registry
 */
export type LifecycleEvent = 'created' | 'stateChanged' | 'disposed';

/**
 * Listener function type for each lifecycle event
 * @template E - The lifecycle event type
 */
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created'
  ? (container: StateContainer<any>) => void
  : E extends 'stateChanged'
    ? (
        container: StateContainer<any>,
        previousState: any,
        currentState: any,
        callstack?: string,
      ) => void
    : E extends 'disposed'
      ? (container: StateContainer<any>) => void
      : never;

/**
 * Central registry for managing StateContainer instances.
 * Handles instance lifecycle, ref counting, and lifecycle event emission.
 *
 * @example
 * ```ts
 * const registry = new StateContainerRegistry();
 * const instance = registry.acquire(MyBloc);  // ownership, must release
 * const other = registry.ensure(OtherBloc);   // no ownership, bloc-to-bloc
 * registry.on('stateChanged', (container, prev, next) => {
 *   console.log('State changed:', prev, '->', next);
 * });
 * ```
 */
export class StateContainerRegistry {
  private readonly instancesByConstructor = new WeakMap<
    StateContainerConstructor,
    Map<string, InstanceEntry>
  >();

  private readonly types = new Set<StateContainerConstructor>();

  private readonly typeConfigs = new Map<string, TypeConfig>();

  private readonly listeners = new Map<
    LifecycleEvent,
    Set<(...args: any[]) => void>
  >();

  /**
   * Register a type for lifecycle event tracking
   * @param constructor - The StateContainer class constructor
   */
  registerType<T extends StateContainerConstructor>(constructor: T): void {
    this.types.add(constructor);
  }

  /**
   * Register a StateContainer class with configuration
   * @param constructor - The StateContainer class constructor
   * @param isolated - Whether instances should be isolated (component-scoped)
   * @throws Error if type is already registered
   */
  register<T extends StateContainerConstructor>(
    constructor: T,
    isolated = false,
  ): void {
    const className = constructor.name;

    if (!isolated && isIsolatedClass(constructor)) {
      isolated = true;
    }

    if (this.typeConfigs.has(className)) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} Type "${className}" is already registered`,
      );
    }

    this.typeConfigs.set(className, { isolated });
    this.registerType(constructor);
  }

  private ensureInstancesMap<T extends StateContainerConstructor>(
    Type: T,
  ): Map<string, InstanceEntry> {
    let instances = this.instancesByConstructor.get(Type);
    if (!instances) {
      instances = new Map<string, InstanceEntry>();
      this.instancesByConstructor.set(Type, instances);
    }
    return instances;
  }

  /**
   * Get the instances Map for a specific class (public API for stats/debugging)
   */
  getInstancesMap<T extends StateContainerConstructor>(
    Type: T,
  ): Map<string, InstanceEntry> {
    return this.instancesByConstructor.get(Type) || new Map();
  }

  private trackExecutionContext(instance: StateContainer<any>): void {
    // Track cross-bloc dependency if we're inside a getter execution
    const context = getGetterExecutionContext();
    if (
      context.tracker &&
      context.currentBloc &&
      context.currentBloc !== instance
    ) {
      // Add this bloc as an external dependency
      context.tracker.externalDependencies.add(instance);
    }
  }

  /**
   * Acquire an instance with ref counting (ownership semantics).
   * Creates a new instance if one doesn't exist, or returns existing and increments ref count.
   * You must call `release()` when done to decrement the ref count.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @param options - Acquisition options
   * @param options.canCreate - Whether to create new instance if not found (default: true)
   * @param options.countRef - Whether to increment ref count (default: true)
   * @param options.props - Props to pass to constructor if creating new instance
   * @param options.trackExecutionContext - Whether to track cross-bloc dependency (default: false)
   * @returns The state container instance
   */
  acquire<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    options: {
      canCreate?: boolean;
      countRef?: boolean;
      props?: ExtractProps<T>;
      trackExecutionContext?: boolean;
    } = {},
  ): InstanceType<T> {
    const {
      canCreate = true,
      countRef = true,
      props,
      trackExecutionContext = false,
    } = options;
    // Check if this is an isolated type
    const registryConfig = this.typeConfigs.get(Type.name);
    const isolated = isIsolatedClass(Type) || registryConfig?.isolated === true;

    const config: StateContainerConfig = {
      instanceId: instanceKey,
    };

    if (isolated && !canCreate) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} Cannot get isolated instance "${instanceKey}" of ${Type.name} when creation is disabled.`,
      );
    }

    // Isolated: always create new instance (not tracked)
    if (isolated) {
      const instance = new Type(props) as InstanceType<T>;
      instance.initConfig(config);
      // Register type for lifecycle coordination
      this.registerType(Type);
      if (trackExecutionContext) {
        this.trackExecutionContext(instance);
      }
      return instance;
    }

    // Shared: singleton pattern with ref counting
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    // Increment ref count if found, only if counting is enabled or refCount is 0
    if (entry && (countRef || entry.refCount === 0)) {
      entry.refCount++;
    }

    if (entry) {
      if (trackExecutionContext) {
        this.trackExecutionContext(entry.instance);
      }
      return entry.instance;
    }

    if (!canCreate) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${Type.name} instance "${instanceKey}" not found and creation is disabled.`,
      );
    }

    // Create new shared instance
    const instance = new Type(props) as InstanceType<T>;
    instance.initConfig(config);
    instances.set(instanceKey, { instance, refCount: 1 });

    // Register type for lifecycle coordination
    this.registerType(Type);

    if (trackExecutionContext) {
      this.trackExecutionContext(instance);
    }
    return instance;
  }

  /**
   * Borrow an existing instance without incrementing ref count (borrowing semantics).
   * Tracks cross-bloc dependency for reactive updates.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns The state container instance
   * @throws Error if instance doesn't exist
   */
  borrow<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ): InstanceType<T> {
    return this.acquire(Type, instanceKey, {
      canCreate: false,
      trackExecutionContext: true,
    });
  }

  /**
   * Safely borrow an existing instance (borrowing semantics with error handling).
   * Returns discriminated union for type-safe conditional access.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns Discriminated union with either the instance or an error
   */
  borrowSafe<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ):
    | { error: Error; instance: null }
    | { error: null; instance: InstanceType<T> } {
    try {
      const instance = this.borrow(Type, instanceKey);
      return { error: null, instance };
    } catch (error: any) {
      return { error, instance: null };
    }
  }

  /**
   * Ensure an instance exists without taking ownership (for bloc-to-bloc communication).
   * Gets existing instance OR creates it if it doesn't exist, without incrementing ref count.
   * Tracks cross-bloc dependency for reactive updates.
   *
   * Use this in bloc-to-bloc communication when you need to ensure an instance exists
   * but don't want to claim ownership (no ref count increment).
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns The state container instance
   */
  ensure<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ): InstanceType<T> {
    return this.acquire(Type, instanceKey, {
      canCreate: true,
      countRef: false,
      trackExecutionContext: true,
    });
  }

  /**
   * Release a reference to an instance.
   * Decrements ref count and disposes when it reaches 0 (unless keepAlive).
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @param forceDispose - Force immediate disposal regardless of ref count
   */
  release<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    forceDispose = false,
  ): void {
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);

    if (!entry) return;

    // Force dispose immediately
    if (forceDispose) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
      return;
    }

    // Decrement ref count
    entry.refCount--;

    // Check static keepAlive property
    const keepAlive = isKeepAliveClass(Type);

    // Auto-dispose when ref count reaches 0 (unless keepAlive)
    if (entry.refCount <= 0 && !keepAlive) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
    }
  }

  /**
   * Get all instances of a specific type.
   * @param Type - The StateContainer class constructor
   * @returns Array of all instances
   */
  getAll<T extends StateContainerConstructor>(
    Type: T,
  ): InstanceReadonlyState<T>[] {
    const instances = this.ensureInstancesMap(Type);
    const result: InstanceReadonlyState<T>[] = [];
    for (const entry of instances.values()) {
      result.push(entry.instance);
    }
    return result;
  }

  /**
   * Safely iterate over all instances of a type.
   * Skips disposed instances and catches callback errors.
   * @param Type - The StateContainer class constructor
   * @param callback - Function to call for each instance
   */
  forEach<T extends StateContainerConstructor>(
    Type: T,
    callback: (instance: InstanceReadonlyState<T>) => void,
  ): void {
    const instances = this.ensureInstancesMap(Type);
    for (const entry of instances.values()) {
      const instance = entry.instance;
      if (!instance.isDisposed) {
        try {
          callback(instance);
        } catch (error) {
          console.error(
            `${BLAC_ERROR_PREFIX} forEach callback error for ${Type.name}:`,
            error,
          );
        }
      }
    }
  }

  /**
   * Clear all instances of a specific type (disposes them).
   * @param Type - The StateContainer class constructor
   */
  clear<T extends StateContainerConstructor>(Type: T): void {
    const instances = this.ensureInstancesMap(Type);
    // Dispose all instances
    for (const entry of instances.values()) {
      if (!entry.instance.isDisposed) {
        entry.instance.dispose();
      }
    }
    // Clear the Map
    instances.clear();
  }

  /**
   * Get reference count for an instance.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns Current ref count (0 if instance doesn't exist)
   */
  getRefCount<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ): number {
    const instances = this.ensureInstancesMap(Type);
    const entry = instances.get(instanceKey);
    return entry?.refCount ?? 0;
  }

  /**
   * Check if an instance exists.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns true if instance exists
   */
  hasInstance<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ): boolean {
    const instances = this.ensureInstancesMap(Type);
    return instances.has(instanceKey);
  }

  /**
   * Clear all instances from all types (for testing)
   *
   * Iterates all registered types and clears their instances.
   * Also clears type tracking to reset the registry state.
   */
  clearAll(): void {
    // Step 1: Clear instances from each type (while we still have the types list)
    for (const Type of this.types) {
      this.clear(Type);
    }
    // Step 2: Now clear type tracking (resets registry state for tests)
    this.types.clear();
    this.typeConfigs.clear();
  }

  /**
   * Get registry statistics for debugging.
   * @returns Object with registeredTypes, totalInstances, and typeBreakdown
   */
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    const typeBreakdown: Record<string, number> = {};
    let totalInstances = 0;

    // Collect stats from each registered type
    for (const Type of this.types) {
      const typeName = Type.name;
      const instances = this.getInstancesMap(Type);
      const count = instances.size;

      typeBreakdown[typeName] = count;
      totalInstances += count;
    }

    return {
      registeredTypes: this.types.size,
      totalInstances,
      typeBreakdown,
    };
  }

  /**
   * Get all registered types (for plugin system).
   * @returns Array of all registered StateContainer class constructors
   */
  getTypes(): StateContainerConstructor[] {
    return Array.from(this.types);
  }

  /**
   * Subscribe to lifecycle events
   * @param event - The lifecycle event to listen for
   * @param listener - The listener function to call when the event occurs
   * @returns Unsubscribe function
   */
  on<E extends LifecycleEvent>(
    event: E,
    listener: LifecycleListener<E>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const instance = this.listeners.get(event);
    if (!instance) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} Failed to register listener for event '${event}'`,
      );
    }

    instance.add(listener as (...args: any[]) => void);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener as (...args: any[]) => void);
    };
  }

  /**
   * Emit lifecycle event to all listeners
   * @internal - Called by StateContainer lifecycle methods
   */
  emit(event: LifecycleEvent, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return; // Zero overhead when no listeners

    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error(
          `${BLAC_ERROR_PREFIX} Listener error for '${event}':`,
          error,
        );
      }
    }
  }
}

/**
 * Global default registry instance
 */
export const globalRegistry = new StateContainerRegistry();

/**
 * Global plugin manager (initialized lazily)
 */
let _globalPluginManager: any = null;

/**
 * Get the global plugin manager
 */
export function getPluginManager(): any {
  if (!_globalPluginManager) {
    _globalPluginManager = createPluginManager(globalRegistry);
  }
  return _globalPluginManager;
}

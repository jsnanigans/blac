import type { StateContainer, StateContainerConfig } from './StateContainer';
import { createPluginManager } from '../plugin/PluginManager';
import { BLAC_DEFAULTS, BLAC_ERROR_PREFIX } from '../constants';
import { isKeepAliveClass } from '../utils/static-props';
import {
  InstanceReadonlyState,
  StateContainerConstructor,
} from '../types/utilities';

/**
 * Entry in the instance registry, tracking the instance and its named references
 * @template T - Instance type
 */
export interface InstanceEntry<T = any> {
  /** The state container instance */
  instance: T;
  /** Map of active reference IDs to their acquire count (supports paired acquire/release) */
  refs: Map<string, number>;
}

/**
 * Lifecycle events emitted by the registry
 */
export type LifecycleEvent =
  | 'created'
  | 'stateChanged'
  | 'disposed'
  | 'refAcquired'
  | 'refReleased';

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
      ) => void
    : E extends 'disposed'
      ? (container: StateContainer<any>) => void
      : E extends 'refAcquired'
        ? (container: StateContainer<any>, refId: string) => void
        : E extends 'refReleased'
          ? (container: StateContainer<any>, refId: string) => void
          : never;

/**
 * Central registry for managing StateContainer instances.
 * Handles instance lifecycle, named ref tracking, and lifecycle event emission.
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

  private readonly registeredTypeNames = new Set<string>();

  private readonly listeners = new Map<
    LifecycleEvent,
    Set<(...args: any[]) => void>
  >();

  private _stateChangedListenerCount = 0;
  private _pendingStateChanges: Array<[StateContainer<any>, any, any]> | null =
    null;

  private _autoRefIdCounter = 0;

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
   * @throws Error if type is already registered
   */
  register<T extends StateContainerConstructor>(constructor: T): void {
    const className = constructor.name;

    if (this.registeredTypeNames.has(className)) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} Type "${className}" is already registered`,
      );
    }

    this.registeredTypeNames.add(className);
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

  /**
   * Acquire an instance with ref tracking (ownership semantics).
   * Creates a new instance if one doesn't exist, or returns existing and adds a ref.
   * You must call `release()` with the same refId when done.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @param options - Acquisition options
   * @param options.canCreate - Whether to create new instance if not found (default: true)
   * @param options.countRef - Whether to add a reference (default: true)
   * @param options.refId - Named reference ID for debugging; auto-generated if omitted
   * @returns The state container instance
   */
  acquire<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    options: {
      canCreate?: boolean;
      countRef?: boolean;
      refId?: string;
    } = {},
  ): InstanceType<T> {
    const { canCreate = true, countRef = true } = options;

    const config: StateContainerConfig = {
      instanceId: instanceKey,
    };

    const instances = this.ensureInstancesMap(Type);
    let entry = instances.get(instanceKey);

    // Detect stale disposed entries (disposed directly, not through release)
    if (entry?.instance.isDisposed) {
      instances.delete(instanceKey);
      entry = undefined;
    }

    if (entry && countRef) {
      const refId = options.refId ?? `_auto_${this._autoRefIdCounter++}`;
      entry.refs.set(refId, (entry.refs.get(refId) ?? 0) + 1);
      this.emit('refAcquired', entry.instance, refId);
    }

    if (entry) {
      return entry.instance;
    }

    if (!canCreate) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${Type.name} instance "${instanceKey}" not found and creation is disabled.`,
      );
    }

    // Create new shared instance
    const instance = new Type() as InstanceType<T>;
    instance.initConfig(config);
    const initialRefs = new Map<string, number>();
    let initialRefId: string | undefined;
    if (countRef) {
      initialRefId = options.refId ?? `_auto_${this._autoRefIdCounter++}`;
      initialRefs.set(initialRefId, 1);
    }
    instances.set(instanceKey, { instance, refs: initialRefs });

    // Register type for lifecycle coordination
    this.registerType(Type);

    if (initialRefId) {
      this.emit('refAcquired', instance, initialRefId);
    }

    return instance;
  }

  /**
   * Borrow an existing instance without adding a ref (borrowing semantics).
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
      countRef: false,
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
   * Gets existing instance OR creates it if it doesn't exist, without adding a ref.
   * Tracks cross-bloc dependency for reactive updates.
   *
   * Use this in bloc-to-bloc communication when you need to ensure an instance exists
   * but don't want to claim ownership (no ref added).
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
    });
  }

  /**
   * Release a reference to an instance.
   * Removes the ref and disposes when refs is empty (unless keepAlive).
   * Releasing an already-removed refId is a no-op (idempotent).
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @param forceDispose - Force immediate disposal regardless of refs
   * @param refId - The specific ref to remove; removes one arbitrary ref if omitted
   */
  release<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    forceDispose = false,
    refId?: string,
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

    // Decrement the ref count, or pick one arbitrary ref for backward compat
    let releasedRefId: string | undefined;
    if (refId !== undefined) {
      const count = entry.refs.get(refId) ?? 0;
      if (count <= 1) {
        entry.refs.delete(refId);
      } else {
        entry.refs.set(refId, count - 1);
      }
      releasedRefId = refId;
    } else {
      const firstKey = entry.refs.keys().next().value;
      if (firstKey !== undefined) {
        const count = entry.refs.get(firstKey)!;
        if (count <= 1) {
          entry.refs.delete(firstKey);
        } else {
          entry.refs.set(firstKey, count - 1);
        }
        releasedRefId = firstKey;
      }
    }

    if (releasedRefId) {
      this.emit('refReleased', entry.instance, releasedRefId);
    }

    // Check static keepAlive property
    const keepAlive = isKeepAliveClass(Type);

    // Auto-dispose when refs are empty (unless keepAlive)
    if (entry.refs.size === 0 && !keepAlive) {
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
   * Get reference count for an instance (number of active refs).
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
    return entry?.refs.size ?? 0;
  }

  /**
   * Get all active reference IDs for an instance.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Instance key (defaults to 'default')
   * @returns Array of ref ID strings (empty if instance doesn't exist)
   */
  getRefIds<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
  ): string[] {
    const instances = this.instancesByConstructor.get(Type);
    if (!instances) return [];
    const entry = instances.get(instanceKey);
    return entry ? Array.from(entry.refs.keys()) : [];
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
    this.registeredTypeNames.clear();
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

    if (event === 'stateChanged') {
      this._stateChangedListenerCount++;
    }

    // Return unsubscribe function
    return () => {
      const deleted = this.listeners
        .get(event)
        ?.delete(listener as (...args: any[]) => void);
      if (deleted && event === 'stateChanged') {
        this._stateChangedListenerCount--;
      }
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

  /**
   * Schedule a deferred stateChanged notification via microtask.
   * Skips entirely when no stateChanged listeners are registered.
   * @internal - Called by StateContainer.applyState
   */
  notifyStateChanged(
    container: StateContainer<any>,
    previousState: any,
    newState: any,
  ): void {
    if (this._stateChangedListenerCount === 0) return;

    if (!this._pendingStateChanges) {
      this._pendingStateChanges = [];
      queueMicrotask(() => this.flushStateChanged());
    }
    this._pendingStateChanges.push([container, previousState, newState]);
  }

  private flushStateChanged(): void {
    const pending = this._pendingStateChanges;
    this._pendingStateChanges = null;
    if (!pending) return;

    for (const [container, prev, next] of pending) {
      this.emit('stateChanged', container, prev, next);
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

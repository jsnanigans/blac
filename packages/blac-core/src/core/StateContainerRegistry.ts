import type {
  HydrationStatus,
  StateContainer,
  StateContainerConfig,
} from './StateContainer';
import { BLAC_ERROR_PREFIX, IS_DEV } from '../constants';
import { getBlacConfig } from '../config';
import {
  isKeepAliveClass,
  getClassKey,
  getBlacName,
} from '../utils/static-props';
import { structuralKey, DEFAULT_STRUCTURAL_KEY } from '../utils/structural-key';
import {
  InstanceReadonlyState,
  StateContainerConstructor,
} from '../types/utilities';
import { INIT_CONFIG, INSERT_INSTANCE, SET_ACTIVE } from './symbols';

/**
 * Entry in the instance registry.
 * @typeParam T - Instance type
 * @internal
 */
export interface InstanceEntry<T = any> {
  instance: T;
  key: string;
  /** refId to acquire count. */
  refs: Map<string, number>;
  /** Args from creation, for the dev arg-mismatch warning. */
  args?: unknown;
  argsKey?: string;
  /** `depend()`-owners holding this instance. */
  dependents?: Set<StateContainer<any, any, any>>;
  sweepTimer?: ReturnType<typeof setTimeout>;
}

const EMPTY_INSTANCES_MAP: ReadonlyMap<string, InstanceEntry> = new Map();

/**
 * Lifecycle events emitted by the registry
 * @public
 */
export type LifecycleEvent =
  | 'created'
  | 'stateChanged'
  | 'disposed'
  | 'refAcquired'
  | 'refReleased'
  | 'depsChanged'
  | 'hydrationChanged'
  | 'activated'
  | 'deactivated';

/**
 * Listener function type for each lifecycle event
 * @typeParam E - The lifecycle event type
 * @public
 */
export type LifecycleListener<E extends LifecycleEvent> = E extends 'created'
  ? (container: StateContainer<any, any, any>) => void
  : E extends 'stateChanged'
    ? (
        container: StateContainer<any, any, any>,
        previousState: Readonly<Record<string, unknown>>,
        currentState: Readonly<Record<string, unknown>>,
      ) => void
    : E extends 'disposed'
      ? (container: StateContainer<any, any, any>) => void
      : E extends 'refAcquired'
        ? (container: StateContainer<any, any, any>, refId: string) => void
        : E extends 'refReleased'
          ? (container: StateContainer<any, any, any>, refId: string) => void
          : E extends 'depsChanged'
            ? (
                container: StateContainer<any, any, any>,
                previousDeps: Readonly<Record<string, unknown>>,
                currentDeps: Readonly<Record<string, unknown>>,
              ) => void
            : E extends 'hydrationChanged'
              ? (
                  container: StateContainer<any, any, any>,
                  status: HydrationStatus,
                  previousStatus: HydrationStatus,
                ) => void
              : E extends 'activated'
                ? (
                    container: StateContainer<any, any, any>,
                    signal: AbortSignal,
                  ) => void
                : E extends 'deactivated'
                  ? (container: StateContainer<any, any, any>) => void
                  : never;

/**
 * Owns StateContainer instances: creation, ref tracking, disposal and
 * lifecycle events.
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
 *
 * `stateChanged` fires once per emit (microtask-deferred, not coalesced).
 * Plugins' `onStateChange` fires once per channel flush with coalesced
 * `prev`/`next` and a `PathSet`.
 */
export class StateContainerRegistry {
  private readonly instancesByConstructor = new WeakMap<
    StateContainerConstructor,
    Map<string, InstanceEntry>
  >();

  private readonly types = new Set<StateContainerConstructor>();

  /**
   * `depend()`-owner to the (Type, key) entries it resolved, per key because
   * one handle resolves a different key per `args`.
   */
  private readonly _dependentEdges = new WeakMap<
    StateContainer<any, any, any>,
    Map<StateContainerConstructor, Set<string>>
  >();

  private readonly _entryByInstance = new WeakMap<
    StateContainer<any, any, any>,
    InstanceEntry
  >();

  /**
   * Only for `PluginContext.getRefIds`: ids can collide across same-named
   * classes, so nothing else may rely on it.
   */
  private readonly _entryById = new Map<string, InstanceEntry>();

  private readonly listeners = new Map<
    LifecycleEvent,
    Set<(...args: any[]) => void>
  >();

  get hasStateChangedListeners(): boolean {
    return (this.listeners.get('stateChanged')?.size ?? 0) > 0;
  }
  private _pendingStateChanges: Array<
    [StateContainer<any, any, any>, any, any]
  > | null = null;

  private _autoRefIdCounter = 0;

  constructor() {
    // Also covers a direct `dispose()` that bypasses `release()`.
    this.on('disposed', (container) => this._handleDisposed(container));
  }

  /** Prune a tracked instance's entry and release its `depend()` edges. */
  private _handleDisposed(container: StateContainer<any, any, any>): void {
    const Type = container.constructor as StateContainerConstructor;
    const found = this._pruneEntry(Type, container);
    if (!found) return;
    const edges = this._dependentEdges.get(container);
    if (!edges) return;
    this._dependentEdges.delete(container);
    for (const [DepType, keys] of edges) {
      for (const depKey of keys) {
        this._releaseDependent(DepType, depKey, container);
      }
    }
  }

  /** The single dispose decision: no refs, no dependents, not keepAlive. */
  private _isUnowned(
    Type: StateContainerConstructor,
    entry: InstanceEntry,
  ): boolean {
    return this._hasNoOwners(entry) && !isKeepAliveClass(Type);
  }

  /** Ignores keepAlive: a keepAlive instance still deactivates. */
  private _hasNoOwners(entry: InstanceEntry): boolean {
    return (
      entry.refs.size === 0 &&
      (entry.dependents === undefined || entry.dependents.size === 0)
    );
  }

  /**
   * Idempotent, so every acquire/release path calls it. The events fire after
   * the instance's own `onActivate`/`onDeactivate`.
   */
  private _syncActivation(entry: InstanceEntry): void {
    const transition = entry.instance[SET_ACTIVE](!this._hasNoOwners(entry));
    if (transition === 'none') return;
    if (transition === 'deactivated') {
      this.emit('deactivated', entry.instance);
    } else {
      this.emit('activated', entry.instance, transition.signal);
    }
  }

  private _recordDependentEdge(
    dependent: StateContainer<any, any, any>,
    Type: StateContainerConstructor,
    key: string,
  ): void {
    let byType = this._dependentEdges.get(dependent);
    if (!byType) this._dependentEdges.set(dependent, (byType = new Map()));
    let keys = byType.get(Type);
    if (!keys) byType.set(Type, (keys = new Set()));
    keys.add(key);
  }

  /** @returns true if this registry tracked `container`. */
  private _pruneEntry(
    Type: StateContainerConstructor,
    container: StateContainer<any, any, any>,
  ): boolean {
    const entry = this._entryByInstance.get(container);
    if (entry === undefined) return false;
    this._entryByInstance.delete(container);
    const instances = this.instancesByConstructor.get(Type);
    if (instances?.get(entry.key) === entry) instances.delete(entry.key);
    const id = container.$blac.id;
    if (this._entryById.get(id) === entry) this._entryById.delete(id);
    return true;
  }

  private _indexEntry(entry: InstanceEntry): void {
    this._entryByInstance.set(entry.instance, entry);
    this._entryById.set(entry.instance.$blac.id, entry);
  }

  /** Disposing here recurses through `disposed`, unwinding dep chains. */
  private _releaseDependent(
    Type: StateContainerConstructor,
    key: string,
    dependent: StateContainer<any, any, any>,
  ): void {
    const instances = this.instancesByConstructor.get(Type);
    const entry = instances?.get(key);
    if (!entry) return;
    entry.dependents?.delete(dependent);
    if (this._isUnowned(Type, entry)) {
      if (!entry.instance.$blac.disposed) entry.instance.dispose();
      return;
    }
    this._syncActivation(entry);
  }

  /**
   * Register a StateContainer class with configuration
   * @param constructor - The StateContainer class constructor
   * @throws Error if type is already registered
   */
  register<T extends StateContainerConstructor>(constructor: T): void {
    if (this.types.has(constructor)) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} Type "${getBlacName(constructor)}" is already registered`,
      );
    }
    this.types.add(constructor);
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
  ): ReadonlyMap<string, InstanceEntry> {
    return this.instancesByConstructor.get(Type) || EMPTY_INSTANCES_MAP;
  }

  /**
   * Insert an entry, replacing the one at `instanceKey`. The instance is not
   * configured here.
   *
   * @internal Used by testing helpers only.
   */
  [INSERT_INSTANCE]<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string,
    instance: InstanceType<T>,
    refs: Map<string, number> = new Map(),
  ): void {
    const instances = this.ensureInstancesMap(Type);
    const existingEntry = instances.get(instanceKey);
    if (
      existingEntry &&
      existingEntry.instance !== instance &&
      !existingEntry.instance.$blac.disposed
    ) {
      existingEntry.instance.dispose();
    }
    const entry: InstanceEntry = { instance, key: instanceKey, refs };
    instances.set(instanceKey, entry);
    this._indexEntry(entry);
    this.types.add(Type);
  }

  /**
   * The single source of keying, so `acquire` and `release` agree: explicit
   * key \> `static key(args)` \> structural hash of args \> default key.
   *
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Explicit key, or undefined to derive from args
   * @param args - Construction args used for structural/`static key` derivation
   */
  resolveKey<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string | undefined,
    args: unknown,
  ): string {
    if (instanceKey !== undefined) {
      return instanceKey;
    }
    const keyFn = getClassKey(Type);
    if (keyFn) {
      return keyFn(args);
    }
    if (args !== undefined) {
      return structuralKey(args);
    }
    return DEFAULT_STRUCTURAL_KEY;
  }

  private assertInstanceLimit(
    Type: StateContainerConstructor,
    currentCount: number,
  ): void {
    const limit = getBlacConfig().maxInstancesPerType;
    if (limit > 0 && currentCount >= limit) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} exceeded the maximum of ${limit} live instances. ` +
          `This usually means the instance key is unstable — e.g. \`args\` that ` +
          `change identity every render, or a missing \`static key\` — so a new ` +
          `instance is created and never disposed (memory leak). Stabilize the key, ` +
          `add a \`static key(args)\`, or raise \`configureBlac({ maxInstancesPerType })\`.`,
      );
    }
  }

  private assertRefLimit(
    Type: StateContainerConstructor,
    resolvedKey: string,
    refCount: number,
  ): void {
    const limit = getBlacConfig().maxRefsPerInstance;
    if (limit > 0 && refCount > limit) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} instance "${resolvedKey}" exceeded the maximum of ${limit} live references. ` +
          `This usually means references are acquired without a matching release ` +
          `(e.g. a consumer that never unmounts/cleans up), leaking refs that keep ` +
          `the instance alive forever. Ensure every acquire is paired with a release, ` +
          `or raise \`configureBlac({ maxRefsPerInstance })\`.`,
      );
    }
  }

  /**
   * Get or create an instance and add a ref; `release()` it with the same
   * refId.
   *
   * @internal Internal key tier. Public callers use the args-based `acquire`
   *   wrapper; `useBloc` and `watch` address a pre-resolved key here.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @param options - `canCreate` and `countRef` default to true; `refId` is
   *   auto-generated when omitted; `dependent` is the `depend()`-owner, whose
   *   edge is released on its disposal; `sweepIfUnowned` is for speculative
   *   creates (see {@link _scheduleSweep}).
   */
  acquire<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey?: string,
    options: {
      canCreate?: boolean;
      countRef?: boolean;
      refId?: string;
      args?: unknown;
      dependent?: StateContainer<any, any, any>;
      sweepIfUnowned?: boolean;
    } = {},
  ): InstanceType<T> {
    const { canCreate = true, countRef = true } = options;
    const args = options.args;

    const resolvedKey = this.resolveKey(Type, instanceKey, args);

    const instances = this.ensureInstancesMap(Type);
    let entry = instances.get(resolvedKey);

    if (entry?.instance.$blac.disposed) {
      instances.delete(resolvedKey);
      entry = undefined;
    }

    if (entry) {
      if (IS_DEV && args !== undefined && entry.args !== undefined) {
        const incomingKey = structuralKey(args);
        const storedKey = (entry.argsKey ??= structuralKey(entry.args));
        if (incomingKey !== storedKey) {
          console.warn(
            `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} instance key "${resolvedKey}" was acquired with different args. ` +
              `Existing args: ${storedKey}, new args: ${incomingKey}. ` +
              `The existing instance will be reused. If distinct args should produce distinct instances, ` +
              `either remove the explicit instanceKey or provide a \`static key\` function that reflects the difference.`,
          );
        }
      }

      if (countRef) {
        const refId = options.refId ?? `_auto_${this._autoRefIdCounter++}`;
        const count = entry.refs.get(refId) ?? 0;
        if (count === 0) {
          this.assertRefLimit(Type, resolvedKey, entry.refs.size + 1);
        }
        entry.refs.set(refId, count + 1);
        this.emit('refAcquired', entry.instance, refId);
      }

      if (options.dependent) {
        (entry.dependents ??= new Set()).add(options.dependent);
        this._recordDependentEdge(options.dependent, Type, resolvedKey);
      }

      this._syncActivation(entry);

      if (options.sweepIfUnowned && entry.sweepTimer !== undefined) {
        this._scheduleSweep(Type, entry);
      }

      return entry.instance;
    }

    if (!canCreate) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} instance "${resolvedKey}" not found and creation is disabled.`,
      );
    }

    this.assertInstanceLimit(Type, instances.size);

    const config: StateContainerConfig = {
      instanceId: resolvedKey,
      args,
      registry: this,
    };
    const instance = new Type() as InstanceType<T>;
    instance[INIT_CONFIG](config);
    const initialRefs = new Map<string, number>();
    let initialRefId: string | undefined;
    if (countRef) {
      initialRefId = options.refId ?? `_auto_${this._autoRefIdCounter++}`;
      initialRefs.set(initialRefId, 1);
    }
    const newEntry: InstanceEntry = {
      instance,
      key: resolvedKey,
      refs: initialRefs,
      args,
    };
    if (options.dependent) {
      (newEntry.dependents ??= new Set()).add(options.dependent);
      this._recordDependentEdge(options.dependent, Type, resolvedKey);
    }
    instances.set(resolvedKey, newEntry);
    this._indexEntry(newEntry);

    this.types.add(Type);

    if (initialRefId) {
      this.emit('refAcquired', instance, initialRefId);
    }

    this._syncActivation(newEntry);

    if (options.sweepIfUnowned && this._hasNoOwners(newEntry)) {
      this._scheduleSweep(Type, newEntry);
    }

    return instance;
  }

  /**
   * Dispose a speculative create (a render that never commits, SSR) that is
   * still unowned after `unownedSweepDelayMs`. The delay must outlast a
   * time-sliced render; a repeat speculative acquire restarts it. Opt-in, so a
   * bare `ensure()` stays usable across an `await`.
   */
  private _scheduleSweep(
    Type: StateContainerConstructor,
    entry: InstanceEntry,
  ): void {
    clearTimeout(entry.sweepTimer);
    entry.sweepTimer = setTimeout(() => {
      entry.sweepTimer = undefined;
      const instances = this.instancesByConstructor.get(Type);
      if (instances?.get(entry.key) !== entry) return;
      if (entry.instance.$blac.disposed) return;
      if (!this._isUnowned(Type, entry)) return;
      entry.instance.dispose();
      instances.delete(entry.key);
    }, getBlacConfig().unownedSweepDelayMs);
  }

  /**
   * Get an existing instance without adding a ref.
   *
   * @internal Internal key tier; public callers use the args-based `borrow`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @returns The state container instance
   * @throws Error if instance doesn't exist
   */
  borrow<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
  ): InstanceType<T> {
    return this.acquire(Type, instanceKey, {
      canCreate: false,
      countRef: false,
    });
  }

  /**
   * Like `borrow`, but returns the error instead of throwing.
   *
   * @internal Internal key tier; public callers use the args-based `borrowSafe`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @returns Discriminated union with either the instance or an error
   */
  borrowSafe<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
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
   * Get or create an instance without adding a ref.
   *
   * @internal Internal key tier; public callers use the args-based `ensure`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key, or undefined to derive from `args`
   *   (`static key(args)` / structural hash), matching `acquire`.
   * @param args - Construction args; used for keying when no explicit key is given
   * @returns The state container instance
   */
  ensure<T extends StateContainerConstructor = StateContainerConstructor>(
    Type: T,
    instanceKey?: string,
    args?: unknown,
  ): InstanceType<T> {
    return this.acquire(Type, instanceKey, {
      canCreate: true,
      countRef: false,
      args,
    });
  }

  /**
   * Remove a ref and dispose the instance once nothing owns it. Releasing a
   * ref that isn't held is a no-op.
   *
   * @internal Internal key tier; public callers use the args-based `release`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @param forceDispose - Force immediate disposal regardless of refs
   * @param refId - The specific ref to remove; removes one arbitrary ref if omitted
   */
  release<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
    forceDispose = false,
    refId?: string,
  ): void {
    const instances = this.instancesByConstructor.get(Type);
    const entry = instances?.get(instanceKey);
    if (!instances || !entry) return;

    if (forceDispose) {
      if (!entry.instance.$blac.disposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
      return;
    }

    const releasedRefId = refId ?? entry.refs.keys().next().value;
    if (releasedRefId === undefined) return;
    const count = entry.refs.get(releasedRefId) ?? 0;
    if (count === 0) return;
    if (count === 1) {
      entry.refs.delete(releasedRefId);
    } else {
      entry.refs.set(releasedRefId, count - 1);
    }
    this.emit('refReleased', entry.instance, releasedRefId);

    // Checked before activation so a disposing entry never also deactivates.
    if (this._isUnowned(Type, entry)) {
      if (!entry.instance.$blac.disposed) {
        entry.instance.dispose();
      }
      instances.delete(instanceKey);
      return;
    }

    this._syncActivation(entry);
  }

  /** Live instances of `Type`. */
  getAll<T extends StateContainerConstructor>(
    Type: T,
  ): InstanceReadonlyState<T>[] {
    const instances = this.getInstancesMap(Type);
    const result: InstanceReadonlyState<T>[] = [];
    for (const entry of instances.values()) {
      if (!entry.instance.$blac.disposed) {
        result.push(entry.instance);
      }
    }
    return result;
  }

  /** Iterate live instances of `Type`; callback errors are logged. */
  forEach<T extends StateContainerConstructor>(
    Type: T,
    callback: (instance: InstanceReadonlyState<T>) => void,
  ): void {
    const instances = this.getInstancesMap(Type);
    for (const entry of instances.values()) {
      const instance = entry.instance;
      if (!instance.$blac.disposed) {
        try {
          callback(instance);
        } catch (error) {
          console.error(
            `${BLAC_ERROR_PREFIX} forEach callback error for ${getBlacName(Type)}:`,
            error,
          );
        }
      }
    }
  }

  /** Dispose all instances of `Type`. */
  clear<T extends StateContainerConstructor>(Type: T): void {
    const instances = this.instancesByConstructor.get(Type);
    if (!instances) return;
    for (const entry of instances.values()) {
      if (!entry.instance.$blac.disposed) {
        entry.instance.dispose();
      }
    }
    instances.clear();
  }

  /**
   * Get reference count for an instance (number of active refs).
   *
   * @internal Internal key tier; public callers use the args-based `getRefCount`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @returns Current ref count (0 if instance doesn't exist)
   */
  getRefCount<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
  ): number {
    return this.getInstancesMap(Type).get(instanceKey)?.refs.size ?? 0;
  }

  /**
   * Get all active reference IDs for an instance.
   *
   * @internal Internal key tier; public callers use the args-based `getRefIds`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @returns Array of ref ID strings (empty if instance doesn't exist)
   */
  getRefIds<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
  ): string[] {
    const entry = this.getInstancesMap(Type).get(instanceKey);
    return entry ? Array.from(entry.refs.keys()) : [];
  }

  /** Ref ids by `$blac.id`, for `PluginContext.getRefIds`. */
  getRefIdsById(instanceId: string): string[] {
    const entry = this._entryById.get(instanceId);
    return entry ? Array.from(entry.refs.keys()) : [];
  }

  /**
   * Check if an instance exists.
   *
   * @internal Internal key tier; public callers use the args-based `hasInstance`.
   * @param Type - The StateContainer class constructor
   * @param instanceKey - Pre-resolved instance key (defaults to 'default')
   * @returns true if a live (not disposed) instance exists
   */
  hasInstance<T extends StateContainerConstructor>(
    Type: T,
    instanceKey: string = DEFAULT_STRUCTURAL_KEY,
  ): boolean {
    const entry = this.getInstancesMap(Type).get(instanceKey);
    return entry !== undefined && !entry.instance.$blac.disposed;
  }

  /** Dispose every instance and forget all types (for testing). */
  clearAll(): void {
    for (const Type of this.types) {
      this.clear(Type);
    }
    this.types.clear();
  }

  /** Instance counts, for debugging. */
  getStats(): {
    registeredTypes: number;
    totalInstances: number;
    typeBreakdown: Record<string, number>;
  } {
    const typeBreakdown: Record<string, number> = {};
    let totalInstances = 0;

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

  /** All registered types (for plugins). */
  getTypes(): StateContainerConstructor[] {
    return Array.from(this.types);
  }

  /**
   * Subscribe to a lifecycle event.
   * @returns Unsubscribe function
   */
  on<E extends LifecycleEvent>(
    event: E,
    listener: LifecycleListener<E>,
  ): () => void {
    let instance = this.listeners.get(event);
    if (!instance) {
      instance = new Set();
      this.listeners.set(event, instance);
    }

    instance.add(listener as (...args: any[]) => void);

    return () => {
      this.listeners.get(event)?.delete(listener as (...args: any[]) => void);
    };
  }

  /**
   * Emit lifecycle event to all listeners
   * @internal - Called by StateContainer lifecycle methods
   */
  emit(event: 'created', container: StateContainer<any, any, any>): void;
  emit(event: 'disposed', container: StateContainer<any, any, any>): void;
  emit(
    event: 'stateChanged',
    container: StateContainer<any, any, any>,
    previousState: any,
    currentState: any,
  ): void;
  emit(
    event: 'refAcquired',
    container: StateContainer<any, any, any>,
    refId: string,
  ): void;
  emit(
    event: 'refReleased',
    container: StateContainer<any, any, any>,
    refId: string,
  ): void;
  emit(
    event: 'depsChanged',
    container: StateContainer<any, any, any>,
    previousDeps: Readonly<Record<string, unknown>>,
    currentDeps: Readonly<Record<string, unknown>>,
  ): void;
  emit(
    event: 'hydrationChanged',
    container: StateContainer<any, any, any>,
    status: HydrationStatus,
    previousStatus: HydrationStatus,
  ): void;
  emit(
    event: 'activated',
    container: StateContainer<any, any, any>,
    signal: AbortSignal,
  ): void;
  emit(event: 'deactivated', container: StateContainer<any, any, any>): void;
  emit(event: LifecycleEvent, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return;

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
   * Queue a microtask-deferred `stateChanged`.
   * @internal - Called by StateContainer.applyState
   */
  notifyStateChanged(
    container: StateContainer<any, any, any>,
    previousState: any,
    newState: any,
  ): void {
    if (!this.hasStateChangedListeners) return;

    if (!this._pendingStateChanges) {
      this._pendingStateChanges = [];
      queueMicrotask(() => this.flushStateChanged());
    }
    this._pendingStateChanges.push([container, previousState, newState]);
  }

  /**
   * One event per emit, deliberately not coalesced: devtools and time-travel
   * need every intermediate transition. Plugins get the coalesced lane.
   */
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
 * The global default registry.
 * @public
 */
export const globalRegistry = new StateContainerRegistry();

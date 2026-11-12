import type {
  HydrationStatus,
  StateContainer,
  StateContainerConfig,
} from './StateContainer';
import { BLAC_ERROR_PREFIX, IS_DEV } from '../constants';
import { getBlacConfig } from '../config';
import { isKeepAliveClass, getBlacName } from '../utils/static-props';
import { structuralKey, DEFAULT_STRUCTURAL_KEY } from '../utils/structural-key';
import {
  ExtractArgs,
  InstanceReadonlyState,
  StateContainerConstructor,
} from '../types/utilities';
import { resolveInstanceKey } from './resolveInstanceKey';
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
  argsMismatchWarned?: boolean;
  /** `depend()`-owners holding this instance. */
  dependents?: Set<StateContainer<any, any, any>>;
  sweepTimer?: ReturnType<typeof setTimeout>;
}

/** A `static key` class may take args the structural hash rejects. */
function safeStructuralKey(args: unknown): string {
  try {
    return structuralKey(args);
  } catch {
    return '<unserializable>';
  }
}

const AUTO_REF_PREFIX = '_auto_';

function pickRef(refs: Map<string, number>): string | undefined {
  for (const refId of refs.keys()) {
    if (refId.startsWith(AUTO_REF_PREFIX)) return refId;
  }
  return refs.keys().next().value;
}

const EMPTY_INSTANCES_MAP: ReadonlyMap<string, InstanceEntry> = new Map();

/**
 * Lifecycle events emitted by the registry
 * @public
 */
export type LifecycleEvent = keyof LifecycleEvents;

type Container = StateContainer<any, any, any>;

/**
 * Arguments each lifecycle event passes to its listeners.
 * @public
 */
export interface LifecycleEvents {
  created: [container: Container];
  disposed: [container: Container];
  refAcquired: [container: Container, refId: string];
  refReleased: [container: Container, refId: string];
  depsChanged: [
    container: Container,
    previousDeps: Readonly<Record<string, unknown>>,
    currentDeps: Readonly<Record<string, unknown>>,
  ];
  hydrationChanged: [
    container: Container,
    status: HydrationStatus,
    previousStatus: HydrationStatus,
  ];
  activated: [container: Container, signal: AbortSignal];
  deactivated: [container: Container];
}

/**
 * Listener function type for each lifecycle event
 * @typeParam E - The lifecycle event type
 * @public
 */
export type LifecycleListener<E extends LifecycleEvent> = (
  ...args: LifecycleEvents[E]
) => void;

/**
 * Owns StateContainer instances: creation, ref tracking, disposal and
 * lifecycle events.
 *
 * @example
 * ```ts
 * const registry = new StateContainerRegistry();
 * const instance = registry.acquire(MyBloc);  // ownership, must release
 * const other = registry.ensure(OtherBloc);   // no ownership, bloc-to-bloc
 * registry.on('created', (container) => console.log(container));
 * ```
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

  private _autoRefIdCounter = 0;
  private _destroyed = false;

  constructor() {
    // Also covers a direct `dispose()` that bypasses `release()`.
    this.on('disposed', (container) => this._handleDisposed(container));
  }

  /** Prune a tracked instance's entry and release its `depend()` edges. */
  private _handleDisposed(container: StateContainer<any, any, any>): void {
    this._pruneEntry(container);
    this._releaseEdges(container);
  }

  /**
   * Also runs for a container this registry never tracked (a bare `new`, or
   * one whose `init()` threw): its `depend()` edges are recorded here anyway.
   */
  private _releaseEdges(container: StateContainer<any, any, any>): void {
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

  /**
   * Forget `container`'s entry. Matches by entry identity, so it never removes
   * an instance recreated under the same key, and is a no-op once pruned.
   */
  private _pruneEntry(container: StateContainer<any, any, any>): void {
    const entry = this._entryByInstance.get(container);
    if (entry === undefined) return;
    this._entryByInstance.delete(container);
    const instances = this.instancesByConstructor.get(
      container.constructor as StateContainerConstructor,
    );
    if (instances?.get(entry.key) === entry) instances.delete(entry.key);
    const id = container.$blac.id;
    if (this._entryById.get(id) === entry) this._entryById.delete(id);
  }

  /** Dispose and forget; covers an instance whose events go to another registry. */
  private _disposeEntry(entry: InstanceEntry): void {
    if (!entry.instance.$blac.disposed) entry.instance.dispose();
    this._pruneEntry(entry.instance);
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
      this._disposeEntry(entry);
      return;
    }
    this._syncActivation(entry);
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
   *   creates (see `_scheduleSweep`).
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

    const resolvedKey =
      instanceKey ?? resolveInstanceKey(Type, args as ExtractArgs<T>);

    const instances = this.ensureInstancesMap(Type);
    let entry = instances.get(resolvedKey);

    if (entry?.instance.$blac.disposed) {
      this._pruneEntry(entry.instance);
      entry = undefined;
    }

    if (entry) {
      if (
        IS_DEV &&
        !entry.argsMismatchWarned &&
        args !== undefined &&
        entry.args !== undefined &&
        args !== entry.args
      ) {
        const incomingKey = safeStructuralKey(args);
        const storedKey = (entry.argsKey ??= safeStructuralKey(entry.args));
        if (incomingKey !== storedKey) {
          entry.argsMismatchWarned = true;
          console.warn(
            `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} instance key "${resolvedKey}" was acquired with different args. ` +
              `Existing args: ${storedKey}, new args: ${incomingKey}. ` +
              `The existing instance will be reused. If distinct args should produce distinct instances, ` +
              `either remove the explicit instanceKey or provide a \`static key\` function that reflects the difference.`,
          );
        }
      }

      if (countRef) {
        const refId =
          options.refId ?? `${AUTO_REF_PREFIX}${this._autoRefIdCounter++}`;
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

      if (!options.sweepIfUnowned) {
        clearTimeout(entry.sweepTimer);
        entry.sweepTimer = undefined;
      } else if (entry.sweepTimer !== undefined) {
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
    try {
      instance[INIT_CONFIG](config);
    } catch (error) {
      this._releaseEdges(instance);
      throw error;
    }
    const initialRefs = new Map<string, number>();
    let initialRefId: string | undefined;
    if (countRef) {
      initialRefId =
        options.refId ?? `${AUTO_REF_PREFIX}${this._autoRefIdCounter++}`;
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
      this._disposeEntry(entry);
    }, getBlacConfig().unownedSweepDelayMs);
    (entry.sweepTimer as { unref?: () => void }).unref?.();
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
    // A plain lookup: no ref, no activation change, and a pending sweep of a
    // speculative instance keeps running.
    const entry = this.instancesByConstructor.get(Type)?.get(instanceKey);
    if (entry === undefined || entry.instance.$blac.disposed) {
      throw new Error(
        `${BLAC_ERROR_PREFIX} ${getBlacName(Type)} instance "${instanceKey}" not found and creation is disabled.`,
      );
    }
    return entry.instance;
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
   * @param refId - The specific ref to remove. If omitted, an auto-generated
   *   ref goes first, so an unnamed release does not drop a named owner's ref
   *   (a mounted component's) while an unnamed one is still held.
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
      this._disposeEntry(entry);
      return;
    }

    const releasedRefId = refId ?? pickRef(entry.refs);
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
      this._disposeEntry(entry);
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
    // A snapshot: disposing prunes the map, and may cascade to other keys.
    for (const entry of Array.from(instances.values())) {
      this._disposeEntry(entry);
    }
  }

  /** Dispose every live instance, keepAlive included, for which `predicate` is true. */
  clearWhere(
    predicate: (instance: StateContainer<any, any, any>) => boolean,
  ): void {
    const matches: StateContainer<any, any, any>[] = [];
    for (const Type of this.types) {
      for (const entry of this.getInstancesMap(Type).values()) {
        if (!entry.instance.$blac.disposed && predicate(entry.instance)) {
          matches.push(entry.instance);
        }
      }
    }
    for (const instance of matches) {
      if (!instance.$blac.disposed) instance.dispose();
    }
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

  /**
   * Dispose every instance and forget all types. Mounted consumers move to
   * new instances, as with any outside dispose; use `destroy()` for a
   * registry that is going away.
   */
  clearAll(): void {
    for (const Type of this.types) {
      this.clear(Type);
    }
    this.types.clear();
  }

  /**
   * Dispose every instance for good: the registry is going away (a test's, a
   * request's), so adapters do not rebind mounted consumers to new instances.
   */
  destroy(): void {
    this._destroyed = true;
    this.clearAll();
  }

  get destroyed(): boolean {
    return this._destroyed;
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
  emit<E extends LifecycleEvent>(event: E, ...args: LifecycleEvents[E]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return;

    for (const listener of listeners) {
      try {
        (listener as (...a: unknown[]) => void)(...args);
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
 * The global default registry.
 * @public
 */
export const globalRegistry = new StateContainerRegistry();

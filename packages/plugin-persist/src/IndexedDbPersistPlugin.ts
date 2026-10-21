import { ALL_PATHS, getBlacName } from '@blac/core';
import type { Cubit, PathSet, PluginContext, StateContainer } from '@blac/core';
import {
  createNativeIndexedDbAdapter,
  NativeIndexedDbAdapter,
} from './IndexedDbAdapter';
import { createWebStorageAdapter } from './WebStorageAdapter';
import type {
  IndexedDbPersistAdapter,
  IndexedDbPersistPlugin,
  IndexedDbPersistPluginOptions,
  PersistDefinitionContext,
  PersistPluginStatus,
  PersistPluginStatusEvent,
  PersistRegistration,
  PersistedRecord,
  WebStoragePersistPluginOptions,
} from './types';

type InternalDefinition = PersistRegistration<any, any, any>;

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>;
  write: () => void;
}

const isPromiseLike = <T>(value: T | PromiseLike<T>): value is PromiseLike<T> =>
  typeof (value as PromiseLike<T> | null)?.then === 'function';

/** Applies `fn` to `value` synchronously unless `value` is still pending. */
const then = <T, R>(
  value: T | PromiseLike<T>,
  fn: (value: T) => R | PromiseLike<R>,
): R | PromiseLike<R> => (isPromiseLike(value) ? value.then(fn) : fn(value));

interface InstanceRuntime {
  key: string;
  /**
   * Pre-`blacName` key for this instance, set only when `key` is the derived
   * default. `undefined` when the registration supplies its own key, which is
   * already stable and needs no migration.
   */
  legacyKey?: string;
  className: string;
  instanceId: string;
  dirtyBeforeHydration: boolean;
  applyingHydration: boolean;
  disposed: boolean;
  hydrationToken: number;
  /**
   * Accumulated paths from all flushes coalesced by the current debounce
   * window. `ALL_PATHS` if any flush in the window touched every path.
   * Reset to `null` after each save so the next window starts clean.
   */
  pendingPaths: PathSet | null;
}

export class IndexedDbPersistPluginImpl implements IndexedDbPersistPlugin {
  readonly name: string;
  readonly version = '0.0.1';

  private readonly adapter: IndexedDbPersistAdapter;
  private readonly registrations = new Map<
    new (...args: any[]) => StateContainer<any>,
    InternalDefinition
  >();
  private readonly runtimes = new WeakMap<
    StateContainer<any>,
    InstanceRuntime
  >();
  private readonly pendingWrites = new Map<StateContainer<any>, PendingWrite>();
  private readonly statuses = new WeakMap<
    StateContainer<any>,
    PersistPluginStatus
  >();
  private readonly listeners = new Set<
    (event: PersistPluginStatusEvent) => void
  >();

  constructor(options: IndexedDbPersistPluginOptions = {}) {
    this.name = options.pluginName ?? 'indexeddb-persist';
    this.adapter =
      options.adapter ??
      createNativeIndexedDbAdapter({
        databaseName: options.databaseName,
        storeName: options.storeName,
      });
  }

  persist(
    Type: new (...args: any[]) => Cubit<any>,
    config: InternalDefinition = {},
  ): IndexedDbPersistPlugin {
    this.registrations.set(Type, config);
    return this;
  }

  flush(): void {
    for (const { timer, write } of this.pendingWrites.values()) {
      clearTimeout(timer);
      write();
    }
  }

  async clearRecord(key: string): Promise<void> {
    await this.adapter.delete(key);
  }

  async clearAll(): Promise<void> {
    await this.adapter.clear();
  }

  getStatus(instance: StateContainer<any>): PersistPluginStatus | undefined {
    return this.statuses.get(instance);
  }

  subscribe(listener: (event: PersistPluginStatusEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onInstall(_context: PluginContext): void {
    if (!this.adapter.isAvailable()) {
      console.warn(
        `[BlaC] Plugin "${this.name}" disabled: storage unavailable`,
      );
    }
    globalThis.addEventListener?.('pagehide', this.onPageHide);
  }

  onUninstall(): void {
    globalThis.removeEventListener?.('pagehide', this.onPageHide);
    for (const { timer } of this.pendingWrites.values()) {
      clearTimeout(timer);
    }
    this.pendingWrites.clear();
    this.listeners.clear();
  }

  private readonly onPageHide = (): void => this.flush();

  onCreated(ctx: PluginContext): void {
    const instance = ctx.container as StateContainer<any>;
    const context = ctx;
    const definition = this.registrations.get(
      instance.constructor as new (...args: any[]) => StateContainer<any>,
    );
    if (!definition || !this.adapter.isAvailable()) {
      return;
    }

    const info = this.createDefinitionContext(instance, context);
    const key = this.resolveKey(definition, info);
    const legacyKey = this.legacyKey(instance);
    const runtime: InstanceRuntime = {
      key,
      legacyKey:
        key === this.defaultKey(instance) && legacyKey !== key
          ? legacyKey
          : undefined,
      className: info.className,
      instanceId: info.instanceId,
      dirtyBeforeHydration: false,
      applyingHydration: false,
      disposed: false,
      hydrationToken: Date.now() + Math.random(),
      pendingPaths: null,
    };

    this.runtimes.set(instance, runtime);
    context.startHydration(instance);
    this.updateStatus(instance, {
      key: runtime.key,
      className: runtime.className,
      instanceId: runtime.instanceId,
      phase: 'hydrating',
      hydratedFromStorage: false,
    });

    this.hydrate(instance, context, definition, runtime);
  }

  onStateChange(
    ctx: PluginContext,
    _prev: any,
    _next: any,
    paths: PathSet,
  ): void {
    const instance = ctx.container as StateContainer<any>;
    const context = ctx;
    const definition = this.registrations.get(
      instance.constructor as new (...args: any[]) => StateContainer<any>,
    );
    const runtime = this.runtimes.get(instance);
    if (
      !definition ||
      !runtime ||
      runtime.disposed ||
      !this.adapter.isAvailable()
    ) {
      return;
    }

    if (runtime.applyingHydration) {
      return;
    }

    if (this.getStatus(instance)?.phase === 'hydrating') {
      runtime.dirtyBeforeHydration = true;
    }

    // Accumulate paths across coalesced flushes within the debounce window.
    // Once we see ALL_PATHS, upgrade the pending set to ALL_PATHS and keep it
    // there — partial information is lost. This lets the save call know
    // whether the full state changed or only a narrow slice did.
    if (paths === ALL_PATHS || runtime.pendingPaths === ALL_PATHS) {
      runtime.pendingPaths = ALL_PATHS;
    } else if (runtime.pendingPaths === null) {
      runtime.pendingPaths = paths;
    } else {
      // Merge into the accumulated set (both are Set<PathId>)
      for (const p of paths) {
        (runtime.pendingPaths as Set<number>).add(p as number);
      }
    }

    const existing = this.pendingWrites.get(instance);
    if (existing) {
      clearTimeout(existing.timer);
    }

    // Capture the live state now (at flush time). When debounce > 0 the
    // timer fires later, but we re-read ctx.container.state at that point
    // via the save() snapshot, so we don't stale-state here intentionally.
    const delay = definition.debounceMs ?? 0;
    const write = () => {
      this.pendingWrites.delete(instance);
      // Re-read the current state at actual write time so a burst of emits
      // within the debounce window always persists the most recent snapshot.
      const stateAtWrite = context.getState(instance);
      const resolvedPaths = runtime.pendingPaths;
      runtime.pendingPaths = null;
      void this.save(
        instance,
        context,
        definition,
        runtime,
        stateAtWrite,
        resolvedPaths,
      );
    };

    this.pendingWrites.set(instance, {
      timer: setTimeout(write, delay),
      write,
    });
  }

  onDestroyed(ctx: PluginContext): void {
    const instance = ctx.container as StateContainer<any>;
    const runtime = this.runtimes.get(instance);
    if (runtime) {
      runtime.disposed = true;
    }

    const pending = this.pendingWrites.get(instance);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingWrites.delete(instance);
    }
  }

  /**
   * Reads the stored record and applies it. A synchronous adapter hydrates
   * before this returns, so the first state read already sees stored state.
   */
  private hydrate(
    instance: StateContainer<any>,
    context: PluginContext,
    definition: InternalDefinition,
    runtime: InstanceRuntime,
  ): void {
    const onError = (error: unknown) =>
      this.handleError(instance, context, definition, error);
    try {
      const record = then(this.adapter.get(runtime.key), (found) =>
        found === null && runtime.legacyKey
          ? this.adapter.get(runtime.legacyKey)
          : found,
      );
      if (isPromiseLike(record)) {
        record
          .then((found) =>
            this.applyRecord(instance, context, definition, runtime, found),
          )
          .then(undefined, onError);
      } else {
        this.applyRecord(instance, context, definition, runtime, record);
      }
    } catch (error) {
      onError(error);
    }
  }

  private applyRecord(
    instance: StateContainer<any>,
    context: PluginContext,
    definition: InternalDefinition,
    runtime: InstanceRuntime,
    record: PersistedRecord | null,
  ): void {
    try {
      if (
        runtime.disposed ||
        this.runtimes.get(instance)?.hydrationToken !== runtime.hydrationToken
      ) {
        return;
      }

      if (!record) {
        context.finishHydration(instance);
        this.updateStatus(instance, {
          key: runtime.key,
          className: runtime.className,
          instanceId: runtime.instanceId,
          phase: 'hydrated',
          hydratedFromStorage: false,
        });
        return;
      }

      if (runtime.dirtyBeforeHydration) {
        context.finishHydration(instance);
        this.updateStatus(instance, {
          key: runtime.key,
          className: runtime.className,
          instanceId: runtime.instanceId,
          phase: 'hydrated',
          hydratedFromStorage: false,
        });
        return;
      }

      const currentState = context.getState(instance);
      const nextState = definition.dbToState
        ? definition.dbToState(record.payload, {
            instance,
            className: runtime.className,
            instanceId: runtime.instanceId,
            currentState,
            key: runtime.key,
            record,
          })
        : (record.payload as any);

      let applied = false;
      runtime.applyingHydration = true;
      try {
        applied = context.applyHydratedState(instance, nextState);
      } finally {
        runtime.applyingHydration = false;
      }
      context.finishHydration(instance);

      if (!applied) {
        this.updateStatus(instance, {
          key: runtime.key,
          className: runtime.className,
          instanceId: runtime.instanceId,
          phase: 'hydrated',
          hydratedFromStorage: false,
          savedAt: record.savedAt,
        });
        return;
      }

      this.updateStatus(instance, {
        key: runtime.key,
        className: runtime.className,
        instanceId: runtime.instanceId,
        phase: 'hydrated',
        hydratedFromStorage: true,
        savedAt: record.savedAt,
      });

      definition.onHydrated?.(nextState, {
        instance,
        className: runtime.className,
        instanceId: runtime.instanceId,
        currentState,
        key: runtime.key,
        record,
      });
    } catch (error) {
      this.handleError(instance, context, definition, error);
    }
  }

  private async save(
    instance: StateContainer<any>,
    context: PluginContext,
    definition: InternalDefinition,
    runtime: InstanceRuntime,
    currentState: any,
    // paths: PathSet | null — the accumulated PathSet for this write window.
    // ALL_PATHS means every path changed; a Set<PathId> means only those
    // paths changed; null means unknown (should not occur in normal flow).
    // Currently used to record changed paths in the persisted record for
    // diagnostics. A future `watchPaths` field on PersistRegistration could
    // use this to skip the write entirely when the changed set is disjoint
    // from the watched set.
    _changedPaths: PathSet | null = null,
  ): Promise<void> {
    try {
      const ctx = this.createDefinitionContext(
        instance,
        context,
        runtime.key,
        currentState,
      );
      const payload = definition.stateToDb
        ? definition.stateToDb(currentState, ctx)
        : currentState;

      this.updateStatus(instance, {
        key: runtime.key,
        className: runtime.className,
        instanceId: runtime.instanceId,
        phase: 'saving',
        hydratedFromStorage:
          this.getStatus(instance)?.hydratedFromStorage ?? false,
        savedAt: this.getStatus(instance)?.savedAt,
      });

      const record: PersistedRecord = {
        id: runtime.key,
        className: runtime.className,
        instanceId: runtime.instanceId,
        savedAt: Date.now(),
        payload,
      };

      await this.adapter.put(record);

      this.updateStatus(instance, {
        key: runtime.key,
        className: runtime.className,
        instanceId: runtime.instanceId,
        phase: 'saved',
        hydratedFromStorage:
          this.getStatus(instance)?.hydratedFromStorage ?? false,
        savedAt: record.savedAt,
      });
    } catch (error) {
      this.handleError(instance, context, definition, error);
    }
  }

  private handleError(
    instance: StateContainer<any>,
    context: PluginContext,
    definition: InternalDefinition,
    error: any,
  ): void {
    const runtime = this.runtimes.get(instance);
    const err = error instanceof Error ? error : new Error(String(error));
    if (runtime) {
      if (context.getHydrationStatus(instance) === 'hydrating') {
        context.failHydration(instance, err);
      }
      this.updateStatus(instance, {
        key: runtime.key,
        className: runtime.className,
        instanceId: runtime.instanceId,
        phase: 'error',
        hydratedFromStorage:
          this.getStatus(instance)?.hydratedFromStorage ?? false,
        savedAt: this.getStatus(instance)?.savedAt,
        error: err,
      });
    }

    definition.onError?.(err, {
      ...(this.createDefinitionContext(
        instance,
        context,
        runtime?.key,
        context.getState(instance),
      ) as PersistDefinitionContext<any>),
      instance,
    });
  }

  private createDefinitionContext(
    instance: StateContainer<any>,
    context: PluginContext,
    key?: string,
    currentState?: any,
  ): PersistDefinitionContext<any> {
    return {
      instance,
      className: getBlacName(instance.constructor as any),
      instanceId: instance.$blac.id,
      currentState: currentState ?? context.getState(instance),
      key: key ?? this.defaultKey(instance),
    };
  }

  private resolveKey(
    definition: InternalDefinition,
    ctx: PersistDefinitionContext<any>,
  ): string {
    if (typeof definition.key === 'function') {
      return definition.key(ctx);
    }

    return definition.key ?? this.defaultKey(ctx.instance);
  }

  private defaultKey(instance: StateContainer<any>): string {
    return `${getBlacName(instance.constructor as any)}:${instance.$blac.id}`;
  }

  /**
   * The pre-`blacName` key shape, kept only so existing records survive the
   * switch. Read as a fallback during hydration; the next save rewrites the
   * record under {@link defaultKey}.
   */
  private legacyKey(instance: StateContainer<any>): string {
    return `${instance.constructor.name}:${instance.$blac.id}`;
  }

  private updateStatus(
    instance: StateContainer<any>,
    status: PersistPluginStatus,
  ): void {
    this.statuses.set(instance, status);
    const event: PersistPluginStatusEvent = { instance, status };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[BlaC] Error in "${this.name}" status listener:`, error);
      }
    }
  }
}

export function createIndexedDbPersistPlugin(
  options: IndexedDbPersistPluginOptions = {},
): IndexedDbPersistPlugin {
  return new IndexedDbPersistPluginImpl(options);
}

export function createWebStoragePersistPlugin(
  options: WebStoragePersistPluginOptions = {},
): IndexedDbPersistPlugin {
  return new IndexedDbPersistPluginImpl({
    adapter: createWebStorageAdapter(options),
    pluginName: options.pluginName ?? 'web-storage-persist',
  });
}

export { NativeIndexedDbAdapter, createNativeIndexedDbAdapter };

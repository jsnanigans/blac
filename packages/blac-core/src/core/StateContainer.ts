import { generateSimpleId } from '../utils/idGenerator';
import { BLAC_DEFAULTS } from '../constants';
import { getRegistry } from '../registry/config';
import type { StateContainerConstructor } from '../types/utilities';
import { APPLY_DEPS, EMIT, REMOVE_DEPS_OWNER } from './symbols';
import { type EqualityFn, getBlacConfig } from '../config';
import { getClassEquality } from '../utils/static-props';

export interface StateContainerConfig {
  name?: string;
  debug?: boolean;
  instanceId?: string;
  /** Args passed at acquire time; forwarded to init(). */
  args?: unknown;
}

export type HydrationStatus = 'idle' | 'hydrating' | 'hydrated' | 'error';

type StateListener<S> = (state: S) => void;

export type SystemEvent = 'stateChanged' | 'dispose' | 'hydrationChanged';

export interface SystemEventPayloads<S> {
  stateChanged: { state: S; previousState: S };
  dispose: void;
  hydrationChanged: {
    status: HydrationStatus;
    previousStatus: HydrationStatus;
    error?: Error;
    changedWhileHydrating: boolean;
  };
}

type SystemEventHandler<S, E extends SystemEvent> = (
  payload: SystemEventPayloads<S>[E],
) => void;

const EMPTY_DEPS: ReadonlyMap<any, any> = new Map();

/**
 * Shallow per-key `Object.is` comparison of two plain records. Keys are
 * considered: a key present in one but not the other (regardless of value)
 * makes the records unequal. Used to detect real deps changes.
 */
function shallowEqualRecord(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (!(key in b)) return false;
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

export abstract class StateContainer<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> {
  static __excludeFromDevTools = false;

  /** @internal phantom — the args type this bloc is constructed with (see init()) */
  declare readonly __args: Args;
  /** @internal phantom — the injected deps type */
  declare readonly __deps: Deps;

  /**
   * Per-owner declared slices. ownerId -> that consumer's deps slice.
   * Lazily allocated; null until the first owner applies a slice.
   */
  private _depsByOwner: Map<string, Partial<Deps>> | null = null;

  /**
   * Merged view of all owners' slices, recomputed whenever a slice is
   * applied or withdrawn. Read lazily via the `deps` getter.
   */
  private _deps: Partial<Deps> = {};

  /**
   * Injected non-serializable handles (refs, callbacks, controllers).
   * Read lazily — never assume a dep is present at init().
   */
  get deps(): Readonly<Deps> {
    return this._deps as Readonly<Deps>;
  }

  /**
   * @internal Apply one owner's (consumer's) deps slice. Shallow-merges the
   * slice, reconciles keys the owner dropped since its last apply (other
   * owners' keys untouched), dev-warns on cross-owner key collisions, then
   * recomputes the merged view and fires onDepsChanged if it changed.
   *
   * Idempotent: re-applying an identical slice for the same owner is a no-op.
   */
  [APPLY_DEPS](ownerId: string, slice: Partial<Deps>): void {
    if (this._disposed) return;

    const owners = (this._depsByOwner ??= new Map());
    const prevSlice = owners.get(ownerId);

    if (prevSlice && shallowEqualRecord(prevSlice, slice)) {
      // Idempotent re-apply (e.g. StrictMode double-invoke): nothing changed.
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      for (const key of Object.keys(slice) as (keyof Deps)[]) {
        for (const [otherOwner, otherSlice] of owners) {
          if (otherOwner === ownerId) continue;
          if (
            key in otherSlice &&
            (otherSlice as Record<keyof Deps, unknown>)[key] !==
              (slice as Record<keyof Deps, unknown>)[key]
          ) {
            console.warn(
              `[${this.name}] multiple owners writing dep \`${String(
                key,
              )}\`; last write wins`,
            );
          }
        }
      }
    }

    // Store a defensive copy so later external mutation of the caller's
    // object can't desync our per-owner snapshot.
    owners.set(ownerId, { ...slice });
    this.reconcileDeps();
  }

  /**
   * @internal Withdraw an owner's entire deps slice (consumer unmounted).
   * Recomputes the merged view; keys only that owner provided go absent.
   */
  [REMOVE_DEPS_OWNER](ownerId: string): void {
    if (this._disposed) return;
    if (!this._depsByOwner?.delete(ownerId)) return;
    this.reconcileDeps();
  }

  /**
   * Rebuild the merged `_deps` view from all owners' slices and fire
   * onDepsChanged(next, prev) if the merged view changed (shallow compare).
   * A key whose last owner was removed appears in `next` as undefined.
   */
  private reconcileDeps(): void {
    const prev = this._deps;
    const next: Partial<Deps> = {};
    if (this._depsByOwner) {
      for (const slice of this._depsByOwner.values()) {
        Object.assign(next, slice);
      }
    }
    // Surface dropped keys explicitly as undefined so the merged view (and
    // the onDepsChanged diff) reflects a handle disappearing.
    for (const key of Object.keys(prev) as (keyof Deps)[]) {
      if (!(key in next)) {
        (next as Record<keyof Deps, unknown>)[key] = undefined;
      }
    }

    if (shallowEqualRecord(prev, next)) return;

    this._deps = next;
    this.onDepsChanged(next as Readonly<Deps>, prev as Readonly<Deps>);
    this._registry.emit(
      'depsChanged',
      this,
      prev as Readonly<Record<string, unknown>>,
      next as Readonly<Record<string, unknown>>,
    );
  }

  /**
   * Override to react when an injected handle appears, changes, or disappears
   * (post-merge). Receives readonly snapshots; diff `next.x !== prev.x` to run
   * setup/teardown (canvas init, controller bind). A disappeared handle is
   * present in `next` as `undefined`.
   */
  protected onDepsChanged(_next: Readonly<Deps>, _prev: Readonly<Deps>): void {}

  private _state: S;
  private readonly _listeners = new Set<StateListener<S>>();
  private _disposed = false;
  private _hydrationStatus: HydrationStatus = 'idle';
  private _hydrationError?: Error;
  private _changedWhileHydrating = false;
  private _hydrationPromise: Promise<void> | null = null;
  private _resolveHydrationPromise?: () => void;
  private _rejectHydrationPromise?: (error: Error) => void;
  private _hydrationPromiseSettled = false;
  private _config: StateContainerConfig = {};
  private _initCalled = false;

  // Dev-only emit-rate circuit breaker state (see configureBlac.maxEmitsPerSecond).
  private _emitWindowStart = 0;
  private _emitCount = 0;
  private _emitRateWarned = false;
  private readonly _systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, any>>
  >();
  private _dependencies: Map<StateContainerConstructor, string> | null = null;
  private _hasStateChangeHandlers = false;
  private _registry = getRegistry();
  private _equalityFn: EqualityFn = getBlacConfig().equality;

  name: string = this.constructor.name;
  debug: boolean = false;
  instanceId: string = generateSimpleId(this.constructor.name, 'main');
  createdAt: number = Date.now();

  get dependencies(): ReadonlyMap<StateContainerConstructor, string> {
    return this._dependencies ?? EMPTY_DEPS;
  }

  get args(): Args | undefined {
    return this._config.args as Args | undefined;
  }

  protected depend<T extends StateContainerConstructor>(
    Type: T,
    instanceKey?: string,
  ): () => InstanceType<T> {
    if (!this._dependencies) {
      this._dependencies = new Map();
    }
    this._dependencies.set(
      Type,
      instanceKey ?? BLAC_DEFAULTS.DEFAULT_INSTANCE_KEY,
    );
    return () => this._registry.ensure(Type, instanceKey);
  }

  constructor(initialState: S) {
    this._state = initialState;
  }

  /**
   * Called once after construction with the args passed at acquire time, before the first
   * state snapshot is read by any consumer. Override to seed args-derived state (via
   * this.emit(...)) or kick off loads. Because init runs before any subscriber exists, the
   * emit is safe and flash-free.
   *
   * Static initial state still comes from the subclass `state` field / `super(initialState)`.
   * For blocs where Args = void, init(undefined) is called — the default no-op ignores it.
   */
  protected init(_args: Args): void {}

  initConfig(config: StateContainerConfig): void {
    this._config = { ...config };
    this.name = this._config.name || this.constructor.name;
    this.debug = this._config.debug ?? false;
    this.instanceId = generateSimpleId(
      this.constructor.name,
      this._config.instanceId,
    );
    const perClass = getClassEquality(
      this.constructor as StateContainerConstructor,
    );
    this._equalityFn = perClass ?? getBlacConfig().equality;
    this._registry.emit('created', this);
    if (!this._initCalled) {
      this._initCalled = true;
      this.init(this._config.args as Args);
    }
  }

  get state(): Readonly<S> {
    return this._state;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  get hydrationStatus(): HydrationStatus {
    return this._hydrationStatus;
  }

  get hydrationError(): Error | undefined {
    return this._hydrationError;
  }

  get isHydrated(): boolean {
    return this._hydrationStatus === 'hydrated';
  }

  get changedWhileHydrating(): boolean {
    return this._changedWhileHydrating;
  }

  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  dispose(): void {
    if (this._disposed) return;

    if (this.debug) {
      console.log(`[${this.name}] Disposing...`);
    }

    // Release injected handles before flipping the disposed flag: reconcile
    // to an empty merged view so a final onDepsChanged(next, prev) fires with
    // all keys absent (undefined), letting renderers release handles. The
    // APPLY_DEPS/REMOVE_DEPS_OWNER guards below then reject any post-dispose
    // emits, so this is the last onDepsChanged for the instance.
    if (this._depsByOwner) {
      this._depsByOwner.clear();
      this.reconcileDeps();
    }

    this._disposed = true;

    if (this._hydrationStatus === 'hydrating') {
      this.failHydration(
        new Error(`Hydration cancelled because ${this.name} was disposed`),
      );
    }

    this.emitSystemEvent('dispose', undefined as void);

    this._listeners.clear();
    this._systemEventHandlers.clear();

    this._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  protected [EMIT](newState: S): void {
    this.applyState(newState, 'default');
  }

  protected emit(newState: S): void {
    this[EMIT](newState);
  }

  beginHydration(): void {
    if (this._disposed) {
      throw new Error(
        `Cannot begin hydration for disposed container ${this.name}`,
      );
    }

    this._changedWhileHydrating = false;
    this._hydrationError = undefined;
    this._hydrationPromise = null;
    this._resolveHydrationPromise = undefined;
    this._rejectHydrationPromise = undefined;
    this._hydrationPromiseSettled = false;
    void this.ensureHydrationPromise();
    this.setHydrationStatus('hydrating');
  }

  applyHydratedState(newState: S): boolean {
    if (this._disposed) {
      return false;
    }

    if (this._hydrationStatus !== 'hydrating' || this._changedWhileHydrating) {
      return false;
    }

    this.applyState(newState, 'hydration');
    return true;
  }

  finishHydration(): void {
    if (this._hydrationStatus !== 'hydrating') {
      if (this._hydrationStatus === 'hydrated') {
        return;
      }
      if (this._hydrationStatus === 'error') {
        void this.ensureHydrationPromise();
      }
    }

    this.setHydrationStatus('hydrated');
    this.resolveHydration();
  }

  failHydration(error: Error): void {
    const err =
      error instanceof Error
        ? error
        : new Error(`Hydration failed: ${String(error)}`);

    this._hydrationError = err;
    this.setHydrationStatus('error', err);
    this.rejectHydration(err);
  }

  waitForHydration(): Promise<void> {
    if (
      this._hydrationStatus === 'idle' ||
      this._hydrationStatus === 'hydrated'
    ) {
      return Promise.resolve();
    }

    if (this._hydrationStatus === 'error') {
      return Promise.reject(
        this._hydrationError ??
          new Error(`Hydration failed for container ${this.name}`),
      );
    }

    return this.ensureHydrationPromise();
  }

  /**
   * Dev-only soft circuit breaker. Counts real state changes in a rolling 1s
   * window and warns once if the rate exceeds `maxEmitsPerSecond` — the
   * signature of a runaway loop (RAF/animation or emit-on-every-commit) pushing
   * high-frequency data through state, which freezes subscribers/plugins.
   */
  private _checkEmitRate(): void {
    const limit = getBlacConfig().maxEmitsPerSecond;
    if (!(limit > 0) || !Number.isFinite(limit) || this._emitRateWarned) return;

    const now = Date.now();
    if (now - this._emitWindowStart >= 1000) {
      this._emitWindowStart = now;
      this._emitCount = 1;
      return;
    }

    this._emitCount++;
    if (this._emitCount > limit) {
      this._emitRateWarned = true;
      console.warn(
        `[${this.name}] emitted more than ${limit} state changes in under a second. ` +
          `This is usually a runaway loop pushing high-frequency data through state ` +
          `(e.g. \`emit\`/\`patch\` inside a requestAnimationFrame loop, or an effect ` +
          `that emits on every render). It can freeze the app by saturating ` +
          `subscribers and plugins (logging/devtools). Keep high-frequency work ` +
          `imperative and emit only coarse/throttled state, or raise ` +
          `\`configureBlac({ maxEmitsPerSecond })\`. (This warning fires once.)`,
      );
    }
  }

  private applyState(newState: S, source: 'default' | 'hydration'): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    if (this._state === newState) return;
    if (this._equalityFn(this._state, newState)) return;

    if (process.env.NODE_ENV !== 'production') {
      this._checkEmitRate();
    }

    const previousState = this._state;
    this._state = newState;

    if (
      this._listeners.size === 0 &&
      !this._hasStateChangeHandlers &&
      this._hydrationStatus !== 'hydrating'
    ) {
      if (this._registry.hasStateChangedListeners) {
        this._registry.notifyStateChanged(this, previousState, newState);
      }
      return;
    }

    if (this._hydrationStatus === 'hydrating' && source !== 'hydration') {
      this._changedWhileHydrating = true;
    }

    if (this._hasStateChangeHandlers) {
      const handlers = this._systemEventHandlers.get('stateChanged')!;
      const payload = { state: newState, previousState };
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[${this.name}] Error in system event handler:`, error);
        }
      }
    }

    if (this._listeners.size > 0) {
      let count = 0;
      const size = this._listeners.size;
      for (const listener of this._listeners) {
        if (++count > size) break;
        try {
          listener(newState);
        } catch (error) {
          console.error(`[${this.name}] Error in listener:`, error);
        }
      }
    }

    if (this._registry.hasStateChangedListeners) {
      this._registry.notifyStateChanged(this, previousState, newState);
    }
  }

  private setHydrationStatus(status: HydrationStatus, error?: Error): void {
    const previousStatus = this._hydrationStatus;
    this._hydrationStatus = status;
    this._hydrationError = error;

    this.emitSystemEvent('hydrationChanged', {
      status,
      previousStatus,
      error,
      changedWhileHydrating: this._changedWhileHydrating,
    });
  }

  private ensureHydrationPromise(): Promise<void> {
    if (!this._hydrationPromise || this._hydrationPromiseSettled) {
      this._hydrationPromiseSettled = false;
      this._hydrationPromise = new Promise<void>((resolve, reject) => {
        this._resolveHydrationPromise = () => {
          if (this._hydrationPromiseSettled) return;
          this._hydrationPromiseSettled = true;
          resolve();
        };
        this._rejectHydrationPromise = (error: Error) => {
          if (this._hydrationPromiseSettled) return;
          this._hydrationPromiseSettled = true;
          reject(error);
        };
      });
      this._hydrationPromise.catch(() => {});
    }

    return this._hydrationPromise;
  }

  private resolveHydration(): void {
    this._resolveHydrationPromise?.();
  }

  private rejectHydration(error: Error): void {
    void this.ensureHydrationPromise();
    this._rejectHydrationPromise?.(error);
  }

  protected onSystemEvent = <E extends SystemEvent>(
    event: E,
    handler: SystemEventHandler<S, E>,
  ): (() => void) => {
    let handlers = this._systemEventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._systemEventHandlers.set(event, handlers);
    }
    handlers.add(handler as SystemEventHandler<S, any>);

    if (event === 'stateChanged') {
      this._hasStateChangeHandlers = true;
    }

    return () => {
      handlers?.delete(handler as SystemEventHandler<S, any>);
      if (event === 'stateChanged' && handlers?.size === 0) {
        this._hasStateChangeHandlers = false;
      }
    };
  };

  private emitSystemEvent<E extends SystemEvent>(
    event: E,
    payload: SystemEventPayloads<S>[E],
  ): void {
    const handlers = this._systemEventHandlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[${this.name}] Error in system event handler:`, error);
      }
    }
  }
}

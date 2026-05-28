import {
  ALL_PATHS,
  StructuralContainer,
  type StructuralContainerOptions,
} from '@dirtytalk/structural';
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

/**
 * BlaC's lifecycle/identity/dependency layer on top of `StructuralContainer`.
 *
 * StructuralContainer provides:
 *   - `state` getter
 *   - `emit` / `patch` / `update` (path-tracked, microtask-flushed)
 *   - `channel` (the underlying `DirtyChannel`)
 *   - `registerConsumerPaths` / `unregisterConsumer` (for fine-grained consumers)
 *   - per-class `PathInterner`
 *
 * StateContainer layers on:
 *   - identity (`name`, `instanceId`, `createdAt`, `debug`)
 *   - lifecycle (`dispose`, `isDisposed`, `onSystemEvent`)
 *   - hydration (`beginHydration` / `applyHydratedState` / `finishHydration` / `failHydration` / `waitForHydration`)
 *   - cross-bloc deps (`depend()`, `dependencies` getter)
 *   - per-consumer deps slices (`APPLY_DEPS` / `REMOVE_DEPS_OWNER` / `onDepsChanged`)
 *   - registry integration (config-driven equality, emit-rate circuit breaker)
 *
 * Subscribers can attach via:
 *   - `subscribe(listener)` — legacy state listener (back-compat); fires on
 *     every flush with the latest state.
 *   - `onSystemEvent('stateChanged' | 'dispose' | 'hydrationChanged', cb)` —
 *     coarse lifecycle events.
 *   - `this.channel.subscribe(interest, cb)` — path-scoped (new code).
 */
export abstract class StateContainer<
  S extends object = any,
  Args = void,
  Deps extends object = Record<string, never>,
> extends StructuralContainer<S> {
  static __excludeFromDevTools = false;

  /** @internal phantom — the args type this bloc is constructed with (see init()) */
  declare readonly __args: Args;
  /** @internal phantom — the injected deps type */
  declare readonly __deps: Deps;

  // ---------------------------------------------------------------------------
  // Per-consumer deps slices (APPLY_DEPS / REMOVE_DEPS_OWNER)
  //
  // Kept until D0 ports `useBloc` off the adapter surface. See A2 audit:
  // `@blac/react/src/useBloc.ts` calls these via the `@blac/adapter`
  // re-export. EMIT is gone; APPLY_DEPS / REMOVE_DEPS_OWNER stay.
  // ---------------------------------------------------------------------------

  private _depsByOwner: Map<string, Partial<Deps>> | null = null;
  private _deps: Partial<Deps> = {};

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

    owners.set(ownerId, { ...slice });
    this.reconcileDeps();
  }

  /**
   * @internal Withdraw an owner's entire deps slice (consumer unmounted).
   */
  [REMOVE_DEPS_OWNER](ownerId: string): void {
    if (this._disposed) return;
    if (!this._depsByOwner?.delete(ownerId)) return;
    this.reconcileDeps();
  }

  private reconcileDeps(): void {
    const prev = this._deps;
    const next: Partial<Deps> = {};
    if (this._depsByOwner) {
      for (const slice of this._depsByOwner.values()) {
        Object.assign(next, slice);
      }
    }
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

  protected onDepsChanged(_next: Readonly<Deps>, _prev: Readonly<Deps>): void {}

  // ---------------------------------------------------------------------------
  // Identity / lifecycle
  // ---------------------------------------------------------------------------

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

  // Legacy listener-style subscribers (subscribe(listener)). Fires on every
  // channel flush with the latest state. Kept for back-compat with code that
  // hasn't migrated to `channel.subscribe(interest, cb)`.
  private readonly _listeners = new Set<StateListener<S>>();

  // System-event handlers (stateChanged | dispose | hydrationChanged).
  private readonly _systemEventHandlers = new Map<
    SystemEvent,
    Set<SystemEventHandler<S, any>>
  >();

  // Cross-bloc dependencies recorded by depend(). Map<DepCtor, instanceKey>.
  private _dependencies: Map<StateContainerConstructor, string> | null = null;

  // Pending state-change capture; set by emit(), drained by the channel-bridge
  // callback on flush. Coalesced: multiple emits in one tick collapse to one
  // (prev = the first prev, next = the latest next), matching Decision 7.
  private _pendingChange: { prev: S; next: S } | null = null;

  // Unsubscribe from the internal bridge that turns channel flushes into
  // legacy listener calls + 'stateChanged' system events.
  private _bridgeUnsub: (() => void) | null = null;

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

  /**
   * Declare a cross-bloc dependency. Returns a getter so callers write
   * `this.user()` lazily — the dep is resolved against the registry on each
   * call, which keeps the surface immune to dep-instance churn.
   *
   * Note: this does NOT auto-resubscribe to the dep's channel. Consumers that
   * need reactive updates from a dep should subscribe explicitly (typically
   * via the framework adapter / `useBloc`'s tracker). A naive auto-bridge
   * here would cycle on mutual deps; the channel's same-tick coalescing
   * limits the blast radius but a true mutual cycle is still a user bug.
   */
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

  constructor(initialState: S, options?: StructuralContainerOptions) {
    super(initialState, options);

    // Bridge channel flushes -> legacy listeners + 'stateChanged' system event.
    // Interest is ALL_PATHS so we wake on every flush. Coalesced via
    // `_pendingChange`: if no emit happened (e.g. a no-op patch), the bridge
    // sees null and skips.
    this._bridgeUnsub = this.channel.subscribe(
      () => ALL_PATHS,
      () => this._drainPending(),
    );
  }

  /**
   * Called once after construction with the args passed at acquire time, before the first
   * state snapshot is read by any consumer. Override to seed args-derived state (via
   * this.emit(...)) or kick off loads.
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

  // ---------------------------------------------------------------------------
  // Subscribe (legacy listener-style) — back-compat.
  //
  // Old surface: subscribe(listener: (state) => void). New code should use
  // `this.channel.subscribe(interest, cb)` directly. This override shadows
  // `StructuralContainer.subscribe`'s richer signature on purpose — only one
  // legacy consumer pattern exists (per A2 audit: tracking/, watch/, adapter).
  // ---------------------------------------------------------------------------

  subscribe(listener: StateListener<S>): () => void {
    if (this._disposed) {
      throw new Error(`Cannot subscribe to disposed container ${this.name}`);
    }
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle: dispose
  // ---------------------------------------------------------------------------

  dispose(): void {
    if (this._disposed) return;

    if (this.debug) {
      console.log(`[${this.name}] Disposing...`);
    }

    // Reconcile to an empty deps view so a final onDepsChanged(next, prev)
    // fires with all keys absent (undefined). After this, APPLY_DEPS /
    // REMOVE_DEPS_OWNER are guarded by _disposed.
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

    // Tear down the channel bridge so we don't leak a subscription.
    this._bridgeUnsub?.();
    this._bridgeUnsub = null;

    this._listeners.clear();
    this._systemEventHandlers.clear();
    this._pendingChange = null;

    this._registry.emit('disposed', this);

    if (this.debug) {
      console.log(`[${this.name}] Disposed successfully`);
    }
  }

  // ---------------------------------------------------------------------------
  // Mutation: emit / patch / update.
  //
  // We override `emit` to layer in:
  //   - disposed guard
  //   - equality-fn short-circuit (consults getBlacConfig().equality or the
  //     per-class override via @blac decorator)
  //   - emit-rate circuit breaker (dev-only)
  //   - `_changedWhileHydrating` flag tracking
  //   - registry-level stateChanged notification (microtask-deferred)
  //   - pending-change capture so the channel-bridge callback can fire the
  //     legacy listeners + 'stateChanged' system event with prev/next.
  //
  // The actual change-detection (path diff, channel mark, single-consumer
  // skip) is delegated to `super.emit`.
  // ---------------------------------------------------------------------------

  override emit(next: S): void {
    this.applyState(next, 'default');
  }

  /**
   * @internal @deprecated Symbol-keyed alias for `emit`. Kept only so legacy
   * in-package tests that index with `[EMIT]` typecheck/run unchanged. C5
   * removes this along with the `EMIT` symbol.
   */
  protected [EMIT](next: S): void {
    this.applyState(next, 'default');
  }

  private applyState(next: S, source: 'default' | 'hydration'): void {
    if (this._disposed) {
      throw new Error(`Cannot emit state from disposed container ${this.name}`);
    }

    const prev = this.state;
    if (prev === next) return;
    if (this._equalityFn(prev, next)) return;

    if (process.env.NODE_ENV !== 'production') {
      this._checkEmitRate();
    }

    if (this._hydrationStatus === 'hydrating' && source !== 'hydration') {
      this._changedWhileHydrating = true;
    }

    // Coalesce: keep the first prev seen this tick, take the latest next.
    if (this._pendingChange) {
      this._pendingChange.next = next;
    } else {
      this._pendingChange = { prev, next };
    }

    super.emit(next);

    if (this._registry.hasStateChangedListeners) {
      this._registry.notifyStateChanged(this, prev, next);
    }
  }

  /**
   * Called by the channel-bridge subscriber on each flush. Drains the
   * pending change (if any) into legacy listeners and the 'stateChanged'
   * system event. No pending change == flush from a no-op patch == skip.
   */
  private _drainPending(): void {
    const pending = this._pendingChange;
    if (!pending) return;
    this._pendingChange = null;

    if (this._listeners.size > 0) {
      const current = this.state;
      for (const listener of this._listeners) {
        try {
          listener(current);
        } catch (error) {
          console.error(`[${this.name}] Error in listener:`, error);
        }
      }
    }

    const handlers = this._systemEventHandlers.get('stateChanged');
    if (handlers && handlers.size > 0) {
      const payload = { state: pending.next, previousState: pending.prev };
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[${this.name}] Error in system event handler:`, error);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hydration
  // ---------------------------------------------------------------------------

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

  applyHydratedState(next: S): boolean {
    if (this._disposed) {
      return false;
    }

    if (this._hydrationStatus !== 'hydrating' || this._changedWhileHydrating) {
      return false;
    }

    this.applyState(next, 'hydration');
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

  // ---------------------------------------------------------------------------
  // System events
  // ---------------------------------------------------------------------------

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

    return () => {
      handlers?.delete(handler as SystemEventHandler<S, any>);
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

  // ---------------------------------------------------------------------------
  // Emit-rate circuit breaker (dev-only)
  // ---------------------------------------------------------------------------

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
}

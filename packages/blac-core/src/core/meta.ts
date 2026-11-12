/**
 * `$blac` meta namespace for `StateContainer`.
 *
 * `BlacMeta` and `BlacHydration` are classes whose accessors live on the
 * prototype and read the container through one `#private` back-reference, so
 * a container allocates a single small object here instead of a literal with
 * seven closures. Members are therefore not own-enumerable: `Object.keys` and
 * `JSON.stringify` see an empty object. Read the fields by name.
 */

import { IS_DEV } from '../constants';
import { generateSimpleId } from '../utils/idGenerator';
import { getBlacName } from '../utils/static-props';
import type { HydrationStatus } from './StateContainer';
import type { StateContainerConstructor } from '../types/utilities';
import type { StateContainerRegistry } from './StateContainerRegistry';

/**
 * Non-enumerable brand carried on every `$blac` object. Used by the clobber
 * guard in `StateContainer` to detect a subclass class-field shadowing the
 * base's own `$blac` property, and by the meta tests. Intentionally NOT
 * re-exported from the package barrel.
 */
export const META_BRAND = Symbol('blac.meta');

const EMPTY_DEPS: ReadonlyMap<StateContainerConstructor, string> = new Map();

/**
 * The parts of `StateContainer` the meta classes reach. Its fields are
 * TS-private, so they are not reachable cross-module by name; the constructors
 * cast once to these shapes.
 */
interface MetaInternals<S extends object> extends HydrationHost<S> {
  readonly constructor: StateContainerConstructor;
  _instanceId?: string;
  _debug: boolean;
  _createdAt: number;
  _registry: StateContainerRegistry;
  _dependencies: Map<StateContainerConstructor, string> | null;
  _hydration: BlacHydration<S> | null;
}

interface HydrationHost<S extends object> {
  _name: string;
  _disposed: boolean;
  _applyHydratedState(next: S): void;
  _notifyHydration(
    status: HydrationStatus,
    previousStatus: HydrationStatus,
    error: Error | undefined,
    changedWhileHydrating: boolean,
  ): void;
}

/**
 * The container's hydration state machine, under `$blac.hydration`. Owns its
 * state and is built on first access, so a container that never hydrates
 * pays for one `null` field.
 */
export class BlacHydration<S extends object> {
  readonly #c: HydrationHost<S>;
  #status: HydrationStatus = 'idle';
  #error: Error | undefined;
  #changed = false;
  #promise: Promise<void> | null = null;
  #settle: { resolve: () => void; reject: (error: Error) => void } | null =
    null;

  /** @internal */
  constructor(container: object) {
    this.#c = container as HydrationHost<S>;
    Object.freeze(this);
  }

  get status(): HydrationStatus {
    return this.#status;
  }

  get error(): Error | undefined {
    return this.#error;
  }

  get isHydrated(): boolean {
    return this.#status === 'hydrated';
  }

  get changedWhileHydrating(): boolean {
    return this.#changed;
  }

  begin(): void {
    if (this.#c._disposed) {
      throw new Error(
        `Cannot begin hydration for disposed container ${this.#c._name}`,
      );
    }
    this.#changed = false;
    this.#promise = null;
    this.#settle = null;
    void this.#pending();
    this.#setStatus('hydrating');
  }

  /** @returns false when the persisted state was not applied. */
  apply(next: S): boolean {
    if (this.#c._disposed) return false;
    if (this.#status !== 'hydrating' || this.#changed) {
      if (IS_DEV && this.#changed) {
        console.warn(
          `[blac] ${this.#c._name}: persisted state discarded because the ` +
            `container emitted while hydrating.`,
        );
      }
      return false;
    }
    this.#c._applyHydratedState(next);
    return true;
  }

  finish(): void {
    if (this.#status === 'hydrated') return;
    if (this.#status === 'error') void this.#pending();
    this.#setStatus('hydrated');
    this.#settle?.resolve();
    this.#settle = null;
  }

  fail(error: Error): void {
    const err =
      error instanceof Error
        ? error
        : new Error(`Hydration failed: ${String(error)}`);
    this.#setStatus('error', err);
    void this.#pending();
    this.#settle?.reject(err);
    this.#settle = null;
  }

  wait(): Promise<void> {
    if (this.#status === 'idle' || this.#status === 'hydrated') {
      return Promise.resolve();
    }
    if (this.#status === 'error') {
      return Promise.reject(
        this.#error ??
          new Error(`Hydration failed for container ${this.#c._name}`),
      );
    }
    return this.#pending();
  }

  /** @internal A non-hydration state change; discards a pending `apply`. */
  noteChange(): void {
    if (this.#status === 'hydrating') this.#changed = true;
  }

  #setStatus(status: HydrationStatus, error?: Error): void {
    const previousStatus = this.#status;
    this.#status = status;
    this.#error = error;
    this.#c._notifyHydration(status, previousStatus, error, this.#changed);
  }

  /** The unsettled promise for the current run, created on demand. */
  #pending(): Promise<void> {
    if (this.#promise === null || this.#settle === null) {
      this.#promise = new Promise<void>((resolve, reject) => {
        this.#settle = { resolve, reject };
      });
      this.#promise.catch(() => {});
    }
    return this.#promise;
  }
}

/**
 * The reserved `$blac` instance member on every `StateContainer`. Gathers the
 * container's identity/lifecycle/hydration surface (`name`, `id`, `debug`,
 * `createdAt`, `disposed`, `dependencies`, and the hydration methods) under one
 * namespace, keeping the generic names free for userland blocs.
 *
 * Allocated once per container and frozen. Every accessor reads the
 * container's current `_`-private fields live — values are never snapshotted.
 */
export class BlacMeta<S extends object = any> {
  readonly #c: MetaInternals<S>;

  /** @internal Called from the `StateContainer` field initializer. */
  constructor(container: object) {
    this.#c = container as unknown as MetaInternals<S>;
    Object.freeze(this);
  }

  get name(): string {
    return this.#c._name;
  }

  get id(): string {
    // Unconfigured containers (a bare `new`) get their id on first read.
    const c = this.#c;
    return (c._instanceId ??= generateSimpleId(
      getBlacName(c.constructor),
      'main',
    ));
  }

  get debug(): boolean {
    return this.#c._debug;
  }

  get createdAt(): number {
    return this.#c._createdAt;
  }

  get disposed(): boolean {
    return this.#c._disposed;
  }

  /** The registry that owns this container (the global one for a bare `new`). */
  get registry(): StateContainerRegistry {
    return this.#c._registry;
  }

  get dependencies(): ReadonlyMap<StateContainerConstructor, string> {
    return this.#c._dependencies ?? EMPTY_DEPS;
  }

  /** Built on first access; identity-stable afterwards. */
  get hydration(): BlacHydration<S> {
    return (this.#c._hydration ??= new BlacHydration(this.#c));
  }
}

Object.defineProperty(BlacMeta.prototype, META_BRAND, {
  value: true,
  enumerable: false,
  writable: false,
  configurable: false,
});

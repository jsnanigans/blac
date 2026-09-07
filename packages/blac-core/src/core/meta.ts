/**
 * `$blac` meta namespace for `StateContainer`.
 *
 * `BlacMeta` and `BlacHydration` are classes whose accessors live on the
 * prototype and read the container through one `#private` back-reference, so
 * a container allocates a single small object here instead of a literal with
 * seven closures. Members are therefore not own-enumerable: `Object.keys` and
 * `JSON.stringify` see an empty object. Read the fields by name.
 */

import { generateSimpleId } from '../utils/idGenerator';
import { getBlacName } from '../utils/static-props';
import type { HydrationStatus } from './StateContainer';
import type { StateContainerConstructor } from '../types/utilities';

/**
 * Non-enumerable brand carried on every `$blac` object. Used by the clobber
 * guard in `StateContainer` to detect a subclass class-field shadowing the
 * base's own `$blac` property, and by the meta tests. Intentionally NOT
 * re-exported from the package barrel.
 */
export const META_BRAND = Symbol('blac.meta');

const EMPTY_DEPS: ReadonlyMap<StateContainerConstructor, string> = new Map();

/**
 * Narrow view of the parts of `StateContainer` the meta accessors read. The
 * container's fields are TS-private (compile-time only), so they are not
 * reachable cross-module by name; the constructor performs a single internal
 * cast to this shape. This is purely a typing bridge — zero runtime indirection.
 *
 * The `$blac.hydration` surface delegates to these `_`-private methods, so the
 * container has a single source of truth for the hydration state machine.
 */
interface MetaInternals<S extends object> {
  readonly constructor: StateContainerConstructor;
  _name: string;
  _instanceId?: string;
  _debug: boolean;
  _createdAt: number;
  _disposed: boolean;
  _hydrationStatus: HydrationStatus;
  _hydrationError: Error | undefined;
  _changedWhileHydrating: boolean;
  _dependencies: Map<StateContainerConstructor, string> | null;
  _beginHydration(): void;
  _applyHydratedState(next: S): boolean;
  _finishHydration(): void;
  _failHydration(error: Error): void;
  _waitForHydration(): Promise<void>;
}

/**
 * Hydration sub-surface of {@link BlacMeta}. Exposes the container's
 * hydration state machine — the `begin`/`apply`/`finish`/`fail`/`wait`
 * methods and the `status`/`error`/`isHydrated`/`changedWhileHydrating`
 * getters — namespaced under `$blac`.
 */
export class BlacHydration<S extends object> {
  readonly #c: MetaInternals<S>;

  /** @internal */
  constructor(container: object) {
    this.#c = container as MetaInternals<S>;
    Object.freeze(this);
  }

  get status(): HydrationStatus {
    return this.#c._hydrationStatus;
  }

  get error(): Error | undefined {
    return this.#c._hydrationError;
  }

  get isHydrated(): boolean {
    return this.#c._hydrationStatus === 'hydrated';
  }

  get changedWhileHydrating(): boolean {
    return this.#c._changedWhileHydrating;
  }

  begin(): void {
    this.#c._beginHydration();
  }

  apply(next: S): boolean {
    return this.#c._applyHydratedState(next);
  }

  finish(): void {
    this.#c._finishHydration();
  }

  fail(error: Error): void {
    this.#c._failHydration(error);
  }

  wait(): Promise<void> {
    return this.#c._waitForHydration();
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
  #hydration: BlacHydration<S> | undefined;

  /** @internal Called from the `StateContainer` field initializer. */
  constructor(container: object) {
    this.#c = container as unknown as MetaInternals<S>;
    Object.freeze(this);
  }

  get name(): string {
    return this.#c._name;
  }

  get id(): string {
    // Generated on first read — the container leaves it undefined so an
    // instance nobody registers or inspects never pays for one.
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

  get dependencies(): ReadonlyMap<StateContainerConstructor, string> {
    return this.#c._dependencies ?? EMPTY_DEPS;
  }

  /** Built on first access; identity-stable afterwards. */
  get hydration(): BlacHydration<S> {
    return (this.#hydration ??= new BlacHydration(this.#c));
  }
}

Object.defineProperty(BlacMeta.prototype, META_BRAND, {
  value: true,
  enumerable: false,
  writable: false,
  configurable: false,
});

/**
 * `$blac` meta namespace for `StateContainer`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONSTRAINT — NO ES `#private` FIELDS, ANYWHERE IN THIS FILE.
 *
 * `@blac/react`'s `buildTrackedProxy` invokes prototype getters with a
 * `Proxy(instance)` as the `this`-receiver. Accessing an ES `#private` field
 * through a proxy receiver throws (`#x` brand checks fail on the proxy). The
 * whole point of this meta object is to be proxy-safe: every getter/method
 * here closes over the *real* container instance captured at `createMeta`
 * time, NEVER over a `this`-receiver. Do not "modernize" the `_`-prefixed
 * TS-private reads below into `#private` access.
 * ──────────────────────────────────────────────────────────────────────────
 */

import type { HydrationStatus } from './StateContainer';
import type { StateContainerConstructor } from '../types/utilities';

/**
 * Hydration sub-surface of {@link BlacMeta}. Mirrors the legacy
 * `beginHydration`/`applyHydratedState`/`finishHydration`/`failHydration`/
 * `waitForHydration` methods and the `hydrationStatus`/`hydrationError`/
 * `isHydrated`/`changedWhileHydrating` getters, namespaced under `$blac`.
 */
export interface BlacHydration<S extends object> {
  readonly status: HydrationStatus;
  readonly error: Error | undefined;
  readonly isHydrated: boolean;
  readonly changedWhileHydrating: boolean;
  begin(): void;
  /** Was `applyHydratedState`. */
  apply(next: S): boolean;
  finish(): void;
  fail(error: Error): void;
  /** Was `waitForHydration`. */
  wait(): Promise<void>;
}

/**
 * The reserved `$blac` instance member on every `StateContainer`. Collapses
 * the previously-scattered identity/lifecycle/hydration surface
 * (`name`, `instanceId`, `debug`, `createdAt`, `isDisposed`, `dependencies`,
 * and the hydration methods) under one namespace, freeing the generic names
 * for userland blocs.
 *
 * The object is allocated once per container, frozen, branded, and exposes
 * live getters that read the container's current `_`-private fields — values
 * are never snapshotted.
 */
export interface BlacMeta<S extends object = any> {
  readonly name: string;
  /** Was `instanceId`. */
  readonly id: string;
  readonly debug: boolean;
  readonly createdAt: number;
  /** Was `isDisposed`. */
  readonly disposed: boolean;
  readonly dependencies: ReadonlyMap<StateContainerConstructor, string>;
  readonly hydration: BlacHydration<S>;
}

/**
 * Non-enumerable brand carried on every `$blac` object produced by
 * {@link createMeta}. Used by the clobber guard in `StateContainer` to detect
 * a subclass class-field shadowing the base's own `$blac` property, and by the
 * meta tests. Intentionally NOT re-exported from the package barrel.
 */
export const META_BRAND = Symbol('blac.meta');

const EMPTY_DEPS: ReadonlyMap<StateContainerConstructor, string> = new Map();

/**
 * Narrow view of the parts of `StateContainer` the meta getters read. The
 * container's fields are TS-private (compile-time only), so they are not
 * reachable cross-module by name; `createMeta` performs a single internal cast
 * to this shape. This is purely a typing bridge — zero runtime indirection.
 *
 * Hydration methods are referenced by their legacy names: the `$blac.hydration`
 * surface delegates to the exact same implementations, so there is one source
 * of truth for the hydration state machine.
 */
interface MetaInternals<S extends object> {
  _name: string;
  _instanceId: string;
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
 * Build the frozen, branded `$blac` meta object for a container.
 *
 * Called from a `StateContainer` field initializer (`$blac = createMeta(this)`).
 * Only the back-reference is captured at this point; every getter/method reads
 * the container's `_`-private fields lazily on access, so field-initializer
 * ordering relative to those private fields is irrelevant.
 *
 * The getters close over `container` (the real instance), never over a
 * `this`-receiver — this is what keeps `$blac` reads safe through
 * `buildTrackedProxy`.
 */
export function createMeta<S extends object>(container: object): BlacMeta<S> {
  const c = container as unknown as MetaInternals<S>;

  const hydration: BlacHydration<S> = Object.freeze({
    get status() {
      return c._hydrationStatus;
    },
    get error() {
      return c._hydrationError;
    },
    get isHydrated() {
      return c._hydrationStatus === 'hydrated';
    },
    get changedWhileHydrating() {
      return c._changedWhileHydrating;
    },
    begin() {
      c._beginHydration();
    },
    apply(next: S) {
      return c._applyHydratedState(next);
    },
    finish() {
      c._finishHydration();
    },
    fail(error: Error) {
      c._failHydration(error);
    },
    wait() {
      return c._waitForHydration();
    },
  });

  const meta: BlacMeta<S> = {
    get name() {
      return c._name;
    },
    get id() {
      return c._instanceId;
    },
    get debug() {
      return c._debug;
    },
    get createdAt() {
      return c._createdAt;
    },
    get disposed() {
      return c._disposed;
    },
    get dependencies() {
      return c._dependencies ?? EMPTY_DEPS;
    },
    hydration,
  };

  Object.defineProperty(meta, META_BRAND, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  return Object.freeze(meta);
}

import { DEP_BRAND, WITH_TRACKED_STATE } from '@blac/core';

interface TrackedStateTarget {
  [WITH_TRACKED_STATE]<R>(
    tracked: unknown,
    fn: () => R,
    onDepHandle?: (handle: object) => unknown,
  ): R;
}

function supportsTrackedState(value: object): value is TrackedStateTarget {
  return (
    typeof (value as TrackedStateTarget)[WITH_TRACKED_STATE] === 'function'
  );
}

type Getter = (this: object) => unknown;

// Prototype getters per class prototype. The chain is static, so walking it
// once per class (not once per mounted component) keeps the get trap O(1).
const gettersByProto = new WeakMap<object, Map<string | symbol, Getter>>();

function collectGetters(proto: object): Map<string | symbol, Getter> {
  const cached = gettersByProto.get(proto);
  if (cached !== undefined) return cached;
  const getters = new Map<string | symbol, Getter>();
  let p: object | null = proto;
  while (p !== null && p !== Object.prototype) {
    for (const key of Reflect.ownKeys(p)) {
      const desc = Object.getOwnPropertyDescriptor(p, key);
      // A descriptor getter, always `.call`ed with an explicit receiver.
      // oxlint-disable-next-line typescript/unbound-method
      if (desc?.get && !getters.has(key)) getters.set(key, desc.get);
    }
    p = Object.getPrototypeOf(p);
  }
  gettersByProto.set(proto, getters);
  return getters;
}

/**
 * Build a per-consumer proxy for a bloc instance.
 *
 * Getters run with `this` bound to the **real instance**, not a proxy, so ES
 * `#private` fields and methods work in user blocs. Path recording is done by
 * `[WITH_TRACKED_STATE]`, which makes the instance's own `state` getter report
 * the render's tracking proxy for the duration of the call; nested getter
 * chains stay tracked because the override is still set.
 *
 * One allocation per bloc acquisition (inside `useMemo`), so the proxy is
 * stable across renders.
 *
 * @param onDepHandle - Optional callback invoked when a read returns a branded
 *   dep handle. Receives the original handle and returns the value to expose in
 *   its place (the session-bound wrapper). The callback is responsible for
 *   caching wrappers per handle to avoid re-allocation.
 */
export function buildTrackedProxy<T extends object>(
  instance: T,
  trackedStateRef: { current: unknown },
  onDepHandle?: (handle: object) => unknown,
): { proxy: T } {
  // Both string- and symbol-keyed prototype getters (excluding
  // Object.prototype). Arrow-function class properties are own values, not
  // getters, and pass through unmodified.
  const getters = collectGetters(Object.getPrototypeOf(instance) as object);
  const tracksState = supportsTrackedState(instance as object);

  // Bound methods are cached so `bloc.method` keeps a stable identity across
  // reads — an unstable one would defeat memoisation in consumers.
  const boundMethods = new Map<string | symbol, unknown>();

  const wrapDepHandle = (value: unknown): unknown => {
    if (
      onDepHandle !== undefined &&
      (typeof value === 'function' || typeof value === 'object') &&
      value !== null &&
      (value as Record<symbol, unknown>)[DEP_BRAND] !== undefined
    ) {
      return onDepHandle(value as object);
    }
    return value;
  };

  const proxy = new Proxy(instance as object, {
    get(target, key) {
      const getter = getters.get(key);
      if (getter !== undefined) {
        const tracked = trackedStateRef.current;
        // `[WITH_TRACKED_STATE]` invokes the getter with `this` = the real
        // instance, so no per-read thunk is needed.
        return wrapDepHandle(
          tracked == null || !tracksState
            ? getter.call(target)
            : (target as TrackedStateTarget)[WITH_TRACKED_STATE](
                tracked,
                getter,
                onDepHandle,
              ),
        );
      }

      // Receiver is the real instance, so own fields keep their `#private`
      // brand. Methods are bound to it too, otherwise `bloc.method()` would
      // call with `this` = proxy and fail the same brand check.
      const value = Reflect.get(target, key, target);
      if (typeof value === 'function') {
        let bound = boundMethods.get(key);
        if (bound === undefined) {
          bound = (value as (...a: unknown[]) => unknown).bind(target);
          boundMethods.set(key, bound);
        }
        return wrapDepHandle(bound);
      }
      return wrapDepHandle(value);
    },
  }) as T;

  return { proxy };
}

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
  // Getter descriptors from the prototype chain (excluding Object.prototype),
  // collected once per acquisition so the get trap stays O(1) per access. Both
  // string- and symbol-keyed getters are collected. Arrow-function class
  // properties are own values, not getters, and pass through unmodified.
  const getterDescs = new Map<string | symbol, PropertyDescriptor>();
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const keys: (string | symbol)[] = [
      ...Object.getOwnPropertyNames(proto),
      ...Object.getOwnPropertySymbols(proto),
    ];
    for (const key of keys) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc?.get && !getterDescs.has(key)) getterDescs.set(key, desc);
    }
    proto = Object.getPrototypeOf(proto);
  }

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
      const desc = getterDescs.get(key);
      // Not an unbound method — a descriptor getter, always `.call`ed below
      // with an explicit receiver.
      // oxlint-disable-next-line typescript/unbound-method
      const getter = desc?.get;
      if (getter) {
        const tracked = trackedStateRef.current;
        const read = () => getter.call(target);
        return wrapDepHandle(
          tracked == null || !supportsTrackedState(target)
            ? read()
            : target[WITH_TRACKED_STATE](tracked, read, onDepHandle),
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

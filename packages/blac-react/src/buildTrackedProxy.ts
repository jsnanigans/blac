/**
 * Build a per-consumer proxy pair for a bloc instance.
 *
 * Returns two proxies:
 * - `proxy` — the stable outer proxy returned to the consumer. Getter
 *   properties are invoked with `thisProxy` as `this` so that `this.state`
 *   reads inside getters are redirected to the current render's tracking
 *   proxy. Non-getter properties fall through to the live instance.
 * - `thisProxy` — the inner `this`-proxy used as the receiver for getter
 *   calls. Intercepts `state` to return `trackedStateRef.current` when a
 *   tracking context is active; otherwise falls through to the live value.
 *   Exposed for Task 03 which needs to intercept dep handles on `thisProxy`.
 *
 * Both allocations happen exactly once per bloc acquisition (inside `useMemo`)
 * so the proxies are stable across renders.
 */
export function buildTrackedProxy<T extends object>(
  instance: T,
  trackedStateRef: { current: unknown },
): { proxy: T; thisProxy: T } {
  // Build a map of getter descriptors from the prototype chain (excluding
  // Object.prototype). This is computed once per bloc acquisition so that
  // the proxy's get trap is O(1) per property access. Both string- and
  // symbol-keyed getters are collected. Arrow-function class properties
  // (own, bound in the constructor) are not getters and pass through
  // unmodified.
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

  // `this`-proxy for getter invocations, allocated ONCE per acquisition (the
  // trap closes over the stable `trackedStateRef`, so it never needs to be
  // rebuilt per access). Redirects `this.state` to the current render's
  // tracking proxy so getter reads during JSX record paths; outside render
  // `trackedStateRef.current` is null and it falls through to live state.
  // The receiver `r` (this proxy) is threaded through Reflect.get so chained
  // getter calls (getters reading other getters) stay in tracked context.
  const thisProxy = new Proxy(instance as object, {
    get(t, k, r) {
      if (k === 'state') return trackedStateRef.current ?? Reflect.get(t, k, r);
      return Reflect.get(t, k, r);
    },
  });

  // Stable proxy: one allocation per bloc acquisition. Non-getter access is
  // a single Map lookup + Reflect.get — no prototype walk on the hot path.
  const proxy = new Proxy(instance as object, {
    get(target, key, receiver) {
      const desc = getterDescs.get(key);
      if (desc?.get) return desc.get.call(thisProxy);
      return Reflect.get(target, key, receiver);
    },
  }) as T;

  return { proxy, thisProxy: thisProxy as T };
}

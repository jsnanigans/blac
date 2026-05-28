import type { PathId } from './types';
import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

export interface TrackResult<S> {
  value: S;
  paths: PathSet;
}

const childPath = (parent: string, key: string): string =>
  parent === '' ? key : `${parent}.${key}`;

const isWrappable = (v: unknown): v is object =>
  v !== null && typeof v === 'object';

/**
 * Wrap `state` in a recording `Proxy` and return the proxy plus a fresh
 * `Set<PathId>` that grows as the consumer reads properties.
 *
 * Recording rules:
 * - Only own, non-symbol property reads on the `get` trap record paths.
 * - Each intermediate read records its own path: reading `a.b.c` records
 *   `a`, `a.b`, and `a.b.c` (a change at any ancestor must wake the
 *   consumer).
 * - Primitives, `null`, and `undefined` short-circuit and are returned as-is.
 * - Nested objects/arrays return a child proxy that records into the same
 *   `paths` set. Proxies are cached per-target via a per-call `WeakMap`, so
 *   `value.user === value.user` within one render.
 * - Iteration coarsens: `for..of`, `.map`, `.find`, `.reduce`, etc. record
 *   the entry path (e.g. `users`) but **not** per-index paths. Callbacks
 *   receive the raw underlying values.
 * - Methods (own functions on non-array objects) are bound to the parent
 *   proxy so internal `this.x` reads continue to record.
 * - Reading a method without invoking it does not record (methods live on
 *   the prototype, not on the object itself).
 *
 * The returned `paths` is always a `Set<PathId>` — never the `ALL_PATHS`
 * sentinel (that sentinel is for source-side signalling).
 */
export const trackRender = <S>(
  state: S,
  interner: PathInterner,
): TrackResult<S> => {
  const paths = new Set<PathId>();

  if (!isWrappable(state)) {
    return { value: state, paths };
  }

  // Per-call cache. Dies with this function frame so each render gets fresh
  // recordings; do not promote to module scope.
  const proxyByTarget = new WeakMap<object, unknown>();

  const wrap = (target: object, prefix: string): unknown => {
    const cached = proxyByTarget.get(target);
    if (cached !== undefined) return cached;

    const isArray = Array.isArray(target);

    const handler: ProxyHandler<object> = {
      get(t, key, receiver) {
        // Symbol keys (Symbol.iterator, Symbol.toStringTag, ...) never
        // record. On arrays we additionally bind any function value to the
        // raw target so iteration coarsens — the iterator's internal reads
        // bypass this proxy (spec § Caveats: iteration entry point only).
        if (typeof key === 'symbol') {
          const sv = Reflect.get(t, key, receiver);
          if (isArray && typeof sv === 'function') {
            return (sv as (...a: unknown[]) => unknown).bind(t);
          }
          return sv;
        }

        const value = Reflect.get(t, key, receiver);

        // Inherited / prototype properties: do not record. For arrays we
        // bind prototype methods (.map, .find, .reduce, ...) to the raw
        // target so per-index reads they perform bypass this proxy. The
        // entry path was already recorded when the array itself was read
        // from its parent, satisfying the coarsening contract.
        if (!Object.prototype.hasOwnProperty.call(t, key)) {
          if (isArray && typeof value === 'function') {
            return (value as (...a: unknown[]) => unknown).bind(t);
          }
          return value;
        }

        // Own property — record the path.
        const path = childPath(prefix, key as string);
        paths.add(interner.intern(path));

        if (!isWrappable(value)) {
          // Primitive, null, undefined: return as-is.
          return value;
        }

        if (typeof value === 'function') {
          // Own function on a non-array object: bind to the proxy so
          // internal `this.x` reads keep recording. (Arrays don't reach
          // here for prototype methods — those are inherited and handled
          // above; own functions on arrays are unusual but pass through
          // unbound to avoid breaking native iteration receivers.)
          if (!isArray) {
            return (value as (...a: unknown[]) => unknown).bind(
              wrap(t, prefix),
            );
          }
          return value;
        }

        return wrap(value as object, path);
      },
    };

    const proxy = new Proxy(target, handler);
    proxyByTarget.set(target, proxy);
    return proxy;
  };

  return { value: wrap(state as object, '') as S, paths };
};

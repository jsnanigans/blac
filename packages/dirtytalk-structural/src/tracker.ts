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
 * True when `v` should be recursively proxy-wrapped: plain object literals
 * (or `Object.create(null)`) and arrays. Everything else — `Map`, `Set`,
 * `Date`, class instances — is a leaf: wrapping it would rebind its methods'
 * `this` to the proxy and break receiver-checked built-ins (e.g.
 * `Map.prototype.get` throws "called on incompatible receiver"). This mirrors
 * the patch-leaf semantics in `diff.ts` (`isPlainPatchObject`), so a change to
 * such a value is detected as a reference change at its own path.
 */
const isStructurallyWrappable = (v: object): boolean => {
  if (Array.isArray(v)) return true;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Wrap `state` in a recording `Proxy` and return the proxy plus a fresh
 * `Set<PathId>` that grows as the consumer reads properties.
 *
 * Recording rules:
 * - Only own, non-symbol property reads on the `get` trap record paths.
 * - Leaf-only (maximal) recording: reading `a.b.c` records just `a.b.c`. As
 *   each deeper read happens, its immediate parent path is dropped, so the
 *   recorded set holds only the deepest paths actually read. This is what
 *   gives sibling-leaf isolation: a consumer that reads `user.name` does NOT
 *   wake when an immutable update replaces the `user` object because a
 *   sibling (`user.address`) changed — its only observed path, `user.name`,
 *   still resolves to the same value. A consumer that reads the whole `user`
 *   object (no deeper key) keeps `user` as its leaf and wakes on any change.
 * - Primitives, `null`, and `undefined` short-circuit and are returned as-is.
 * - Nested objects/arrays return a child proxy that records into the same
 *   `paths` set. Proxies are cached per-target via a per-call `WeakMap`, so
 *   `value.user === value.user` within one render.
 * - Iteration coarsens: `for..of`, `.map`, `.find`, `.reduce`, etc. record
 *   the entry path (e.g. `users`) but **not** per-index paths. Callbacks
 *   receive the raw underlying values. This entry path is also *pinned*: a
 *   later own-property read on the same array (notably `.length`) cannot
 *   supersede it. Otherwise a consumer that both reads `users.length` and
 *   iterates `users` would track only `users.length` and miss element-content
 *   changes that preserve the array length.
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
  // Path ids that array iteration has asserted as *content* dependencies (the
  // array's own entry path). Unlike a plain object — where reading `user.name`
  // legitimately narrows interest away from `user` — iterating or calling a
  // method on an array means the consumer depends on element contents, so a
  // later own-property read such as `.length` must NOT supersede it. Pinning is
  // order-independent: whichever of (`.length` read, iteration) happens last,
  // the array path survives.
  const pinned = new Set<PathId>();

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

    // Pin this array's own entry path as a content dependency. Called when an
    // iteration entry point (Symbol.iterator) or any array method is accessed.
    const pinArrayPath = (): void => {
      if (prefix === '') return;
      const id = interner.intern(prefix);
      paths.add(id);
      pinned.add(id);
    };

    const handler: ProxyHandler<object> = {
      get(t, key, receiver) {
        // Symbol keys (Symbol.iterator, Symbol.toStringTag, ...) never
        // record. On arrays we additionally bind any function value to the
        // raw target so iteration coarsens — the iterator's internal reads
        // bypass this proxy (spec § Caveats: iteration entry point only).
        if (typeof key === 'symbol') {
          const sv = Reflect.get(t, key, receiver);
          if (isArray && typeof sv === 'function') {
            // Iteration entry point (Symbol.iterator → for..of / spread). The
            // consumer depends on element contents, so pin the array's path.
            pinArrayPath();
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
            // Array method (.map, .find, .reduce, .includes, …). Using one
            // means the consumer depends on element contents, so pin the
            // array's path — a later `.length` read must not drop it.
            pinArrayPath();
            return (value as (...a: unknown[]) => unknown).bind(t);
          }
          return value;
        }

        // Own property — record the path. Then drop the immediate parent:
        // this deeper read supersedes it, leaving only maximal (leaf) paths.
        // Reference changes to an ancestor object therefore can't falsely wake
        // a consumer that only read a specific leaf beneath it.
        const path = childPath(prefix, key as string);
        paths.add(interner.intern(path));
        if (prefix !== '') {
          const parentId = interner.intern(prefix);
          // Keep an iteration-pinned array path: `.length` (or any own read)
          // must not narrow away a content dependency the consumer also has.
          if (!pinned.has(parentId)) paths.delete(parentId);
        }

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

        // Only recurse into plain objects/arrays. Maps, Sets, Dates, and class
        // instances are leaves: returning the raw value avoids rebinding their
        // methods' `this` to the proxy (which breaks receiver-checked built-ins
        // like `Map.prototype.get`). The path was already recorded above, so a
        // reference change to the value still wakes the consumer.
        if (!isStructurallyWrappable(value as object)) {
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

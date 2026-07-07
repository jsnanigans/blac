import type { PathId } from './types';
import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

/**
 * When true, array iteration methods (.map, .filter, .forEach, .find,
 * .reduce, Symbol.iterator, etc.) bind to the recording proxy rather than the
 * raw array. Callbacks receive per-index sub-proxies, so `items.map(i =>
 * i.title)` records `items.length`, `items.0.title`, `items.1.title`, …
 * instead of just `items`. Re-renders are isolated to the specific items and
 * fields that actually changed.
 *
 * Set to false to revert to coarse tracking: every array iteration records
 * only the array's own entry path (e.g. `items`), waking all consumers of
 * that array on any element change regardless of which field changed.
 */
const TRACK_ARRAY_ITERATION = true;

export interface TrackResult<S> {
  value: S;
  paths: PathSet;
}

// Registry of every recording proxy → its raw target, populated by `wrap` on
// each `trackRender` call. Keyed weakly by the proxy, so entries vanish once a
// render's proxies are collected. Backs the exported `raw()` escape hatch.
const proxyToTarget = new WeakMap<object, object>();

/**
 * Unwrap a recording proxy to its underlying raw target. Returns `v` unchanged
 * when it is not a tracked proxy (including primitives, `null`, `undefined`).
 * Use this to defuse the identity/escaped-proxy hazards documented on
 * {@link trackRender}.
 */
export const raw = <T>(v: T): T => {
  if (v !== null && typeof v === 'object') {
    const target = proxyToTarget.get(v as object);
    if (target !== undefined) return target as T;
  }
  return v;
};

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
 *   `paths` set. Proxies are cached per (target, prefix) via a per-call
 *   `WeakMap<object, Map<prefix, proxy>>`, so `value.user === value.user`
 *   within one render, while the same object reached via two different paths
 *   gets two distinct proxies that each record their own prefix.
 * - Iteration (when {@link TRACK_ARRAY_ITERATION} is true, the default): array
 *   methods and `for..of` / spread bind to the proxy, so the method's internal
 *   index reads (`this.length`, `this[0]`, …) go through the `get` trap.
 *   Callbacks receive per-index sub-proxies, so `items.map(i => i.title)`
 *   records `items.length`, `items.0.title`, `items.1.title`, … — precise
 *   leaf paths that isolate re-renders to the specific items and fields that
 *   changed. When the flag is false the old coarsening applies: every
 *   iteration records only the array's own entry path (e.g. `items`).
 * - Methods (own functions on non-array objects) are bound to the parent
 *   proxy so internal `this.x` reads continue to record.
 * - Reading a method without invoking it does not record (methods live on
 *   the prototype, not on the object itself).
 *
 * The returned `paths` is always a `Set<PathId>` — never the `ALL_PATHS`
 * sentinel (that sentinel is for source-side signalling).
 *
 * Hazards (use {@link raw} to unwrap when either bites):
 * 1. Identity `===` callbacks: values read off the proxy are themselves
 *    recording proxies, so comparing a wrapped value against a raw object with
 *    `===` (or passing it to an identity-search that does) fails. Unwrap with
 *    `raw(value)` before comparing to a raw reference.
 * 2. Derived-array / escaped-proxy: a proxy (or a sub-proxy inside a derived
 *    array such as a `.filter` result) that escapes the render frame keeps
 *    recording into a stale `paths` set and breaks reference identity against
 *    the underlying state. Call `raw()` on anything stored or handed to code
 *    that expects the raw object.
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

  // Per-call cache keyed by (target, prefix): target -> prefix -> proxy. Dies
  // with this function frame so each render gets fresh recordings; do not
  // promote to module scope. Keying by prefix (not target alone) means the
  // same object reached via two distinct paths gets two proxies, each
  // recording its own prefix, while a repeat read at the same path is
  // ===-identical.
  const proxyByTarget = new WeakMap<object, Map<string, unknown>>();

  const wrap = (target: object, prefix: string): unknown => {
    let byPrefix = proxyByTarget.get(target);
    if (byPrefix === undefined) {
      byPrefix = new Map<string, unknown>();
      proxyByTarget.set(target, byPrefix);
    }
    const cached = byPrefix.get(prefix);
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
            if (TRACK_ARRAY_ITERATION) {
              // Bind to the proxy so the iterator's internal index reads
              // (e.g. this[0], this.length) go through the get trap and
              // record per-index paths.
              return (sv as (...a: unknown[]) => unknown).bind(wrap(t, prefix));
            }
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
            // Identity-search methods compare a raw argument against elements
            // with `===` / SameValueZero. Binding to the recording proxy would
            // hand them wrapped sub-proxies, so `arr.includes(rawItem)` would
            // never match for object arrays. Bind these to the raw target so
            // the comparison is correct, and coarsen: pin the array's entry
            // path so element-content changes still wake the consumer.
            if (
              key === 'includes' ||
              key === 'indexOf' ||
              key === 'lastIndexOf'
            ) {
              pinArrayPath();
              return (value as (...a: unknown[]) => unknown).bind(t);
            }
            if (TRACK_ARRAY_ITERATION) {
              // Bind to the proxy so the method's internal reads (this.length,
              // this[0], this[1], …) go through the get trap. Callbacks
              // receive sub-proxies and their property accesses record precise
              // leaf paths (e.g. items.0.title) instead of the coarse entry.
              return (value as (...a: unknown[]) => unknown).bind(
                wrap(t, prefix),
              );
            }
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

        // Non-configurable, non-writable own data property (e.g. a field of an
        // Object.freeze'd state). The Proxy [[Get]] invariant forbids returning
        // anything other than the exact target value for such a property, so
        // wrapping it would throw a TypeError. Return the raw value; the path
        // was already recorded above as a coarse leaf.
        const desc = Object.getOwnPropertyDescriptor(t, key);
        if (desc && !desc.configurable && !desc.writable) {
          return value;
        }

        return wrap(value as object, path);
      },

      ownKeys(t) {
        // Enumeration (Object.keys, for..in, spread of an object) depends on
        // the object's shape, so pin its own entry path — a later deeper read
        // must not narrow it away, and it must wake on key add/remove. Skips
        // the root (prefix === '') via pinArrayPath's own guard. Array
        // length/iteration behaviour is unaffected: for..of / spread / methods
        // never route through ownKeys.
        pinArrayPath();
        return Reflect.ownKeys(t);
      },

      has(t, key) {
        // `key in obj` queries a specific child path — record it so the
        // consumer wakes when that key is added or removed.
        if (typeof key !== 'symbol') {
          paths.add(interner.intern(childPath(prefix, key as string)));
        }
        return Reflect.has(t, key);
      },
    };

    const proxy = new Proxy(target, handler);
    byPrefix.set(prefix, proxy);
    proxyToTarget.set(proxy, target);
    return proxy;
  };

  return { value: wrap(state as object, '') as S, paths };
};

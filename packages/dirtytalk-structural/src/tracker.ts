import { isDev } from './env';
import type { PathId } from './types';
import type { PathSet } from './path-set';
import { NO_PARENT, type PathInterner } from './path-interner';

/**
 * When true, `trackRender` honors a `ProxyCache` passed as its third argument
 * and reuses proxies for (target, prefix) pairs unchanged since the caller's
 * last render, instead of allocating a fresh Proxy every call. When false,
 * a supplied ProxyCache is ignored entirely and behavior is identical to not
 * passing one — kept as a single rollout toggle while this is verified.
 */
const PERSIST_TRACKING_PROXIES = true;

export interface TrackResult<S> {
  value: S;
  paths: PathSet;
  /**
   * Stop this render's proxy from recording. After calling, every trap on
   * this proxy tree (and its cached sub-proxies) becomes a transparent
   * pass-through: reads return the raw underlying value and record nothing.
   * `useBloc` calls this on a microtask so reads after the synchronous
   * render+commit pass (effects, handlers, async, devtools) can't pollute
   * `paths`.
   */
  disarm: () => void;
}

// ---- Test-only trace seam (zero-cost in production) --------------------
// Production never installs a hook, so every `traceHook?.(…)` guard below is
// a single null check. A test calls `__setTrackTrace(fn)` to observe every
// recording decision, then `__setTrackTrace(null)` to detach.
export interface TrackTraceEvent {
  /** Monotonic id of the trackRender() call whose proxy tree emitted this. */
  instance: number;
  kind:
    | 'root-wrap' // root proxy created for this render
    | 'record' // a leaf path was added to `paths`
    | 'drop-parent' // the immediate parent path was superseded/removed
    | 'pin' // an array entry path was pinned as a content dependency
    | 'ownKeys' // enumeration trap fired
    | 'has' // `key in obj` trap fired
    | 'pass-through' // read after disarm(); recorded nothing
    | 'disarm'; // this render's proxy tree was frozen
  prefix: string;
  key?: string;
  path?: string;
  armed: boolean;
}

let traceHook: ((e: TrackTraceEvent) => void) | null = null;
let traceInstanceSeq = 0;

/**
 * Install (or clear with `null`) a global trace hook fired on every recording
 * decision inside every live tracking proxy. Test-only.
 */
export const __setTrackTrace = (
  hook: ((e: TrackTraceEvent) => void) | null,
): void => {
  traceHook = hook;
};

// Test-only override for PERSIST_TRACKING_PROXIES, mirroring __setTrackTrace
// above. `null` (the default) defers to the module constant; a test sets an
// explicit boolean to exercise the ProxyCache path regardless of the
// production default, then resets to `null` when done.
let persistOverride: boolean | null = null;

/**
 * Force (or clear with `null`) whether `trackRender` honors a supplied
 * `ProxyCache`, overriding `PERSIST_TRACKING_PROXIES`. Test-only.
 */
export const __setPersistTrackingProxies = (v: boolean | null): void => {
  persistOverride = v;
};

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

/**
 * Semantic alias of {@link raw}, expressing intent at a component boundary: pass
 * a tracked value as an **untracked snapshot** so reads on it (and nested reads)
 * never record into any tracking scope.
 *
 * When a parent does `<Child item={untracked(item)} />`, the child reads a plain,
 * detached value — its reads are NOT attributed to the parent's tracker, so the
 * parent stops re-rendering for paths only the child reads. The trade-off is
 * intentional: the child is **not** reactive to that value unless it re-reads the
 * data through its own `useBloc`. This is BlaC's model — a component is reactive
 * only to the paths it reads during its *own* render; props are snapshots.
 *
 * This is the explicit, no-build-step form of the ambient/compiler-plugin scoping
 * described in the @blac/react README. Identical mechanism to {@link raw}; the
 * separate name documents the intent at the call site.
 */
export const untracked = raw;

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

interface TrackSession {
  paths: Set<PathId>;
  /** Allocated on first pin; most renders never pin anything. */
  pinned: Set<PathId> | null;
  armed: boolean;
  instance: number;
}

/** Proxy store keyed by target: the head of that target's handler list. */
interface HandlerStore {
  get(target: object): TrackHandler | undefined;
  set(target: object, handler: TrackHandler): unknown;
  delete(target: object): unknown;
}

/** State of one `trackRender` call, shared by every proxy it claims. */
interface TrackContext {
  readonly session: TrackSession;
  readonly interner: PathInterner;
  /** The caller's `ProxyCache` store, or a per-call one created on demand. */
  store: HandlerStore | undefined;
  /** Targets whose handler list held more than one prefix this call. */
  readonly touched: Set<object> | undefined;
}

/**
 * Opt-in, caller-owned cache that lets `trackRender` reuse the same tracking
 * `Proxy` for a given `(target, prefix)` pair across multiple calls (e.g.
 * across React re-renders of one consumer), instead of allocating a fresh
 * Proxy every time. Keyed by `(target, prefix)` — NOT by target alone — so an
 * object read at two different paths (aliasing) still gets two independent
 * proxies, exactly as the per-call cache already guarantees; only a genuine
 * repeat read at the *same* path across calls is reused.
 *
 * Scope this per call-site (e.g. one per `useBloc` hook instance, one per
 * resolved dependency handle), never globally or per-container: an entry
 * holds exactly one live `session` at a time, so sharing a `ProxyCache`
 * across two independently-timed callers would let one caller's render
 * silently repoint an entry the other caller is still reading from.
 *
 * No entry is ever evicted explicitly — the `WeakMap` keyed by `target` lets
 * entries for objects no longer referenced anywhere else be collected
 * normally.
 */
export class ProxyCache {
  /** @internal — head of each target's handler list (one per prefix). */
  readonly byTarget: HandlerStore = new WeakMap<object, TrackHandler>();
}

/**
 * The `ProxyHandler` of one recording proxy, and its cache entry. Traps run
 * with `this` bound to the handler, so one instance per proxy carries all of
 * its state — no per-proxy trap closures. `ctx` is repointed when a later
 * `trackRender` call reuses the proxy, so the traps record into that call's
 * session.
 */
class TrackHandler implements ProxyHandler<object> {
  proxy: object = null as unknown as object;

  constructor(
    public ctx: TrackContext,
    readonly prefixId: PathId,
    readonly isArray: boolean,
    /** Next handler for the same target at another prefix. */
    public next: TrackHandler | undefined,
  ) {}

  get(t: object, key: string | symbol, receiver: unknown): unknown {
    const session = this.ctx.session;
    // Frozen (post-render): a transparent pass-through. Two-arg Reflect.get
    // (receiver = target) avoids re-entering this trap through getters.
    if (!session.armed) {
      if (traceHook !== null) this._trace('pass-through', String(key));
      return Reflect.get(t, key);
    }

    // Symbol keys never record. Iteration (`Symbol.iterator`) is invoked with
    // the proxy as receiver, so its internal index reads go through this trap.
    if (typeof key === 'symbol') return Reflect.get(t, key, receiver);

    const value = Reflect.get(t, key, receiver);

    // Inherited properties (array methods, prototype getters) don't record.
    // Array methods called on the proxy read `this.length`, `this[i]` through
    // the trap, and their callbacks get sub-proxies, so `items.map(i =>
    // i.title)` records `items.length`, `items.0.title`, … precisely.
    if (!Object.prototype.hasOwnProperty.call(t, key)) {
      // Identity-search methods compare a raw argument against elements, so
      // binding them to the proxy would never match object elements. Bind to
      // the raw target and pin the array path instead.
      if (
        this.isArray &&
        (key === 'includes' || key === 'indexOf' || key === 'lastIndexOf') &&
        typeof value === 'function'
      ) {
        this._pin();
        return (value as (...a: unknown[]) => unknown).bind(t);
      }
      return value;
    }

    // Own property: record it and drop the immediate parent, so only maximal
    // (leaf) paths remain — a reference change to an ancestor can't wake a
    // consumer that only read a leaf beneath it.
    const prefixId = this.prefixId;
    const interner = this.ctx.interner;
    const id = interner.internChild(prefixId, key);
    const paths = session.paths;
    paths.add(id);
    if (traceHook !== null) this._trace('record', key, interner.lookup(id));
    // An iteration/enumeration-pinned path is a content dependency that a
    // later own read (e.g. `.length`) must not narrow away.
    if (prefixId !== NO_PARENT && session.pinned?.has(prefixId) !== true) {
      paths.delete(prefixId);
      if (traceHook !== null) this._trace('drop-parent');
    }

    // Primitives, functions, and non-plain objects (Map, Set, Date, class
    // instances) are leaves, returned raw. The path is already recorded, so a
    // reference change still wakes the consumer.
    if (
      value === null ||
      typeof value !== 'object' ||
      !isStructurallyWrappable(value)
    ) {
      return value;
    }

    // Non-configurable, non-writable own data property (e.g. a field of an
    // Object.freeze'd state): the Proxy [[Get]] invariant forbids returning
    // anything but the exact target value, so it stays raw.
    const desc = Object.getOwnPropertyDescriptor(t, key);
    if (desc !== undefined && !desc.configurable && !desc.writable) {
      return value;
    }

    return wrap(this.ctx, value, id);
  }

  ownKeys(t: object): ArrayLike<string | symbol> {
    // Enumeration (Object.keys, for..in, object spread) depends on the shape,
    // so pin this object's path: it must survive deeper reads and wake on key
    // add/remove.
    if (this.ctx.session.armed) {
      this._pin();
      if (traceHook !== null) this._trace('ownKeys');
    }
    return Reflect.ownKeys(t);
  }

  has(t: object, key: string | symbol): boolean {
    // `key in obj` queries a specific child path — record it so the consumer
    // wakes when that key is added or removed.
    if (this.ctx.session.armed && typeof key !== 'symbol') {
      const interner = this.ctx.interner;
      const id = interner.internChild(this.prefixId, key);
      this.ctx.session.paths.add(id);
      if (traceHook !== null) this._trace('has', key, interner.lookup(id));
    }
    return Reflect.has(t, key);
  }

  // State is read-only from outside a bloc. In dev, catch stray writes that
  // would otherwise bypass rendering with no warning.
  set(t: object, key: string | symbol, value: unknown): boolean {
    if (isDev()) throwReadOnly('set', key);
    return Reflect.set(t, key, value);
  }

  deleteProperty(t: object, key: string | symbol): boolean {
    if (isDev()) throwReadOnly('delete', key);
    return Reflect.deleteProperty(t, key);
  }

  defineProperty(
    t: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ): boolean {
    if (isDev()) throwReadOnly('define', key);
    return Reflect.defineProperty(t, key, descriptor);
  }

  /**
   * Pin this proxy's own path as a content dependency. The root pins the
   * root id, which the container marks on every change.
   */
  private _pin(): void {
    const id =
      this.prefixId === NO_PARENT ? this.ctx.interner.rootId() : this.prefixId;
    const session = this.ctx.session;
    session.paths.add(id);
    (session.pinned ??= new Set<PathId>()).add(id);
    if (traceHook !== null) this._trace('pin', undefined, this._prefix());
  }

  private _prefix(): string {
    return this.prefixId === NO_PARENT
      ? ''
      : this.ctx.interner.lookup(this.prefixId);
  }

  private _trace(
    kind: TrackTraceEvent['kind'],
    key?: string,
    path?: string,
  ): void {
    const prefix = this._prefix();
    traceHook?.({
      instance: this.ctx.session.instance,
      kind,
      prefix,
      key,
      path: kind === 'drop-parent' ? prefix : path,
      armed: this.ctx.session.armed,
    });
  }
}

const throwReadOnly = (op: string, key: string | symbol): never => {
  throw new Error(
    `Cannot ${op} property "${String(key)}" on tracked state — state is ` +
      'read-only outside a bloc. Call a bloc method to mutate state instead.',
  );
};

/**
 * The recording proxy for `target` read at `prefixId`, reused from the store
 * when one exists for that pair (claimed for `ctx`), otherwise created.
 */
const createProxy = (
  ctx: TrackContext,
  target: object,
  prefixId: PathId,
  next: TrackHandler | undefined,
): TrackHandler => {
  const handler = new TrackHandler(ctx, prefixId, Array.isArray(target), next);
  handler.proxy = new Proxy(target, handler);
  proxyToTarget.set(handler.proxy, target);
  return handler;
};

const wrap = (ctx: TrackContext, target: object, prefixId: PathId): object => {
  const store = (ctx.store ??= new Map<object, TrackHandler>());
  const head = store.get(target);
  for (let h = head; h !== undefined; h = h.next) {
    if (h.prefixId === prefixId) {
      h.ctx = ctx;
      if (head?.next !== undefined) ctx.touched?.add(target);
      return h.proxy;
    }
  }
  const handler = createProxy(ctx, target, prefixId, head);
  store.set(target, handler);
  if (head !== undefined) ctx.touched?.add(target);
  return handler.proxy;
};

// Drop every handler for `target` not claimed by `ctx` (the completed call),
// so an object read at a shifting prefix (e.g. a reordered list item) doesn't
// accumulate one stale entry per prefix it has ever been read at.
const pruneStale = (
  store: HandlerStore,
  target: object,
  ctx: TrackContext,
): void => {
  let head: TrackHandler | undefined;
  let tail: TrackHandler | undefined;
  for (let h = store.get(target); h !== undefined; h = h.next) {
    if (h.ctx !== ctx) continue;
    if (tail === undefined) head = h;
    else tail.next = h;
    tail = h;
  }
  if (tail !== undefined) tail.next = undefined;
  if (head === undefined) store.delete(target);
  else store.set(target, head);
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
 * - Nested plain objects/arrays return a child proxy that records into the
 *   same `paths` set. Proxies are cached per (target, prefix), so
 *   `value.user === value.user` within one render, while the same object
 *   reached via two different paths gets two distinct proxies that each
 *   record their own prefix. When a `ProxyCache` is passed as the third
 *   argument, a `(target, prefix)` pair unchanged since the caller's last
 *   `trackRender` call reuses the same Proxy; see {@link ProxyCache}.
 * - Iteration: array methods and `for..of` / spread run against the proxy,
 *   so their internal index reads (`this.length`, `this[0]`, …) go through
 *   the `get` trap and callbacks receive per-index sub-proxies:
 *   `items.map(i => i.title)` records `items.length`, `items.0.title`, … —
 *   precise leaf paths that isolate re-renders to the items and fields that
 *   changed. `includes` / `indexOf` / `lastIndexOf` run against the raw
 *   array and pin the array's own path instead.
 * - Methods called on the proxy keep it as their receiver, so internal
 *   `this.x` reads continue to record. Reading an inherited method without
 *   invoking it does not record.
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
 *
 * @param proxyCache Optional caller-owned {@link ProxyCache}. When supplied
 * (and `PERSIST_TRACKING_PROXIES` is enabled), proxies for `(target, prefix)`
 * pairs unchanged since the caller's last `trackRender` call are reused
 * instead of freshly allocated.
 */
export const trackRender = <S>(
  state: S,
  interner: PathInterner,
  proxyCache?: ProxyCache,
): TrackResult<S> => {
  const cache =
    (persistOverride ?? PERSIST_TRACKING_PROXIES) ? proxyCache : undefined;

  // `pinned`: path ids that iteration/enumeration asserted as *content*
  // dependencies, so a later own-property read (e.g. `.length`) must not
  // supersede them. `armed`: when false, every trap is a raw pass-through
  // (flipped by `disarm`). Grouped in one object so a reused proxy is
  // repointed at a new render by swapping its `ctx`.
  const session: TrackSession = {
    paths: new Set<PathId>(),
    pinned: null,
    armed: true,
    instance: ++traceInstanceSeq,
  };

  if (state === null || typeof state !== 'object') {
    return { value: state, paths: session.paths, disarm: () => {} };
  }

  const ctx: TrackContext = {
    session,
    interner,
    store: cache?.byTarget,
    touched: cache !== undefined ? new Set<object>() : undefined,
  };

  if (traceHook !== null) {
    traceHook({
      instance: session.instance,
      kind: 'root-wrap',
      prefix: '',
      armed: true,
    });
  }
  return {
    // The root is never reused: a reused child proxy is only reachable via a
    // `get` that records it, but a reused root reaches the consumer unchanged,
    // so `useMemo(..., [state])` would skip every read and record nothing.
    value: createProxy(ctx, state, NO_PARENT, undefined).proxy as S,
    paths: session.paths,
    disarm: () => {
      // Reads keep routing through this call's handlers until `armed` flips,
      // so `touched` is only settled here. Prune each touched target down to
      // the prefixes this render claimed.
      const store = ctx.store;
      if (ctx.touched !== undefined && store !== undefined) {
        for (const target of ctx.touched) pruneStale(store, target, ctx);
        ctx.touched.clear();
      }
      session.armed = false;
      if (traceHook !== null) {
        traceHook({
          instance: session.instance,
          kind: 'disarm',
          prefix: '',
          armed: false,
        });
      }
    },
  };
};

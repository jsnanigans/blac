import {
  DirtyChannel,
  MicrotaskScheduler,
  type Scheduler,
} from '@dirtytalk/engine';
import {
  changedPathsFromPatch,
  diffAlongSkeleton,
  getAtSegments,
} from './diff';
import { PathInterner } from './path-interner';

/**
 * Recursively make all object-valued properties optional.
 *
 * - Plain-object branches recurse so nested patches type-check without casts.
 * - Arrays are accepted as `ReadonlyArray<DeepPartial<U>>` (matching runtime:
 *   `deepMerge` treats arrays as leaves, not per-index expandable).
 * - `Date | Map | Set | RegExp` are kept as-is; without this carve-out TS
 *   would try to partial their internal prototype properties.
 * - Primitives and functions pass through unchanged.
 */
export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Date | Map<unknown, unknown> | Set<unknown> | RegExp
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
import {
  ALL_PATHS,
  emptyPathSet,
  pathSetEquals,
  PathSetSpace,
  type PathSet,
} from './path-set';
import type { ConsumerId, PathId } from './types';

export interface StructuralContainerOptions {
  /**
   * Scheduler for the underlying DirtyChannel.
   * Default: a fresh MicrotaskScheduler per instance.
   * Tests and SSR should pass SyncScheduler.
   */
  scheduler?: Scheduler;

  /**
   * Per-path-pattern equality override. v1 keys are *exact dotted path
   * strings* — the container interns each at construction so the diff hook
   * can look them up by `PathId`. Concrete pattern matching (globs, etc.)
   * is a follow-up.
   */
  equality?: ReadonlyMap<string, (a: unknown, b: unknown) => boolean>;

  /**
   * Error handler forwarded to the underlying `DirtyChannel`. Invoked when a
   * subscriber callback throws during flush, instead of letting the error
   * propagate. Unset preserves the channel's default (throw) behavior:
   * subscriber and interest-thunk errors are re-thrown synchronously inside
   * the scheduler's flush callback (a microtask or rAF tick), where they
   * surface as uncaught errors and abort the remainder of that flush tick.
   */
  onError?: (err: unknown) => void;
}

/**
 * `StructuralContainer<S>` — owns a piece of state, a `DirtyChannel<PathSet>`,
 * and a consumer registry. Mutations mark only paths whose values actually
 * changed: `emit` value-diffs along the observed skeleton (`diffAlongSkeleton`),
 * `patch` value-filters the patch shape (`changedPathsFromPatch`). Consumers
 * (and raw subscribers) whose observed paths didn't change value stay asleep.
 *
 * Zero-consumer flows short-circuit to `ALL_PATHS` to avoid the diff cost;
 * with one or more registered consumers, `emit` always diffs along the
 * skeleton so precise per-leaf wake-ups apply even for a single consumer.
 *
 * `dispose()` exists for embedders that need to tear down a container's channel.
 */
export abstract class StructuralContainer<S> {
  // Per-class interner registry — keyed by constructor so GC can reclaim
  // interners once all instances of a class are gone (WeakMap, not Map).
  // Keyed as `object` (constructors are objects) to satisfy no-unsafe-function-type.
  private static readonly _interners = new WeakMap<object, PathInterner>();

  static getInternerFor(ctor: object): PathInterner {
    let interner = StructuralContainer._interners.get(ctor);
    if (interner === undefined) {
      interner = new PathInterner();
      StructuralContainer._interners.set(ctor, interner);
    }
    return interner;
  }

  private readonly _channel: DirtyChannel<PathSet>;
  private readonly _consumerPaths = new Map<ConsumerId, PathSet>();
  private _state: S;
  private _skeleton: PathSet = emptyPathSet();
  // Incremental skeleton refcounting (replaces the O(consumers × paths)
  // from-scratch union). `_skeletonSet` is the live backing set for `_skeleton`
  // when no ALL_PATHS consumer is registered; `_pathRefCounts` tracks how many
  // consumers reference each id so an id leaves the skeleton only on its final
  // 1→0 transition; `_allPathsConsumers` counts ALL_PATHS-interest consumers.
  private readonly _pathRefCounts = new Map<PathId, number>();
  private _allPathsConsumers = 0;
  private readonly _skeletonSet = new Set<PathId>();
  private readonly _equalsByPathId: Map<
    PathId,
    (a: unknown, b: unknown) => boolean
  >;
  private _equalsFnCached?: (id: PathId, a: unknown, b: unknown) => boolean;

  constructor(initial: S, options: StructuralContainerOptions = {}) {
    this._state = initial;
    const scheduler = options.scheduler ?? new MicrotaskScheduler();
    this._channel = new DirtyChannel<PathSet>(PathSetSpace, scheduler, {
      onError: options.onError,
    });

    this._equalsByPathId = new Map();
    if (options.equality) {
      for (const [path, eq] of options.equality) {
        this._equalsByPathId.set(this.interner.intern(path), eq);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  get state(): S {
    return this._state;
  }

  get interner(): PathInterner {
    return StructuralContainer.getInternerFor(this.constructor);
  }

  get channel(): DirtyChannel<PathSet> {
    return this._channel;
  }

  dispose(): void {
    this._channel.dispose();
  }

  get consumerCount(): number {
    return this._consumerPaths.size;
  }

  /**
   * Read-only snapshot of every registered consumer's watched path set, keyed
   * by consumer id. For inspection/devtools only — these are the live interest
   * sets that feed the diff skeleton, *not* a copy. `ALL_PATHS` means the
   * consumer opted out of path tracking (e.g. React select-mode) and wakes on
   * any change. Select-mode consumers don't register here at all.
   */
  getConsumerPaths(): ReadonlyMap<ConsumerId, PathSet> {
    return new Map(this._consumerPaths);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  emit(next: S): void {
    if (Object.is(this._state, next)) return; // reference-equal short-circuit
    const prev = this._state;
    this._state = next;

    let dirty: PathSet;
    if (this._consumerPaths.size === 0) {
      // Zero-consumer skip: nothing is registered to diff against, so mark
      // the whole space for any ALL_PATHS subscribers (blac bridge, plugins,
      // watch/select).
      dirty = ALL_PATHS;
    } else {
      dirty = diffAlongSkeleton(
        prev,
        next,
        this._skeleton,
        this.interner,
        this._equalsFn(),
      );
      // The skeleton only covers registered consumers' watched paths. A
      // change outside every skeleton path (e.g. an untracked field) yields
      // an empty diff here, which would otherwise make `#flush`'s empty
      // fast-path swallow the mark before ALL_PATHS subscribers (the blac
      // bridge, plugins, watch/select) ever run. Since we already know
      // `prev !== next` (reference short-circuit above), union in the
      // reserved root-sentinel id so ALL_PATHS interests still wake while
      // leaf `Set` interests (which never request the sentinel) stay asleep.
      if (
        dirty !== ALL_PATHS &&
        (dirty as Set<PathId>).size === 0 &&
        !Object.is(prev, next)
      ) {
        dirty = new Set<PathId>([this.interner.rootId()]);
      }
    }
    this._channel.mark(dirty);
  }

  /**
   * Shallow-or-deep patch: accepts a `DeepPartial<S>` so nested object
   * branches type-check without casts. `deepMerge` walks plain-object branches
   * and treats class instances, arrays, Date, Map, Set, etc. as atomic leaves.
   *
   * Dirty paths are derived from the patch's shape but **value-filtered**: a
   * path is marked only if its value actually changed. Plain-object branches are
   * handled precisely by `changedPathsFromPatch`. For atomic-leaf replacements
   * (arrays, class instances, etc.) where `changedPathsFromPatch` would emit a
   * coarse ancestor-watch mark, `_refineAncestorMarks` replaces it with precise
   * skeleton-child diffs so per-index consumers only wake when their specific
   * value changed.
   */
  patch(partial: DeepPartial<S>): void {
    let _empty = true;
    for (const _k in partial as object) {
      _empty = false;
      break;
    }
    if (_empty) return;
    const prev = this._state;
    const next = deepMerge(prev, partial as Partial<S>);
    // `deepMerge` returns `prev` by reference when nothing actually changed
    // (shallow or deep no-op) — no paths to mark, no subscribers to wake.
    if (Object.is(prev, next)) return;
    // Apply state mutation atomically *before* mark so consumers see the new
    // state when they read it inside the dirty callback.
    this._state = next;
    // Zero-consumer skip (mirrors `emit`): with no path-scoped consumer
    // registered, no subscriber can use precise per-path marks — ALL_PATHS
    // subscribers (blac bridge, plugins, watch, manual `subscribe`) wake on
    // any mark regardless. So skip the `changedPathsFromPatch` +
    // `_refineAncestorMarks` diff work entirely and mark the whole space.
    if (this._consumerPaths.size === 0) {
      this._channel.mark(ALL_PATHS);
      return;
    }
    const rough = changedPathsFromPatch(
      prev,
      next,
      partial as Partial<S>,
      this.interner,
      this._equalsFn(),
    );
    this._channel.mark(this._refineAncestorMarks(rough, prev, next));
  }

  update(fn: (state: S) => S): void {
    this.emit(fn(this._state));
  }

  // ---------------------------------------------------------------------------
  // Subscriptions / registry
  // ---------------------------------------------------------------------------

  /**
   * Pass-through subscribe on the underlying channel — for devtools, plugins,
   * and manual subscribers that don't go through the tracker.
   */
  subscribe(interest: () => PathSet, cb: (dirty: PathSet) => void): () => void {
    return this._channel.subscribe(interest, cb);
  }

  registerConsumerPaths(id: ConsumerId, paths: PathSet): void {
    const prev = this._consumerPaths.get(id);
    if (prev && pathSetEquals(prev, paths)) return; // fast-path skip

    this._consumerPaths.set(id, paths);
    this._applyRefDelta(prev, paths);
  }

  unregisterConsumer(id: ConsumerId): void {
    const prev = this._consumerPaths.get(id);
    if (this._consumerPaths.delete(id)) this._applyRefDelta(prev, undefined);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  // Per-path custom-equality callback shared by `emit` and `patch`, or
  // `undefined` when no overrides are configured (the common case → default
  // `Object.is`).
  private _equalsFn():
    | ((id: PathId, a: unknown, b: unknown) => boolean)
    | undefined {
    if (this._equalsByPathId.size === 0) return undefined;
    return (this._equalsFnCached ??= (id, a, b) => {
      const eq = this._equalsByPathId.get(id);
      return eq ? eq(a, b) : Object.is(a, b);
    });
  }

  // Incrementally fold a single consumer's `prev`→`next` interest change into
  // the refcounted skeleton, then republish `_skeleton`. `undefined` on either
  // side means "no interest" (register of a new id / unregister). `ALL_PATHS`
  // interests are counted separately: while any exist the skeleton is
  // `ALL_PATHS`; otherwise it is the live `_skeletonSet`. An id is added on its
  // 0→1 refcount transition and dropped on its final 1→0 transition, so the
  // result is always set-equal to a from-scratch union of all current
  // consumers' paths.
  private _applyRefDelta(
    prev: PathSet | undefined,
    next: PathSet | undefined,
  ): void {
    if (prev === ALL_PATHS) {
      this._allPathsConsumers--;
    } else if (prev !== undefined) {
      for (const id of prev as Set<PathId>) {
        const count = (this._pathRefCounts.get(id) ?? 0) - 1;
        if (count <= 0) {
          this._pathRefCounts.delete(id);
          this._skeletonSet.delete(id);
        } else {
          this._pathRefCounts.set(id, count);
        }
      }
    }
    if (next === ALL_PATHS) {
      this._allPathsConsumers++;
    } else if (next !== undefined) {
      for (const id of next as Set<PathId>) {
        const count = (this._pathRefCounts.get(id) ?? 0) + 1;
        this._pathRefCounts.set(id, count);
        if (count === 1) this._skeletonSet.add(id);
      }
    }
    this._skeleton =
      this._allPathsConsumers > 0 ? ALL_PATHS : this._skeletonSet;
  }

  /**
   * Replace coarse ancestor-watch marks in `rough` with precise skeleton-child
   * diffs. Called by `patch()` after `changedPathsFromPatch`.
   *
   * When `changedPathsFromPatch` hits an atomic-leaf change (an array, class
   * instance, etc.) it emits both `PathId(path)` and the ancestor-watch
   * `PathId("\0a:path")`. The ancestor-watch is intentionally broad — it wakes
   * any consumer whose expanded interest includes that ancestor — but it cannot
   * distinguish which child paths actually changed value.
   *
   * This method replaces each ancestor-watch mark with a targeted
   * `diffAlongSkeleton`-style pass over the skeleton paths that are children of
   * that ancestor, adding only the ones whose value actually changed. The normal
   * `PathId(path)` mark (for consumers that pinned the parent directly, e.g. via
   * `.map()`) is preserved — it passes through unchanged.
   *
   * Fast-exits:
   *   - No ancestor-watch marks in `rough` → return `rough` as-is (plain-object
   *     patches pay zero overhead).
   *   - Skeleton is empty or ALL_PATHS → return `rough` as-is.
   */
  private _refineAncestorMarks(rough: PathSet, prev: S, next: S): PathSet {
    if (rough === ALL_PATHS) return rough;
    const roughSet = rough as Set<PathId>;

    // Single pass over `roughSet`: build the refine *targets* (real-path ids
    // every ancestor-watch mark decodes to) and, in the same pass, collect the
    // non-ancestor marks to keep (e.g. PathId("items") for whole-array readers
    // that pinned the parent directly, e.g. via .map()). Ancestor-watch marks
    // are dropped — they are replaced by the precise leaf marks below.
    const targetIds = new Set<PathId>();
    const nonAncestorIds: PathId[] = [];
    for (const id of roughSet) {
      if (this.interner.isAncestorId(id)) {
        const target = this.interner.ancestorTargetId(id);
        if (target !== undefined) targetIds.add(target);
      } else {
        nonAncestorIds.push(id);
      }
    }
    // Fast exit: no ancestor-watch marks → plain-object patch, zero overhead.
    if (targetIds.size === 0) return rough;

    // Fast exit: nothing in the skeleton to refine against.
    if (this._skeleton === ALL_PATHS) return rough;
    const skeleton = this._skeleton as Set<PathId>;
    if (skeleton.size === 0) return rough;

    const equalsFn = this._equalsFn();
    // Seed with the non-ancestor marks collected above. Consumers whose
    // expanded interest relied on the dropped ancestor-watch marks match the
    // precise leaves added below instead.
    const result = new Set<PathId>(nonAncestorIds);

    // Single pass over the skeleton: a leaf that descends from any refined
    // ancestor is marked iff its value actually changed (one read per leaf,
    // never re-walked per ancestor). Same value-compare as diffAlongSkeleton.
    for (const skelId of skeleton) {
      const ancestors = this.interner.ancestorIds(skelId);
      let descends = false;
      for (let i = 0; i < ancestors.length; i++) {
        if (targetIds.has(ancestors[i])) {
          descends = true;
          break;
        }
      }
      if (!descends) continue;
      const segments = this.interner.lookupSegments(skelId);
      const pv = getAtSegments(prev, segments);
      const nv = getAtSegments(next, segments);
      const eq = equalsFn ? equalsFn(skelId, pv, nv) : Object.is(pv, nv);
      if (!eq) result.add(skelId);
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// deepMerge — patch-shaped recursive merge.
//
// Mirrors `pathsFromPatch`'s leaf/branch decision exactly:
// - Plain-object branches merge recursively.
// - Arrays, class instances, primitives, null, undefined, Date, Map, Set,
//   etc. replace the corresponding slot atomically.
//
// Kept local to this module — the predicate is duplicated from diff.ts on
// purpose. If a third call site appears, factor at that point.
// ---------------------------------------------------------------------------

const isPlainPatchObject = (v: unknown): v is Record<string, unknown> => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

// Bracket-assigning the literal key "__proto__" invokes the inherited
// Object.prototype setter and rewrites `out`'s prototype instead of storing
// an own key — e.g. from a JSON.parse'd patch. Route that one key through
// defineProperty so it lands as a plain own property.
// NOTE: carry this guard into deepMerge's planned lazy-clone rewrite
// (plans/patch-emit-redundant-diff-clone.md) — its single-loop version must
// not reintroduce the bracket-assignment path for this key.
const setMergedKey = (
  out: Record<string, unknown>,
  key: string,
  value: unknown,
): void => {
  if (key === '__proto__') {
    Object.defineProperty(out, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    out[key] = value;
  }
};

const deepMerge = <S>(target: S, patch: Partial<S>): S => {
  if (!isPlainPatchObject(target) || !isPlainPatchObject(patch)) {
    // Either side isn't a plain object — patch replaces wholesale.
    return patch as S;
  }
  const out: Record<string, unknown> = {
    ...(target as Record<string, unknown>),
  };
  // Track whether any key actually moved. When nothing changed we return the
  // original `target` reference so callers can detect no-ops with `Object.is`
  // (and skip marking/waking entirely) — and a touched-but-equal subtree keeps
  // its reference, which `changedPathsFromPatch` already relies on.
  let changed = false;
  for (const key of Object.keys(patch)) {
    const nextVal = (patch as Record<string, unknown>)[key];
    const prevVal = (target as Record<string, unknown>)[key];
    if (isPlainPatchObject(nextVal) && isPlainPatchObject(prevVal)) {
      const merged = deepMerge(prevVal, nextVal as Partial<typeof prevVal>);
      setMergedKey(out, key, merged);
      if (!Object.is(merged, prevVal)) changed = true;
    } else {
      setMergedKey(out, key, nextVal);
      if (!Object.is(nextVal, prevVal)) changed = true;
    }
  }
  return changed ? (out as S) : target;
};

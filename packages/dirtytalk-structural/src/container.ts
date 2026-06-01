import {
  DirtyChannel,
  MicrotaskScheduler,
  type Scheduler,
} from '@dirtytalk/engine';
import { changedPathsFromPatch, diffAlongSkeleton, getAt } from './diff';
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
  pathSetUnion,
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
}

/**
 * `StructuralContainer<S>` — owns a piece of state, a `DirtyChannel<PathSet>`,
 * and a consumer registry. Mutations mark only paths whose values actually
 * changed: `emit` value-diffs along the observed skeleton (`diffAlongSkeleton`),
 * `patch` value-filters the patch shape (`changedPathsFromPatch`). Consumers
 * (and raw subscribers) whose observed paths didn't change value stay asleep.
 *
 * Single-consumer flows short-circuit to `ALL_PATHS` to avoid the diff cost.
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
  private readonly _equalsByPathId: Map<
    PathId,
    (a: unknown, b: unknown) => boolean
  >;

  constructor(initial: S, options: StructuralContainerOptions = {}) {
    this._state = initial;
    const scheduler = options.scheduler ?? new MicrotaskScheduler();
    this._channel = new DirtyChannel<PathSet>(PathSetSpace, scheduler);

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
    return this._consumerPaths;
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  emit(next: S): void {
    if (Object.is(this._state, next)) return; // reference-equal short-circuit
    const prev = this._state;
    this._state = next;

    let dirty: PathSet;
    if (this._consumerPaths.size <= 1) {
      // Single-consumer skip: with at most one consumer, the diff cost isn't
      // worth it — mark the whole space so the sole consumer (if any) wakes.
      dirty = ALL_PATHS;
    } else {
      dirty = diffAlongSkeleton(
        prev,
        next,
        this._skeleton,
        this.interner,
        this._equalsFn(),
      );
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
    if (Object.keys(partial as object).length === 0) return;
    const prev = this._state;
    const next = deepMerge(prev, partial as Partial<S>);
    // `deepMerge` returns `prev` by reference when nothing actually changed
    // (shallow or deep no-op) — no paths to mark, no subscribers to wake.
    if (Object.is(prev, next)) return;
    // Apply state mutation atomically *before* mark so consumers see the new
    // state when they read it inside the dirty callback.
    this._state = next;
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
    this._recomputeSkeleton();
  }

  unregisterConsumer(id: ConsumerId): void {
    if (this._consumerPaths.delete(id)) this._recomputeSkeleton();
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
    return (id, a, b) => {
      const eq = this._equalsByPathId.get(id);
      return eq ? eq(a, b) : Object.is(a, b);
    };
  }

  // O(consumers × paths); incremental update is a future optimisation.
  private _recomputeSkeleton(): void {
    let s: PathSet = emptyPathSet();
    for (const p of this._consumerPaths.values()) s = pathSetUnion(s, p);
    this._skeleton = s;
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

    // Fast exit: scan for any ancestor-watch mark before allocating anything.
    let hasAncestor = false;
    for (const id of roughSet) {
      if (this.interner.isAncestorId(id)) {
        hasAncestor = true;
        break;
      }
    }
    if (!hasAncestor) return rough;

    // Fast exit: nothing in the skeleton to refine against.
    if (this._skeleton === ALL_PATHS) return rough;
    const skeleton = this._skeleton as Set<PathId>;
    if (skeleton.size === 0) return rough;

    const equalsFn = this._equalsFn();
    const result = new Set<PathId>();

    for (const id of roughSet) {
      if (!this.interner.isAncestorId(id)) {
        // Normal path mark (e.g. PathId("items"), PathId("matrix")): keep as-is.
        // These wake consumers that pinned the parent directly (e.g. via .map()).
        result.add(id);
        continue;
      }

      // Ancestor-watch mark: replace with precise value-diffs against skeleton
      // children. `lookup` strips the sentinel so we get the real ancestor path.
      const ancestorPath = this.interner.lookup(id);
      const prefix = ancestorPath + '.';

      for (const skelId of skeleton) {
        const skelPath = this.interner.lookup(skelId);
        if (!skelPath.startsWith(prefix)) continue;
        // Value-compare at this skeleton path — same logic as diffAlongSkeleton.
        const pv = getAt(prev, skelPath);
        const nv = getAt(next, skelPath);
        const eq = equalsFn ? equalsFn(skelId, pv, nv) : Object.is(pv, nv);
        if (!eq) result.add(skelId);
      }
      // The ancestor-watch mark itself is intentionally dropped: it has been
      // replaced by the precise leaf marks above. Consumers whose expanded
      // interest relied on it will instead match directly on the leaf PathIds.
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
      out[key] = merged;
      if (!Object.is(merged, prevVal)) changed = true;
    } else {
      out[key] = nextVal;
      if (!Object.is(nextVal, prevVal)) changed = true;
    }
  }
  return changed ? (out as S) : target;
};

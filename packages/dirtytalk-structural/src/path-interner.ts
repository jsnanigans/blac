import type { PathId } from './types';

/**
 * Sentinel prefix marking an *ancestor-watch* path id. `\0` cannot appear in a
 * real dotted property path, so an ancestor-watch id can never collide with a
 * normal path id even though both live in the same `Set<PathId>`.
 *
 * This is the second matching lane of the structural space. A consumer that
 * read a descendant (e.g. `items.length`) registers an ancestor-watch on its
 * parents; the source emits an ancestor-watch mark for a path it replaces
 * *atomically* (arrays, `null`, primitives — anything `changedPathsFromPatch`
 * can't see inside). The two only intersect each other, so a normal structural
 * pulse-up mark (e.g. `user`, marked because a sibling `user.name` changed)
 * cannot falsely wake a sibling-leaf consumer that expanded up to `user`.
 *
 * `lookup` strips this prefix, so decoders (devtools, logging) and
 * `diffAlongSkeleton` only ever observe the underlying real path.
 */
const ANCESTOR_SENTINEL = '\0a:';

/**
 * Sentinel path string for the reserved **root** id (see {@link PathInterner.rootId}).
 * Also NUL-prefixed like {@link ANCESTOR_SENTINEL} but distinct from it, so
 * `lookup`/`isAncestorId` must check for it explicitly *before* falling back
 * to the ancestor-watch NUL-guard — otherwise `'\0root'.slice(ANCESTOR_SENTINEL.length)`
 * would silently mangle it into `'oot'`.
 */
const ROOT_SENTINEL = '\0root';

export class PathInterner {
  private readonly _map = new Map<string, PathId>();
  private readonly _paths: string[] = [];
  // Parallel cache: memoized `path.split('.')` per id (see `lookupSegments`).
  private readonly _segments: (readonly string[])[] = [];
  // Parallel cache: for an ancestor-watch id, the id of the underlying real
  // path (see `internAncestor` / `ancestorTargetId`).
  private readonly _ancestorTarget: (PathId | undefined)[] = [];
  // Parallel cache: memoized existing ancestor ids per id (see `ancestorIds`).
  private readonly _ancestorIds: (readonly PathId[])[] = [];

  intern(path: string): PathId {
    const existing = this._map.get(path);
    if (existing !== undefined) return existing;
    this._paths.push(path);
    const id = this._paths.length - 1;
    this._map.set(path, id);
    // A genuinely new path can newly satisfy some cached ancestorIds prefix
    // lookup, so drop the memo; it lazily recomputes against the larger map.
    this._ancestorIds.length = 0;
    return id;
  }

  /**
   * Intern the *ancestor-watch* id for `path` (see {@link ANCESTOR_SENTINEL}).
   * Distinct from `intern(path)`: the returned id only intersects other
   * ancestor-watch ids of the same path, never the path's normal id.
   *
   * Also interns the *real* `path` (idempotent — every current call site has
   * already interned it) and records the ancestor→real id mapping so
   * {@link ancestorTargetId} can resolve the underlying path id without a
   * string decode.
   */
  internAncestor(path: string): PathId {
    const realId = this.intern(path);
    const ancestorId = this.intern(`${ANCESTOR_SENTINEL}${path}`);
    this._ancestorTarget[ancestorId] = realId;
    return ancestorId;
  }

  /**
   * The real-path id an ancestor-watch id decodes to, or `undefined` when `id`
   * was not produced by {@link internAncestor}. Cheap parallel-array read used
   * by the container to build the refine-target set without string work.
   */
  ancestorTargetId(id: PathId): PathId | undefined {
    return this._ancestorTarget[id];
  }

  /**
   * Memoized segments of the path for `id` (i.e. `lookup(id).split('.')`, with
   * the empty path decoding to `[]`). The returned array is cached per id and
   * is reference-stable across calls — hot-loop readers (`diffAlongSkeleton`,
   * `_refineAncestorMarks`) split each path at most once ever.
   */
  lookupSegments(id: PathId): readonly string[] {
    const cached = this._segments[id];
    if (cached !== undefined) return cached;
    const path = this.lookup(id);
    const segments = path === '' ? [] : path.split('.');
    this._segments[id] = segments;
    return segments;
  }

  /**
   * The ids of every *already-interned* strict-ancestor prefix of `id`'s path,
   * longest first. A plain (never force-interning) `_map` read per shrinking
   * prefix — a missing intermediate is simply skipped, so `.size` is never
   * affected. Memoized per id and reference-stable across calls.
   */
  ancestorIds(id: PathId): readonly PathId[] {
    const cached = this._ancestorIds[id];
    if (cached !== undefined) return cached;
    const segments = this.lookupSegments(id);
    const result: PathId[] = [];
    for (let k = segments.length - 1; k >= 1; k--) {
      const prefixId = this._map.get(segments.slice(0, k).join('.'));
      if (prefixId !== undefined) result.push(prefixId);
    }
    this._ancestorIds[id] = result;
    return result;
  }

  /**
   * Reserved **root-sentinel** id: not a real path, used by `emit` to wake
   * `ALL_PATHS` interests when a change lands outside every consumer's
   * skeleton (so the skeleton diff is otherwise empty). Idempotent — repeated
   * calls return the same id via `intern`'s dedup. Never intersects a leaf
   * consumer's `Set<PathId>` interest since no consumer ever requests it.
   */
  rootId(): PathId {
    return this.intern(ROOT_SENTINEL);
  }

  /** True when `id` is the reserved root-sentinel id (see {@link rootId}). */
  isRootId(id: PathId): boolean {
    return (
      id >= 0 && id < this._paths.length && this._paths[id] === ROOT_SENTINEL
    );
  }

  lookup(id: PathId): string {
    if (id < 0 || !Number.isInteger(id) || id >= this._paths.length) {
      throw new RangeError(
        `PathInterner.lookup: unknown PathId ${id} (size=${this._paths.length})`,
      );
    }
    const path = this._paths[id];
    // Root-sentinel guard *before* the ancestor NUL-slice below — both are
    // NUL-prefixed, but the root sentinel has no real path to decode to, so
    // it must not be sliced as if it were an ancestor-watch id.
    if (path === ROOT_SENTINEL) return path;
    // Decode ancestor-watch ids back to the real path so callers never see the
    // internal sentinel. Cheap NUL-byte guard before the slice.
    return path.charCodeAt(0) === 0
      ? path.slice(ANCESTOR_SENTINEL.length)
      : path;
  }

  /** True when `id` was interned via {@link internAncestor} (sentinel prefix). */
  isAncestorId(id: PathId): boolean {
    if (id < 0 || id >= this._paths.length) return false;
    const path = this._paths[id];
    // Exclude the root sentinel: also NUL-prefixed, but not an ancestor-watch id.
    return path !== ROOT_SENTINEL && path.charCodeAt(0) === 0;
  }

  /**
   * Number of interned entries (real paths, ancestor-watch ids, and sentinels).
   * Exposed for devtools/leak diagnostics — see review-889 T9: per-class
   * interners are append-only and shared across all instances of a class, so
   * watch this for state shapes with unbounded dynamic keys.
   */
  get size(): number {
    return this._paths.length;
  }
}

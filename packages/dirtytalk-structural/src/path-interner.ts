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

  intern(path: string): PathId {
    const existing = this._map.get(path);
    if (existing !== undefined) return existing;
    this._paths.push(path);
    const id = this._paths.length - 1;
    this._map.set(path, id);
    return id;
  }

  /**
   * Intern the *ancestor-watch* id for `path` (see {@link ANCESTOR_SENTINEL}).
   * Distinct from `intern(path)`: the returned id only intersects other
   * ancestor-watch ids of the same path, never the path's normal id.
   */
  internAncestor(path: string): PathId {
    return this.intern(`${ANCESTOR_SENTINEL}${path}`);
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

  get size(): number {
    return this._paths.length;
  }
}

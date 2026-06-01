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

  lookup(id: PathId): string {
    if (id < 0 || !Number.isInteger(id) || id >= this._paths.length) {
      throw new RangeError(
        `PathInterner.lookup: unknown PathId ${id} (size=${this._paths.length})`,
      );
    }
    const path = this._paths[id];
    // Decode ancestor-watch ids back to the real path so callers never see the
    // internal sentinel. Cheap NUL-byte guard before the slice.
    return path.charCodeAt(0) === 0
      ? path.slice(ANCESTOR_SENTINEL.length)
      : path;
  }

  get size(): number {
    return this._paths.length;
  }
}

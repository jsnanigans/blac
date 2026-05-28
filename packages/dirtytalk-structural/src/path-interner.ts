import type { PathId } from './types';

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

  lookup(id: PathId): string {
    if (id < 0 || !Number.isInteger(id) || id >= this._paths.length) {
      throw new RangeError(
        `PathInterner.lookup: unknown PathId ${id} (size=${this._paths.length})`,
      );
    }
    return this._paths[id];
  }

  get size(): number {
    return this._paths.length;
  }
}

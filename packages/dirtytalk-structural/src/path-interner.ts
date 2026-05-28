import type { PathId } from './types';

export class PathInterner {
  intern(_path: string): PathId {
    throw new Error('PathInterner.intern: not implemented (Phase 1)');
  }
  lookup(_id: PathId): string {
    throw new Error('PathInterner.lookup: not implemented (Phase 1)');
  }
  get size(): number {
    throw new Error('PathInterner.size: not implemented (Phase 1)');
  }
}

import type { PathSet } from './path-set';
import type { PathInterner } from './path-interner';

export const diffAlongSkeleton = <S>(
  _prev: S,
  _next: S,
  _skeleton: PathSet,
  _interner: PathInterner,
): PathSet => {
  throw new Error('diffAlongSkeleton: not implemented (Phase 2)');
};

export const pathsFromPatch = <S>(
  _patch: Partial<S>,
  _interner: PathInterner,
  _basePath?: string,
): PathSet => {
  throw new Error('pathsFromPatch: not implemented (Phase 2)');
};

export const getAt = (_state: unknown, _path: string): unknown => {
  throw new Error('getAt: not implemented (Phase 2)');
};

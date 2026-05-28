import type { PathId } from './types';
import type { Space } from '@dirtytalk/engine';

export type PathSet = Set<PathId> | typeof ALL_PATHS;

export const ALL_PATHS: unique symbol = Symbol.for(
  '@dirtytalk/structural/ALL_PATHS',
);

export const emptyPathSet = (): PathSet => {
  throw new Error('emptyPathSet: not implemented (Phase 1)');
};
export const pathSetUnion = (_a: PathSet, _b: PathSet): PathSet => {
  throw new Error('pathSetUnion: not implemented (Phase 1)');
};
export const pathSetEquals = (_a: PathSet, _b: PathSet): boolean => {
  throw new Error('pathSetEquals: not implemented (Phase 1)');
};

export const PathSetSpace: Space<PathSet> = {
  empty: () => {
    throw new Error('PathSetSpace.empty: not implemented (Phase 1)');
  },
  isEmpty: () => {
    throw new Error('PathSetSpace.isEmpty: not implemented (Phase 1)');
  },
  union: () => {
    throw new Error('PathSetSpace.union: not implemented (Phase 1)');
  },
  intersects: () => {
    throw new Error('PathSetSpace.intersects: not implemented (Phase 1)');
  },
};

import type { PathId } from './types';
import type { Space } from '@dirtytalk/engine';

export const ALL_PATHS: unique symbol = Symbol.for(
  '@dirtytalk/structural/ALL_PATHS',
);
export type AllPaths = typeof ALL_PATHS;
export type PathSet = Set<PathId> | AllPaths;

export const emptyPathSet = (): PathSet => new Set<PathId>();

export const pathSetUnion = (a: PathSet, b: PathSet): PathSet => {
  if (a === ALL_PATHS || b === ALL_PATHS) return ALL_PATHS;
  const result = new Set<PathId>(a as Set<PathId>);
  for (const id of b as Set<PathId>) result.add(id);
  return result;
};

export const pathSetEquals = (a: PathSet, b: PathSet): boolean => {
  if (a === ALL_PATHS && b === ALL_PATHS) return true;
  if (a === ALL_PATHS || b === ALL_PATHS) return false;
  const sa = a as Set<PathId>;
  const sb = b as Set<PathId>;
  if (sa.size !== sb.size) return false;
  for (const id of sa) if (!sb.has(id)) return false;
  return true;
};

export const PathSetSpace: Space<PathSet> = {
  empty: () => emptyPathSet(),

  isEmpty: (r: PathSet): boolean =>
    r !== ALL_PATHS && (r as Set<PathId>).size === 0,

  union: (a: PathSet, b: PathSet): PathSet => pathSetUnion(a, b),

  intersects: (interest: PathSet, dirty: PathSet): boolean => {
    if (interest === ALL_PATHS && dirty === ALL_PATHS) return true;
    if (interest === ALL_PATHS) return !PathSetSpace.isEmpty(dirty);
    if (dirty === ALL_PATHS) return !PathSetSpace.isEmpty(interest);
    // Both are Sets. Iterate the smaller, lookup in the larger.
    const [small, large] =
      (interest as Set<PathId>).size <= (dirty as Set<PathId>).size
        ? [interest as Set<PathId>, dirty as Set<PathId>]
        : [dirty as Set<PathId>, interest as Set<PathId>];
    for (const id of small) if (large.has(id)) return true;
    return false;
  },
};

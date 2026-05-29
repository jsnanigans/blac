// @dirtytalk/structural — core (no React)
export type { PathId, ConsumerId } from './types';
export { PathInterner } from './path-interner';
export {
  ALL_PATHS,
  emptyPathSet,
  pathSetUnion,
  pathSetEquals,
  PathSetSpace,
} from './path-set';
export type { PathSet, AllPaths } from './path-set';
export { trackRender } from './tracker';
export type { TrackResult } from './tracker';
export {
  diffAlongSkeleton,
  pathsFromPatch,
  changedPathsFromPatch,
  getAt,
} from './diff';
export { StructuralContainer } from './container';
export type { StructuralContainerOptions, DeepPartial } from './container';

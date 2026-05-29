import type { Space } from '@dirtytalk/engine';
import type { DirtyRegion } from './types';

export const RectSpace: Space<DirtyRegion> = {
  empty: () => {
    throw new Error('RectSpace.empty: not implemented (Phase 1)');
  },
  isEmpty: () => {
    throw new Error('RectSpace.isEmpty: not implemented (Phase 1)');
  },
  union: () => {
    throw new Error('RectSpace.union: not implemented (Phase 1)');
  },
  intersects: () => {
    throw new Error('RectSpace.intersects: not implemented (Phase 1)');
  },
};

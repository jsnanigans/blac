import type { Space } from '@dirtytalk/engine';
import type { DirtyRegion } from './types';
import { rectOverlaps } from './rect';

export const RectSpace: Space<DirtyRegion> = {
  empty: (): DirtyRegion => [],

  isEmpty: (r: DirtyRegion): boolean => r.length === 0,

  union: (a: DirtyRegion, b: DirtyRegion): DirtyRegion => {
    if (a.length === 0) return b; // safe under DirtyRegion = readonly Damage[]
    if (b.length === 0) return a; // safe under DirtyRegion = readonly Damage[]
    return [...a, ...b];
  },

  intersects: (interest: DirtyRegion, dirty: DirtyRegion): boolean => {
    if (interest.length === 0 || dirty.length === 0) return false;
    for (const i of interest) {
      for (const d of dirty) {
        if (rectOverlaps(i.rect, d.rect)) return true;
      }
    }
    return false;
  },
};

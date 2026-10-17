import type { Space } from '@dirtytalk/engine';
import type { Damage, DirtyRegion } from './types';
import { rectOverlaps } from './rect';

export const RectSpace: Space<DirtyRegion> = {
  empty: (): DirtyRegion => [],

  isEmpty: (r: DirtyRegion): boolean => r.length === 0,

  union: (a: DirtyRegion, b: DirtyRegion): DirtyRegion => {
    if (a.length === 0) return b; // safe under DirtyRegion = readonly Damage[]
    if (b.length === 0) return a; // safe under DirtyRegion = readonly Damage[]
    return a.concat(b);
  },

  // In-place accumulate for DirtyChannel's private accumulator: a burst of N
  // marks costs O(N) instead of the O(N²) of copying `union`.
  unionInto: (acc: DirtyRegion, b: DirtyRegion): DirtyRegion => {
    const out = acc as Damage[];
    for (let i = 0; i < b.length; i++) out.push(b[i]);
    return out;
  },

  // 'data' / 'layout' damage is pipeline work, not area: it intersects any
  // non-empty interest so a zero-size or off-screen node still gets its
  // rebuildData / doLayout pass.
  intersects: (interest: DirtyRegion, dirty: DirtyRegion): boolean => {
    if (interest.length === 0 || dirty.length === 0) return false;
    for (const d of dirty) {
      if (d.kind !== 'paint') return true;
      for (const i of interest) {
        if (rectOverlaps(i.rect, d.rect)) return true;
      }
    }
    return false;
  },
};

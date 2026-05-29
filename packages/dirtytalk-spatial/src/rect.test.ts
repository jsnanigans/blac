import { describe, expect, it } from 'vite-plus/test';
import {
  pointInRect,
  rectClamp,
  rectEquals,
  rectOverlaps,
  unionRects,
} from './rect';

describe('rectOverlaps', () => {
  it('returns true for overlapping rects', () => {
    expect(
      rectOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }),
    ).toBe(true);
  });

  it('returns false for disjoint rects', () => {
    expect(
      rectOverlaps(
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 20, y: 20, w: 10, h: 10 },
      ),
    ).toBe(false);
  });

  it('returns false for touching edges (open-interval semantics)', () => {
    // right edge of A = left edge of B
    expect(
      rectOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }),
    ).toBe(false);
  });

  it('returns true for identical rects', () => {
    expect(
      rectOverlaps({ x: 5, y: 5, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }),
    ).toBe(true);
  });

  it('returns true when one rect is fully inside the other', () => {
    expect(
      rectOverlaps({ x: 1, y: 1, w: 3, h: 3 }, { x: 0, y: 0, w: 10, h: 10 }),
    ).toBe(true);
  });

  it('returns false for zero-area rect (w=0)', () => {
    expect(
      rectOverlaps({ x: 5, y: 5, w: 0, h: 10 }, { x: 0, y: 0, w: 20, h: 20 }),
    ).toBe(false);
  });
});

describe('rectEquals', () => {
  it('returns true for identical rects', () => {
    expect(
      rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 4 }),
    ).toBe(true);
  });

  it('returns false when any single field differs', () => {
    expect(
      rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 9, y: 2, w: 3, h: 4 }),
    ).toBe(false);
    expect(
      rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 9, w: 3, h: 4 }),
    ).toBe(false);
    expect(
      rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 9, h: 4 }),
    ).toBe(false);
    expect(
      rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 9 }),
    ).toBe(false);
  });
});

describe('unionRects', () => {
  it('returns zero-area rect at origin for empty array', () => {
    expect(unionRects([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('returns a rect equal to the single input', () => {
    const r = { x: 5, y: 10, w: 20, h: 30 };
    expect(unionRects([r])).toEqual(r);
  });

  it('returns bounding box for two disjoint rects', () => {
    expect(
      unionRects([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 20, y: 20, w: 10, h: 10 },
      ]),
    ).toEqual({
      x: 0,
      y: 0,
      w: 30,
      h: 30,
    });
  });

  it('returns bounding box for two overlapping rects', () => {
    expect(
      unionRects([
        { x: 0, y: 0, w: 15, h: 15 },
        { x: 10, y: 10, w: 15, h: 15 },
      ]),
    ).toEqual({
      x: 0,
      y: 0,
      w: 25,
      h: 25,
    });
  });

  it('returns correct bounding box for three rects', () => {
    expect(
      unionRects([
        { x: 5, y: 5, w: 10, h: 10 },
        { x: 0, y: 20, w: 5, h: 5 },
        { x: 30, y: 0, w: 10, h: 8 },
      ]),
    ).toEqual({ x: 0, y: 0, w: 40, h: 25 });
  });
});

describe('pointInRect', () => {
  const r = { x: 10, y: 20, w: 30, h: 40 };

  // In-rect cases
  it('returns true for a point inside the rect', () => {
    expect(pointInRect(20, 30, r)).toBe(true);
  });

  it('returns true for the exact top-left corner (inclusive)', () => {
    expect(pointInRect(10, 20, r)).toBe(true);
  });

  it('returns true for a point one pixel inside the bottom-right corner', () => {
    // bottom-right interior: (x+w-1, y+h-1) = (39, 59)
    expect(pointInRect(39, 59, r)).toBe(true);
  });

  it('returns true for a point at the center of the rect', () => {
    expect(pointInRect(25, 40, r)).toBe(true);
  });

  // Out-of-rect cases (one per side)
  it('returns false for a point left of the rect', () => {
    expect(pointInRect(9, 30, r)).toBe(false);
  });

  it('returns false for a point right of the rect (exact right edge, exclusive)', () => {
    // x = r.x + r.w = 40 is outside
    expect(pointInRect(40, 30, r)).toBe(false);
  });

  it('returns false for a point above the rect', () => {
    expect(pointInRect(20, 19, r)).toBe(false);
  });

  it('returns false for a point below the rect (exact bottom edge, exclusive)', () => {
    // y = r.y + r.h = 60 is outside
    expect(pointInRect(20, 60, r)).toBe(false);
  });

  // Zero-area rect
  it('returns false for any point in a zero-area rect (w=0)', () => {
    expect(pointInRect(5, 5, { x: 5, y: 5, w: 0, h: 10 })).toBe(false);
  });

  it('returns false for any point in a zero-area rect (h=0)', () => {
    expect(pointInRect(5, 5, { x: 5, y: 5, w: 10, h: 0 })).toBe(false);
  });
});

describe('rectClamp', () => {
  it('returns inner unchanged when fully inside outer', () => {
    const inner = { x: 2, y: 2, w: 5, h: 5 };
    expect(rectClamp(inner, { x: 0, y: 0, w: 20, h: 20 })).toEqual(inner);
  });

  it('clips inner to overlap when partially outside outer', () => {
    expect(
      rectClamp({ x: 8, y: 8, w: 10, h: 10 }, { x: 0, y: 0, w: 15, h: 15 }),
    ).toEqual({
      x: 8,
      y: 8,
      w: 7,
      h: 7,
    });
  });

  it('returns zero-area result when inner is fully outside outer', () => {
    const result = rectClamp(
      { x: 50, y: 50, w: 10, h: 10 },
      { x: 0, y: 0, w: 20, h: 20 },
    );
    expect(result.w).toBe(0);
    expect(result.h).toBe(0);
  });

  it('returns equal result when inner equals outer', () => {
    const r = { x: 5, y: 5, w: 10, h: 10 };
    expect(rectClamp(r, r)).toEqual(r);
  });
});

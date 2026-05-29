import type { Rect } from './types';

export const rectOverlaps = (a: Rect, b: Rect): boolean =>
  a.w > 0 &&
  a.h > 0 &&
  b.w > 0 &&
  b.h > 0 &&
  a.x < b.x + b.w &&
  b.x < a.x + a.w &&
  a.y < b.y + b.h &&
  b.y < a.y + a.h;

export const rectEquals = (a: Rect, b: Rect): boolean =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

export const unionRects = (rects: readonly Rect[]): Rect => {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].w;
  let maxY = rects[0].y + rects[0].h;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i];
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const rectClamp = (inner: Rect, outer: Rect): Rect => {
  const x1 = Math.max(inner.x, outer.x);
  const y1 = Math.max(inner.y, outer.y);
  const x2 = Math.min(inner.x + inner.w, outer.x + outer.w);
  const y2 = Math.min(inner.y + inner.h, outer.y + outer.h);
  return { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) };
};

/**
 * Half-open point-in-rect test: [x, x+w) × [y, y+h).
 * Matches CSS pixel-grid convention — top-left corner is in, bottom-right is out.
 */
export const pointInRect = (x: number, y: number, r: Rect): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

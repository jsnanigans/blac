import { describe, expect, it } from 'vite-plus/test';
import { RectSpace } from './rect-space';
import type { Damage, DamageKind } from './types';

const damage = (
  x: number,
  y: number,
  w: number,
  h: number,
  kind: DamageKind = 'paint',
): Damage => ({ rect: { x, y, w, h }, kind });

describe('RectSpace', () => {
  // 1. empty() returns an empty array
  it('empty() returns an empty array', () => {
    expect(RectSpace.empty()).toEqual([]);
  });

  // 2. empty() returns a fresh array on each call
  it('empty() returns a fresh array on each call', () => {
    expect(RectSpace.empty()).not.toBe(RectSpace.empty());
  });

  // 3. isEmpty(empty()) is true
  it('isEmpty(empty()) is true', () => {
    expect(RectSpace.isEmpty(RectSpace.empty())).toBe(true);
  });

  // 4. isEmpty([damage(...)]) is false
  it('isEmpty([damage(...)]) is false', () => {
    expect(RectSpace.isEmpty([damage(0, 0, 10, 10)])).toBe(false);
  });

  // 5. union(empty(), r) returns r by reference
  it('union(empty(), r) returns r (same reference, short-circuit)', () => {
    const r = [damage(0, 0, 10, 10)];
    expect(RectSpace.union([], r)).toBe(r);
  });

  // 6. union(r, empty()) returns r by reference
  it('union(r, empty()) returns r (same reference, short-circuit)', () => {
    const r = [damage(0, 0, 10, 10)];
    expect(RectSpace.union(r, [])).toBe(r);
  });

  // 7. union of two non-empty arrays produces concatenated result
  it('union(a, b) concatenates non-empty arrays', () => {
    const a = [damage(0, 0, 5, 5), damage(10, 10, 5, 5)];
    const b = [damage(20, 20, 5, 5)];
    const result = RectSpace.union(a, b);
    expect(result).toHaveLength(a.length + b.length);
    expect(result).toEqual([...a, ...b]);
  });

  // 8. union does not mutate inputs
  it('union does not mutate inputs', () => {
    const a = [damage(0, 0, 5, 5)];
    const b = [damage(10, 10, 5, 5)];
    const aCopy = [...a];
    const bCopy = [...b];
    RectSpace.union(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });

  // 9. intersects(empty(), r) is false for any r (including non-empty)
  it('intersects(empty(), nonEmpty) is false', () => {
    expect(RectSpace.intersects([], [damage(0, 0, 10, 10)])).toBe(false);
  });

  // 10. intersects(r, empty()) is false
  it('intersects(nonEmpty, empty()) is false', () => {
    expect(RectSpace.intersects([damage(0, 0, 10, 10)], [])).toBe(false);
  });

  // 11. intersects of overlapping single-damage arrays → true
  it('intersects of overlapping single-damage arrays is true', () => {
    const interest = [damage(0, 0, 10, 10)];
    const dirty = [damage(5, 5, 10, 10)];
    expect(RectSpace.intersects(interest, dirty)).toBe(true);
  });

  // 12. intersects of disjoint single-damage arrays → false
  it('intersects of disjoint single-damage arrays is false', () => {
    const interest = [damage(0, 0, 5, 5)];
    const dirty = [damage(10, 10, 5, 5)];
    expect(RectSpace.intersects(interest, dirty)).toBe(false);
  });

  // 13. intersects of multi-damage arrays where exactly one pair overlaps → true
  it('intersects of multi-damage arrays with one overlapping pair is true', () => {
    const interest = [damage(0, 0, 5, 5), damage(50, 50, 5, 5)];
    const dirty = [damage(100, 100, 5, 5), damage(52, 52, 5, 5)];
    expect(RectSpace.intersects(interest, dirty)).toBe(true);
  });

  // 14. intersects of multi-damage arrays where no pair overlaps → false
  it('intersects of multi-damage arrays with no overlapping pairs is false', () => {
    const interest = [damage(0, 0, 5, 5), damage(20, 20, 5, 5)];
    const dirty = [damage(100, 100, 5, 5), damage(200, 200, 5, 5)];
    expect(RectSpace.intersects(interest, dirty)).toBe(false);
  });

  // 15. intersects doesn't care about DamageKind — same-rect, different-kind damages still intersect
  it('intersects ignores DamageKind — different kinds with same rect still intersect', () => {
    const interest = [damage(0, 0, 10, 10, 'paint')];
    const dirty = [damage(0, 0, 10, 10, 'layout')];
    expect(RectSpace.intersects(interest, dirty)).toBe(true);

    const interest2 = [damage(0, 0, 10, 10, 'data')];
    const dirty2 = [damage(0, 0, 10, 10, 'paint')];
    expect(RectSpace.intersects(interest2, dirty2)).toBe(true);
  });
});

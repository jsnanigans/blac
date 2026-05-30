import { describe, it, expect } from 'vitest';
import { extractChanges } from './extractChanges';

describe('extractChanges', () => {
  it('returns undefined for identical references', () => {
    const obj = { a: 1 };
    expect(extractChanges(obj, obj)).toBeUndefined();
  });

  it('returns undefined when deep-equal primitives are unchanged', () => {
    expect(extractChanges(1, 1)).toBeUndefined();
    expect(extractChanges('x', 'x')).toBeUndefined();
  });

  it('returns the new primitive when changed', () => {
    expect(extractChanges(1, 2)).toBe(2);
    expect(extractChanges('a', 'b')).toBe('b');
  });

  it('returns only the changed keys of an object', () => {
    expect(extractChanges({ a: 1, b: 2, c: 3 }, { a: 1, b: 20, c: 3 })).toEqual(
      { b: 20 },
    );
  });

  // Regression: equal-length arrays must report the changed ELEMENTS, not the
  // whole array. Previously this branch returned `current`, so a one-element
  // change was rendered as "the entire array changed".
  it('returns only the changed elements of an equal-length array', () => {
    const result = extractChanges([1, 2, 3], [1, 99, 3]);
    expect(result).not.toBe(3 /* sanity */);
    // index 1 changed; indices 0 and 2 are absent (sparse), not the full array
    expect(result[1]).toBe(99);
    expect(0 in result).toBe(false);
    expect(2 in result).toBe(false);
  });

  it('returns undefined when an equal-length array is unchanged', () => {
    expect(extractChanges([1, 2, 3], [1, 2, 3])).toBeUndefined();
  });

  it('returns the whole array when lengths differ', () => {
    expect(extractChanges([1, 2], [1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('recurses into nested arrays of objects', () => {
    const result = extractChanges(
      { items: [{ n: 1 }, { n: 2 }] },
      { items: [{ n: 1 }, { n: 5 }] },
    );
    expect(result.items[1]).toEqual({ n: 5 });
    expect(0 in result.items).toBe(false);
  });
});

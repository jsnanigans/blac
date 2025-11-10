import { describe, it, expect } from 'vitest';
import { deepEqual, shallowEqual } from './equality';

describe('deepEqual', () => {
  describe('primitives', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('hello', 'world')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
    });

    it('should return false for different types', () => {
      expect(deepEqual(1, '1')).toBe(false);
      expect(deepEqual(0, false)).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(1, null)).toBe(false);
      expect(deepEqual(1, undefined)).toBe(false);
    });
  });

  describe('arrays', () => {
    it('should return true for identical arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([], [])).toBe(true);
      expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('should return false for different arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('should handle nested arrays', () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true);
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 5],
          ],
        ),
      ).toBe(false);
    });

    it('should return false for array vs non-array', () => {
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
    });
  });

  describe('objects', () => {
    it('should return true for identical objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({}, {})).toBe(true);
    });

    it('should return false for different objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('should handle nested objects', () => {
      expect(
        deepEqual(
          { user: { name: 'Alice', age: 30 } },
          { user: { name: 'Alice', age: 30 } },
        ),
      ).toBe(true);
      expect(
        deepEqual(
          { user: { name: 'Alice', age: 30 } },
          { user: { name: 'Alice', age: 31 } },
        ),
      ).toBe(false);
    });

    it('should handle objects with different key order', () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    });
  });

  describe('Date', () => {
    it('should return true for equal dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-01');
      expect(deepEqual(date1, date2)).toBe(true);
    });

    it('should return false for different dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      expect(deepEqual(date1, date2)).toBe(false);
    });

    it('should return false for date vs non-date', () => {
      expect(deepEqual(new Date('2024-01-01'), '2024-01-01')).toBe(false);
    });
  });

  describe('Set', () => {
    it('should return true for equal Sets', () => {
      expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
      expect(deepEqual(new Set(), new Set())).toBe(true);
    });

    it('should return false for different Sets', () => {
      expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 4]))).toBe(false);
      expect(deepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
    });

    it('should return false for Set vs Array', () => {
      expect(deepEqual(new Set([1, 2, 3]), [1, 2, 3])).toBe(false);
    });
  });

  describe('Map', () => {
    it('should return true for equal Maps', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const map2 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      expect(deepEqual(map1, map2)).toBe(true);
    });

    it('should return false for different Maps', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const map2 = new Map([
        ['a', 1],
        ['b', 3],
      ]);
      expect(deepEqual(map1, map2)).toBe(false);
    });

    it('should handle nested values in Maps', () => {
      const map1 = new Map([['user', { name: 'Alice' }]]);
      const map2 = new Map([['user', { name: 'Alice' }]]);
      const map3 = new Map([['user', { name: 'Bob' }]]);
      expect(deepEqual(map1, map2)).toBe(true);
      expect(deepEqual(map1, map3)).toBe(false);
    });

    it('should return false for Map vs Object', () => {
      expect(deepEqual(new Map([['a', 1]]), { a: 1 })).toBe(false);
    });
  });

  describe('circular references', () => {
    it('should handle circular object references', () => {
      const obj1: any = { a: 1 };
      obj1.self = obj1;

      const obj2: any = { a: 1 };
      obj2.self = obj2;

      expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should handle circular array references', () => {
      const arr1: any = [1, 2];
      arr1.push(arr1);

      const arr2: any = [1, 2];
      arr2.push(arr2);

      expect(deepEqual(arr1, arr2)).toBe(true);
    });

    it('should handle complex circular references', () => {
      const obj1: any = { a: 1, nested: {} };
      obj1.nested.parent = obj1;

      const obj2: any = { a: 1, nested: {} };
      obj2.nested.parent = obj2;

      expect(deepEqual(obj1, obj2)).toBe(true);
    });
  });

  describe('mixed complex structures', () => {
    it('should handle deeply nested mixed structures', () => {
      const obj1 = {
        users: [
          { name: 'Alice', meta: { age: 30, tags: new Set(['admin']) } },
          { name: 'Bob', meta: { age: 25, tags: new Set(['user']) } },
        ],
        settings: new Map([
          ['theme', 'dark'],
          ['lang', 'en'],
        ]),
        createdAt: new Date('2024-01-01'),
      };

      const obj2 = {
        users: [
          { name: 'Alice', meta: { age: 30, tags: new Set(['admin']) } },
          { name: 'Bob', meta: { age: 25, tags: new Set(['user']) } },
        ],
        settings: new Map([
          ['theme', 'dark'],
          ['lang', 'en'],
        ]),
        createdAt: new Date('2024-01-01'),
      };

      expect(deepEqual(obj1, obj2)).toBe(true);
    });
  });
});

describe('shallowEqual', () => {
  it('should return true for identical primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('hello', 'hello')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual('hello', 'world')).toBe(false);
  });

  it('should return true for shallow equal objects', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('should use reference equality for nested objects', () => {
    const nested = { x: 1 };
    const obj1 = { a: nested };
    const obj2 = { a: nested };
    const obj3 = { a: { x: 1 } };

    expect(shallowEqual(obj1, obj2)).toBe(true); // Same reference
    expect(shallowEqual(obj1, obj3)).toBe(false); // Different reference
  });

  it('should return false for null/undefined mismatches', () => {
    expect(shallowEqual(null, undefined)).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
    expect(shallowEqual({}, undefined)).toBe(false);
  });

  it('should handle empty objects', () => {
    expect(shallowEqual({}, {})).toBe(true);
  });

  it('should handle objects with different key order', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });
});

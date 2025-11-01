/**
 * Equality Tests
 */

import { describe, it, expect } from 'vitest';
import { deepEqual, shallowEqual } from './equality';

describe('Equality Utils', () => {
  describe('deepEqual()', () => {
    describe('Primitives', () => {
      it('should compare numbers', () => {
        expect(deepEqual(1, 1)).toBe(true);
        expect(deepEqual(1, 2)).toBe(false);
        expect(deepEqual(0, -0)).toBe(true);
      });

      it('should compare strings', () => {
        expect(deepEqual('test', 'test')).toBe(true);
        expect(deepEqual('test', 'Test')).toBe(false);
      });

      it('should compare booleans', () => {
        expect(deepEqual(true, true)).toBe(true);
        expect(deepEqual(false, false)).toBe(true);
        expect(deepEqual(true, false)).toBe(false);
      });

      it('should handle null', () => {
        expect(deepEqual(null, null)).toBe(true);
        expect(deepEqual(null, undefined)).toBe(false);
        expect(deepEqual(null, 0)).toBe(false);
      });

      it('should handle undefined', () => {
        expect(deepEqual(undefined, undefined)).toBe(true);
        expect(deepEqual(undefined, null)).toBe(false);
      });
    });

    describe('Objects', () => {
      it('should compare simple objects', () => {
        expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
        expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
        expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
      });

      it('should compare nested objects', () => {
        expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
          true,
        );
        expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
          false,
        );
      });

      it('should check object key counts', () => {
        expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
        expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      });

      it('should handle object reference equality', () => {
        const obj = { a: 1 };
        expect(deepEqual(obj, obj)).toBe(true);
      });

      it('should handle empty objects', () => {
        expect(deepEqual({}, {})).toBe(true);
      });
    });

    describe('Arrays', () => {
      it('should compare simple arrays', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
        expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
      });

      it('should compare nested arrays', () => {
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

      it('should compare arrays with objects', () => {
        expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(
          true,
        );
        expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(
          false,
        );
      });

      it('should handle empty arrays', () => {
        expect(deepEqual([], [])).toBe(true);
      });
    });

    describe('Dates', () => {
      it('should compare dates', () => {
        const date1 = new Date('2024-01-01');
        const date2 = new Date('2024-01-01');
        const date3 = new Date('2024-01-02');

        expect(deepEqual(date1, date2)).toBe(true);
        expect(deepEqual(date1, date3)).toBe(false);
      });
    });

    describe('Sets', () => {
      it('should compare sets', () => {
        expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
        expect(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 4]))).toBe(false);
        expect(deepEqual(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
      });

      it('should handle empty sets', () => {
        expect(deepEqual(new Set(), new Set())).toBe(true);
      });
    });

    describe('Maps', () => {
      it('should compare maps', () => {
        const map1 = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const map2 = new Map([
          ['a', 1],
          ['b', 2],
        ]);
        const map3 = new Map([
          ['a', 1],
          ['b', 3],
        ]);

        expect(deepEqual(map1, map2)).toBe(true);
        expect(deepEqual(map1, map3)).toBe(false);
      });

      it('should handle empty maps', () => {
        expect(deepEqual(new Map(), new Map())).toBe(true);
      });

      it('should compare maps with object values', () => {
        const map1 = new Map([['key', { value: 1 }]]);
        const map2 = new Map([['key', { value: 1 }]]);
        const map3 = new Map([['key', { value: 2 }]]);

        expect(deepEqual(map1, map2)).toBe(true);
        expect(deepEqual(map1, map3)).toBe(false);
      });
    });

    describe('Circular References', () => {
      it('should handle circular object references', () => {
        const obj1: any = { a: 1 };
        obj1.self = obj1;

        const obj2: any = { a: 1 };
        obj2.self = obj2;

        expect(deepEqual(obj1, obj2)).toBe(true);
      });

      it('should handle circular array references', () => {
        const arr1: any[] = [1, 2];
        arr1.push(arr1);

        const arr2: any[] = [1, 2];
        arr2.push(arr2);

        expect(deepEqual(arr1, arr2)).toBe(true);
      });
    });

    describe('Type Mismatches', () => {
      it('should return false for different types', () => {
        expect(deepEqual(1, '1' as any)).toBe(false);
        expect(deepEqual([], {})).toBe(false);
        expect(deepEqual(null, undefined)).toBe(false);
        expect(deepEqual(0, false as any)).toBe(false);
      });
    });
  });

  describe('shallowEqual()', () => {
    it('should compare primitive values', () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual('test', 'test')).toBe(true);
      expect(shallowEqual(true, true)).toBe(true);
    });

    it('should use reference equality for objects', () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);

      // shallowEqual checks keys and values, so same structure = equal
      const obj1 = { a: 1 };
      const obj2 = { a: 1 };
      expect(shallowEqual(obj1, obj2)).toBe(true); // Same keys and values
    });

    it('should compare object keys and values', () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 2, c: 3 };

      expect(shallowEqual(obj1, obj2)).toBe(true);
    });

    it('should detect different values', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };

      expect(shallowEqual(obj1, obj2)).toBe(false);
    });

    it('should detect different keys', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, c: 2 };

      expect(shallowEqual(obj1, obj2 as any)).toBe(false);
    });

    it('should detect different key counts', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1 };

      expect(shallowEqual(obj1, obj2)).toBe(false);
    });

    it('should not deep compare nested objects', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { b: 1 } };

      // Different references for nested object
      expect(shallowEqual(obj1, obj2)).toBe(false);

      // Same reference for nested object
      const nested = { b: 1 };
      const obj3 = { a: nested };
      const obj4 = { a: nested };
      expect(shallowEqual(obj3, obj4)).toBe(true);
    });

    it('should handle null', () => {
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(null, {})).toBe(false);
      expect(shallowEqual({}, null)).toBe(false);
    });

    it('should handle arrays', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];

      // Arrays are objects, so shallowEqual compares their keys (indices) and values
      expect(shallowEqual(arr1, arr1)).toBe(true);
      expect(shallowEqual(arr1, arr2)).toBe(true); // Same indices and values
    });
  });
});

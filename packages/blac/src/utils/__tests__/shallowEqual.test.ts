import { describe, it, expect } from 'vitest';
import { shallowEqual } from '../shallowEqual';

describe('shallowEqual', () => {
  describe('Primitive values', () => {
    it('should return true for identical primitives', () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual('hello', 'hello')).toBe(true);
      expect(shallowEqual(true, true)).toBe(true);
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(undefined, undefined)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(shallowEqual(1, 2)).toBe(false);
      expect(shallowEqual('hello', 'world')).toBe(false);
      expect(shallowEqual(true, false)).toBe(false);
      expect(shallowEqual(null, undefined)).toBe(false);
      expect(shallowEqual(0, false)).toBe(false);
    });

    it('should handle special numeric values using Object.is', () => {
      expect(shallowEqual(NaN, NaN)).toBe(true); // Object.is(NaN, NaN) is true
      expect(shallowEqual(0, -0)).toBe(false); // Object.is can distinguish +0 and -0
      expect(shallowEqual(-0, -0)).toBe(true);
      expect(shallowEqual(Infinity, Infinity)).toBe(true);
      expect(shallowEqual(-Infinity, -Infinity)).toBe(true);
      expect(shallowEqual(Infinity, -Infinity)).toBe(false);
    });
  });

  describe('Object comparison', () => {
    it('should return true for objects with same properties', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(
        shallowEqual({ name: 'John', age: 30 }, { name: 'John', age: 30 }),
      ).toBe(true);
      expect(shallowEqual({}, {})).toBe(true);
    });

    it('should return false for objects with different values', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(shallowEqual({ name: 'John' }, { name: 'Jane' })).toBe(false);
    });

    it('should return false for objects with different keys', () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('should return true for same object reference', () => {
      const obj = { a: 1, b: 2 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });

    it('should only compare one level deep (shallow)', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      expect(shallowEqual(obj1, obj2)).toBe(false); // Different object references for b

      const sharedNested = { c: 2 };
      const obj3 = { a: 1, b: sharedNested };
      const obj4 = { a: 1, b: sharedNested };
      expect(shallowEqual(obj3, obj4)).toBe(true); // Same reference for b
    });

    it('should handle objects with null/undefined values', () => {
      expect(shallowEqual({ a: null }, { a: null })).toBe(true);
      expect(shallowEqual({ a: undefined }, { a: undefined })).toBe(true);
      expect(shallowEqual({ a: null }, { a: undefined })).toBe(false);
    });
  });

  describe('Array comparison', () => {
    it('should compare arrays shallowly', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(shallowEqual([], [])).toBe(true);
    });

    it('should return true for same array reference', () => {
      const arr = [1, 2, 3];
      expect(shallowEqual(arr, arr)).toBe(true);
    });

    it('should handle nested arrays shallowly', () => {
      const nested = [4, 5];
      expect(shallowEqual([1, [2, 3]], [1, [2, 3]])).toBe(false); // Different array references
      expect(shallowEqual([1, nested], [1, nested])).toBe(true); // Same reference
    });
  });

  describe('Mixed types', () => {
    it('should return false when comparing different types', () => {
      // Arrays and objects with same keys will be considered equal by shallowEqual
      // since it only checks enumerable keys
      const arr: any[] = [];
      const obj = {};
      expect(shallowEqual(obj, arr)).toBe(true); // Both have 0 enumerable keys

      const arr2 = [1, 2];
      const obj2 = { 0: 1, 1: 2 };
      expect(shallowEqual(obj2, arr2)).toBe(true); // Same enumerable keys and values

      // These should return false because of type differences
      expect(
        shallowEqual('hello', { 0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o' }),
      ).toBe(false);
      expect(shallowEqual(42, { valueOf: () => 42 })).toBe(false);
    });

    it('should return false when comparing objects with primitives', () => {
      expect(shallowEqual({}, null)).toBe(false);
      expect(shallowEqual({}, undefined)).toBe(false);
      expect(shallowEqual({}, 'object')).toBe(false);
      expect(shallowEqual({}, 123)).toBe(false);
      expect(shallowEqual({}, true)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle objects with prototype properties correctly', () => {
      const obj1 = Object.create({ inherited: true });
      obj1.own = 'property';

      const obj2 = { own: 'property' };

      expect(shallowEqual(obj1, obj2)).toBe(true); // Only compares own properties
    });

    it('should handle objects with Symbol properties', () => {
      const sym = Symbol('test');
      const obj1 = { [sym]: 'value', a: 1 };
      const obj2 = { [sym]: 'value', a: 1 };

      // Symbol properties are not enumerated by Object.keys
      expect(shallowEqual(obj1, obj2)).toBe(true);
    });

    it('should handle Date objects', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-01');
      const sameDate = date1;

      // Date objects have no enumerable properties, so they're considered equal
      expect(shallowEqual(date1, date2)).toBe(true); // Both have 0 enumerable keys
      expect(shallowEqual(date1, sameDate)).toBe(true); // Same reference
    });

    it('should handle RegExp objects', () => {
      const regex1 = /test/g;
      const regex2 = /test/g;
      const sameRegex = regex1;

      // RegExp objects have no enumerable properties, so they're considered equal
      expect(shallowEqual(regex1, regex2)).toBe(true); // Both have 0 enumerable keys
      expect(shallowEqual(regex1, sameRegex)).toBe(true); // Same reference
    });

    it('should handle functions', () => {
      const fn1 = () => {};
      const fn2 = () => {};
      const sameFn = fn1;

      expect(shallowEqual(fn1, fn2)).toBe(false);
      expect(shallowEqual(fn1, sameFn)).toBe(true);
    });
  });
});

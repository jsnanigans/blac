/**
 * Immutable Utils Tests
 */

import { describe, it, expect } from 'vitest';
import { cloneDeep, deepFreeze } from './immutable';

describe('Immutable Utils', () => {
  describe('cloneDeep()', () => {
    it('should clone primitives', () => {
      expect(cloneDeep(1)).toBe(1);
      expect(cloneDeep('test')).toBe('test');
      expect(cloneDeep(true)).toBe(true);
      expect(cloneDeep(null)).toBe(null);
      expect(cloneDeep(undefined)).toBe(undefined);
    });

    it('should clone simple objects', () => {
      const obj = { a: 1, b: 2 };
      const clone = cloneDeep(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj); // Different reference
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const clone = cloneDeep(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      expect(clone.a).not.toBe(obj.a);
      expect(clone.a.b).not.toBe(obj.a.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, 3];
      const clone = cloneDeep(arr);

      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
    });

    it('should clone nested arrays', () => {
      const arr = [
        [1, 2],
        [3, 4],
      ];
      const clone = cloneDeep(arr);

      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[0]).not.toBe(arr[0]);
    });

    it('should clone Date objects', () => {
      const date = new Date('2024-01-01');
      const clone = cloneDeep(date);

      expect(clone.getTime()).toBe(date.getTime());
      expect(clone).not.toBe(date);
    });

    it('should clone Sets', () => {
      const set = new Set([1, 2, 3]);
      const clone = cloneDeep(set);

      expect(clone).toEqual(set);
      expect(clone).not.toBe(set);
    });

    it('should clone Maps', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const clone = cloneDeep(map);

      expect(clone).toEqual(map);
      expect(clone).not.toBe(map);
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const clone = cloneDeep(obj);

      expect(clone.a).toBe(1);
      expect(clone.self).toBe(clone); // Circular reference maintained
      expect(clone).not.toBe(obj);
    });

    it('should handle circular references in arrays', () => {
      const arr: any[] = [1, 2];
      arr.push(arr);

      const clone = cloneDeep(arr);

      expect(clone[0]).toBe(1);
      expect(clone[1]).toBe(2);
      expect(clone[2]).toBe(clone); // Circular reference maintained
      expect(clone).not.toBe(arr);
    });

    it('should clone complex nested structures', () => {
      const obj = {
        num: 42,
        str: 'test',
        arr: [1, 2, { nested: true }],
        obj: { deep: { value: 'hello' } },
        date: new Date(),
        set: new Set([1, 2]),
        map: new Map([['key', 'value']]),
      };

      const clone = cloneDeep(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
      expect(clone.arr).not.toBe(obj.arr);
      expect(clone.obj).not.toBe(obj.obj);
      expect(clone.date).not.toBe(obj.date);
      expect(clone.set).not.toBe(obj.set);
      expect(clone.map).not.toBe(obj.map);
    });

    it('should preserve prototypes', () => {
      class CustomClass {
        constructor(public value: number) {}
      }

      const obj = new CustomClass(42);
      const clone = cloneDeep(obj);

      expect(clone.value).toBe(42);
      expect(Object.getPrototypeOf(clone)).toBe(Object.getPrototypeOf(obj));
    });

    it('should handle empty objects and arrays', () => {
      expect(cloneDeep({})).toEqual({});
      expect(cloneDeep([])).toEqual([]);
    });
  });

  describe('deepFreeze()', () => {
    it('should return object unchanged when disabled (default)', () => {
      const obj = { a: 1, b: { c: 2 } };
      const frozen = deepFreeze(obj);

      expect(frozen).toBe(obj); // Same reference
      expect(Object.isFrozen(obj)).toBe(false);
    });

    it('should freeze object when enabled', () => {
      const obj = { a: 1 };
      const frozen = deepFreeze(obj, new WeakSet(), true);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should deep freeze nested objects when enabled', () => {
      const obj = { a: { b: { c: 1 } } };
      deepFreeze(obj, new WeakSet(), true);

      expect(Object.isFrozen(obj)).toBe(true);
      expect(Object.isFrozen(obj.a)).toBe(true);
      expect(Object.isFrozen(obj.a.b)).toBe(true);
    });

    it('should prevent modifications when frozen', () => {
      const obj: any = { a: 1 };
      deepFreeze(obj, new WeakSet(), true);

      expect(() => {
        obj.a = 2;
      }).toThrow();
    });

    it('should handle circular references when enabled', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      expect(() => deepFreeze(obj, new WeakSet(), true)).not.toThrow();
      expect(Object.isFrozen(obj)).toBe(true);
    });

    it('should handle already frozen objects', () => {
      const obj = Object.freeze({ a: 1 });

      expect(() => deepFreeze(obj, new WeakSet(), true)).not.toThrow();
    });

    it('should handle primitives', () => {
      expect(deepFreeze(1, new WeakSet(), true)).toBe(1);
      expect(deepFreeze('test', new WeakSet(), true)).toBe('test');
      expect(deepFreeze(null, new WeakSet(), true)).toBe(null);
    });

    it('should be disabled by default for proxy compatibility', () => {
      const obj = { a: 1, b: { c: 2 } };
      const result = deepFreeze(obj);

      // Should not freeze when disabled
      expect(Object.isFrozen(result)).toBe(false);
      expect(result).toBe(obj);

      // Should still be mutable
      obj.a = 999;
      expect(obj.a).toBe(999);
    });
  });

  describe('Integration Scenarios', () => {
    it('should clone then freeze independently', () => {
      const original = { a: 1, b: { c: 2 } };
      const clone = cloneDeep(original);

      deepFreeze(clone, new WeakSet(), true);

      expect(Object.isFrozen(clone)).toBe(true);
      expect(Object.isFrozen(original)).toBe(false);

      // Original should still be mutable
      original.a = 999;
      expect(original.a).toBe(999);
      expect(clone.a).toBe(1);
    });

    it('should handle complex state management scenarios', () => {
      interface State {
        count: number;
        user: { name: string; age: number };
        items: number[];
      }

      const state: State = {
        count: 0,
        user: { name: 'John', age: 30 },
        items: [1, 2, 3],
      };

      // Clone for next state
      const nextState = cloneDeep(state);
      nextState.count++;
      nextState.items.push(4);

      // States should be independent
      expect(state.count).toBe(0);
      expect(nextState.count).toBe(1);
      expect(state.items.length).toBe(3);
      expect(nextState.items.length).toBe(4);
    });
  });
});

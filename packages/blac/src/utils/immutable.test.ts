import { describe, it, expect } from 'vitest';
import { cloneDeep, deepFreeze } from './immutable';

describe('cloneDeep', () => {
  describe('primitives', () => {
    it('should return primitives as-is', () => {
      expect(cloneDeep(1)).toBe(1);
      expect(cloneDeep('hello')).toBe('hello');
      expect(cloneDeep(true)).toBe(true);
      expect(cloneDeep(null)).toBe(null);
      expect(cloneDeep(undefined)).toBe(undefined);
    });
  });

  describe('arrays', () => {
    it('should create a new array instance', () => {
      const original = [1, 2, 3];
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should deep clone nested arrays', () => {
      const original = [
        [1, 2],
        [3, 4],
      ];
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[0]).not.toBe(original[0]);
      expect(cloned[1]).not.toBe(original[1]);
    });

    it('should allow modification without affecting original', () => {
      const original = [
        [1, 2],
        [3, 4],
      ];
      const cloned = cloneDeep(original);
      cloned[0][0] = 999;
      expect(original[0][0]).toBe(1);
      expect(cloned[0][0]).toBe(999);
    });
  });

  describe('objects', () => {
    it('should create a new object instance', () => {
      const original = { a: 1, b: 2 };
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should deep clone nested objects', () => {
      const original = { user: { name: 'Alice', age: 30 } };
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.user).not.toBe(original.user);
    });

    it('should allow modification without affecting original', () => {
      const original = { user: { name: 'Alice', age: 30 } };
      const cloned = cloneDeep(original);
      cloned.user.name = 'Bob';
      expect(original.user.name).toBe('Alice');
      expect(cloned.user.name).toBe('Bob');
    });

    it('should preserve prototype chain', () => {
      class CustomClass {
        constructor(public value: number) {}
      }
      const original = new CustomClass(42);
      const cloned = cloneDeep(original);
      expect(cloned).toBeInstanceOf(CustomClass);
      expect(cloned.value).toBe(42);
      expect(cloned).not.toBe(original);
    });
  });

  describe('Date', () => {
    it('should clone Date objects', () => {
      const original = new Date(2024, 0, 1);
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned).toBeInstanceOf(Date);
    });

    it('should allow modification without affecting original', () => {
      const original = new Date(2024, 0, 1);
      const cloned = cloneDeep(original);
      cloned.setFullYear(2025);
      expect(original.getFullYear()).toBe(2024);
      expect(cloned.getFullYear()).toBe(2025);
    });
  });

  describe('Set', () => {
    it('should clone Set instances', () => {
      const original = new Set([1, 2, 3]);
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned).toBeInstanceOf(Set);
    });

    it('should deep clone Set values', () => {
      const original = new Set([{ a: 1 }, { b: 2 }]);
      const cloned = cloneDeep(original);
      const originalArray = Array.from(original);
      const clonedArray = Array.from(cloned);
      expect(clonedArray[0]).toEqual(originalArray[0]);
      expect(clonedArray[0]).not.toBe(originalArray[0]);
    });

    it('should allow modification without affecting original', () => {
      const original = new Set([1, 2, 3]);
      const cloned = cloneDeep(original);
      cloned.add(4);
      expect(original.has(4)).toBe(false);
      expect(cloned.has(4)).toBe(true);
    });
  });

  describe('Map', () => {
    it('should clone Map instances', () => {
      const original = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned).toBeInstanceOf(Map);
    });

    it('should deep clone Map keys and values', () => {
      const keyObj = { id: 1 };
      const valObj = { name: 'Alice' };
      const original = new Map([[keyObj, valObj]]);
      const cloned = cloneDeep(original);

      const [[clonedKey, clonedVal]] = Array.from(cloned.entries());
      expect(clonedKey).toEqual(keyObj);
      expect(clonedKey).not.toBe(keyObj);
      expect(clonedVal).toEqual(valObj);
      expect(clonedVal).not.toBe(valObj);
    });

    it('should allow modification without affecting original', () => {
      const original = new Map([['a', 1]]);
      const cloned = cloneDeep(original);
      cloned.set('b', 2);
      expect(original.has('b')).toBe(false);
      expect(cloned.has('b')).toBe(true);
    });
  });

  describe('circular references', () => {
    it('should handle circular object references', () => {
      const original: any = { a: 1 };
      original.self = original;

      const cloned = cloneDeep(original);
      expect(cloned.a).toBe(1);
      expect(cloned.self).toBe(cloned); // Should reference cloned, not original
      expect(cloned.self).not.toBe(original);
    });

    it('should handle circular array references', () => {
      const original: any = [1, 2];
      original.push(original);

      const cloned = cloneDeep(original);
      expect(cloned[0]).toBe(1);
      expect(cloned[1]).toBe(2);
      expect(cloned[2]).toBe(cloned); // Should reference cloned, not original
      expect(cloned[2]).not.toBe(original);
    });

    it('should handle complex circular references', () => {
      const original: any = { a: 1, nested: {} };
      original.nested.parent = original;

      const cloned = cloneDeep(original);
      expect(cloned.a).toBe(1);
      expect(cloned.nested.parent).toBe(cloned);
      expect(cloned.nested.parent).not.toBe(original);
    });

    it('should handle multiple references to same object', () => {
      const shared = { value: 42 };
      const original = { ref1: shared, ref2: shared };

      const cloned = cloneDeep(original);
      expect(cloned.ref1).toBe(cloned.ref2); // Should be same cloned instance
      expect(cloned.ref1).not.toBe(shared);
    });
  });

  describe('complex structures', () => {
    it('should handle deeply nested mixed structures', () => {
      const original = {
        users: [
          { name: 'Alice', tags: new Set(['admin']) },
          { name: 'Bob', tags: new Set(['user']) },
        ],
        settings: new Map([['theme', 'dark']]),
        createdAt: new Date(2024, 0, 1),
      };

      const cloned = cloneDeep(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.users).not.toBe(original.users);
      expect(cloned.users[0]).not.toBe(original.users[0]);
      expect(cloned.settings).not.toBe(original.settings);
      expect(cloned.createdAt).not.toBe(original.createdAt);
    });
  });
});

describe('deepFreeze', () => {
  describe('disabled by default (for proxy compatibility)', () => {
    it('should not freeze when enabled=false (default)', () => {
      const obj = { a: 1, b: { c: 2 } };
      const frozen = deepFreeze(obj);
      expect(Object.isFrozen(frozen)).toBe(false);
      expect(Object.isFrozen(frozen.b)).toBe(false);
    });

    it('should return same object reference when disabled', () => {
      const obj = { a: 1 };
      const frozen = deepFreeze(obj);
      expect(frozen).toBe(obj);
    });
  });

  describe('enabled mode', () => {
    it('should freeze object when enabled=true', () => {
      const obj = { a: 1, b: 2 };
      const frozen = deepFreeze(obj, new WeakSet(), true);
      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should deep freeze nested objects', () => {
      const obj = { a: 1, nested: { b: 2 } };
      const frozen = deepFreeze(obj, new WeakSet(), true);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.nested)).toBe(true);
    });

    it('should prevent modification of frozen object', () => {
      const obj: any = { a: 1, b: 2 };
      deepFreeze(obj, new WeakSet(), true);

      expect(() => {
        obj.a = 999;
      }).toThrow();
    });

    it('should prevent adding properties to frozen object', () => {
      const obj: any = { a: 1 };
      deepFreeze(obj, new WeakSet(), true);

      expect(() => {
        obj.b = 2;
      }).toThrow();
    });

    it('should handle circular references when enabled', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const frozen = deepFreeze(obj, new WeakSet(), true);
      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should handle already frozen objects', () => {
      const obj = Object.freeze({ a: 1 });
      const frozen = deepFreeze(obj, new WeakSet(), true);
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen).toBe(obj);
    });

    it('should return primitives as-is', () => {
      expect(deepFreeze(1, new WeakSet(), true)).toBe(1);
      expect(deepFreeze('hello', new WeakSet(), true)).toBe('hello');
      expect(deepFreeze(null, new WeakSet(), true)).toBe(null);
    });
  });
});

import { describe, it, expect } from 'vite-plus/test';
import { parsePath, getValueAtPath, shallowEqual } from './path-utils';

describe('parsePath', () => {
  describe('dot notation', () => {
    it('should parse simple dot notation paths', () => {
      expect(parsePath('user.name')).toEqual(['user', 'name']);
      expect(parsePath('a.b.c')).toEqual(['a', 'b', 'c']);
      expect(parsePath('single')).toEqual(['single']);
    });

    it('should handle empty path', () => {
      expect(parsePath('')).toEqual([]);
    });

    it('should handle single segment', () => {
      expect(parsePath('user')).toEqual(['user']);
    });

    it('should handle deeply nested paths', () => {
      expect(parsePath('a.b.c.d.e.f')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });
  });

  describe('bracket notation', () => {
    it('should parse simple bracket notation', () => {
      expect(parsePath('items[0]')).toEqual(['items', '0']);
      expect(parsePath('users[5]')).toEqual(['users', '5']);
    });

    it('should parse bracket notation with string keys', () => {
      expect(parsePath('data[key]')).toEqual(['data', 'key']);
      expect(parsePath('obj[prop]')).toEqual(['obj', 'prop']);
    });

    it('should parse consecutive brackets', () => {
      expect(parsePath('matrix[0][1]')).toEqual(['matrix', '0', '1']);
      expect(parsePath('data[a][b][c]')).toEqual(['data', 'a', 'b', 'c']);
    });
  });

  describe('mixed notation', () => {
    it('should parse mixed dot and bracket notation', () => {
      expect(parsePath('items[0].name')).toEqual(['items', '0', 'name']);
      expect(parsePath('users[2].address.city')).toEqual([
        'users',
        '2',
        'address',
        'city',
      ]);
    });

    it('should parse complex mixed paths', () => {
      expect(parsePath('data.users[2].profile.tags[0].name')).toEqual([
        'data',
        'users',
        '2',
        'profile',
        'tags',
        '0',
        'name',
      ]);
    });

    it('should handle bracket at start', () => {
      expect(parsePath('[0].name')).toEqual(['0', 'name']);
    });
  });

  describe('edge cases', () => {
    it('should handle trailing dot', () => {
      expect(parsePath('user.')).toEqual(['user']);
    });

    it('should handle leading dot', () => {
      expect(parsePath('.user')).toEqual(['user']);
    });

    it('should handle multiple consecutive dots', () => {
      expect(parsePath('a..b')).toEqual(['a', 'b']);
    });

    it('should handle empty brackets', () => {
      expect(parsePath('items[]')).toEqual(['items']);
    });
  });
});

describe('getValueAtPath', () => {
  describe('simple access', () => {
    it('should get value from simple path', () => {
      const obj = { name: 'Alice', age: 30 };
      expect(getValueAtPath(obj, ['name'])).toBe('Alice');
      expect(getValueAtPath(obj, ['age'])).toBe(30);
    });

    it('should return undefined for missing property', () => {
      const obj = { name: 'Alice' };
      expect(getValueAtPath(obj, ['missing'])).toBeUndefined();
    });

    it('should handle empty path', () => {
      const obj = { name: 'Alice' };
      expect(getValueAtPath(obj, [])).toBe(obj);
    });
  });

  describe('nested access', () => {
    it('should get value from nested path', () => {
      const obj = {
        user: {
          name: 'Alice',
          profile: {
            bio: 'Hello world',
          },
        },
      };

      expect(getValueAtPath(obj, ['user', 'name'])).toBe('Alice');
      expect(getValueAtPath(obj, ['user', 'profile', 'bio'])).toBe(
        'Hello world',
      );
    });

    it('should return undefined for missing nested property', () => {
      const obj = { user: { name: 'Alice' } };
      expect(getValueAtPath(obj, ['user', 'missing'])).toBeUndefined();
      expect(getValueAtPath(obj, ['missing', 'name'])).toBeUndefined();
    });
  });

  describe('array access', () => {
    it('should get value from array index', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(getValueAtPath(obj, ['items', '0'])).toBe('a');
      expect(getValueAtPath(obj, ['items', '1'])).toBe('b');
      expect(getValueAtPath(obj, ['items', '2'])).toBe('c');
    });

    it('should handle nested arrays', () => {
      const obj = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      };
      expect(getValueAtPath(obj, ['matrix', '0', '1'])).toBe(2);
      expect(getValueAtPath(obj, ['matrix', '1', '0'])).toBe(3);
    });

    it('should return undefined for out of bounds index', () => {
      const obj = { items: ['a', 'b'] };
      expect(getValueAtPath(obj, ['items', '5'])).toBeUndefined();
    });
  });

  describe('mixed structures', () => {
    it('should handle arrays of objects', () => {
      const obj = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      };

      expect(getValueAtPath(obj, ['users', '0', 'name'])).toBe('Alice');
      expect(getValueAtPath(obj, ['users', '1', 'age'])).toBe(25);
    });

    it('should handle deeply nested mixed structures', () => {
      const obj = {
        data: {
          users: [
            {
              profile: {
                tags: ['admin', 'user'],
              },
            },
          ],
        },
      };

      expect(
        getValueAtPath(obj, ['data', 'users', '0', 'profile', 'tags', '0']),
      ).toBe('admin');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for null object', () => {
      expect(getValueAtPath(null, ['name'])).toBeUndefined();
    });

    it('should return undefined for undefined object', () => {
      expect(getValueAtPath(undefined, ['name'])).toBeUndefined();
    });

    it('should return undefined when intermediate value is null', () => {
      const obj = { user: null };
      expect(getValueAtPath(obj, ['user', 'name'])).toBeUndefined();
    });

    it('should return undefined when intermediate value is undefined', () => {
      const obj = { user: undefined };
      expect(getValueAtPath(obj, ['user', 'name'])).toBeUndefined();
    });

    it('should handle falsy values correctly', () => {
      const obj = { count: 0, flag: false, text: '' };
      expect(getValueAtPath(obj, ['count'])).toBe(0);
      expect(getValueAtPath(obj, ['flag'])).toBe(false);
      expect(getValueAtPath(obj, ['text'])).toBe('');
    });
  });
});

describe('shallowEqual', () => {
  describe('equal arrays', () => {
    it('should return true for identical arrays', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(shallowEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('should return true for empty arrays', () => {
      expect(shallowEqual([], [])).toBe(true);
    });

    it('should use Object.is for element comparison', () => {
      const obj = { a: 1 };
      expect(shallowEqual([obj], [obj])).toBe(true); // Same reference
      expect(shallowEqual([{ a: 1 }], [{ a: 1 }])).toBe(false); // Different references
    });
  });

  describe('unequal arrays', () => {
    it('should return false for different lengths', () => {
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(shallowEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('should return false for different elements', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(shallowEqual(['a', 'b'], ['a', 'c'])).toBe(false);
    });

    it('should return false for different element order', () => {
      expect(shallowEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });
  });

  describe('special values', () => {
    it('should handle NaN correctly with Object.is', () => {
      expect(shallowEqual([NaN], [NaN])).toBe(true);
    });

    it('should distinguish +0 and -0 with Object.is', () => {
      expect(shallowEqual([+0], [-0])).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(shallowEqual([null], [null])).toBe(true);
      expect(shallowEqual([undefined], [undefined])).toBe(true);
      expect(shallowEqual([null], [undefined])).toBe(false);
    });

    it('should handle mixed types', () => {
      expect(shallowEqual([1, 'a', true, null], [1, 'a', true, null])).toBe(
        true,
      );
      expect(shallowEqual([1, 'a', true], [1, 'a', false])).toBe(false);
    });
  });
});

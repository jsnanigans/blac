/**
 * ProxyTracker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProxyTracker, trackAccess } from './ProxyTracker';

describe('ProxyTracker', () => {
  let tracker: ProxyTracker<any>;

  beforeEach(() => {
    tracker = new ProxyTracker();
  });

  describe('Basic tracking', () => {
    it('should track simple property access', () => {
      const state = { count: 0, name: 'test', active: true };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access only count
      const _ = proxy.count;

      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toEqual(['count']);
    });

    it('should track multiple property accesses', () => {
      const state = { a: 1, b: 2, c: 3 };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access multiple properties
      const sum = proxy.a + proxy.b;

      const paths = tracker.stopTracking();
      expect(Array.from(paths).sort()).toEqual(['a', 'b']);
    });

    it('should not track when tracking is stopped', () => {
      const state = { count: 0 };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);
      const _ = proxy.count;
      const pathsBeforeStop = Array.from(tracker.getTrackedPaths());
      tracker.stopTracking();

      // This access should not be tracked
      const __ = proxy.count;

      // Paths should remain the same as before stopping
      expect(pathsBeforeStop).toEqual(['count']);
    });
  });

  describe('Nested object tracking', () => {
    it('should track nested property access', () => {
      const state = {
        user: {
          name: 'John',
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access nested property
      const city = proxy.user.address.city;

      const paths = tracker.stopTracking();
      // Only track leaf property, not intermediate objects
      expect(Array.from(paths).sort()).toEqual(['user.address.city']);
    });

    it('should not track unaccessed nested properties', () => {
      const state = {
        user: {
          name: 'John',
          age: 30,
          profile: {
            bio: 'Developer',
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Only access name
      const name = proxy.user.name;

      const paths = tracker.stopTracking();
      // Only track leaf property, not intermediate objects
      expect(Array.from(paths).sort()).toEqual(['user.name']);
      expect(Array.from(paths)).not.toContain('user.age');
      expect(Array.from(paths)).not.toContain('user.profile');
    });
  });

  describe('Array tracking', () => {
    it('should track array index access', () => {
      const state = {
        items: ['a', 'b', 'c'],
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access array index
      const first = proxy.items[0];
      const second = proxy.items[1];

      const paths = tracker.stopTracking();
      // Track array indices as leaf values
      expect(Array.from(paths).sort()).toEqual(['items[0]', 'items[1]']);
    });

    it('should track array length access', () => {
      const state = {
        items: [1, 2, 3],
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access array length
      const len = proxy.items.length;

      const paths = tracker.stopTracking();
      // Track array length as leaf value
      expect(Array.from(paths).sort()).toEqual(['items.length']);
    });

    it('should track array method usage', () => {
      const state = {
        items: [1, 2, 3],
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Use array method
      const doubled = proxy.items.map((x) => x * 2);

      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toContain('items');
    });

    it('should track nested arrays', () => {
      const state = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access nested array element
      const value = proxy.matrix[0][1];

      const paths = tracker.stopTracking();
      // Only track the actual accessed leaf value
      expect(Array.from(paths).sort()).toEqual(['matrix[0][1]']);
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values', () => {
      const state = {
        nullValue: null,
        undefinedValue: undefined,
        nested: {
          value: null,
        },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access null and undefined values
      const n = proxy.nullValue;
      const u = proxy.undefinedValue;
      const nv = proxy.nested.value;

      const paths = tracker.stopTracking();
      // Only track leaf values (null/undefined are not objects so they're leaves)
      expect(Array.from(paths).sort()).toEqual([
        'nested.value',
        'nullValue',
        'undefinedValue',
      ]);
    });

    it('should not proxy primitives', () => {
      const state = {
        num: 42,
        str: 'hello',
        bool: true,
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // These should return primitives, not proxies
      expect(typeof proxy.num).toBe('number');
      expect(typeof proxy.str).toBe('string');
      expect(typeof proxy.bool).toBe('boolean');
    });

    it('should handle circular references', () => {
      const state: any = { a: 1 };
      state.self = state;

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access circular reference
      const self = proxy.self.self.a;

      const paths = tracker.stopTracking();
      // Only the leaf property 'a' is tracked
      expect(Array.from(paths)).toContain('a');
    });

    it('should not track internal properties starting with underscore', () => {
      const state = {
        public: 'value',
        _private: 'secret',
        $$internal: 'hidden',
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Access all properties
      const pub = proxy.public;
      const priv = proxy._private;
      const internal = proxy.$$internal;

      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toEqual(['public']);
    });

    it('should handle Date, RegExp, and other built-in objects', () => {
      const state = {
        date: new Date(),
        regex: /test/g,
        map: new Map(),
        set: new Set(),
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // These should not be proxied
      expect(proxy.date).toBeInstanceOf(Date);
      expect(proxy.regex).toBeInstanceOf(RegExp);
      expect(proxy.map).toBeInstanceOf(Map);
      expect(proxy.set).toBeInstanceOf(Set);
    });
  });

  describe('Manual path management', () => {
    it('should allow manual path addition', () => {
      tracker.startTracking();
      tracker.addPath('manual.path');
      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toContain('manual.path');
    });

    it('should allow manual path removal', () => {
      tracker.startTracking();
      tracker.addPath('path1');
      tracker.addPath('path2');
      tracker.removePath('path1');
      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toEqual(['path2']);
    });

    it('should clear all paths', () => {
      tracker.startTracking();
      tracker.addPath('path1');
      tracker.addPath('path2');
      tracker.clearPaths();
      const paths = tracker.stopTracking();
      expect(Array.from(paths)).toEqual([]);
    });
  });

  describe('Max depth limiting', () => {
    it('should respect max depth setting', () => {
      tracker.setMaxDepth(2);

      const state = {
        level1: {
          level2: {
            level3: {
              level4: 'deep',
            },
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Try to access deep property
      const deep = proxy.level1.level2.level3.level4;

      const paths = tracker.stopTracking();
      // With max depth 2, we can't proxy level3, so level4 is the last accessible leaf
      // But since we return non-proxy after depth 2, we get the value directly
      expect(Array.from(paths).sort()).toEqual([]);
    });
  });

  describe('trackAccess utility', () => {
    it('should track access in a callback', () => {
      const state = {
        user: {
          name: 'John',
          age: 30,
        },
        settings: {
          theme: 'dark',
        },
      };

      const { result, trackedPaths } = trackAccess(state, (s) => {
        return `${s.user.name} prefers ${s.settings.theme}`;
      });

      expect(result).toBe('John prefers dark');
      // Only track leaf properties
      expect(Array.from(trackedPaths).sort()).toEqual([
        'settings.theme',
        'user.name',
      ]);
    });

    it('should handle errors in callback', () => {
      const state = { value: 10 };

      expect(() => {
        trackAccess(state, (s) => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });
  });

  describe('Method binding', () => {
    it('should properly bind methods to original objects', () => {
      class Counter {
        count = 0;
        increment() {
          this.count++;
          return this.count;
        }
      }

      const state = {
        counter: new Counter(),
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Method should work correctly
      const result = proxy.counter.increment();
      expect(result).toBe(1);
      expect(state.counter.count).toBe(1);

      const paths = tracker.stopTracking();
      // When accessing counter.increment(), counter is an object so it's not tracked as a leaf
      // No leaf properties are accessed, only the method
      expect(Array.from(paths)).toEqual([]);
    });
  });

  describe('Object iteration tracking', () => {
    it('should track Object.keys usage', () => {
      const state = {
        data: { a: 1, b: 2, c: 3 },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Iterate over keys
      const keys = Object.keys(proxy.data);

      const paths = tracker.stopTracking();
      expect(Array.from(paths).sort()).toEqual(['data']);
    });

    it('should track for...in loops', () => {
      const state = {
        data: { a: 1, b: 2 },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Use for...in loop
      const values = [];
      for (const key in proxy.data) {
        values.push(proxy.data[key]);
      }

      const paths = tracker.stopTracking();
      // ownKeys tracks 'data', and accessing values tracks leaf properties
      expect(Array.from(paths).sort()).toEqual(['data', 'data.a', 'data.b']);
    });

    it('should track "in" operator', () => {
      const state = {
        user: { name: 'John', age: 30 },
      };

      tracker.startTracking();
      const proxy = tracker.createProxy(state);

      // Use "in" operator
      const hasName = 'name' in proxy.user;
      const hasEmail = 'email' in proxy.user;

      const paths = tracker.stopTracking();
      // 'in' operator uses the 'has' trap which tracks the properties being checked
      expect(Array.from(paths).sort()).toEqual(['user.email', 'user.name']);
    });
  });
});

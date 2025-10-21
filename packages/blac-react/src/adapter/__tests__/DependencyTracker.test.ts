/**
 * Tests for DependencyTracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyTracker } from '../DependencyTracker';

describe('DependencyTracker', () => {
  let tracker: DependencyTracker;

  beforeEach(() => {
    tracker = new DependencyTracker(2);
  });

  describe('Basic Property Tracking', () => {
    it('should track single property access', () => {
      const state = { name: 'John', age: 30 };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      // Access property
      const name = proxy.name;

      const deps = tracker.stopTracking();

      expect(deps.has('name')).toBe(true);
      expect(deps.size).toBe(1);
      expect(name).toBe('John');
    });

    it('should track multiple property accesses', () => {
      const state = { name: 'John', age: 30, city: 'NYC' };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      // Access multiple properties
      const _ = proxy.name;
      const __ = proxy.age;

      const deps = tracker.stopTracking();

      expect(deps.has('name')).toBe(true);
      expect(deps.has('age')).toBe(true);
      expect(deps.size).toBe(2);
    });

    it('should not track when tracking is stopped', () => {
      const state = { name: 'John' };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');
      tracker.stopTracking(); // Stop tracking

      // Access after stopping
      const _ = proxy.name;

      const deps = tracker.stopTracking();
      expect(deps.size).toBe(0);
    });
  });

  describe('Nested Property Tracking', () => {
    it('should track nested property access', () => {
      const state = {
        user: {
          profile: {
            name: 'John',
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      // Access nested property
      const name = proxy.user.profile.name;

      const deps = tracker.stopTracking();

      // With depth limit of 2, it stops at 'user.profile'
      // user.profile.name exceeds depth limit, so it tracks up to user.profile
      expect(deps.has('user')).toBe(false);
      expect(deps.has('user.profile')).toBe(true);
      expect(deps.size).toBe(1);
      expect(name).toBe('John');
    });

    it('should track multiple nested properties, only save leaf nodes', () => {
      const state = {
        user: {
          name: 'John',
          email: 'john@test.com',
        },
        settings: {
          theme: 'dark',
        },
      };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      const _ = proxy.user.name;
      const __ = proxy.settings.theme;

      const deps = tracker.stopTracking();

      expect(deps.has('user')).toBe(false);
      expect(deps.has('user.name')).toBe(true);
      expect(deps.has('settings')).toBe(false);
      expect(deps.has('settings.theme')).toBe(true);
      expect(deps.size).toBe(2);
    });
  });

  describe('Depth Limiting', () => {
    it('should respect depth limit', () => {
      const tracker = new DependencyTracker(2);
      const state = {
        a: {
          b: {
            c: {
              d: 'deep',
            },
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      // Try to access deep property
      const value = proxy.a.b.c.d;

      const deps = tracker.stopTracking();

      // Should stop at depth 2 (a.b)
      expect(deps.has('a.b')).toBe(true);
      expect(deps.has('a.b.c')).toBe(false);
      expect(deps.has('a.b.c.d')).toBe(false);
      expect(value).toBe('deep'); // Value still accessible
    });

    it('should allow custom depth limit', () => {
      const tracker = new DependencyTracker(3);
      const state = {
        a: {
          b: {
            c: {
              d: 'deep',
            },
          },
        },
      };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      const value = proxy.a.b.c.d;

      const deps = tracker.stopTracking();

      // Should stop at depth 3 (a.b.c)
      expect(deps.has('a.b.c')).toBe(true);
      expect(deps.has('a.b.c.d')).toBe(false);
      expect(value).toBe('deep');
    });
  });

  describe('Dependency Comparison', () => {
    it('should detect changed dependencies', () => {
      const oldState = { count: 0, name: 'John' };
      const newState = { count: 1, name: 'John' };

      const deps = new Set(['count']);

      const hasChanged = tracker.haveDependenciesChanged(
        deps,
        newState,
        oldState,
      );

      expect(hasChanged).toBe(true);
    });

    it('should not detect changes when dependencies are unchanged', () => {
      const oldState = { count: 0, name: 'John' };
      const newState = { count: 0, name: 'Jane' }; // name changed but not tracked

      const deps = new Set(['count']);

      const hasChanged = tracker.haveDependenciesChanged(
        deps,
        newState,
        oldState,
      );

      expect(hasChanged).toBe(false);
    });

    it('should handle nested dependency changes', () => {
      const oldState = { user: { name: 'John', age: 30 } };
      const newState = { user: { name: 'Jane', age: 30 } };

      const deps = new Set(['user.name']);

      const hasChanged = tracker.haveDependenciesChanged(
        deps,
        newState,
        oldState,
      );

      expect(hasChanged).toBe(true);
    });

    it('should handle multiple dependencies', () => {
      const oldState = { count: 0, name: 'John', active: true };
      const newState = { count: 0, name: 'John', active: false };

      const deps = new Set(['count', 'name', 'active']);

      const hasChanged = tracker.haveDependenciesChanged(
        deps,
        newState,
        oldState,
      );

      expect(hasChanged).toBe(true); // active changed
    });
  });

  describe('Proxy Caching', () => {
    it('should cache proxies for same object', () => {
      const state = { name: 'John' };

      const proxy1 = tracker.createTrackedProxy(state, [], 'root');
      const proxy2 = tracker.createTrackedProxy(state, [], 'root');

      expect(proxy1).toBe(proxy2); // Same proxy returned
    });

    it('should clear cache when requested', () => {
      const state = { name: 'John' };

      const proxy1 = tracker.createTrackedProxy(state, [], 'root');
      tracker.clearCache();
      const proxy2 = tracker.createTrackedProxy(state, [], 'root');

      expect(proxy1).not.toBe(proxy2); // Different proxies after cache clear
    });
  });

  describe('Read-Only Proxies', () => {
    it('should throw error on mutation attempt (set)', () => {
      const state = { name: 'John' };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      expect(() => {
        (proxy as any).name = 'Jane';
      }).toThrow('State mutations are not allowed during render');
    });

    it('should throw error on deletion attempt', () => {
      const state = { name: 'John' };

      tracker.startTracking();
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      expect(() => {
        delete (proxy as any).name;
      }).toThrow('State mutations are not allowed during render');
    });
  });

  describe('Primitive Values', () => {
    it('should return primitives as-is', () => {
      const num = 42;
      const str = 'hello';
      const bool = true;
      const nullVal = null;

      expect(tracker.createTrackedProxy(num, [], 'root')).toBe(num);
      expect(tracker.createTrackedProxy(str, [], 'root')).toBe(str);
      expect(tracker.createTrackedProxy(bool, [], 'root')).toBe(bool);
      expect(tracker.createTrackedProxy(nullVal, [], 'root')).toBe(nullVal);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug info', () => {
      tracker.startTracking();
      const state = { name: 'John' };
      const proxy = tracker.createTrackedProxy(state, [], 'root');

      const _ = proxy.name;

      const debugInfo = tracker.getDebugInfo();

      expect(debugInfo.tracking).toBe(true);
      expect(debugInfo.dependencyCount).toBe(1);
      expect(debugInfo.dependencies).toContain('name');
    });
  });
});

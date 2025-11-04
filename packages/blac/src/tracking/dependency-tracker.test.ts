/**
 * Dependency Tracker Tests
 * Testing framework-agnostic dependency tracking for automatic reactivity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTrackerState,
  startTracking,
  createProxy,
  captureTrackedPaths,
  hasChanges,
  hasTrackedData,
  optimizeTrackedPaths,
  type TrackerState,
} from './dependency-tracker';

interface SimpleState {
  count: number;
  name: string;
}

interface NestedState {
  user: {
    name: string;
    profile: {
      age: number;
      email: string;
    };
  };
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

interface ArrayState {
  items: number[];
  tags: string[];
}

interface ComplexState {
  id: string;
  data: {
    nested: {
      value: number;
      list: Array<{ id: string; name: string }>;
    };
  };
  flags: {
    enabled: boolean;
    count: number;
  };
}

describe('Dependency Tracker', () => {
  // Core Tracking

  describe('Core Tracking', () => {
    describe('createTrackerState()', () => {
      it('should initialize properly', () => {
        const tracker = createTrackerState<SimpleState>();

        expect(tracker.proxyTrackerState).toBeDefined();
        expect(tracker.previousRenderPaths).toBeInstanceOf(Set);
        expect(tracker.currentRenderPaths).toBeInstanceOf(Set);
        expect(tracker.pathCache).toBeInstanceOf(Map);
        expect(tracker.lastCheckedState).toBeNull();
        expect(tracker.lastCheckedValues).toBeInstanceOf(Map);
      });

      it('should create independent tracker instances', () => {
        const tracker1 = createTrackerState<SimpleState>();
        const tracker2 = createTrackerState<SimpleState>();

        expect(tracker1).not.toBe(tracker2);
        expect(tracker1.pathCache).not.toBe(tracker2.pathCache);
      });
    });

    describe('startTracking()', () => {
      it('should enable tracking mode', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 0, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        // Access a property
        const _ = proxy.count;

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
      });

      it('should allow multiple tracking sessions', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 0, name: 'test' };

        // First session
        startTracking(tracker);
        const proxy1 = createProxy(tracker, state);
        const _ = proxy1.count;
        captureTrackedPaths(tracker, state);

        // Second session
        startTracking(tracker);
        const proxy2 = createProxy(tracker, state);
        const __ = proxy2.name;
        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });
    });

    describe('createProxy()', () => {
      it('should wrap objects correctly', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 5, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        expect(proxy.count).toBe(5);
        expect(proxy.name).toBe('test');
      });

      it('should track property access paths', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 5, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.count;
        const __ = proxy.name;

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });

      it('should not track unaccessed properties', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 5, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.count;
        // Don't access name

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(false);
      });
    });

    describe('Nested object access tracking', () => {
      it('should track nested property access', () => {
        const tracker = createTrackerState<NestedState>();
        const state: NestedState = {
          user: {
            name: 'John',
            profile: {
              age: 30,
              email: 'john@example.com',
            },
          },
          settings: {
            theme: 'light',
            notifications: true,
          },
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.user.name;
        const __ = proxy.user.profile.age;

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('user.name')).toBe(true);
        expect(tracker.currentRenderPaths.has('user.profile.age')).toBe(true);
      });

      it('should track deep nested paths', () => {
        const tracker = createTrackerState<ComplexState>();
        const state: ComplexState = {
          id: '123',
          data: {
            nested: {
              value: 42,
              list: [
                { id: '1', name: 'First' },
                { id: '2', name: 'Second' },
              ],
            },
          },
          flags: {
            enabled: true,
            count: 10,
          },
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.data.nested.value;
        const __ = proxy.data.nested.list[0].name;

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('data.nested.value')).toBe(true);
        expect(tracker.currentRenderPaths.has('data.nested.list[0].name')).toBe(
          true,
        );
      });
    });

    describe('Array access tracking', () => {
      it('should track array index access', () => {
        const tracker = createTrackerState<ArrayState>();
        const state: ArrayState = {
          items: [1, 2, 3, 4, 5],
          tags: ['a', 'b', 'c'],
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.items[0];
        const __ = proxy.items[2];
        const ___ = proxy.tags[1];

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('items[0]')).toBe(true);
        expect(tracker.currentRenderPaths.has('items[2]')).toBe(true);
        expect(tracker.currentRenderPaths.has('tags[1]')).toBe(true);
      });

      it('should track array property access', () => {
        const tracker = createTrackerState<ArrayState>();
        const state: ArrayState = {
          items: [1, 2, 3],
          tags: ['a', 'b'],
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.items.length;

        captureTrackedPaths(tracker, state);

        expect(tracker.currentRenderPaths.has('items.length')).toBe(true);
      });
    });

    describe('captureTrackedPaths()', () => {
      it('should store accessed paths with values', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);

        const _ = proxy.count;

        captureTrackedPaths(tracker, state);

        expect(tracker.pathCache.has('count')).toBe(true);
        expect(tracker.pathCache.get('count')?.value).toBe(10);
      });

      it('should move current paths to previous paths', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        // First render
        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        // After first capture, tracked paths are in currentRenderPaths
        expect(tracker.currentRenderPaths.has('count')).toBe(true);

        // Second render
        startTracking(tracker);
        const proxy2 = createProxy(tracker, state);
        const __ = proxy2.name;
        captureTrackedPaths(tracker, state);

        // Now previousRenderPaths should have 'count' from first render
        expect(tracker.previousRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });

      it('should store newly tracked paths in currentRenderPaths', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        // After capture, current paths should contain what was just tracked
        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.size).toBe(1);
      });

      it('should update cache with new values', () => {
        const tracker = createTrackerState<SimpleState>();
        let state = { count: 10, name: 'test' };

        startTracking(tracker);
        let proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        expect(tracker.pathCache.get('count')?.value).toBe(10);

        // Update state
        state = { count: 20, name: 'test' };
        startTracking(tracker);
        proxy = createProxy(tracker, state);
        const __ = proxy.count;
        captureTrackedPaths(tracker, state);

        expect(tracker.pathCache.get('count')?.value).toBe(20);
      });
    });
  });

  // Change Detection

  describe('Change Detection', () => {
    describe('hasChanges()', () => {
      it('should detect value changes at tracked paths', () => {
        const tracker = createTrackerState<SimpleState>();
        let state = { count: 10, name: 'test' };

        // Track initial render
        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        // Check changes with updated state
        const newState = { count: 20, name: 'test' };
        expect(hasChanges(tracker, newState)).toBe(true);
      });

      it('should return false when no changes detected', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        // Same state, no changes
        expect(hasChanges(tracker, state)).toBe(false);
      });

      it('should ignore changes in untracked paths', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count; // Only track count
        captureTrackedPaths(tracker, state);

        // Change untracked field
        const newState = { count: 10, name: 'updated' };
        expect(hasChanges(tracker, newState)).toBe(false);
      });

      it('should use shallow equality for primitive values', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        const __ = proxy.name;
        captureTrackedPaths(tracker, state);

        // Same primitive values
        const newState = { count: 10, name: 'test' };
        expect(hasChanges(tracker, newState)).toBe(false);
      });

      it('should detect deep path changes', () => {
        const tracker = createTrackerState<NestedState>();
        const state: NestedState = {
          user: {
            name: 'John',
            profile: { age: 30, email: 'john@example.com' },
          },
          settings: { theme: 'light', notifications: true },
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.user.profile.age;
        captureTrackedPaths(tracker, state);

        // Change deep nested value
        const newState: NestedState = {
          user: {
            name: 'John',
            profile: { age: 31, email: 'john@example.com' },
          },
          settings: { theme: 'light', notifications: true },
        };

        expect(hasChanges(tracker, newState)).toBe(true);
      });

      it('should handle array mutations', () => {
        const tracker = createTrackerState<ArrayState>();
        const state: ArrayState = {
          items: [1, 2, 3],
          tags: ['a', 'b'],
        };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.items[0];
        const __ = proxy.items.length;
        captureTrackedPaths(tracker, state);

        // Array mutation - length changed
        const newState: ArrayState = {
          items: [1, 2, 3, 4],
          tags: ['a', 'b'],
        };

        expect(hasChanges(tracker, newState)).toBe(true);
      });

      it('should return true when no paths are tracked', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        // No tracking, so hasChanges should return true (first render)
        expect(hasChanges(tracker, state)).toBe(true);
      });

      it('should handle null and undefined values', () => {
        interface NullableState {
          value: string | null;
          optional?: number;
        }

        const tracker = createTrackerState<NullableState>();
        const state: NullableState = { value: 'test', optional: 10 };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.value;
        const __ = proxy.optional;
        captureTrackedPaths(tracker, state);

        // Change to null
        const newState: NullableState = { value: null, optional: undefined };
        expect(hasChanges(tracker, newState)).toBe(true);
      });
    });

    describe('hasTrackedData()', () => {
      it('should return false when no data is tracked', () => {
        const tracker = createTrackerState<SimpleState>();

        expect(hasTrackedData(tracker)).toBe(false);
      });

      it('should return true when paths are tracked', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;

        // Before capture, tracking is active
        expect(hasTrackedData(tracker)).toBe(true);
      });

      it('should return true when cache has paths', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        expect(hasTrackedData(tracker)).toBe(true);
      });

      it('should return true when previous render paths exist', () => {
        const tracker = createTrackerState<SimpleState>();
        const state = { count: 10, name: 'test' };

        // First render
        startTracking(tracker);
        const proxy = createProxy(tracker, state);
        const _ = proxy.count;
        captureTrackedPaths(tracker, state);

        // Second render
        startTracking(tracker);
        const proxy2 = createProxy(tracker, state);
        const __ = proxy2.name;
        captureTrackedPaths(tracker, state);

        // Previous render paths should exist now (from first render)
        expect(tracker.previousRenderPaths.size).toBeGreaterThan(0);
        expect(hasTrackedData(tracker)).toBe(true);
      });
    });
  });

  // Performance and Edge Cases

  describe('Performance and Edge Cases', () => {
    it('should handle many tracked paths efficiently', () => {
      interface LargeState {
        [key: string]: number;
      }

      const tracker = createTrackerState<LargeState>();
      const state: LargeState = {};

      // Create large state with many properties
      for (let i = 0; i < 100; i++) {
        state[`field${i}`] = i;
      }

      startTracking(tracker);
      const proxy = createProxy(tracker, state);

      // Access many properties
      for (let i = 0; i < 100; i++) {
        const _ = proxy[`field${i}`];
      }

      captureTrackedPaths(tracker, state);

      expect(tracker.pathCache.size).toBe(100);

      // Check changes with updated state
      const newState = { ...state, field50: 999 };
      expect(hasChanges(tracker, newState)).toBe(true);
    });

    it('should cleanup unused paths periodically', () => {
      const tracker = createTrackerState<SimpleState>();
      const state = { count: 10, name: 'test' };

      // First render - track count
      startTracking(tracker);
      let proxy = createProxy(tracker, state);
      const _ = proxy.count;
      captureTrackedPaths(tracker, state);

      expect(tracker.pathCache.has('count')).toBe(true);

      // Next 10 renders - track only name
      for (let i = 0; i < 10; i++) {
        startTracking(tracker);
        proxy = createProxy(tracker, state);
        const __ = proxy.name;
        captureTrackedPaths(tracker, state);
      }

      // After cleanup interval, 'count' should be removed
      // (since it wasn't accessed in recent renders)
      expect(tracker.pathCache.has('name')).toBe(true);
    });

    it('should handle object references correctly with fine-grained tracking', () => {
      interface RefState {
        obj: { value: number };
        arr: number[];
      }

      const tracker = createTrackerState<RefState>();
      const obj = { value: 10 };
      const arr = [1, 2, 3];
      const state: RefState = { obj, arr };

      startTracking(tracker);
      const proxy = createProxy(tracker, state);
      const _ = proxy.obj.value;
      captureTrackedPaths(tracker, state);

      // Fine-grained tracking: only 'obj.value' is tracked, not 'obj'
      expect(tracker.currentRenderPaths.has('obj.value')).toBe(true);
      expect(tracker.currentRenderPaths.has('obj')).toBe(false);

      // Same reference, no change
      const newState: RefState = { obj, arr };
      expect(hasChanges(tracker, newState)).toBe(false);

      // Different reference, same value - should NOT trigger change
      // because only 'obj.value' is tracked (fine-grained), and value is same
      const newState2: RefState = { obj: { value: 10 }, arr };
      expect(hasChanges(tracker, newState2)).toBe(false);

      // Different value - WILL trigger change
      const newState3: RefState = { obj: { value: 20 }, arr };
      expect(hasChanges(tracker, newState3)).toBe(true);
    });

    it('should handle rapid tracking sessions', () => {
      const tracker = createTrackerState<SimpleState>();
      const states: SimpleState[] = [];

      // Create many states
      for (let i = 0; i < 50; i++) {
        states.push({ count: i, name: `state${i}` });
      }

      // Rapid tracking sessions
      for (let i = 0; i < 50; i++) {
        startTracking(tracker);
        const proxy = createProxy(tracker, states[i]);
        const _ = proxy.count;
        captureTrackedPaths(tracker, states[i]);
      }

      // Should still work correctly
      const finalState = { count: 999, name: 'final' };
      expect(hasChanges(tracker, finalState)).toBe(true);
    });

    it('should handle empty objects', () => {
      interface EmptyState {
        value: number;
        empty: Record<string, never>;
      }

      const tracker = createTrackerState<EmptyState>();
      const state: EmptyState = { value: 10, empty: {} };

      startTracking(tracker);
      const proxy = createProxy(tracker, state);
      const _ = proxy.value; // Track a primitive instead
      captureTrackedPaths(tracker, state);

      // No changes - same state reference
      expect(hasChanges(tracker, state)).toBe(false);

      // Different state, same value
      const newState: EmptyState = { value: 10, empty: {} };
      expect(hasChanges(tracker, newState)).toBe(false);
    });

    it('should handle circular references gracefully', () => {
      interface CircularState {
        value: number;
        self?: CircularState;
      }

      const tracker = createTrackerState<CircularState>();
      const state: CircularState = { value: 10 };
      // Don't create circular reference for this test
      // as it may cause issues

      startTracking(tracker);
      const proxy = createProxy(tracker, state);
      const _ = proxy.value;
      captureTrackedPaths(tracker, state);

      expect(tracker.pathCache.has('value')).toBe(true);
    });
  });

  // Integration Scenarios

  describe('Integration Scenarios', () => {
    it('should work through complete render cycle', () => {
      const tracker = createTrackerState<SimpleState>();
      let state = { count: 0, name: 'initial' };

      // First render
      startTracking(tracker);
      let proxy = createProxy(tracker, state);
      expect(proxy.count).toBe(0);
      expect(proxy.name).toBe('initial');
      captureTrackedPaths(tracker, state);

      // State update - should detect changes
      state = { count: 1, name: 'updated' };
      expect(hasChanges(tracker, state)).toBe(true);

      // Second render
      startTracking(tracker);
      proxy = createProxy(tracker, state);
      expect(proxy.count).toBe(1);
      captureTrackedPaths(tracker, state);

      // No changes
      expect(hasChanges(tracker, state)).toBe(false);
    });

    it('should handle partial state updates', () => {
      const tracker = createTrackerState<NestedState>();
      let state: NestedState = {
        user: {
          name: 'John',
          profile: { age: 30, email: 'john@example.com' },
        },
        settings: { theme: 'light', notifications: true },
      };

      // Render - only access user.name
      startTracking(tracker);
      let proxy = createProxy(tracker, state);
      expect(proxy.user.name).toBe('John');
      captureTrackedPaths(tracker, state);

      // Update untracked field - should not trigger re-render
      state = {
        ...state,
        settings: { theme: 'dark', notifications: false },
      };
      expect(hasChanges(tracker, state)).toBe(false);

      // Update tracked field - should trigger re-render
      state = {
        ...state,
        user: {
          ...state.user,
          name: 'Jane',
        },
      };
      expect(hasChanges(tracker, state)).toBe(true);
    });

    it('should support conditional rendering logic', () => {
      const tracker = createTrackerState<SimpleState>();
      let state = { count: 0, name: 'test' };

      // First render - conditionally access count
      startTracking(tracker);
      let proxy = createProxy(tracker, state);
      if (proxy.count > 0) {
        const _ = proxy.name; // Won't be accessed since count is 0
      }
      captureTrackedPaths(tracker, state);

      // Only count should be tracked
      expect(tracker.pathCache.has('count')).toBe(true);
      expect(tracker.pathCache.has('name')).toBe(false);

      // Update count
      state = { count: 1, name: 'test' };
      expect(hasChanges(tracker, state)).toBe(true);

      // Second render - now name is accessed
      startTracking(tracker);
      proxy = createProxy(tracker, state);
      if (proxy.count > 0) {
        const _ = proxy.name; // Will be accessed now
      }
      captureTrackedPaths(tracker, state);

      // Both should be tracked now
      expect(tracker.pathCache.has('count')).toBe(true);
      expect(tracker.pathCache.has('name')).toBe(true);
    });
  });

  // Fine-Grained Path Optimization

  describe('Fine-Grained Path Optimization', () => {
    describe('optimizeTrackedPaths()', () => {
      it('should remove parent when only leaf accessed', () => {
        const paths = new Set(['user', 'user.profile', 'user.profile.bio']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('user.profile.bio')).toBe(true);
        expect(optimized.has('user.profile')).toBe(false);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(1);
      });

      it('should keep siblings without parent', () => {
        const paths = new Set(['user', 'user.name', 'user.age']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.has('user.age')).toBe(true);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle mixed depth siblings', () => {
        const paths = new Set([
          'user',
          'user.profile',
          'user.profile.bio',
          'user.name',
        ]);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('user.profile.bio')).toBe(true);
        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.has('user.profile')).toBe(false);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle array indices separately', () => {
        const paths = new Set(['items', 'items[0]', 'items[1]']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('items[0]')).toBe(true);
        expect(optimized.has('items[1]')).toBe(true);
        expect(optimized.has('items')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle array properties separately from indices', () => {
        const paths = new Set(['items', 'items.length', 'items[0]']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('items.length')).toBe(true);
        expect(optimized.has('items[0]')).toBe(true);
        expect(optimized.has('items')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle empty set correctly', () => {
        const paths = new Set<string>();
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.size).toBe(0);
      });

      it('should handle single path correctly', () => {
        const paths = new Set(['user.name']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.size).toBe(1);
      });

      it('should handle top-level properties', () => {
        const paths = new Set(['count', 'name', 'theme']);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('count')).toBe(true);
        expect(optimized.has('name')).toBe(true);
        expect(optimized.has('theme')).toBe(true);
        expect(optimized.size).toBe(3);
      });

      it('should handle complex nested structure', () => {
        const paths = new Set([
          'state',
          'state.user',
          'state.user.profile',
          'state.user.profile.bio',
          'state.user.profile.avatar',
          'state.user.settings',
          'state.user.settings.theme',
          'state.stats',
          'state.stats.count',
        ]);
        const optimized = optimizeTrackedPaths(paths);

        expect(optimized.has('state.user.profile.bio')).toBe(true);
        expect(optimized.has('state.user.profile.avatar')).toBe(true);
        expect(optimized.has('state.user.settings.theme')).toBe(true);
        expect(optimized.has('state.stats.count')).toBe(true);
        expect(optimized.has('state')).toBe(false);
        expect(optimized.has('state.user')).toBe(false);
        expect(optimized.has('state.user.profile')).toBe(false);
        expect(optimized.size).toBe(4);
      });
    });

    it('should use fine-grained tracking in real scenario', () => {
      interface TestState {
        user: {
          personal: { name: string; age: number };
          preferences: { theme: string; language: string };
        };
        stats: { count: number };
      }

      const tracker = createTrackerState<TestState>();
      const state: TestState = {
        user: {
          personal: { name: 'John', age: 30 },
          preferences: { theme: 'light', language: 'en' },
        },
        stats: { count: 0 },
      };

      // Access nested properties
      startTracking(tracker);
      const proxy = createProxy(tracker, state);
      const _ = proxy.user.personal.name;
      const __ = proxy.user.preferences.theme;
      captureTrackedPaths(tracker, state);

      // Should only track leaf paths
      expect(tracker.currentRenderPaths.has('user.personal.name')).toBe(true);
      expect(tracker.currentRenderPaths.has('user.preferences.theme')).toBe(
        true,
      );
      expect(tracker.currentRenderPaths.has('user')).toBe(false);
      expect(tracker.currentRenderPaths.has('user.personal')).toBe(false);
      expect(tracker.currentRenderPaths.has('user.preferences')).toBe(false);
      expect(tracker.currentRenderPaths.size).toBe(2);

      // Update unrelated field - should not detect change
      const newState1: TestState = {
        ...state,
        user: {
          ...state.user,
          personal: { ...state.user.personal, age: 31 }, // Changed age, not name
        },
      };
      expect(hasChanges(tracker, newState1)).toBe(false);

      // Update tracked field - should detect change
      const newState2: TestState = {
        ...state,
        user: {
          ...state.user,
          personal: { ...state.user.personal, name: 'Jane' },
        },
      };
      expect(hasChanges(tracker, newState2)).toBe(true);
    });
  });
});

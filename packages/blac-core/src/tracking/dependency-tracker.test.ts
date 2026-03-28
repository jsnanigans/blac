import { describe, it, expect } from 'vite-plus/test';
import {
  createDependencyState,
  startDependency,
  createDependencyProxy,
  capturePaths,
  hasDependencyChanges,
  hasTrackedData,
  optimizeTrackedPaths,
} from './tracking-proxy';

// ============ Test Data ============

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

// ============ Fixtures ============

const fixture = {
  tracker: <T extends object>() => createDependencyState<T>(),
};

// ============ Test Helpers ============

const runSession = <T>(
  tracker: any,
  state: T,
  accessor: (proxy: T) => void,
): void => {
  startDependency(tracker);
  const proxy = createDependencyProxy(tracker, state) as T;
  accessor(proxy);
  capturePaths(tracker, state);
};

// ============ Tests ============

describe('Dependency Tracker', () => {
  describe('Core Tracking', () => {
    describe('createDependencyState()', () => {
      it('should initialize properly', () => {
        const tracker = fixture.tracker<SimpleState>();

        expect(tracker.proxyState).toBeDefined();
        expect(tracker.previousRenderPaths).toBeInstanceOf(Set);
        expect(tracker.currentRenderPaths).toBeInstanceOf(Set);
        expect(tracker.pathCache).toBeInstanceOf(Map);
        expect(tracker.lastCheckedState).toBeNull();
        expect(tracker.lastCheckedValues).toBeInstanceOf(Map);
      });

      it('should create independent tracker instances', () => {
        const tracker1 = fixture.tracker<SimpleState>();
        const tracker2 = fixture.tracker<SimpleState>();

        expect(tracker1).not.toBe(tracker2);
        expect(tracker1.pathCache).not.toBe(tracker2.pathCache);
      });
    });

    describe('startDependency()', () => {
      it('should enable tracking mode', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 0, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
      });

      it('should allow multiple tracking sessions', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 0, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });
        runSession(tracker, state, (proxy) => {
          void proxy.name;
        });

        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });
    });

    describe('createDependencyProxy()', () => {
      it('should wrap objects correctly', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 5, name: 'test' };

        startDependency(tracker);
        const proxy = createDependencyProxy(tracker, state) as SimpleState;

        expect(proxy.count).toBe(5);
        expect(proxy.name).toBe('test');
      });

      it('should track property access paths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 5, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
          void proxy.name;
        });

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });

      it('should not track unaccessed properties', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 5, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(false);
      });
    });

    describe('Nested object access tracking', () => {
      it('should track nested property access', () => {
        const tracker = fixture.tracker<NestedState>();
        const state: NestedState = {
          user: {
            name: 'John',
            profile: { age: 30, email: 'john@example.com' },
          },
          settings: { theme: 'light', notifications: true },
        };

        runSession(tracker, state, (proxy) => {
          void proxy.user.name;
          void proxy.user.profile.age;
        });

        expect(tracker.currentRenderPaths.has('user.name')).toBe(true);
        expect(tracker.currentRenderPaths.has('user.profile.age')).toBe(true);
      });

      it('should track deep nested paths', () => {
        const tracker = fixture.tracker<ComplexState>();
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
          flags: { enabled: true, count: 10 },
        };

        runSession(tracker, state, (proxy) => {
          void proxy.data.nested.value;
          void proxy.data.nested.list[0].name;
        });

        expect(tracker.currentRenderPaths.has('data.nested.value')).toBe(true);
        expect(tracker.currentRenderPaths.has('data.nested.list[0].name')).toBe(
          true,
        );
      });
    });

    describe('Array access tracking', () => {
      it('should track array index access', () => {
        const tracker = fixture.tracker<ArrayState>();
        const state: ArrayState = {
          items: [1, 2, 3, 4, 5],
          tags: ['a', 'b', 'c'],
        };

        runSession(tracker, state, (proxy) => {
          void proxy.items[0];
          void proxy.items[2];
          void proxy.tags[1];
        });

        expect(tracker.currentRenderPaths.has('items[0]')).toBe(true);
        expect(tracker.currentRenderPaths.has('items[2]')).toBe(true);
        expect(tracker.currentRenderPaths.has('tags[1]')).toBe(true);
      });

      it('should track array property access', () => {
        const tracker = fixture.tracker<ArrayState>();
        const state: ArrayState = { items: [1, 2, 3], tags: ['a', 'b'] };

        runSession(tracker, state, (proxy) => {
          void proxy.items.length;
        });

        expect(tracker.currentRenderPaths.has('items.length')).toBe(true);
      });
    });

    describe('capturePaths()', () => {
      it('should store accessed paths with values', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(tracker.pathCache.has('count')).toBe(true);
        expect(tracker.pathCache.get('count')?.value).toBe(10);
      });

      it('should move current paths to previous paths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });
        expect(tracker.currentRenderPaths.has('count')).toBe(true);

        runSession(tracker, state, (proxy) => {
          void proxy.name;
        });
        expect(tracker.previousRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.has('name')).toBe(true);
      });

      it('should store newly tracked paths in currentRenderPaths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(tracker.currentRenderPaths.has('count')).toBe(true);
        expect(tracker.currentRenderPaths.size).toBe(1);
      });

      it('should update cache with new values', () => {
        const tracker = fixture.tracker<SimpleState>();

        runSession(tracker, { count: 10, name: 'test' }, (proxy) => {
          void proxy.count;
        });
        expect(tracker.pathCache.get('count')?.value).toBe(10);

        runSession(tracker, { count: 20, name: 'test' }, (proxy) => {
          void proxy.count;
        });
        expect(tracker.pathCache.get('count')?.value).toBe(20);
      });
    });
  });

  describe('Change Detection', () => {
    describe('hasDependencyChanges()', () => {
      it('should detect value changes at tracked paths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(hasDependencyChanges(tracker, { count: 20, name: 'test' })).toBe(
          true,
        );
      });

      it('should return false when no changes detected', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(hasDependencyChanges(tracker, state)).toBe(false);
      });

      it('should ignore changes in untracked paths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(
          hasDependencyChanges(tracker, { count: 10, name: 'updated' }),
        ).toBe(false);
      });

      it('should use shallow equality for primitive values', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
          void proxy.name;
        });

        expect(hasDependencyChanges(tracker, { count: 10, name: 'test' })).toBe(
          false,
        );
      });

      it('should detect deep path changes', () => {
        const tracker = fixture.tracker<NestedState>();
        const state: NestedState = {
          user: {
            name: 'John',
            profile: { age: 30, email: 'john@example.com' },
          },
          settings: { theme: 'light', notifications: true },
        };

        runSession(tracker, state, (proxy) => {
          void proxy.user.profile.age;
        });

        const newState: NestedState = {
          user: {
            name: 'John',
            profile: { age: 31, email: 'john@example.com' },
          },
          settings: { theme: 'light', notifications: true },
        };
        expect(hasDependencyChanges(tracker, newState)).toBe(true);
      });

      it('should handle array mutations', () => {
        const tracker = fixture.tracker<ArrayState>();
        const state: ArrayState = { items: [1, 2, 3], tags: ['a', 'b'] };

        runSession(tracker, state, (proxy) => {
          void proxy.items[0];
          void proxy.items.length;
        });

        expect(
          hasDependencyChanges(tracker, {
            items: [1, 2, 3, 4],
            tags: ['a', 'b'],
          }),
        ).toBe(true);
      });

      it('should return true when no paths are tracked', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        expect(hasDependencyChanges(tracker, state)).toBe(true);
      });

      it('should handle null and undefined values', () => {
        interface NullableState {
          value: string | null;
          optional?: number;
        }

        const tracker = fixture.tracker<NullableState>();
        const state: NullableState = { value: 'test', optional: 10 };

        runSession(tracker, state, (proxy) => {
          void proxy.value;
          void proxy.optional;
        });

        expect(
          hasDependencyChanges(tracker, { value: null, optional: undefined }),
        ).toBe(true);
      });
    });

    describe('hasTrackedData()', () => {
      it('should return false when no data is tracked', () => {
        const tracker = fixture.tracker<SimpleState>();

        expect(hasTrackedData(tracker)).toBe(false);
      });

      it('should return true when tracking is active', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        startDependency(tracker);
        const proxy = createDependencyProxy(tracker, state) as SimpleState;
        void proxy.count;

        expect(hasTrackedData(tracker)).toBe(true);
      });

      it('should return true when cache has paths', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });

        expect(hasTrackedData(tracker)).toBe(true);
      });

      it('should return true when previous render paths exist', () => {
        const tracker = fixture.tracker<SimpleState>();
        const state = { count: 10, name: 'test' };

        runSession(tracker, state, (proxy) => {
          void proxy.count;
        });
        runSession(tracker, state, (proxy) => {
          void proxy.name;
        });

        expect(tracker.previousRenderPaths.size).toBeGreaterThan(0);
        expect(hasTrackedData(tracker)).toBe(true);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle many tracked paths efficiently', () => {
      interface LargeState {
        [key: string]: number;
      }

      const tracker = fixture.tracker<LargeState>();
      const state: LargeState = {};

      for (let i = 0; i < 100; i++) {
        state[`field${i}`] = i;
      }

      runSession(tracker, state, (proxy) => {
        for (let i = 0; i < 100; i++) {
          void proxy[`field${i}`];
        }
      });

      expect(tracker.pathCache.size).toBe(100);
      expect(hasDependencyChanges(tracker, { ...state, field50: 999 })).toBe(
        true,
      );
    });

    it('should cleanup unused paths periodically', () => {
      const tracker = fixture.tracker<SimpleState>();
      const state = { count: 10, name: 'test' };

      runSession(tracker, state, (proxy) => {
        void proxy.count;
      });
      expect(tracker.pathCache.has('count')).toBe(true);

      for (let i = 0; i < 10; i++) {
        runSession(tracker, state, (proxy) => {
          void proxy.name;
        });
      }

      expect(tracker.pathCache.has('name')).toBe(true);
    });

    it('should handle object references correctly with fine-grained tracking', () => {
      interface RefState {
        obj: { value: number };
        arr: number[];
      }

      const obj = { value: 10 };
      const arr = [1, 2, 3];
      const state: RefState = { obj, arr };

      const tracker = fixture.tracker<RefState>();
      runSession(tracker, state, (proxy) => {
        void proxy.obj.value;
      });

      expect(tracker.currentRenderPaths.has('obj.value')).toBe(true);
      expect(tracker.currentRenderPaths.has('obj')).toBe(false);

      expect(hasDependencyChanges(tracker, { obj, arr })).toBe(false);
      expect(hasDependencyChanges(tracker, { obj: { value: 10 }, arr })).toBe(
        false,
      );
      expect(hasDependencyChanges(tracker, { obj: { value: 20 }, arr })).toBe(
        true,
      );
    });

    it('should handle rapid tracking sessions', () => {
      const tracker = fixture.tracker<SimpleState>();
      const states: SimpleState[] = [];

      for (let i = 0; i < 50; i++) {
        states.push({ count: i, name: `state${i}` });
      }

      for (let i = 0; i < 50; i++) {
        runSession(tracker, states[i], (proxy) => {
          void proxy.count;
        });
      }

      expect(hasDependencyChanges(tracker, { count: 999, name: 'final' })).toBe(
        true,
      );
    });

    it('should handle empty objects', () => {
      interface EmptyState {
        value: number;
        empty: Record<string, never>;
      }

      const tracker = fixture.tracker<EmptyState>();
      const state: EmptyState = { value: 10, empty: {} };

      runSession(tracker, state, (proxy) => {
        void proxy.value;
      });

      expect(hasDependencyChanges(tracker, state)).toBe(false);
      expect(hasDependencyChanges(tracker, { value: 10, empty: {} })).toBe(
        false,
      );
    });

    it('should handle circular references gracefully', () => {
      interface CircularState {
        value: number;
        self?: CircularState;
      }

      const tracker = fixture.tracker<CircularState>();
      const state: CircularState = { value: 10 };

      runSession(tracker, state, (proxy) => {
        void proxy.value;
      });

      expect(tracker.pathCache.has('value')).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should work through complete render cycle', () => {
      const tracker = fixture.tracker<SimpleState>();
      let state = { count: 0, name: 'initial' };

      runSession(tracker, state, (proxy) => {
        expect(proxy.count).toBe(0);
        expect(proxy.name).toBe('initial');
      });

      state = { count: 1, name: 'updated' };
      expect(hasDependencyChanges(tracker, state)).toBe(true);

      runSession(tracker, state, (proxy) => {
        expect(proxy.count).toBe(1);
      });

      expect(hasDependencyChanges(tracker, state)).toBe(false);
    });

    it('should handle partial state updates', () => {
      const tracker = fixture.tracker<NestedState>();
      let state: NestedState = {
        user: { name: 'John', profile: { age: 30, email: 'john@example.com' } },
        settings: { theme: 'light', notifications: true },
      };

      runSession(tracker, state, (proxy) => {
        expect(proxy.user.name).toBe('John');
      });

      state = { ...state, settings: { theme: 'dark', notifications: false } };
      expect(hasDependencyChanges(tracker, state)).toBe(false);

      state = { ...state, user: { ...state.user, name: 'Jane' } };
      expect(hasDependencyChanges(tracker, state)).toBe(true);
    });

    it('should support conditional rendering logic', () => {
      const tracker = fixture.tracker<SimpleState>();
      let state = { count: 0, name: 'test' };

      runSession(tracker, state, (proxy) => {
        if (proxy.count > 0) {
          void proxy.name;
        }
      });

      expect(tracker.pathCache.has('count')).toBe(true);
      expect(tracker.pathCache.has('name')).toBe(false);

      state = { count: 1, name: 'test' };
      expect(hasDependencyChanges(tracker, state)).toBe(true);

      runSession(tracker, state, (proxy) => {
        if (proxy.count > 0) {
          void proxy.name;
        }
      });

      expect(tracker.pathCache.has('count')).toBe(true);
      expect(tracker.pathCache.has('name')).toBe(true);
    });
  });

  describe('Fine-Grained Path Optimization', () => {
    describe('optimizeTrackedPaths()', () => {
      it('should remove parent when only leaf accessed', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['user', 'user.profile', 'user.profile.bio']),
        );

        expect(optimized.has('user.profile.bio')).toBe(true);
        expect(optimized.has('user.profile')).toBe(false);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(1);
      });

      it('should keep siblings without parent', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['user', 'user.name', 'user.age']),
        );

        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.has('user.age')).toBe(true);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle mixed depth siblings', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['user', 'user.profile', 'user.profile.bio', 'user.name']),
        );

        expect(optimized.has('user.profile.bio')).toBe(true);
        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.has('user.profile')).toBe(false);
        expect(optimized.has('user')).toBe(false);
        expect(optimized.size).toBe(2);
      });

      it('should handle array indices separately but keep parent', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['items', 'items[0]', 'items[1]']),
        );

        expect(optimized.has('items[0]')).toBe(true);
        expect(optimized.has('items[1]')).toBe(true);
        expect(optimized.has('items')).toBe(true);
        expect(optimized.size).toBe(3);
      });

      it('should handle array properties and restore parent', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['items', 'items.length', 'items[0]']),
        );

        expect(optimized.has('items.length')).toBe(true);
        expect(optimized.has('items[0]')).toBe(true);
        expect(optimized.has('items')).toBe(true);
        expect(optimized.size).toBe(3);
      });

      it('should handle empty set correctly', () => {
        const optimized = optimizeTrackedPaths(new Set<string>());

        expect(optimized.size).toBe(0);
      });

      it('should handle single path correctly', () => {
        const optimized = optimizeTrackedPaths(new Set(['user.name']));

        expect(optimized.has('user.name')).toBe(true);
        expect(optimized.size).toBe(1);
      });

      it('should handle top-level properties', () => {
        const optimized = optimizeTrackedPaths(
          new Set(['count', 'name', 'theme']),
        );

        expect(optimized.has('count')).toBe(true);
        expect(optimized.has('name')).toBe(true);
        expect(optimized.has('theme')).toBe(true);
        expect(optimized.size).toBe(3);
      });

      it('should handle complex nested structure', () => {
        const optimized = optimizeTrackedPaths(
          new Set([
            'state',
            'state.user',
            'state.user.profile',
            'state.user.profile.bio',
            'state.user.profile.avatar',
            'state.user.settings',
            'state.user.settings.theme',
            'state.stats',
            'state.stats.count',
          ]),
        );

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

      const tracker = fixture.tracker<TestState>();
      const state: TestState = {
        user: {
          personal: { name: 'John', age: 30 },
          preferences: { theme: 'light', language: 'en' },
        },
        stats: { count: 0 },
      };

      runSession(tracker, state, (proxy) => {
        void proxy.user.personal.name;
        void proxy.user.preferences.theme;
      });

      expect(tracker.currentRenderPaths.has('user.personal.name')).toBe(true);
      expect(tracker.currentRenderPaths.has('user.preferences.theme')).toBe(
        true,
      );
      expect(tracker.currentRenderPaths.has('user')).toBe(false);
      expect(tracker.currentRenderPaths.has('user.personal')).toBe(false);
      expect(tracker.currentRenderPaths.has('user.preferences')).toBe(false);
      expect(tracker.currentRenderPaths.size).toBe(2);

      const newState1: TestState = {
        ...state,
        user: { ...state.user, personal: { ...state.user.personal, age: 31 } },
      };
      expect(hasDependencyChanges(tracker, newState1)).toBe(false);

      const newState2: TestState = {
        ...state,
        user: {
          ...state.user,
          personal: { ...state.user.personal, name: 'Jane' },
        },
      };
      expect(hasDependencyChanges(tracker, newState2)).toBe(true);
    });
  });
});

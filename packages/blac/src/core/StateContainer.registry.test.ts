/**
 * Tests for StateContainer Registry Features
 * Tests the isolated/shared instance management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateContainer } from './StateContainer';

// Test implementations
class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

class IsolatedCounterBloc extends StateContainer<{ count: number }> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

class UserBloc extends StateContainer<
  { name: string; age: number },
  { initialName?: string }
> {
  constructor(props: { initialName?: string }) {
    super({ name: props?.initialName ?? '', age: 0 });
  }

  setName = (name: string) => {
    this.update((state) => ({ ...state, name }));
  };
}

describe('StateContainer - Registry Features', () => {
  beforeEach(() => {
    // Clear all instances before each test
    StateContainer.clearAllInstances();
  });

  describe('Type Registration', () => {
    it('should register a bloc type', () => {
      CounterBloc.register();

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
      expect(stats.totalInstances).toBe(0);
    });

    it('should throw if registering duplicate type', () => {
      CounterBloc.register();

      expect(() => {
        CounterBloc.register();
      }).toThrow('Type "CounterBloc" is already registered');
    });

    it('should allow registering multiple different types', () => {
      CounterBloc.register();
      UserBloc.register();

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(2);
    });

    it('should auto-detect isolated from static property', () => {
      IsolatedCounterBloc.register();

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should allow setting isolated mode explicitly', () => {
      CounterBloc.register(true);

      const instance1 = CounterBloc.resolve();
      const instance2 = CounterBloc.resolve();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Shared Instances (Default)', () => {
    it('should create instance on first get (auto-register)', () => {
      const instance = CounterBloc.resolve();

      expect(instance).toBeInstanceOf(CounterBloc);
      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should return same instance for default key', () => {
      const instance1 = CounterBloc.resolve();
      const instance2 = CounterBloc.resolve();

      expect(instance1).toBe(instance2);
    });

    it('should create different instances for different keys', () => {
      const instance1 = CounterBloc.resolve('counter-1');
      const instance2 = CounterBloc.resolve('counter-2');

      expect(instance1).not.toBe(instance2);
    });

    it('should return same instance for same custom key', () => {
      const instance1 = CounterBloc.resolve('shared');
      const instance2 = CounterBloc.resolve('shared');

      expect(instance1).toBe(instance2);
    });

    it('should create instance only once per key', () => {
      const instance1 = CounterBloc.resolve();
      const instance2 = CounterBloc.resolve();
      const instance3 = CounterBloc.resolve();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance on each get (static isolated)', () => {
      const instance1 = IsolatedCounterBloc.resolve();
      const instance2 = IsolatedCounterBloc.resolve();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(IsolatedCounterBloc);
      expect(instance2).toBeInstanceOf(IsolatedCounterBloc);
    });

    it('should create new instance even with same key', () => {
      const instance1 = IsolatedCounterBloc.resolve('same-key');
      const instance2 = IsolatedCounterBloc.resolve('same-key');

      expect(instance1).not.toBe(instance2);
    });

    it('should respect isolated mode set via register', () => {
      CounterBloc.register(true);

      const instance1 = CounterBloc.resolve();
      const instance2 = CounterBloc.resolve();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Query Operations', () => {
    it('should return all shared instances of a type', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      CounterBloc.resolve('c3');

      const instances = CounterBloc.getAll();
      expect(instances).toHaveLength(3);
    });

    it('should return empty array for type with no instances', () => {
      CounterBloc.register();
      const instances = CounterBloc.getAll();
      expect(instances).toEqual([]);
    });

    it('should return empty array for non-registered type', () => {
      const instances = CounterBloc.getAll();
      expect(instances).toEqual([]);
    });

    it('should not track isolated instances in getAll', () => {
      IsolatedCounterBloc.resolve();
      IsolatedCounterBloc.resolve();
      IsolatedCounterBloc.resolve();

      // Isolated instances are not tracked in registry
      const instances = IsolatedCounterBloc.getAll();
      expect(instances).toEqual([]);
    });

    it('should get stats for all types', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      UserBloc.resolve('u1');

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(2);
      expect(stats.totalInstances).toBe(3);
      expect(stats.typeBreakdown).toEqual({
        CounterBloc: 2,
        UserBloc: 1,
      });
    });
  });

  describe('forEach Operations', () => {
    it('should iterate over all shared instances', () => {
      const c1 = CounterBloc.resolve('c1');
      const c2 = CounterBloc.resolve('c2');
      const c3 = CounterBloc.resolve('c3');

      // Increment each instance to different values
      c1.increment(); // 1
      c2.increment();
      c2.increment(); // 2
      c3.increment();
      c3.increment();
      c3.increment(); // 3

      const states: number[] = [];
      CounterBloc.forEach((instance) => {
        states.push(instance.state.count);
      });

      expect(states).toHaveLength(3);
      expect(states.sort()).toEqual([1, 2, 3]);
    });

    it('should skip disposed instances during iteration', () => {
      const c1 = CounterBloc.resolve('c1');
      const c2 = CounterBloc.resolve('c2');
      const c3 = CounterBloc.resolve('c3');

      // Mark different values
      c1.increment();
      c2.increment();
      c2.increment();
      c3.increment();
      c3.increment();
      c3.increment();

      const states: number[] = [];
      CounterBloc.forEach((instance) => {
        states.push(instance.state.count);

        // Dispose middle instance during iteration
        if (instance.state.count === 2) {
          CounterBloc.release('c2');
        }
      });

      // Should have processed all 3 instances
      expect(states.sort()).toEqual([1, 2, 3]);

      // c2 should now be disposed
      expect(c2.isDisposed).toBe(true);

      // Second forEach should skip the disposed one
      const secondStates: number[] = [];
      CounterBloc.forEach((instance) => {
        secondStates.push(instance.state.count);
      });

      expect(secondStates.sort()).toEqual([1, 3]);
    });

    it('should not throw when callback throws', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      CounterBloc.resolve('c3');

      const visitedKeys: string[] = [];

      // Should not throw, but should log error
      expect(() => {
        CounterBloc.forEach((instance) => {
          visitedKeys.push(instance.instanceId);
          if (instance.state.count === 0) {
            throw new Error('Test error');
          }
        });
      }).not.toThrow();

      // All instances should have been visited despite error
      expect(visitedKeys).toHaveLength(3);
    });

    it('should work with no instances', () => {
      let callCount = 0;
      CounterBloc.forEach(() => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should work with single instance', () => {
      const instance = CounterBloc.resolve('single');
      instance.increment();

      let state: number | null = null;
      CounterBloc.forEach((inst) => {
        state = inst.state.count;
      });

      expect(state).toBe(1);
    });

    it('should not iterate over isolated instances', () => {
      IsolatedCounterBloc.resolve();
      IsolatedCounterBloc.resolve();
      IsolatedCounterBloc.resolve();

      let callCount = 0;
      IsolatedCounterBloc.forEach(() => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should allow state mutation during iteration', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      CounterBloc.resolve('c3');

      // Increment all instances
      CounterBloc.forEach((instance) => {
        instance.increment();
      });

      // Verify all were incremented
      const states: number[] = [];
      CounterBloc.forEach((instance) => {
        states.push(instance.state.count);
      });

      expect(states.every((s) => s === 1)).toBe(true);
    });

    it('should support collecting statistics', () => {
      const c1 = CounterBloc.resolve('c1');
      const c2 = CounterBloc.resolve('c2');
      const c3 = CounterBloc.resolve('c3');

      c1.increment();
      c1.increment(); // 2
      c2.increment(); // 1
      c3.increment();
      c3.increment();
      c3.increment(); // 3

      let totalCount = 0;
      let maxCount = 0;
      CounterBloc.forEach((instance) => {
        totalCount += instance.state.count;
        maxCount = Math.max(maxCount, instance.state.count);
      });

      expect(totalCount).toBe(6); // 2 + 1 + 3
      expect(maxCount).toBe(3);
    });

    it('should support conditional release during iteration', () => {
      const c1 = CounterBloc.resolve('c1');
      const c2 = CounterBloc.resolve('c2');
      const c3 = CounterBloc.resolve('c3');

      c1.increment(); // Keep (state: 1)
      c2.increment();
      c2.increment(); // Release (state: 2)
      c3.increment();
      c3.increment();
      c3.increment(); // Release (state: 3)

      // Track which keys to release
      const keysToRelease: string[] = [];
      CounterBloc.forEach((instance) => {
        if (instance.state.count > 1) {
          // Determine key based on state value
          if (instance.state.count === 2) keysToRelease.push('c2');
          if (instance.state.count === 3) keysToRelease.push('c3');
        }
      });

      // Release after iteration
      keysToRelease.forEach((key) => CounterBloc.release(key));

      // Only c1 should remain
      const remaining = CounterBloc.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].state.count).toBe(1);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all instances of a type', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      UserBloc.resolve('u1');

      CounterBloc.clear();

      expect(CounterBloc.getAll()).toHaveLength(0);
      expect(UserBloc.getAll()).toHaveLength(1);
    });

    it('should allow clearing non-registered type', () => {
      expect(() => {
        CounterBloc.clear();
      }).not.toThrow();
    });

    it('should clear all instances from all types', () => {
      CounterBloc.resolve('c1');
      CounterBloc.resolve('c2');
      UserBloc.resolve('u1');

      StateContainer.clearAllInstances();

      const stats = StateContainer.getStats();
      expect(stats.totalInstances).toBe(0);
      expect(stats.registeredTypes).toBe(0); // Types also cleared
    });
  });

  describe('Error Handling', () => {
    it('should auto-register on first get (no error for unregistered)', () => {
      expect(() => {
        CounterBloc.resolve();
      }).not.toThrow();

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should handle constructor errors gracefully', () => {
      class ErrorBloc extends StateContainer<{ value: number }> {
        constructor() {
          super({ value: 0 });
          throw new Error('Constructor error');
        }
      }

      expect(() => {
        ErrorBloc.resolve();
      }).toThrow('Constructor error');
    });
  });

  describe('Type Safety', () => {
    it('should infer correct return types', () => {
      const instance = CounterBloc.resolve();

      // TypeScript should infer this is a CounterBloc
      instance.increment();
      expect(instance.state.count).toBe(1);
    });

    it('should work with different state types', () => {
      const instance = UserBloc.resolve();

      instance.setName('Alice');
      expect(instance.state.name).toBe('Alice');
    });

    it('should support props arguments', () => {
      const instance = UserBloc.resolve(undefined, {
        props: { initialName: 'Bob' },
      });

      expect(instance.state.name).toBe('Bob');
    });
  });

  describe('Reference Counting', () => {
    it('should increment ref count on attach', () => {
      const instance1 = CounterBloc.resolve('test');
      const instance2 = CounterBloc.resolve('test');

      expect(instance1).toBe(instance2);
      expect(CounterBloc.getAll()).toHaveLength(1);
    });

    it('should dispose instance when ref count reaches zero', () => {
      const instance = CounterBloc.resolve('test');

      expect(instance.isDisposed).toBe(false);

      CounterBloc.release('test');

      expect(instance.isDisposed).toBe(true);
      expect(CounterBloc.getAll()).toHaveLength(0);
    });

    it('should respect static keepAlive property', () => {
      class KeepAliveBloc extends StateContainer<{ value: number }> {
        static keepAlive = true;

        constructor() {
          super({ value: 0 });
        }
      }

      const instance = KeepAliveBloc.resolve('test');
      KeepAliveBloc.release('test');

      expect(instance.isDisposed).toBe(false);
      expect(KeepAliveBloc.getAll()).toHaveLength(1);
    });
  });
});

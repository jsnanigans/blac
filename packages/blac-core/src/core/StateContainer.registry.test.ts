/**
 * Tests for StateContainer Registry Features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateContainer } from './StateContainer';
import {
  acquire,
  borrow,
  ensure,
  release,
  getAll,
  forEach,
  register,
  clear,
  clearAll,
  getStats,
  getRefCount,
} from '../registry';

// Test implementations
class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

class UserBloc extends StateContainer<{ name: string; age: number }> {
  constructor() {
    super({ name: '', age: 0 });
  }

  setName = (name: string) => {
    this.update((state) => ({ ...state, name }));
  };
}

describe('StateContainer - Registry Features', () => {
  beforeEach(() => {
    // Clear all instances before each test
    clearAll();
  });

  describe('Type Registration', () => {
    it('should register a bloc type', () => {
      register(CounterBloc);

      const stats = getStats();
      expect(stats.registeredTypes).toBe(1);
      expect(stats.totalInstances).toBe(0);
    });

    it('should throw if registering duplicate type', () => {
      register(CounterBloc);

      expect(() => {
        register(CounterBloc);
      }).toThrow('Type "CounterBloc" is already registered');
    });

    it('should allow registering multiple different types', () => {
      register(CounterBloc);
      register(UserBloc);

      const stats = getStats();
      expect(stats.registeredTypes).toBe(2);
    });

  });

  describe('Shared Instances (Default)', () => {
    it('should create instance on first get (auto-register)', () => {
      const instance = acquire(CounterBloc);

      expect(instance).toBeInstanceOf(CounterBloc);
      const stats = getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should return same instance for default key', () => {
      const instance1 = acquire(CounterBloc);
      const instance2 = acquire(CounterBloc);

      expect(instance1).toBe(instance2);
    });

    it('should create different instances for different keys', () => {
      const instance1 = acquire(CounterBloc, 'counter-1');
      const instance2 = acquire(CounterBloc, 'counter-2');

      expect(instance1).not.toBe(instance2);
    });

    it('should return same instance for same custom key', () => {
      const instance1 = acquire(CounterBloc, 'shared');
      const instance2 = acquire(CounterBloc, 'shared');

      expect(instance1).toBe(instance2);
    });

    it('should create instance only once per key', () => {
      const instance1 = acquire(CounterBloc);
      const instance2 = acquire(CounterBloc);
      const instance3 = acquire(CounterBloc);

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Query Operations', () => {
    it('should return all shared instances of a type', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(CounterBloc, 'c3');

      const instances = getAll(CounterBloc);
      expect(instances).toHaveLength(3);
    });

    it('should return empty array for type with no instances', () => {
      register(CounterBloc);
      const instances = getAll(CounterBloc);
      expect(instances).toEqual([]);
    });

    it('should return empty array for non-registered type', () => {
      const instances = getAll(CounterBloc);
      expect(instances).toEqual([]);
    });

    it('should get stats for all types', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(UserBloc, 'u1');

      const stats = getStats();
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
      const c1 = acquire(CounterBloc, 'c1');
      const c2 = acquire(CounterBloc, 'c2');
      const c3 = acquire(CounterBloc, 'c3');

      // Increment each instance to different values
      c1.increment(); // 1
      c2.increment();
      c2.increment(); // 2
      c3.increment();
      c3.increment();
      c3.increment(); // 3

      const states: number[] = [];
      forEach(CounterBloc, (instance) => {
        states.push(instance.state.count);
      });

      expect(states).toHaveLength(3);
      expect(states.sort()).toEqual([1, 2, 3]);
    });

    it('should skip disposed instances during iteration', () => {
      const c1 = acquire(CounterBloc, 'c1');
      const c2 = acquire(CounterBloc, 'c2');
      const c3 = acquire(CounterBloc, 'c3');

      // Mark different values
      c1.increment();
      c2.increment();
      c2.increment();
      c3.increment();
      c3.increment();
      c3.increment();

      const states: number[] = [];
      forEach(CounterBloc, (instance) => {
        states.push(instance.state.count);

        // Dispose middle instance during iteration
        if (instance.state.count === 2) {
          release(CounterBloc, 'c2');
        }
      });

      // Should have processed all 3 instances
      expect(states.sort()).toEqual([1, 2, 3]);

      // c2 should now be disposed
      expect(c2.isDisposed).toBe(true);

      // Second forEach should skip the disposed one
      const secondStates: number[] = [];
      forEach(CounterBloc, (instance) => {
        secondStates.push(instance.state.count);
      });

      expect(secondStates.sort()).toEqual([1, 3]);
    });

    it('should not throw when callback throws', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(CounterBloc, 'c3');

      const visitedKeys: string[] = [];

      // Should not throw, but should log error
      expect(() => {
        forEach(CounterBloc, (instance) => {
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
      forEach(CounterBloc, () => {
        callCount++;
      });

      expect(callCount).toBe(0);
    });

    it('should work with single instance', () => {
      const instance = acquire(CounterBloc, 'single');
      instance.increment();

      let state: number | null = null;
      forEach(CounterBloc, (inst) => {
        state = inst.state.count;
      });

      expect(state).toBe(1);
    });

    it('should allow state mutation during iteration', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(CounterBloc, 'c3');

      // Increment all instances
      forEach(CounterBloc, (instance) => {
        instance.increment();
      });

      // Verify all were incremented
      const states: number[] = [];
      forEach(CounterBloc, (instance) => {
        states.push(instance.state.count);
      });

      expect(states.every((s) => s === 1)).toBe(true);
    });

    it('should support collecting statistics', () => {
      const c1 = acquire(CounterBloc, 'c1');
      const c2 = acquire(CounterBloc, 'c2');
      const c3 = acquire(CounterBloc, 'c3');

      c1.increment();
      c1.increment(); // 2
      c2.increment(); // 1
      c3.increment();
      c3.increment();
      c3.increment(); // 3

      let totalCount = 0;
      let maxCount = 0;
      forEach(CounterBloc, (instance) => {
        totalCount += instance.state.count;
        maxCount = Math.max(maxCount, instance.state.count);
      });

      expect(totalCount).toBe(6); // 2 + 1 + 3
      expect(maxCount).toBe(3);
    });

    it('should support conditional release during iteration', () => {
      const c1 = acquire(CounterBloc, 'c1');
      const c2 = acquire(CounterBloc, 'c2');
      const c3 = acquire(CounterBloc, 'c3');

      c1.increment(); // Keep (state: 1)
      c2.increment();
      c2.increment(); // Release (state: 2)
      c3.increment();
      c3.increment();
      c3.increment(); // Release (state: 3)

      // Track which keys to release
      const keysToRelease: string[] = [];
      forEach(CounterBloc, (instance) => {
        if (instance.state.count > 1) {
          // Determine key based on state value
          if (instance.state.count === 2) keysToRelease.push('c2');
          if (instance.state.count === 3) keysToRelease.push('c3');
        }
      });

      // Release after iteration
      keysToRelease.forEach((key) => release(CounterBloc, key));

      // Only c1 should remain
      const remaining = getAll(CounterBloc);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].state.count).toBe(1);
    });
  });

  describe('Clear Operations', () => {
    it('should clear all instances of a type', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(UserBloc, 'u1');

      clear(CounterBloc);

      expect(getAll(CounterBloc)).toHaveLength(0);
      expect(getAll(UserBloc)).toHaveLength(1);
    });

    it('should allow clearing non-registered type', () => {
      expect(() => {
        clear(CounterBloc);
      }).not.toThrow();
    });

    it('should clear all instances from all types', () => {
      acquire(CounterBloc, 'c1');
      acquire(CounterBloc, 'c2');
      acquire(UserBloc, 'u1');

      clearAll();

      const stats = getStats();
      expect(stats.totalInstances).toBe(0);
      expect(stats.registeredTypes).toBe(0); // Types also cleared
    });
  });

  describe('Error Handling', () => {
    it('should auto-register on first get (no error for unregistered)', () => {
      expect(() => {
        acquire(CounterBloc);
      }).not.toThrow();

      const stats = getStats();
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
        acquire(ErrorBloc);
      }).toThrow('Constructor error');
    });
  });

  describe('Type Safety', () => {
    it('should infer correct return types', () => {
      const instance = acquire(CounterBloc);

      // TypeScript should infer this is a CounterBloc
      instance.increment();
      expect(instance.state.count).toBe(1);
    });

    it('should work with different state types', () => {
      const instance = acquire(UserBloc);

      instance.setName('Alice');
      expect(instance.state.name).toBe('Alice');
    });
  });

  describe('Reference Counting', () => {
    it('should increment ref count on attach', () => {
      const instance1 = acquire(CounterBloc, 'test');
      const instance2 = acquire(CounterBloc, 'test');

      expect(instance1).toBe(instance2);
      expect(getAll(CounterBloc)).toHaveLength(1);
    });

    it('should dispose instance when ref count reaches zero', () => {
      const instance = acquire(CounterBloc, 'test');

      expect(instance.isDisposed).toBe(false);

      release(CounterBloc, 'test');

      expect(instance.isDisposed).toBe(true);
      expect(getAll(CounterBloc)).toHaveLength(0);
    });

    it('should respect static keepAlive property', () => {
      class KeepAliveBloc extends StateContainer<{ value: number }> {
        static keepAlive = true;

        constructor() {
          super({ value: 0 });
        }
      }

      const instance = acquire(KeepAliveBloc, 'test');
      release(KeepAliveBloc, 'test');

      expect(instance.isDisposed).toBe(false);
      expect(getAll(KeepAliveBloc)).toHaveLength(1);
    });

    it('borrow does not increment refCount', () => {
      acquire(CounterBloc, 'test');
      const before = getRefCount(CounterBloc, 'test');

      borrow(CounterBloc, 'test');
      const after = getRefCount(CounterBloc, 'test');

      expect(after).toBe(before);
    });

    it('ensure does not increment keepAlive at refCount 0', () => {
      class KeepAliveBloc extends StateContainer<{ value: number }> {
        static keepAlive = true;
        constructor() {
          super({ value: 0 });
        }
      }

      acquire(KeepAliveBloc, 'test');
      release(KeepAliveBloc, 'test');
      expect(getRefCount(KeepAliveBloc, 'test')).toBe(0);

      ensure(KeepAliveBloc, 'test');
      expect(getRefCount(KeepAliveBloc, 'test')).toBe(0);
    });

    it('acquire replaces disposed entry', () => {
      const instance1 = acquire(CounterBloc, 'test');
      instance1.dispose();

      const instance2 = acquire(CounterBloc, 'test');
      expect(instance2).not.toBe(instance1);
      expect(instance2.isDisposed).toBe(false);
    });
  });
});

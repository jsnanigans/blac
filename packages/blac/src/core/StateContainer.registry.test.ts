/**
 * Tests for StateContainer Registry Features
 * Tests the isolated/shared instance management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateContainer } from './StateContainer';

// Test implementations
class CounterBloc extends StateContainer<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.update((state) => state + 1);
  };
}

class IsolatedCounterBloc extends StateContainer<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.update((state) => state + 1);
  };
}

class UserBloc extends StateContainer<{ name: string; age: number }> {
  constructor(config?: { initialName?: string }) {
    super({ name: config?.initialName || 'Unknown', age: 0 });
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

      const instance1 = CounterBloc.getOrCreate();
      const instance2 = CounterBloc.getOrCreate();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Shared Instances (Default)', () => {
    it('should create instance on first get (auto-register)', () => {
      const instance = CounterBloc.getOrCreate();

      expect(instance).toBeInstanceOf(CounterBloc);
      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should return same instance for default key', () => {
      const instance1 = CounterBloc.getOrCreate();
      const instance2 = CounterBloc.getOrCreate();

      expect(instance1).toBe(instance2);
    });

    it('should create different instances for different keys', () => {
      const instance1 = CounterBloc.getOrCreate('counter-1');
      const instance2 = CounterBloc.getOrCreate('counter-2');

      expect(instance1).not.toBe(instance2);
    });

    it('should return same instance for same custom key', () => {
      const instance1 = CounterBloc.getOrCreate('shared');
      const instance2 = CounterBloc.getOrCreate('shared');

      expect(instance1).toBe(instance2);
    });

    it('should create instance only once per key', () => {
      const instance1 = CounterBloc.getOrCreate();
      const instance2 = CounterBloc.getOrCreate();
      const instance3 = CounterBloc.getOrCreate();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance on each get (static isolated)', () => {
      const instance1 = IsolatedCounterBloc.getOrCreate();
      const instance2 = IsolatedCounterBloc.getOrCreate();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(IsolatedCounterBloc);
      expect(instance2).toBeInstanceOf(IsolatedCounterBloc);
    });

    it('should create new instance even with same key', () => {
      const instance1 = IsolatedCounterBloc.getOrCreate('same-key');
      const instance2 = IsolatedCounterBloc.getOrCreate('same-key');

      expect(instance1).not.toBe(instance2);
    });

    it('should respect isolated mode set via register', () => {
      CounterBloc.register(true);

      const instance1 = CounterBloc.getOrCreate();
      const instance2 = CounterBloc.getOrCreate();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Query Operations', () => {
    it('should return all shared instances of a type', () => {
      CounterBloc.getOrCreate('c1');
      CounterBloc.getOrCreate('c2');
      CounterBloc.getOrCreate('c3');

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
      IsolatedCounterBloc.getOrCreate();
      IsolatedCounterBloc.getOrCreate();
      IsolatedCounterBloc.getOrCreate();

      // Isolated instances are not tracked in registry
      const instances = IsolatedCounterBloc.getAll();
      expect(instances).toEqual([]);
    });

    it('should get stats for all types', () => {
      CounterBloc.getOrCreate('c1');
      CounterBloc.getOrCreate('c2');
      UserBloc.getOrCreate('u1');

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(2);
      expect(stats.totalInstances).toBe(3);
      expect(stats.typeBreakdown).toEqual({
        CounterBloc: 2,
        UserBloc: 1,
      });
    });
  });

  describe('Clear Operations', () => {
    it('should clear all instances of a type', () => {
      CounterBloc.getOrCreate('c1');
      CounterBloc.getOrCreate('c2');
      UserBloc.getOrCreate('u1');

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
      CounterBloc.getOrCreate('c1');
      CounterBloc.getOrCreate('c2');
      UserBloc.getOrCreate('u1');

      StateContainer.clearAllInstances();

      const stats = StateContainer.getStats();
      expect(stats.totalInstances).toBe(0);
      expect(stats.registeredTypes).toBe(0); // Types also cleared
    });
  });

  describe('Error Handling', () => {
    it('should auto-register on first get (no error for unregistered)', () => {
      expect(() => {
        CounterBloc.getOrCreate();
      }).not.toThrow();

      const stats = StateContainer.getStats();
      expect(stats.registeredTypes).toBe(1);
    });

    it('should handle constructor errors gracefully', () => {
      class ErrorBloc extends StateContainer<number> {
        constructor() {
          super(0);
          throw new Error('Constructor error');
        }
      }

      expect(() => {
        ErrorBloc.getOrCreate();
      }).toThrow('Constructor error');
    });
  });

  describe('Type Safety', () => {
    it('should infer correct return types', () => {
      const instance = CounterBloc.getOrCreate();

      // TypeScript should infer this is a CounterBloc
      instance.increment();
      expect(instance.state).toBe(1);
    });

    it('should work with different state types', () => {
      const instance = UserBloc.getOrCreate();

      instance.setName('Alice');
      expect(instance.state.name).toBe('Alice');
    });

    it('should support constructor arguments', () => {
      const instance = UserBloc.getOrCreate(undefined, { initialName: 'Bob' });

      expect(instance.state.name).toBe('Bob');
    });
  });

  describe('Reference Counting', () => {
    it('should increment ref count on getOrCreate', () => {
      const instance1 = CounterBloc.getOrCreate('test');
      const instance2 = CounterBloc.getOrCreate('test');

      expect(instance1).toBe(instance2);
      expect(CounterBloc.getAll()).toHaveLength(1);
    });

    it('should dispose instance when ref count reaches zero', () => {
      const instance = CounterBloc.getOrCreate('test');

      expect(instance.isDisposed).toBe(false);

      CounterBloc.release('test');

      expect(instance.isDisposed).toBe(true);
      expect(CounterBloc.getAll()).toHaveLength(0);
    });

    it('should respect keepAlive flag', () => {
      class KeepAliveBloc extends StateContainer<number> {
        constructor() {
          super(0, { keepAlive: true });
        }
      }

      const instance = KeepAliveBloc.getOrCreate('test');
      KeepAliveBloc.release('test');

      expect(instance.isDisposed).toBe(false);
      expect(KeepAliveBloc.getAll()).toHaveLength(1);
    });
  });
});

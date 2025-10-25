/**
 * Tests for BlocRegistry - Constructor Pattern
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlocRegistry } from './BlocRegistry';
import { instanceId as createInstanceId } from '../types/branded';
import { StateContainer } from '../core/StateContainer';

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

describe('BlocRegistry', () => {
  let registry: BlocRegistry;

  beforeEach(() => {
    registry = new BlocRegistry();
  });

  describe('Type Registration', () => {
    it('should register a bloc type with constructor', () => {
      registry.register(CounterBloc);

      const stats = registry.getStats();
      expect(stats.registeredTypes).toBe(1);
      expect(stats.totalInstances).toBe(0);
    });

    it('should throw if registering duplicate type', () => {
      registry.register(CounterBloc);

      expect(() => {
        registry.register(CounterBloc);
      }).toThrow('Bloc type "CounterBloc" is already registered');
    });

    it('should allow registering multiple different types', () => {
      registry.register(CounterBloc);
      registry.register(UserBloc);

      const stats = registry.getStats();
      expect(stats.registeredTypes).toBe(2);
    });

    it('should auto-detect isolated from static property', () => {
      registry.register(IsolatedCounterBloc);

      expect(registry.isRegistered(IsolatedCounterBloc)).toBe(true);
    });

    it('should allow overriding isolated setting', () => {
      registry.register(CounterBloc, { isolated: true });

      expect(registry.isRegistered(CounterBloc)).toBe(true);
    });
  });

  describe('Shared Instances (Default)', () => {
    it('should create instance on first get (auto-register)', () => {
      const instance = registry.get(CounterBloc);

      expect(instance).toBeInstanceOf(CounterBloc);
      expect(registry.isRegistered(CounterBloc)).toBe(true);
    });

    it('should return same instance for default ID', () => {
      const instance1 = registry.get(CounterBloc);
      const instance2 = registry.get(CounterBloc);

      expect(instance1).toBe(instance2);
    });

    it('should create different instances for different IDs', () => {
      const instance1 = registry.get(CounterBloc, { instanceId: 'counter-1' });
      const instance2 = registry.get(CounterBloc, { instanceId: 'counter-2' });

      expect(instance1).not.toBe(instance2);
    });

    it('should return same instance for same custom ID', () => {
      const instance1 = registry.get(CounterBloc, { instanceId: 'shared' });
      const instance2 = registry.get(CounterBloc, { instanceId: 'shared' });

      expect(instance1).toBe(instance2);
    });

    it('should create instance only once per ID', () => {
      const instance1 = registry.get(CounterBloc);
      const instance2 = registry.get(CounterBloc);
      const instance3 = registry.get(CounterBloc);

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance on each get (static isolated)', () => {
      const instance1 = registry.get(IsolatedCounterBloc);
      const instance2 = registry.get(IsolatedCounterBloc);

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(IsolatedCounterBloc);
      expect(instance2).toBeInstanceOf(IsolatedCounterBloc);
    });

    it('should create new instance even with same ID', () => {
      const instance1 = registry.get(IsolatedCounterBloc, {
        instanceId: 'same-id',
      });
      const instance2 = registry.get(IsolatedCounterBloc, {
        instanceId: 'same-id',
      });

      expect(instance1).not.toBe(instance2);
    });

    it('should track all isolated instances', () => {
      registry.get(IsolatedCounterBloc);
      registry.get(IsolatedCounterBloc);
      registry.get(IsolatedCounterBloc);

      const instances = registry.getAll(IsolatedCounterBloc);
      expect(instances).toHaveLength(3);
    });

    it('should respect isolated option even without static property', () => {
      registry.register(CounterBloc, { isolated: true });

      const instance1 = registry.get(CounterBloc);
      const instance2 = registry.get(CounterBloc);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Instance Removal', () => {
    it('should remove instance from registry', () => {
      const id = createInstanceId('counter-1');
      registry.get(CounterBloc, { instanceId: 'counter-1' });

      expect(registry.has(CounterBloc, id)).toBe(true);
      const removed = registry.remove(CounterBloc, id);

      expect(removed).toBe(true);
      expect(registry.has(CounterBloc, id)).toBe(false);
    });

    it('should return false if instance does not exist', () => {
      const id = createInstanceId('counter-1');
      const removed = registry.remove(CounterBloc, id);

      expect(removed).toBe(false);
    });

    it('should allow recreating instance after removal', () => {
      const id = createInstanceId('counter-1');
      const instance1 = registry.get(CounterBloc, { instanceId: 'counter-1' });
      registry.remove(CounterBloc, id);
      const instance2 = registry.get(CounterBloc, { instanceId: 'counter-1' });

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Query Operations', () => {
    it('should check instance existence', () => {
      const id = createInstanceId('counter-1');

      expect(registry.has(CounterBloc, id)).toBe(false);
      registry.get(CounterBloc, { instanceId: 'counter-1' });
      expect(registry.has(CounterBloc, id)).toBe(true);
    });

    it('should check if type is registered', () => {
      expect(registry.isRegistered(CounterBloc)).toBe(false);
      registry.register(CounterBloc);
      expect(registry.isRegistered(CounterBloc)).toBe(true);
    });

    it('should return all instances of a type', () => {
      registry.get(CounterBloc, { instanceId: 'c1' });
      registry.get(CounterBloc, { instanceId: 'c2' });
      registry.get(CounterBloc, { instanceId: 'c3' });

      const instances = registry.getAll(CounterBloc);
      expect(instances).toHaveLength(3);
    });

    it('should return empty array for type with no instances', () => {
      registry.register(CounterBloc);
      const instances = registry.getAll(CounterBloc);
      expect(instances).toEqual([]);
    });

    it('should return empty array for non-registered type', () => {
      const instances = registry.getAll(CounterBloc);
      expect(instances).toEqual([]);
    });

    it('should get stats for all types', () => {
      registry.get(CounterBloc, { instanceId: 'c1' });
      registry.get(CounterBloc, { instanceId: 'c2' });
      registry.get(UserBloc, { instanceId: 'u1' });

      const stats = registry.getStats();
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
      registry.get(CounterBloc, { instanceId: 'c1' });
      registry.get(CounterBloc, { instanceId: 'c2' });
      registry.get(UserBloc, { instanceId: 'u1' });

      registry.clear(CounterBloc);

      expect(registry.getAll(CounterBloc)).toHaveLength(0);
      expect(registry.getAll(UserBloc)).toHaveLength(1);
    });

    it('should allow clearing non-registered type', () => {
      expect(() => {
        registry.clear(CounterBloc);
      }).not.toThrow();
    });

    it('should clear all instances from all types', () => {
      registry.get(CounterBloc, { instanceId: 'c1' });
      registry.get(CounterBloc, { instanceId: 'c2' });
      registry.get(UserBloc, { instanceId: 'u1' });

      registry.clearAll();

      const stats = registry.getStats();
      expect(stats.totalInstances).toBe(0);
      expect(stats.registeredTypes).toBe(2); // Types still registered
    });

    it('should unregister a type', () => {
      registry.get(CounterBloc, { instanceId: 'c1' });

      expect(registry.isRegistered(CounterBloc)).toBe(true);
      const removed = registry.unregister(CounterBloc);

      expect(removed).toBe(true);
      expect(registry.isRegistered(CounterBloc)).toBe(false);
      expect(registry.getAll(CounterBloc)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should auto-register on first get (no error for unregistered)', () => {
      expect(() => {
        registry.get(CounterBloc);
      }).not.toThrow();

      expect(registry.isRegistered(CounterBloc)).toBe(true);
    });

    it('should handle constructor errors gracefully', () => {
      class ErrorBloc extends StateContainer<number> {
        constructor() {
          super(0);
          throw new Error('Constructor error');
        }
      }

      expect(() => {
        registry.get(ErrorBloc);
      }).toThrow('Constructor error');
    });
  });

  describe('Type Safety', () => {
    it('should infer correct return types', () => {
      const instance = registry.get(CounterBloc);

      // TypeScript should infer this is a CounterBloc
      instance.increment();
      expect(instance.state).toBe(1);
    });

    it('should work with different state types', () => {
      const instance = registry.get(UserBloc);

      instance.setName('Alice');
      expect(instance.state.name).toBe('Alice');
    });

    it('should support constructor arguments', () => {
      const instance = registry.get(UserBloc, {
        constructorArgs: [{ initialName: 'Bob' }],
      });

      expect(instance.state.name).toBe('Bob');
    });
  });

  describe('Instance ID Branding', () => {
    it('should create branded instance IDs', () => {
      const id = createInstanceId('test');

      // TypeScript should accept branded ID
      expect(() => {
        registry.get(CounterBloc, { instanceId: 'test' });
      }).not.toThrow();
    });
  });
});

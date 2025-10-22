/**
 * Tests for BlocRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlocRegistry, createInstanceId } from './BlocRegistry';
import { StateContainer } from '../core/StateContainer';

// Test implementations
class CounterBloc extends StateContainer<number> {
  constructor(id: string) {
    super(0);
  }

  increment = () => {
    this.update(state => state + 1);
  };
}

class UserBloc extends StateContainer<{ name: string; age: number }> {
  constructor(id: string) {
    super({ name: 'Unknown', age: 0 });
  }

  setName = (name: string) => {
    this.update(state => ({ ...state, name }));
  };
}

describe('BlocRegistry', () => {
  let registry: BlocRegistry;

  beforeEach(() => {
    registry = new BlocRegistry();
  });

  describe('Type Registration', () => {
    it('should register a bloc type with factory', () => {
      const factory = vi.fn((id) => new CounterBloc(id));

      registry.register('Counter', { factory });

      const stats = registry.getStats();
      expect(stats.registeredTypes).toBe(1);
      expect(stats.totalInstances).toBe(0);
    });

    it('should throw if registering duplicate type name', () => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });

      expect(() => {
        registry.register('Counter', {
          factory: (id) => new CounterBloc(id),
        });
      }).toThrow('Bloc type "Counter" is already registered');
    });

    it('should allow registering multiple different types', () => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });
      registry.register('User', {
        factory: (id) => new UserBloc(id),
      });

      const stats = registry.getStats();
      expect(stats.registeredTypes).toBe(2);
    });
  });

  describe('Shared Instances (Default)', () => {
    beforeEach(() => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });
    });

    it('should create instance on first get', () => {
      const id = createInstanceId('counter-1');
      const instance = registry.get<number, CounterBloc>('Counter', id);

      expect(instance).toBeInstanceOf(CounterBloc);
      expect(registry.has('Counter', id)).toBe(true);
    });

    it('should return same instance for same ID', () => {
      const id = createInstanceId('counter-1');
      const instance1 = registry.get<number, CounterBloc>('Counter', id);
      const instance2 = registry.get<number, CounterBloc>('Counter', id);

      expect(instance1).toBe(instance2);
    });

    it('should create different instances for different IDs', () => {
      const id1 = createInstanceId('counter-1');
      const id2 = createInstanceId('counter-2');

      const instance1 = registry.get<number, CounterBloc>('Counter', id1);
      const instance2 = registry.get<number, CounterBloc>('Counter', id2);

      expect(instance1).not.toBe(instance2);
    });

    it('should call factory only once per ID', () => {
      const factory = vi.fn((id) => new CounterBloc(id));
      registry.register('CounterTracked', { factory });

      const id = createInstanceId('counter-1');
      registry.get('CounterTracked', id);
      registry.get('CounterTracked', id);
      registry.get('CounterTracked', id);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(factory).toHaveBeenCalledWith(id);
    });
  });

  describe('Isolated Instances', () => {
    beforeEach(() => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
        isolated: true,
      });
    });

    it('should create new instance on each get', () => {
      const id = createInstanceId('counter-1');
      const instance1 = registry.get<number, CounterBloc>('Counter', id);
      const instance2 = registry.get<number, CounterBloc>('Counter', id);

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeInstanceOf(CounterBloc);
      expect(instance2).toBeInstanceOf(CounterBloc);
    });

    it('should call factory on each get', () => {
      const factory = vi.fn((id) => new CounterBloc(id));
      registry.register('CounterIsolated', { factory, isolated: true });

      const id = createInstanceId('counter-1');
      registry.get('CounterIsolated', id);
      registry.get('CounterIsolated', id);
      registry.get('CounterIsolated', id);

      expect(factory).toHaveBeenCalledTimes(3);
    });

    it('should still track all isolated instances', () => {
      const id = createInstanceId('counter-1');
      registry.get<number, CounterBloc>('Counter', id);
      registry.get<number, CounterBloc>('Counter', id);
      registry.get<number, CounterBloc>('Counter', id);

      const instances = registry.getAll<number, CounterBloc>('Counter');
      expect(instances).toHaveLength(3);
    });
  });

  describe('Instance Removal', () => {
    beforeEach(() => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });
    });

    it('should remove instance from registry', () => {
      const id = createInstanceId('counter-1');
      registry.get<number, CounterBloc>('Counter', id);

      expect(registry.has('Counter', id)).toBe(true);
      const removed = registry.remove('Counter', id);

      expect(removed).toBe(true);
      expect(registry.has('Counter', id)).toBe(false);
    });

    it('should return false if instance does not exist', () => {
      const id = createInstanceId('counter-1');
      const removed = registry.remove('Counter', id);

      expect(removed).toBe(false);
    });

    it('should return false if type does not exist', () => {
      const id = createInstanceId('counter-1');
      const removed = registry.remove('NonExistent', id);

      expect(removed).toBe(false);
    });

    it('should allow recreating instance after removal', () => {
      const id = createInstanceId('counter-1');
      const instance1 = registry.get<number, CounterBloc>('Counter', id);
      registry.remove('Counter', id);
      const instance2 = registry.get<number, CounterBloc>('Counter', id);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });
      registry.register('User', {
        factory: (id) => new UserBloc(id),
      });
    });

    it('should check instance existence', () => {
      const id = createInstanceId('counter-1');

      expect(registry.has('Counter', id)).toBe(false);
      registry.get<number, CounterBloc>('Counter', id);
      expect(registry.has('Counter', id)).toBe(true);
    });

    it('should return all instances of a type', () => {
      const id1 = createInstanceId('counter-1');
      const id2 = createInstanceId('counter-2');
      const id3 = createInstanceId('counter-3');

      registry.get<number, CounterBloc>('Counter', id1);
      registry.get<number, CounterBloc>('Counter', id2);
      registry.get<number, CounterBloc>('Counter', id3);

      const instances = registry.getAll<number, CounterBloc>('Counter');
      expect(instances).toHaveLength(3);
    });

    it('should return empty array for type with no instances', () => {
      const instances = registry.getAll<number, CounterBloc>('Counter');
      expect(instances).toEqual([]);
    });

    it('should return empty array for non-existent type', () => {
      const instances = registry.getAll('NonExistent');
      expect(instances).toEqual([]);
    });

    it('should get stats for all types', () => {
      registry.get<number, CounterBloc>('Counter', createInstanceId('c1'));
      registry.get<number, CounterBloc>('Counter', createInstanceId('c2'));
      registry.get('User', createInstanceId('u1'));

      const stats = registry.getStats();
      expect(stats.registeredTypes).toBe(2);
      expect(stats.totalInstances).toBe(3);
      expect(stats.typeBreakdown).toEqual({
        Counter: 2,
        User: 1,
      });
    });
  });

  describe('Clear Operations', () => {
    beforeEach(() => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });
      registry.register('User', {
        factory: (id) => new UserBloc(id),
      });
    });

    it('should clear all instances of a type', () => {
      registry.get<number, CounterBloc>('Counter', createInstanceId('c1'));
      registry.get<number, CounterBloc>('Counter', createInstanceId('c2'));
      registry.get('User', createInstanceId('u1'));

      registry.clear('Counter');

      expect(registry.getAll('Counter')).toHaveLength(0);
      expect(registry.getAll('User')).toHaveLength(1);
    });

    it('should allow clearing non-existent type', () => {
      expect(() => {
        registry.clear('NonExistent');
      }).not.toThrow();
    });

    it('should clear all instances from all types', () => {
      registry.get<number, CounterBloc>('Counter', createInstanceId('c1'));
      registry.get<number, CounterBloc>('Counter', createInstanceId('c2'));
      registry.get('User', createInstanceId('u1'));

      registry.clearAll();

      const stats = registry.getStats();
      expect(stats.totalInstances).toBe(0);
      expect(stats.registeredTypes).toBe(2); // Types still registered
    });
  });

  describe('Error Handling', () => {
    it('should throw if getting unregistered type', () => {
      expect(() => {
        registry.get('NonExistent', createInstanceId('id'));
      }).toThrow('Bloc type "NonExistent" is not registered');
    });

    it('should handle errors in factory gracefully', () => {
      const factory = vi.fn(() => {
        throw new Error('Factory error');
      });
      registry.register('ErrorBloc', { factory });

      expect(() => {
        registry.get('ErrorBloc', createInstanceId('id'));
      }).toThrow('Factory error');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct return types', () => {
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });

      const instance = registry.get<number, CounterBloc>(
        'Counter',
        createInstanceId('c1')
      );

      // TypeScript should enforce this is a CounterBloc
      instance.increment();
      expect(instance.state).toBe(1);
    });

    it('should work with different state types', () => {
      registry.register('User', {
        factory: (id) => new UserBloc(id),
      });

      const instance = registry.get<{ name: string; age: number }, UserBloc>(
        'User',
        createInstanceId('u1')
      );

      instance.setName('Alice');
      expect(instance.state.name).toBe('Alice');
    });
  });

  describe('Instance ID Branding', () => {
    it('should create branded instance IDs', () => {
      const id = createInstanceId('test');

      // TypeScript should accept branded ID
      registry.register('Counter', {
        factory: (id) => new CounterBloc(id),
      });

      expect(() => {
        registry.get('Counter', id);
      }).not.toThrow();
    });
  });
});

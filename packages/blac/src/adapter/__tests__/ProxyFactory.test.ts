import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProxyFactory } from '../ProxyFactory';
import { Cubit } from '../../Cubit';

// Mock consumer tracker
const createMockTracker = () => ({
  trackAccess: vi.fn(),
});

// Test objects
const simpleObject = {
  name: 'John',
  age: 30,
  active: true,
};

const nestedObject = {
  user: {
    name: 'John',
    profile: {
      email: 'john@example.com',
      settings: {
        theme: 'dark',
        notifications: true,
      },
    },
  },
  metadata: {
    created: new Date('2024-01-01'),
    tags: ['user', 'admin'],
  },
};

// Test Cubit with getters
class TestCubit extends Cubit<{ count: number; multiplier: number }> {
  constructor() {
    super({ count: 0, multiplier: 2 });
  }

  get doubled() {
    return this.state.count * 2;
  }

  get quadrupled() {
    return this.doubled * 2;
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('ProxyFactory', () => {
  let consumerRef: object;
  let tracker: ReturnType<typeof createMockTracker>;

  beforeEach(() => {
    consumerRef = { id: 'test-consumer' };
    tracker = createMockTracker();
    ProxyFactory.resetStats();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('State Proxy Creation', () => {
    it('should create state proxy and track property access', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access properties
      const name = proxy.name;
      const age = proxy.age;

      expect(name).toBe('John');
      expect(age).toBe(30);

      // Verify tracking (V2: top-level tracking only, no value tracking)
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'name',
        undefined, // V2 change: no value tracking for state properties
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'age',
        undefined, // V2 change: no value tracking for state properties
      );
    });

    it('should handle nested object proxying', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: nestedObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access nested properties
      const email = proxy.user.profile.email;
      const theme = proxy.user.profile.settings.theme;

      expect(email).toBe('john@example.com');
      expect(theme).toBe('dark');

      // V3 change: Full path tracking - should track ALL accessed paths
      // First expression: proxy.user.profile.email
      //   - Accesses 'user', 'user.profile', 'user.profile.email'
      // Second expression: proxy.user.profile.settings.theme
      //   - Accesses 'user' (again), 'user.profile' (again), 'user.profile.settings', 'user.profile.settings.theme'
      // Total: 7 accesses (some paths accessed multiple times)
      expect(tracker.trackAccess).toHaveBeenCalledTimes(7);

      // Verify that all expected paths were tracked (order matters)
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        1,
        consumerRef,
        'state',
        'user',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        2,
        consumerRef,
        'state',
        'user.profile',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        3,
        consumerRef,
        'state',
        'user.profile.email',
        undefined,
      );
      // Second expression starts
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        4,
        consumerRef,
        'state',
        'user',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        5,
        consumerRef,
        'state',
        'user.profile',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        6,
        consumerRef,
        'state',
        'user.profile.settings',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenNthCalledWith(
        7,
        consumerRef,
        'state',
        'user.profile.settings.theme',
        undefined,
      );
    });

    it('should not proxy primitive values', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: 'primitive' as any,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(proxy).toBe('primitive');
      expect(tracker.trackAccess).not.toHaveBeenCalled();
    });

    it('should not proxy null or undefined', () => {
      const nullProxy = ProxyFactory.createStateProxy({
        target: null as any,
        consumerRef,
        consumerTracker: tracker,
      });

      const undefinedProxy = ProxyFactory.createStateProxy({
        target: undefined as any,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(nullProxy).toBe(null);
      expect(undefinedProxy).toBe(undefined);
    });

    it('should handle arrays correctly', () => {
      const arrayObject = {
        items: [1, 2, 3],
        users: [{ name: 'John' }, { name: 'Jane' }],
      };

      const proxy = ProxyFactory.createStateProxy({
        target: arrayObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access array properties
      const length = proxy.items.length;
      const firstItem = proxy.items[0];
      const userName = proxy.users[1].name;

      expect(length).toBe(3);
      expect(firstItem).toBe(1);
      expect(userName).toBe('Jane');

      // Array methods should work
      const mapped = proxy.items.map((x: number) => x * 2);
      expect(mapped).toEqual([2, 4, 6]);
    });

    it('should prevent state mutations', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Try to mutate - proxy set trap returns false which throws in strict mode
      expect(() => {
        (proxy as any).name = 'Jane';
      }).toThrow(); // Throws in strict mode

      expect(proxy.name).toBe('John'); // Unchanged
    });

    it('should prevent property deletion', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: { ...simpleObject },
        consumerRef,
        consumerTracker: tracker,
      });

      // Try to delete - proxy deleteProperty trap returns false which throws in strict mode
      expect(() => {
        delete (proxy as any).name;
      }).toThrow(); // Throws in strict mode

      expect(proxy.name).toBe('John'); // Still exists
    });

    it('should handle symbols correctly', () => {
      const sym = Symbol('test');
      const objWithSymbol = {
        [sym]: 'symbol value',
        regular: 'regular value',
      };

      const proxy = ProxyFactory.createStateProxy({
        target: objWithSymbol,
        consumerRef,
        consumerTracker: tracker,
      });

      // Symbol access should work without tracking
      expect(proxy[sym]).toBe('symbol value');
      expect(tracker.trackAccess).not.toHaveBeenCalledWith(
        consumerRef,
        'state',
        expect.any(Symbol),
        expect.anything(),
      );
    });
  });

  describe('Class Proxy Creation', () => {
    it('should create class proxy and track getter access', () => {
      const cubit = new TestCubit();
      const proxy = ProxyFactory.createClassProxy({
        target: cubit,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access getter
      const doubled = proxy.doubled;

      expect(doubled).toBe(0);
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'class',
        'doubled',
        0,
      );
    });

    it('should not track method access', () => {
      const cubit = new TestCubit();
      const proxy = ProxyFactory.createClassProxy({
        target: cubit,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access method
      const increment = proxy.increment;

      expect(typeof increment).toBe('function');
      expect(tracker.trackAccess).not.toHaveBeenCalledWith(
        consumerRef,
        'class',
        'increment',
        expect.anything(),
      );

      // Method should still work
      increment();
      expect(cubit.state.count).toBe(1);
    });

    it('should handle getter inheritance correctly', () => {
      class Parent {
        value = 10;
        get parentGetter() {
          return this.value * 2;
        }
      }

      class Child extends Parent {
        get childGetter() {
          return this.value * 3;
        }
      }

      const child = new Child();
      const proxy = ProxyFactory.createClassProxy({
        target: child,
        consumerRef,
        consumerTracker: tracker,
      });

      // Access both getters
      const parentValue = proxy.parentGetter;
      const childValue = proxy.childGetter;

      expect(parentValue).toBe(20);
      expect(childValue).toBe(30);

      // Both should be tracked
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'class',
        'parentGetter',
        20,
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'class',
        'childGetter',
        30,
      );
    });

    it('should handle deep prototype chains safely', () => {
      // Create deep prototype chain
      const createDeepChain = (depth: number) => {
        let current: any = {
          get deepGetter() {
            return 'deep';
          },
        };

        for (let i = 0; i < depth; i++) {
          const parent = Object.create(current);
          current = parent;
        }

        return current;
      };

      const deepObject = createDeepChain(15); // Exceeds MAX_PROTOTYPE_DEPTH
      const proxy = ProxyFactory.createClassProxy({
        target: deepObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Should handle without infinite loop
      const value = proxy.deepGetter;
      expect(value).toBe('deep');
    });

    it('should handle circular prototype references', () => {
      // Can't actually create circular prototype chains - JS prevents this
      // Instead test deep prototype chains with WeakSet tracking
      const deepObj = { value: 1 };
      let current = deepObj;

      // Create a deep chain instead
      for (let i = 0; i < 15; i++) {
        const next = Object.create(current);
        next[`level${i}`] = i;
        current = next;
      }

      const proxy = ProxyFactory.createClassProxy({
        target: current,
        consumerRef,
        consumerTracker: tracker,
      });

      // Should handle deep chains
      expect(proxy.value).toBe(1);
    });
  });

  describe('Cache Management', () => {
    it('should cache proxies for same target and consumer', () => {
      const proxy1 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      const proxy2 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(proxy1).toBe(proxy2); // Same reference

      // Stats should show cache hit
      const stats = ProxyFactory.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should create different proxies for different consumers', () => {
      const consumer1 = { id: 'consumer1' };
      const consumer2 = { id: 'consumer2' };

      const proxy1 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef: consumer1,
        consumerTracker: tracker,
      });

      const proxy2 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef: consumer2,
        consumerTracker: tracker,
      });

      expect(proxy1).not.toBe(proxy2); // Different references
    });

    it('should handle WeakMap cache correctly', () => {
      let target: any = { value: 'test' };

      const proxy = ProxyFactory.createStateProxy({
        target,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(proxy.value).toBe('test');

      // Remove reference to target
      target = null;

      // Proxy should still work until garbage collected
      expect(proxy.value).toBe('test');
    });
  });

  describe('getProxyState and getProxyBlocInstance helpers', () => {
    it('should create state proxy through helper', () => {
      const state = { count: 5 };
      const proxy = ProxyFactory.getProxyState({
        state,
        consumerRef,
        consumerTracker: tracker,
      });

      const count = proxy.count;
      expect(count).toBe(5);
      // V2 change: no value tracking for state properties
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'count',
        undefined, // V2 change: no value tracking
      );
    });

    it('should create bloc instance proxy through helper', () => {
      const cubit = new TestCubit();
      const proxy = ProxyFactory.getProxyBlocInstance({
        blocInstance: cubit,
        consumerRef,
        consumerTracker: tracker,
      });

      const doubled = proxy.doubled;
      expect(doubled).toBe(0);
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'class',
        'doubled',
        0,
      );
    });
  });

  describe('Statistics and Performance', () => {
    it('should track proxy creation statistics', () => {
      // Create various proxies
      ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      ProxyFactory.createClassProxy({
        target: new TestCubit(),
        consumerRef,
        consumerTracker: tracker,
      });

      ProxyFactory.createStateProxy({
        target: nestedObject,
        consumerRef,
        consumerTracker: tracker,
      });

      const stats = ProxyFactory.getStats();
      expect(stats.stateProxiesCreated).toBeGreaterThan(0);
      expect(stats.classProxiesCreated).toBeGreaterThan(0);
      expect(stats.totalProxiesCreated).toBe(
        stats.stateProxiesCreated + stats.classProxiesCreated,
      );
      expect(stats.propertyAccesses).toBe(0); // No properties accessed yet
    });

    it('should reset statistics', () => {
      // Create some proxies
      ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      let stats = ProxyFactory.getStats();
      expect(stats.totalProxiesCreated).toBeGreaterThan(0);

      // Reset
      ProxyFactory.resetStats();

      stats = ProxyFactory.getStats();
      expect(stats.totalProxiesCreated).toBe(0);
      expect(stats.stateProxiesCreated).toBe(0);
      expect(stats.classProxiesCreated).toBe(0);
    });

    it('should calculate cache efficiency', () => {
      const _proxy1 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      // Cache hit
      const _proxy2 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      const stats = ProxyFactory.getStats();
      expect(stats.cacheEfficiency).toMatch(/\d+\.\d+%/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle objects with non-standard prototypes', () => {
      const objWithoutProto = Object.create(null);
      objWithoutProto.value = 'test';

      const proxy = ProxyFactory.createStateProxy({
        target: objWithoutProto,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(proxy.value).toBe('test');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01');
      const obj = { date };

      const proxy = ProxyFactory.createStateProxy({
        target: obj,
        consumerRef,
        consumerTracker: tracker,
      });

      // Date should not be proxied (not plain object)
      expect(proxy.date).toBe(date);
      expect(proxy.date instanceof Date).toBe(true);
    });

    it('should handle property descriptor edge cases', () => {
      const obj: { readOnly?: string } = {};
      Object.defineProperty(obj, 'readOnly', {
        value: 'fixed',
        writable: false,
        enumerable: true,
      });

      const proxy = ProxyFactory.createStateProxy({
        target: obj,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(proxy.readOnly).toBe('fixed');
      expect(Object.getOwnPropertyDescriptor(proxy, 'readOnly')).toEqual({
        value: 'fixed',
        writable: false,
        enumerable: true,
        configurable: false,
      });
    });

    it('should handle missing tracker or consumerRef', () => {
      // Missing tracker
      const proxy1 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: null as any,
      });
      expect(proxy1).toBe(simpleObject); // Returns original

      // Missing consumerRef
      const proxy2 = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef: null as any,
        consumerTracker: tracker,
      });
      expect(proxy2).toBe(simpleObject); // Returns original
    });

    it("should handle 'in' operator", () => {
      const proxy = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      expect('name' in proxy).toBe(true);
      expect('nonexistent' in proxy).toBe(false);
    });

    it('should handle Object.keys and similar operations', () => {
      const proxy = ProxyFactory.createStateProxy({
        target: simpleObject,
        consumerRef,
        consumerTracker: tracker,
      });

      expect(Object.keys(proxy)).toEqual(['name', 'age', 'active']);
      expect(Object.getOwnPropertyNames(proxy)).toEqual([
        'name',
        'age',
        'active',
      ]);
    });
  });

  describe('Proxy Depth Limiting', () => {
    beforeEach(() => {
      ProxyFactory.resetStats();
    });

    it('should create proxies up to the specified maxDepth', () => {
      const deeplyNestedObject = {
        level0: {
          level1: {
            level2: {
              level3: {
                level4: {
                  value: 'deep value',
                },
              },
            },
          },
        },
      };

      const maxDepth = 3;
      const proxy = ProxyFactory.createStateProxy({
        target: deeplyNestedObject,
        consumerRef,
        consumerTracker: tracker,
        maxDepth,
      });

      // Access nested properties up to maxDepth
      const level0 = proxy.level0;
      expect(level0).toBeDefined();

      const level1 = level0.level1;
      expect(level1).toBeDefined();

      const level2 = level1.level2;
      expect(level2).toBeDefined();

      // At maxDepth, should return raw object (not a proxy)
      const level3 = level2.level3;
      expect(level3).toBeDefined();

      // Verify that deeper levels are raw objects (not proxied)
      const level4 = level3.level4;
      expect(level4.value).toBe('deep value');

      // Check that all levels were tracked
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'level0',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'level0.level1',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'level0.level1.level2',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'level0.level1.level2.level3',
        undefined,
      );
    });

    it('should use default maxDepth of 3 when not specified', () => {
      const deepObject = {
        level0: { level1: { level2: { value: 'test' } } },
      };

      const proxy = ProxyFactory.createStateProxy({
        target: deepObject,
        consumerRef,
        consumerTracker: tracker,
        // No maxDepth specified, should default to 3
      });

      // Should create proxies for reasonable depth
      const result = proxy.level0.level1.level2.value;
      expect(result).toBe('test');
    });

    it('should stop creating proxies at maxDepth = 1', () => {
      const nestedObj = {
        first: {
          second: {
            third: 'value',
          },
        },
      };

      const proxy = ProxyFactory.createStateProxy({
        target: nestedObj,
        consumerRef,
        consumerTracker: tracker,
        maxDepth: 1,
      });

      // First level should be proxied
      const first = proxy.first;
      expect(first).toBeDefined();

      // Second level should be raw (at maxDepth)
      const second = first.second;
      expect(second).toBeDefined();
      expect(second.third).toBe('value');

      // Verify tracking
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'first',
        undefined,
      );
      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'first.second',
        undefined,
      );
    });

    it('should handle arrays within depth limit', () => {
      const objWithArrays = {
        users: [
          { name: 'John', details: { age: 30 } },
          { name: 'Jane', details: { age: 25 } },
        ],
      };

      const proxy = ProxyFactory.createStateProxy({
        target: objWithArrays,
        consumerRef,
        consumerTracker: tracker,
        maxDepth: 2,
      });

      // Access array and its contents
      const users = proxy.users;
      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);

      const firstUser = users[0];
      expect(firstUser.name).toBe('John');

      // At depth limit, details should be raw
      const details = firstUser.details;
      expect(details.age).toBe(30);
    });

    it('should handle currentDepth parameter correctly', () => {
      const obj = {
        nested: {
          value: 'test',
        },
      };

      // Create proxy with currentDepth = 2, maxDepth = 3
      const proxy = ProxyFactory.createStateProxy({
        target: obj,
        consumerRef,
        consumerTracker: tracker,
        currentDepth: 2,
        maxDepth: 3,
      });

      // Should only allow one more level of proxying
      const nested = proxy.nested;
      expect(nested).toBeDefined();

      // Next level should be raw
      expect(nested.value).toBe('test');
    });

    it('should return raw object when currentDepth >= maxDepth', () => {
      const obj = {
        nested: {
          value: 'test',
        },
      };

      // Create proxy where currentDepth equals maxDepth
      const proxy = ProxyFactory.createStateProxy({
        target: obj,
        consumerRef,
        consumerTracker: tracker,
        currentDepth: 5,
        maxDepth: 5,
      });

      // Should track access but return raw nested objects
      const nested = proxy.nested;
      expect(nested).toBeDefined();
      expect(nested.value).toBe('test');

      expect(tracker.trackAccess).toHaveBeenCalledWith(
        consumerRef,
        'state',
        'nested',
        undefined,
      );
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DependencyTracker, createDependencyTracker, defaultDependencyTracker } from '../src/DependencyTracker';

describe('DependencyTracker', () => {
  let tracker: DependencyTracker;

  beforeEach(() => {
    tracker = new DependencyTracker();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should use default configuration', () => {
      const defaultTracker = new DependencyTracker();
      const metrics = defaultTracker.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customTracker = new DependencyTracker({
        enableBatching: false,
        enableMetrics: true,
        maxCacheSize: 500,
        enableDeepTracking: true,
        batchTimeout: 100,
      });
      expect(customTracker).toBeDefined();
    });

    it('should set enableMetrics based on NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'development';
      const devTracker = new DependencyTracker();
      expect(devTracker.getMetrics().stateAccessCount).toBe(0);
      
      process.env.NODE_ENV = 'production';
      const prodTracker = new DependencyTracker();
      expect(prodTracker.getMetrics().stateAccessCount).toBe(0);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('trackStateAccess', () => {
    it('should track state access keys', () => {
      tracker.trackStateAccess('count');
      tracker.trackStateAccess('name');
      
      const stateKeys = tracker.getStateKeys();
      expect(stateKeys.has('count')).toBe(true);
      expect(stateKeys.has('name')).toBe(true);
      expect(stateKeys.size).toBe(2);
    });

    it('should not duplicate keys', () => {
      tracker.trackStateAccess('count');
      tracker.trackStateAccess('count');
      
      const stateKeys = tracker.getStateKeys();
      expect(stateKeys.size).toBe(1);
    });

    it('should increment metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      metricsTracker.trackStateAccess('count');
      metricsTracker.trackStateAccess('name');
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.stateAccessCount).toBe(2);
    });
  });

  describe('trackClassAccess', () => {
    it('should track class access keys', () => {
      tracker.trackClassAccess('someProperty');
      tracker.trackClassAccess('anotherProperty');
      
      const classKeys = tracker.getClassKeys();
      expect(classKeys.has('someProperty')).toBe(true);
      expect(classKeys.has('anotherProperty')).toBe(true);
      expect(classKeys.size).toBe(2);
    });

    it('should not duplicate keys', () => {
      tracker.trackClassAccess('someProperty');
      tracker.trackClassAccess('someProperty');
      
      const classKeys = tracker.getClassKeys();
      expect(classKeys.size).toBe(1);
    });

    it('should increment metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      metricsTracker.trackClassAccess('someProperty');
      metricsTracker.trackClassAccess('anotherProperty');
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.classAccessCount).toBe(2);
    });
  });

  describe('createStateProxy', () => {
    it('should create a proxy that tracks property access', () => {
      const state = { count: 0, name: 'test' };
      const proxy = tracker.createStateProxy(state);
      
      // Access properties
      expect(proxy.count).toBe(0);
      expect(proxy.name).toBe('test');
      
      const stateKeys = tracker.getStateKeys();
      expect(stateKeys.has('count')).toBe(true);
      expect(stateKeys.has('name')).toBe(true);
    });

    it('should call onAccess callback when provided', () => {
      const onAccess = vi.fn();
      const state = { count: 0 };
      const proxy = tracker.createStateProxy(state, onAccess);
      
      proxy.count;
      expect(onAccess).toHaveBeenCalledWith('count');
    });

    it('should cache proxies', () => {
      const state = { count: 0 };
      const proxy1 = tracker.createStateProxy(state);
      const proxy2 = tracker.createStateProxy(state);
      
      expect(proxy1).toBe(proxy2);
    });

    it('should handle deep tracking when enabled', () => {
      const deepTracker = new DependencyTracker({ enableDeepTracking: true });
      const state = { user: { name: 'test', age: 30 } };
      const proxy = deepTracker.createStateProxy(state);
      
      const userName = proxy.user.name;
      expect(userName).toBe('test');
      
      const stateKeys = deepTracker.getStateKeys();
      expect(stateKeys.has('user')).toBe(true);
      expect(stateKeys.has('name')).toBe(true);
    });

    it('should support proxy traps (has, ownKeys, getOwnPropertyDescriptor)', () => {
      const state = { count: 0, name: 'test' };
      const proxy = tracker.createStateProxy(state);
      
      expect('count' in proxy).toBe(true);
      expect('missing' in proxy).toBe(false);
      
      const keys = Object.getOwnPropertyNames(proxy);
      expect(keys).toContain('count');
      expect(keys).toContain('name');
      
      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'count');
      expect(descriptor).toBeDefined();
      expect(descriptor?.value).toBe(0);
    });

    it('should increment metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      const state = { count: 0 };
      metricsTracker.createStateProxy(state);
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.proxyCreationCount).toBe(1);
    });
  });

  describe('createClassProxy', () => {
    it('should create a proxy that tracks non-function property access', () => {
      class TestClass {
        count = 0;
        name = 'test';
        increment() { this.count++; }
      }
      
      const instance = new TestClass();
      const proxy = tracker.createClassProxy(instance);
      
      expect(proxy.count).toBe(0);
      expect(proxy.name).toBe('test');
      expect(typeof proxy.increment).toBe('function');
      
      const classKeys = tracker.getClassKeys();
      expect(classKeys.has('count')).toBe(true);
      expect(classKeys.has('name')).toBe(true);
      expect(classKeys.has('increment')).toBe(false);
    });

    it('should call onAccess callback for non-function properties', () => {
      const onAccess = vi.fn();
      const instance = { count: 0, increment: () => {} };
      const proxy = tracker.createClassProxy(instance, onAccess);
      
      proxy.count;
      proxy.increment;
      
      expect(onAccess).toHaveBeenCalledWith('count');
      expect(onAccess).toHaveBeenCalledTimes(1);
    });

    it('should cache proxies', () => {
      const instance = { count: 0 };
      const proxy1 = tracker.createClassProxy(instance);
      const proxy2 = tracker.createClassProxy(instance);
      
      expect(proxy1).toBe(proxy2);
    });

    it('should increment metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      const instance = { count: 0 };
      metricsTracker.createClassProxy(instance);
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.proxyCreationCount).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all tracked keys', () => {
      tracker.trackStateAccess('count');
      tracker.trackClassAccess('property');
      
      expect(tracker.getStateKeys().size).toBe(1);
      expect(tracker.getClassKeys().size).toBe(1);
      
      tracker.reset();
      
      expect(tracker.getStateKeys().size).toBe(0);
      expect(tracker.getClassKeys().size).toBe(0);
    });

    it('should cancel scheduled flush', () => {
      const batchTracker = new DependencyTracker({ enableBatching: true, batchTimeout: 100 });
      batchTracker.trackStateAccess('count');
      
      batchTracker.reset();
      vi.advanceTimersByTime(200);
    });
  });

  describe('subscribe and batching', () => {
    it('should subscribe to dependency changes', () => {
      const callback = vi.fn();
      const unsubscribe = tracker.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    it('should batch dependency changes with timeout', async () => {
      const batchTracker = new DependencyTracker({ 
        enableBatching: true, 
        batchTimeout: 50,
        enableMetrics: true 
      });
      
      const callback = vi.fn();
      batchTracker.subscribe(callback);
      
      batchTracker.trackStateAccess('count');
      batchTracker.trackStateAccess('name');
      batchTracker.trackClassAccess('property');
      
      expect(callback).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(60);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(new Set(['count', 'name', 'property']));
      
      const metrics = batchTracker.getMetrics();
      expect(metrics.batchFlushCount).toBe(1);
    });

    it('should batch with Promise.resolve when batchTimeout is 0', async () => {
      const batchTracker = new DependencyTracker({ 
        enableBatching: true, 
        batchTimeout: 0 
      });
      
      const callback = vi.fn();
      batchTracker.subscribe(callback);
      
      batchTracker.trackStateAccess('count');
      
      expect(callback).not.toHaveBeenCalled();
      
      await vi.runAllTimersAsync();
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const batchTracker = new DependencyTracker({ enableBatching: true, batchTimeout: 0 });
      
      const errorCallback = vi.fn(() => { throw new Error('Test error'); });
      const goodCallback = vi.fn();
      
      batchTracker.subscribe(errorCallback);
      batchTracker.subscribe(goodCallback);
      
      batchTracker.trackStateAccess('count');
      
      await vi.runAllTimersAsync();
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('Error in dependency change callback:', expect.any(Error));
      
      consoleError.mockRestore();
    });

    it('should unsubscribe correctly', async () => {
      const batchTracker = new DependencyTracker({ enableBatching: true, batchTimeout: 0 });
      
      const callback = vi.fn();
      const unsubscribe = batchTracker.subscribe(callback);
      
      unsubscribe();
      
      batchTracker.trackStateAccess('count');
      
      await vi.runAllTimersAsync();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('computeDependencyArray', () => {
    it('should return empty array when no dependencies tracked', () => {
      const state = { count: 0 };
      const instance = { property: 'value' };
      
      const deps = tracker.computeDependencyArray(state, instance);
      expect(deps).toEqual([[]]);
    });

    it('should return state values for tracked state keys', () => {
      const state = { count: 0, name: 'test', unused: 'ignore' };
      const instance = { property: 'value' };
      
      tracker.trackStateAccess('count');
      tracker.trackStateAccess('name');
      
      const deps = tracker.computeDependencyArray(state, instance);
      expect(deps).toEqual([[0, 'test']]);
    });

    it('should return class values for tracked class keys', () => {
      const state = { count: 0 };
      const instance = { property: 'value', other: 'data', unused: 'ignore' };
      
      tracker.trackClassAccess('property');
      tracker.trackClassAccess('other');
      
      const deps = tracker.computeDependencyArray(state, instance);
      expect(deps).toEqual([['value', 'data']]);
    });

    it('should return both state and class values when both are tracked', () => {
      const state = { count: 0 };
      const instance = { property: 'value' };
      
      tracker.trackStateAccess('count');
      tracker.trackClassAccess('property');
      
      const deps = tracker.computeDependencyArray(state, instance);
      expect(deps).toEqual([[0], ['value']]);
    });

    it('should handle non-object state', () => {
      tracker.trackStateAccess('count');
      
      const deps = tracker.computeDependencyArray(null, {});
      expect(deps).toEqual([[null]]);
      
      const deps2 = tracker.computeDependencyArray(undefined, {});
      expect(deps2).toEqual([[undefined]]);
      
      const deps3 = tracker.computeDependencyArray(42, {});
      expect(deps3).toEqual([[42]]);
    });

    it('should skip function properties in class instance', () => {
      class TestClass {
        count = 0;
        increment() { this.count++; }
      }
      
      const instance = new TestClass();
      tracker.trackClassAccess('count');
      tracker.trackClassAccess('increment');
      
      const deps = tracker.computeDependencyArray({}, instance);
      expect(deps).toEqual([[0]]);
    });

    it('should handle property access errors gracefully', () => {
      const problematicInstance = {
        get throwingProperty() {
          throw new Error('Access error');
        },
        normalProperty: 'value'
      };
      
      tracker.trackClassAccess('throwingProperty');
      tracker.trackClassAccess('normalProperty');
      
      const deps = tracker.computeDependencyArray({}, problematicInstance);
      expect(deps).toEqual([['value']]);
    });

    it('should update metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      metricsTracker.trackStateAccess('count');
      
      const state = { count: 0 };
      metricsTracker.computeDependencyArray(state, {});
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('should return zero metrics when metrics disabled', () => {
      const noMetricsTracker = new DependencyTracker({ enableMetrics: false });
      const metrics = noMetricsTracker.getMetrics();
      
      expect(metrics).toEqual({
        stateAccessCount: 0,
        classAccessCount: 0,
        proxyCreationCount: 0,
        batchFlushCount: 0,
        averageResolutionTime: 0,
        memoryUsageKB: 0,
      });
    });

    it('should return actual metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      
      metricsTracker.trackStateAccess('count');
      metricsTracker.trackClassAccess('property');
      metricsTracker.createStateProxy({ count: 0 });
      
      const metrics = metricsTracker.getMetrics();
      
      expect(metrics.stateAccessCount).toBe(1);
      expect(metrics.classAccessCount).toBe(1);
      expect(metrics.proxyCreationCount).toBe(1);
      expect(metrics.memoryUsageKB).toBeGreaterThanOrEqual(0);
    });

    it('should estimate memory usage', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      
      for (let i = 0; i < 10; i++) {
        metricsTracker.trackStateAccess(`state${i}`);
        metricsTracker.trackClassAccess(`class${i}`);
      }
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.memoryUsageKB).toBeGreaterThan(0);
    });
  });

  describe('clearCaches', () => {
    it('should clear proxy caches', () => {
      const state = { count: 0 };
      const instance = { property: 'value' };
      
      const proxy1 = tracker.createStateProxy(state);
      const proxy2 = tracker.createClassProxy(instance);
      
      tracker.clearCaches();
      
      const proxy3 = tracker.createStateProxy(state);
      const proxy4 = tracker.createClassProxy(instance);
      
      expect(proxy1).not.toBe(proxy3);
      expect(proxy2).not.toBe(proxy4);
    });

    it('should reset metrics when enabled', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      
      metricsTracker.trackStateAccess('count');
      metricsTracker.createStateProxy({ count: 0 });
      
      let metrics = metricsTracker.getMetrics();
      expect(metrics.stateAccessCount).toBe(1);
      expect(metrics.proxyCreationCount).toBe(1);
      
      metricsTracker.clearCaches();
      
      metrics = metricsTracker.getMetrics();
      expect(metrics.stateAccessCount).toBe(0);
      expect(metrics.proxyCreationCount).toBe(0);
    });
  });

  describe('factory functions', () => {
    it('should create tracker with createDependencyTracker', () => {
      const tracker = createDependencyTracker({ enableMetrics: true });
      expect(tracker).toBeInstanceOf(DependencyTracker);
    });

    it('should provide default tracker', () => {
      expect(defaultDependencyTracker).toBeInstanceOf(DependencyTracker);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large numbers of tracked keys', () => {
      for (let i = 0; i < 1000; i++) {
        tracker.trackStateAccess(`key${i}`);
      }
      
      expect(tracker.getStateKeys().size).toBe(1000);
    });

    it('should handle resolution time tracking', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      
      // Create many proxies to generate resolution times
      for (let i = 0; i < 150; i++) {
        metricsTracker.createStateProxy({ [`prop${i}`]: i });
      }
      
      const metrics = metricsTracker.getMetrics();
      expect(metrics.averageResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should limit resolution times array to approximately 100 entries', () => {
      const metricsTracker = new DependencyTracker({ enableMetrics: true });
      
      // Access private resolutionTimes for testing
      const resolutionTimes = (metricsTracker as any).resolutionTimes;
      
      // Create many proxies to test the trimming behavior
      for (let i = 0; i < 150; i++) {
        metricsTracker.createStateProxy({ [`prop${i}`]: i });
      }
      
      // The array should eventually be trimmed to around 100 entries
      // Due to the implementation, it may have 101 entries at most before trimming
      expect(resolutionTimes.length).toBeLessThanOrEqual(101);
      expect(resolutionTimes.length).toBeGreaterThan(50); // Should have meaningful data
    });

    it('should handle symbol properties', () => {
      const sym = Symbol('test');
      const state = { [sym]: 'value', normal: 'prop' };
      const proxy = tracker.createStateProxy(state);
      
      expect(proxy[sym]).toBe('value');
      expect(proxy.normal).toBe('prop');
      
      const stateKeys = tracker.getStateKeys();
      expect(stateKeys.has('normal')).toBe(true);
      expect(stateKeys.size).toBe(1);
    });
  });
});
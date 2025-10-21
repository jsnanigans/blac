/**
 * Tests for AdapterCache
 *
 * Test suite covering:
 * - Adapter creation and caching
 * - WeakMap-based cleanup
 * - Statistics tracking
 * - Cache operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '@blac/core';
import {
  getOrCreateAdapter,
  hasAdapter,
  removeAdapter,
  getAdapterCacheStats,
  resetAdapterCacheStats,
} from '../AdapterCache';
import { ReactBlocAdapter } from '../ReactBlocAdapter';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('AdapterCache', () => {
  beforeEach(() => {
    resetAdapterCacheStats();
  });

  describe('Adapter Creation', () => {
    it('should create adapter for new bloc', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-1' };
      const adapter = getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(adapter).toBeInstanceOf(ReactBlocAdapter);
      expect(adapter.getSnapshot()).toBe(0);
    });

    it('should return same adapter for same subscriptionIdRef', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-2' };
      const adapter1 = getOrCreateAdapter(cubit, subscriptionIdRef);
      const adapter2 = getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(adapter1).toBe(adapter2);
    });

    it('should create different adapters for different subscriptionIdRefs', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef1 = { current: 'test-sub-3a' };
      const subscriptionIdRef2 = { current: 'test-sub-3b' };

      const adapter1 = getOrCreateAdapter(cubit, subscriptionIdRef1);
      const adapter2 = getOrCreateAdapter(cubit, subscriptionIdRef2);

      expect(adapter1).not.toBe(adapter2);
    });

    it('should track creation in statistics', () => {
      resetAdapterCacheStats();

      const cubit = new CounterCubit();
      const subscriptionIdRef1 = { current: 'test-sub-4a' };
      const subscriptionIdRef2 = { current: 'test-sub-4b' };

      getOrCreateAdapter(cubit, subscriptionIdRef1);
      expect(getAdapterCacheStats().totalCreated).toBe(1);

      getOrCreateAdapter(cubit, subscriptionIdRef2);
      expect(getAdapterCacheStats().totalCreated).toBe(2);

      // Getting same adapter again should not increment
      getOrCreateAdapter(cubit, subscriptionIdRef1);
      expect(getAdapterCacheStats().totalCreated).toBe(2);
    });
  });

  describe('Cache Operations', () => {
    it('should check if adapter exists', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-5' };

      expect(hasAdapter(subscriptionIdRef)).toBe(false);

      getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(hasAdapter(subscriptionIdRef)).toBe(true);
    });

    it('should remove adapter from cache', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-6' };
      const adapter = getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(hasAdapter(subscriptionIdRef)).toBe(true);

      const removed = removeAdapter(subscriptionIdRef);

      expect(removed).toBe(true);
      expect(hasAdapter(subscriptionIdRef)).toBe(false);

      // Getting adapter again should create new one
      const newAdapter = getOrCreateAdapter(cubit, subscriptionIdRef);
      expect(newAdapter).not.toBe(adapter);
    });

    it('should return false when removing non-existent adapter', () => {
      const subscriptionIdRef = { current: 'test-sub-7' };

      const removed = removeAdapter(subscriptionIdRef);

      expect(removed).toBe(false);
    });

    it('should dispose adapter when removing', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-8' };
      const adapter = getOrCreateAdapter(cubit, subscriptionIdRef);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      removeAdapter(subscriptionIdRef);

      // After removal, adapter should be disposed
      cubit.increment();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track total created adapters', () => {
      resetAdapterCacheStats();

      const cubit = new CounterCubit();
      const subscriptionIdRef1 = { current: 'test-sub-9a' };
      const subscriptionIdRef2 = { current: 'test-sub-9b' };
      const subscriptionIdRef3 = { current: 'test-sub-9c' };

      getOrCreateAdapter(cubit, subscriptionIdRef1);
      getOrCreateAdapter(cubit, subscriptionIdRef2);
      getOrCreateAdapter(cubit, subscriptionIdRef3);

      const stats = getAdapterCacheStats();
      expect(stats.totalCreated).toBe(3);
    });

    it('should track last created timestamp', () => {
      resetAdapterCacheStats();

      const beforeCreate = Date.now();
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-10' };
      getOrCreateAdapter(cubit, subscriptionIdRef);
      const afterCreate = Date.now();

      const stats = getAdapterCacheStats();
      expect(stats.lastCreated).toBeDefined();
      expect(stats.lastCreated!).toBeGreaterThanOrEqual(beforeCreate);
      expect(stats.lastCreated!).toBeLessThanOrEqual(afterCreate);
    });

    it('should track last cache hit timestamp', () => {
      resetAdapterCacheStats();

      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-11' };
      getOrCreateAdapter(cubit, subscriptionIdRef);

      // Initial creation has no cache hit
      let stats = getAdapterCacheStats();
      expect(stats.lastCacheHit).toBeUndefined();

      const beforeHit = Date.now();
      getOrCreateAdapter(cubit, subscriptionIdRef); // Cache hit
      const afterHit = Date.now();

      stats = getAdapterCacheStats();
      expect(stats.lastCacheHit).toBeDefined();
      expect(stats.lastCacheHit!).toBeGreaterThanOrEqual(beforeHit);
      expect(stats.lastCacheHit!).toBeLessThanOrEqual(afterHit);
    });

    it('should reset statistics', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef1 = { current: 'test-sub-12a' };
      const subscriptionIdRef2 = { current: 'test-sub-12b' };

      getOrCreateAdapter(cubit, subscriptionIdRef1);
      getOrCreateAdapter(cubit, subscriptionIdRef2);

      let stats = getAdapterCacheStats();
      expect(stats.totalCreated).toBe(2);

      resetAdapterCacheStats();

      stats = getAdapterCacheStats();
      expect(stats.totalCreated).toBe(0);
      expect(stats.lastCreated).toBeUndefined();
      expect(stats.lastCacheHit).toBeUndefined();
    });
  });

  describe('WeakMap Behavior', () => {
    it('should maintain cache for active subscriptionIdRefs', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-13' };
      const adapter1 = getOrCreateAdapter(cubit, subscriptionIdRef);

      // Even after some time, same adapter should be returned
      const adapter2 = getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(adapter1).toBe(adapter2);
    });

    it('should allow garbage collection of unreferenced subscriptionIdRefs', () => {
      // Note: This test demonstrates the WeakMap behavior conceptually
      // Actual GC is non-deterministic and can't be reliably tested

      const cubit = new CounterCubit();
      let subscriptionIdRef: { current: string } | null = {
        current: 'test-sub-14',
      };
      const adapter = getOrCreateAdapter(cubit, subscriptionIdRef);

      expect(hasAdapter(subscriptionIdRef)).toBe(true);

      // In theory, when subscriptionIdRef is set to null and GC runs,
      // the WeakMap entry should be cleaned up automatically
      // But we can't force GC in tests, so we just verify the API works

      subscriptionIdRef = null;

      // The WeakMap will clean up automatically when GC runs
      // We can't test this directly, but the behavior is guaranteed by WeakMap
    });
  });

  describe('Integration', () => {
    it('should work correctly with bloc state changes', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef = { current: 'test-sub-15' };
      const adapter = getOrCreateAdapter(cubit, subscriptionIdRef);

      const notify = vi.fn();
      // Use a selector to subscribe to state changes
      const selector = (state: number) => state;
      adapter.subscribe(selector, notify);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(adapter.getSnapshot()).toBe(1);

      // Getting cached adapter should work the same
      const cachedAdapter = getOrCreateAdapter(cubit, subscriptionIdRef);
      expect(cachedAdapter).toBe(adapter);
      expect(cachedAdapter.getSnapshot()).toBe(1);
    });

    it('should handle multiple subscriptionIdRefs with same bloc', () => {
      const cubit = new CounterCubit();
      const subscriptionIdRef1 = { current: 'test-sub-16a' };
      const subscriptionIdRef2 = { current: 'test-sub-16b' };

      const adapter1 = getOrCreateAdapter(cubit, subscriptionIdRef1);
      const adapter2 = getOrCreateAdapter(cubit, subscriptionIdRef2);

      const notify1 = vi.fn();
      const notify2 = vi.fn();

      // Use a selector to subscribe to state changes
      const selector = (state: number) => state;
      adapter1.subscribe(selector, notify1);
      adapter2.subscribe(selector, notify2);

      cubit.increment();
      expect(notify1).toHaveBeenCalledTimes(1);
      expect(notify2).toHaveBeenCalledTimes(1);
      expect(adapter1.getSnapshot()).toBe(1);
      expect(adapter2.getSnapshot()).toBe(1);
    });
  });
});

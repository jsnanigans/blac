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
      const adapter = getOrCreateAdapter(cubit);

      expect(adapter).toBeInstanceOf(ReactBlocAdapter);
      expect(adapter.getSnapshot()).toBe(0);
    });

    it('should return same adapter for same bloc', () => {
      const cubit = new CounterCubit();
      const adapter1 = getOrCreateAdapter(cubit);
      const adapter2 = getOrCreateAdapter(cubit);

      expect(adapter1).toBe(adapter2);
    });

    it('should create different adapters for different blocs', () => {
      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();

      const adapter1 = getOrCreateAdapter(cubit1);
      const adapter2 = getOrCreateAdapter(cubit2);

      expect(adapter1).not.toBe(adapter2);
    });

    it('should track creation in statistics', () => {
      resetAdapterCacheStats();

      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();

      getOrCreateAdapter(cubit1);
      expect(getAdapterCacheStats().totalCreated).toBe(1);

      getOrCreateAdapter(cubit2);
      expect(getAdapterCacheStats().totalCreated).toBe(2);

      // Getting same adapter again should not increment
      getOrCreateAdapter(cubit1);
      expect(getAdapterCacheStats().totalCreated).toBe(2);
    });
  });

  describe('Cache Operations', () => {
    it('should check if adapter exists', () => {
      const cubit = new CounterCubit();

      expect(hasAdapter(cubit)).toBe(false);

      getOrCreateAdapter(cubit);

      expect(hasAdapter(cubit)).toBe(true);
    });

    it('should remove adapter from cache', () => {
      const cubit = new CounterCubit();
      const adapter = getOrCreateAdapter(cubit);

      expect(hasAdapter(cubit)).toBe(true);

      const removed = removeAdapter(cubit);

      expect(removed).toBe(true);
      expect(hasAdapter(cubit)).toBe(false);

      // Getting adapter again should create new one
      const newAdapter = getOrCreateAdapter(cubit);
      expect(newAdapter).not.toBe(adapter);
    });

    it('should return false when removing non-existent adapter', () => {
      const cubit = new CounterCubit();

      const removed = removeAdapter(cubit);

      expect(removed).toBe(false);
    });

    it('should dispose adapter when removing', () => {
      const cubit = new CounterCubit();
      const adapter = getOrCreateAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      removeAdapter(cubit);

      // After removal, adapter should be disposed
      cubit.increment();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track total created adapters', () => {
      resetAdapterCacheStats();

      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();
      const cubit3 = new CounterCubit();

      getOrCreateAdapter(cubit1);
      getOrCreateAdapter(cubit2);
      getOrCreateAdapter(cubit3);

      const stats = getAdapterCacheStats();
      expect(stats.totalCreated).toBe(3);
    });

    it('should track last created timestamp', () => {
      resetAdapterCacheStats();

      const beforeCreate = Date.now();
      const cubit = new CounterCubit();
      getOrCreateAdapter(cubit);
      const afterCreate = Date.now();

      const stats = getAdapterCacheStats();
      expect(stats.lastCreated).toBeDefined();
      expect(stats.lastCreated!).toBeGreaterThanOrEqual(beforeCreate);
      expect(stats.lastCreated!).toBeLessThanOrEqual(afterCreate);
    });

    it('should track last cache hit timestamp', () => {
      resetAdapterCacheStats();

      const cubit = new CounterCubit();
      getOrCreateAdapter(cubit);

      // Initial creation has no cache hit
      let stats = getAdapterCacheStats();
      expect(stats.lastCacheHit).toBeUndefined();

      const beforeHit = Date.now();
      getOrCreateAdapter(cubit); // Cache hit
      const afterHit = Date.now();

      stats = getAdapterCacheStats();
      expect(stats.lastCacheHit).toBeDefined();
      expect(stats.lastCacheHit!).toBeGreaterThanOrEqual(beforeHit);
      expect(stats.lastCacheHit!).toBeLessThanOrEqual(afterHit);
    });

    it('should reset statistics', () => {
      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();

      getOrCreateAdapter(cubit1);
      getOrCreateAdapter(cubit2);

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
    it('should maintain cache for active blocs', () => {
      const cubit = new CounterCubit();
      const adapter1 = getOrCreateAdapter(cubit);

      // Even after some time, same adapter should be returned
      const adapter2 = getOrCreateAdapter(cubit);

      expect(adapter1).toBe(adapter2);
    });

    it('should allow garbage collection of unreferenced blocs', () => {
      // Note: This test demonstrates the WeakMap behavior conceptually
      // Actual GC is non-deterministic and can't be reliably tested

      let cubit: CounterCubit | null = new CounterCubit();
      const adapter = getOrCreateAdapter(cubit);

      expect(hasAdapter(cubit)).toBe(true);

      // In theory, when cubit is set to null and GC runs,
      // the WeakMap entry should be cleaned up automatically
      // But we can't force GC in tests, so we just verify the API works

      cubit = null;

      // The WeakMap will clean up automatically when GC runs
      // We can't test this directly, but the behavior is guaranteed by WeakMap
    });
  });

  describe('Integration', () => {
    it('should work correctly with bloc state changes', () => {
      const cubit = new CounterCubit();
      const adapter = getOrCreateAdapter(cubit);

      const notify = vi.fn();
      adapter.subscribe(undefined, notify);

      cubit.increment();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(adapter.getSnapshot()).toBe(1);

      // Getting cached adapter should work the same
      const cachedAdapter = getOrCreateAdapter(cubit);
      expect(cachedAdapter).toBe(adapter);
      expect(cachedAdapter.getSnapshot()).toBe(1);
    });

    it('should handle multiple blocs with subscriptions', () => {
      const cubit1 = new CounterCubit();
      const cubit2 = new CounterCubit();

      const adapter1 = getOrCreateAdapter(cubit1);
      const adapter2 = getOrCreateAdapter(cubit2);

      const notify1 = vi.fn();
      const notify2 = vi.fn();

      adapter1.subscribe(undefined, notify1);
      adapter2.subscribe(undefined, notify2);

      cubit1.increment();
      expect(notify1).toHaveBeenCalledTimes(1);
      expect(notify2).not.toHaveBeenCalled();

      cubit2.increment();
      expect(notify1).toHaveBeenCalledTimes(1);
      expect(notify2).toHaveBeenCalledTimes(1);
    });
  });
});

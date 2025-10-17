import { describe, it, expect } from 'vitest';
import { Cubit } from '../../Cubit';

/**
 * Functional tests for subscription sorting optimization behavior
 * - Fast path (no priorities) detection
 * - Cached path (with priorities) detection
 * - Cache creation and invalidation
 */

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
}

describe('SubscriptionManager - Sorting Optimization', () => {
  describe('Fast path detection', () => {
    it('should use fast path when all subscriptions have default priority', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add subscriptions with default priority (0)
      for (let i = 0; i < 10; i++) {
        manager.subscribe({
          type: 'observer',
          notify: () => {},
        });
      }

      // Verify we're using fast path
      expect((manager as any).hasNonZeroPriorities).toBe(false);
    });

    it('should detect when priorities are used', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add priority subscriptions
      for (let i = 0; i < 5; i++) {
        manager.subscribe({
          type: 'observer',
          priority: i + 1,
          notify: () => {},
        });
      }

      // Verify priorities are detected
      expect((manager as any).hasNonZeroPriorities).toBe(true);
    });
  });

  describe('Cache behavior', () => {
    it('should create cache after first notify with priorities', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add subscriptions with priorities
      for (let i = 0; i < 10; i++) {
        manager.subscribe({
          type: 'observer',
          priority: i % 3,
          notify: () => {},
        });
      }

      // Cache should be null initially
      expect((manager as any).cachedSortedSubscriptions).toBe(null);

      // First notify should create cache
      cubit.emit(1);
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);
    });

    it('should invalidate cache when subscriptions change', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add initial subscriptions
      const { unsubscribe } = manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      // Create cache
      cubit.emit(1);
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);

      // Unsubscribe should invalidate cache
      unsubscribe();
      expect((manager as any).cachedSortedSubscriptions).toBe(null);
    });

    it('should recreate cache after invalidation', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add subscriptions
      const { unsubscribe } = manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      // Add one more to keep priorities
      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => {},
      });

      // Create cache
      cubit.emit(1);
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);

      // Invalidate cache
      unsubscribe();
      expect((manager as any).cachedSortedSubscriptions).toBe(null);

      // Next notify should recreate cache
      cubit.emit(2);
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);
    });

    it('should not create cache for fast path (no priorities)', () => {
      const cubit = new TestCubit();
      const manager = (cubit as any)._subscriptionManager;

      // Add subscriptions without priorities
      for (let i = 0; i < 10; i++) {
        manager.subscribe({
          type: 'observer',
          notify: () => {},
        });
      }

      // Notify multiple times
      cubit.emit(1);
      cubit.emit(2);
      cubit.emit(3);

      // Cache should remain null (fast path doesn't need cache)
      expect((manager as any).cachedSortedSubscriptions).toBe(null);
    });
  });
});

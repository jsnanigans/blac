import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '../../Cubit';
import { SubscriptionManager } from '../SubscriptionManager';

/**
 * Test suite for subscription sorting optimization
 * Verifies the hybrid optimization approach:
 * - Fast path when all priorities are 0
 * - Cached sorted array when priorities differ
 */

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
}

describe('SubscriptionManager - Sorting Optimization', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<number>;

  beforeEach(() => {
    cubit = new TestCubit();
    manager = (cubit as any)._subscriptionManager;
  });

  describe('Fast Path (No Priorities)', () => {
    it('should use fast path when all priorities are 0', () => {
      const notifications: number[] = [];

      // Add multiple subscriptions with default priority (0)
      manager.subscribe({
        type: 'observer',
        notify: (value) => notifications.push(value as number),
      });

      manager.subscribe({
        type: 'observer',
        notify: (value) => notifications.push(value as number),
      });

      manager.subscribe({
        type: 'observer',
        notify: (value) => notifications.push(value as number),
      });

      // Verify flag is false
      expect((manager as any).hasNonZeroPriorities).toBe(false);

      // Verify cache is null (fast path doesn't use cache)
      expect((manager as any).cachedSortedSubscriptions).toBe(null);

      // Trigger notification
      cubit.emit(1);

      // All should be notified
      expect(notifications).toHaveLength(3);
      expect(notifications).toEqual([1, 1, 1]);
    });

    it('should maintain insertion order for equal priorities', () => {
      const notifications: string[] = [];

      // Add subscriptions with default priority
      manager.subscribe({
        type: 'observer',
        notify: () => notifications.push('first'),
      });

      manager.subscribe({
        type: 'observer',
        notify: () => notifications.push('second'),
      });

      manager.subscribe({
        type: 'observer',
        notify: () => notifications.push('third'),
      });

      cubit.emit(1);

      // Order should match insertion order (Map iteration order)
      expect(notifications).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Priority Ordering', () => {
    it('should notify higher priority subscriptions first', () => {
      const notifications: string[] = [];

      // Add subscriptions with different priorities
      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => notifications.push('priority-1'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 0,
        notify: () => notifications.push('priority-0'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => notifications.push('priority-2'),
      });

      // Verify flag is true
      expect((manager as any).hasNonZeroPriorities).toBe(true);

      cubit.emit(1);

      // Should be notified in priority order (descending)
      expect(notifications).toEqual([
        'priority-2',
        'priority-1',
        'priority-0',
      ]);
    });

    it('should use cached sorted array on subsequent notifies', () => {
      const notifications: string[] = [];

      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => notifications.push('p1'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => notifications.push('p2'),
      });

      // First notify should create cache
      cubit.emit(1);
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);
      expect(notifications).toEqual(['p2', 'p1']);

      // Second notify should use cache
      notifications.length = 0;
      cubit.emit(2);
      expect(notifications).toEqual(['p2', 'p1']);

      // Third notify should also use cache
      notifications.length = 0;
      cubit.emit(3);
      expect(notifications).toEqual(['p2', 'p1']);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when subscription added', () => {
      // Setup with priority subscriptions
      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      cubit.emit(1); // Create cache
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);

      // Add new subscription
      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => {},
      });

      // Cache should be invalidated
      expect((manager as any).cachedSortedSubscriptions).toBe(null);
    });

    it('should invalidate cache when subscription removed', () => {
      // Setup with priority subscriptions
      const { unsubscribe: unsubscribe1 } = manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => {},
      });

      cubit.emit(1); // Create cache
      expect((manager as any).cachedSortedSubscriptions).not.toBe(null);

      // Remove subscription
      unsubscribe1();

      // Cache should be invalidated
      expect((manager as any).cachedSortedSubscriptions).toBe(null);
    });
  });

  describe('Flag Recalculation', () => {
    it('should reset hasNonZeroPriorities flag when all priority subscriptions removed', () => {
      const { unsubscribe: unsubscribe1 } = manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      const { unsubscribe: unsubscribe2 } = manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => {},
      });

      // Add one with default priority
      manager.subscribe({
        type: 'observer',
        notify: () => {},
      });

      expect((manager as any).hasNonZeroPriorities).toBe(true);

      // Remove first priority subscription
      unsubscribe1();
      expect((manager as any).hasNonZeroPriorities).toBe(true);

      // Remove second priority subscription
      unsubscribe2();
      expect((manager as any).hasNonZeroPriorities).toBe(false);
    });

    it('should keep hasNonZeroPriorities flag when some priority subscriptions remain', () => {
      const { unsubscribe: unsubscribe1 } = manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => {},
      });

      manager.subscribe({
        type: 'observer',
        priority: 2,
        notify: () => {},
      });

      expect((manager as any).hasNonZeroPriorities).toBe(true);

      // Remove one priority subscription
      unsubscribe1();

      // Flag should still be true
      expect((manager as any).hasNonZeroPriorities).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subscriptions', () => {
      // No subscriptions
      expect(() => cubit.emit(1)).not.toThrow();
    });

    it('should handle single subscription with priority 0', () => {
      const notifications: number[] = [];

      manager.subscribe({
        type: 'observer',
        priority: 0,
        notify: (value) => notifications.push(value as number),
      });

      cubit.emit(1);
      expect(notifications).toEqual([1]);
      expect((manager as any).hasNonZeroPriorities).toBe(false);
    });

    it('should handle single subscription with non-zero priority', () => {
      const notifications: number[] = [];

      manager.subscribe({
        type: 'observer',
        priority: 5,
        notify: (value) => notifications.push(value as number),
      });

      cubit.emit(1);
      expect(notifications).toEqual([1]);
      expect((manager as any).hasNonZeroPriorities).toBe(true);
    });

    it('should handle mixed priorities with same value', () => {
      const notifications: string[] = [];

      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => notifications.push('first'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => notifications.push('second'),
      });

      cubit.emit(1);

      // Both should be notified (order may vary for same priority)
      expect(notifications).toHaveLength(2);
      expect(notifications).toContain('first');
      expect(notifications).toContain('second');
    });
  });
});

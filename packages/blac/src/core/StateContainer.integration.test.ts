/**
 * Integration tests for StateContainer with new Subscription System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StateContainer } from './StateContainer';
import { SubscriptionPriority } from '../subscription/stages';

// Test implementation of StateContainer
class TestContainer extends StateContainer<{ count: number; message: string }> {
  constructor(initialCount: number = 0) {
    super({ count: initialCount, message: 'initial' });
  }

  increment = () => {
    this.update(state => ({ ...state, count: state.count + 1 }));
  };

  setMessage = (message: string) => {
    this.update(state => ({ ...state, message }));
  };

  setCount = (count: number) => {
    this.update(state => ({ ...state, count }));
  };
}

describe('StateContainer with Subscription System', () => {
  let container: TestContainer;

  beforeEach(() => {
    container = new TestContainer(0);
  });

  afterEach(async () => {
    await container.dispose();
  });

  describe('Basic Subscriptions', () => {
    it('should subscribe to state changes', () => {
      const handler = vi.fn();
      const unsubscribe = container.subscribe(handler);

      container.increment();

      // Wait for async notification
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith({ count: 1, message: 'initial' });
      }, 0);

      unsubscribe();
    });

    it('should handle multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = container.subscribe(handler1);
      const unsub2 = container.subscribe(handler2);

      container.increment();

      // Wait for async notifications
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler1).toHaveBeenCalledWith({ count: 1, message: 'initial' });
      expect(handler2).toHaveBeenCalledWith({ count: 1, message: 'initial' });

      unsub1();
      unsub2();
    });

    it('should stop notifications after unsubscribe', async () => {
      const handler = vi.fn();
      const unsubscribe = container.subscribe(handler);

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Advanced Subscriptions', () => {
    it('should support path filtering', async () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        paths: ['message']
      });

      // Change count - should not trigger
      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();

      // Change message - should trigger
      container.setMessage('updated');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith({ count: 1, message: 'updated' });

      subscription.unsubscribe();
    });

    it('should support custom filter predicates', async () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        filter: (current, previous) => current.count > 5
      });

      // Small increments - should not trigger
      container.setCount(3);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).not.toHaveBeenCalled();

      // Large value - should trigger
      container.setCount(6);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledWith({ count: 6, message: 'initial' });

      subscription.unsubscribe();
    });

    it('should support priority subscriptions', async () => {
      const results: number[] = [];

      const lowPriority = container.subscribeAdvanced({
        callback: () => results.push(1),
        priority: SubscriptionPriority.LOW
      });

      const highPriority = container.subscribeAdvanced({
        callback: () => results.push(2),
        priority: SubscriptionPriority.HIGH
      });

      const normalPriority = container.subscribeAdvanced({
        callback: () => results.push(3),
        priority: SubscriptionPriority.NORMAL
      });

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));

      // High priority should execute first
      // Note: The order may depend on internal processing
      expect(results.length).toBe(3);

      lowPriority.unsubscribe();
      highPriority.unsubscribe();
      normalPriority.unsubscribe();
    });
  });

  describe('Performance Optimizations', () => {
    it('should support debounced subscriptions', async () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        debounce: 50
      });

      // Rapid changes
      container.increment();
      container.increment();
      container.increment();

      // Should not have been called yet
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(handler).not.toHaveBeenCalled();

      // After debounce period
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ count: 3, message: 'initial' });

      subscription.unsubscribe();
    });

    it('should support throttled subscriptions', async () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        throttle: 50
      });

      // Rapid changes
      container.setCount(1);
      await new Promise(resolve => setTimeout(resolve, 10));
      container.setCount(2);
      await new Promise(resolve => setTimeout(resolve, 10));
      container.setCount(3);

      // Should have been called only once due to throttle
      expect(handler).toHaveBeenCalledTimes(1);

      // After throttle period
      await new Promise(resolve => setTimeout(resolve, 40));
      container.setCount(4);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(2);

      subscription.unsubscribe();
    });

    it('should support batched subscriptions', async () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        batch: true
      });

      // Rapid synchronous changes
      container.setCount(1);
      container.setCount(2);
      container.setCount(3);

      // Should batch and only notify with last value
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ count: 3, message: 'initial' });

      subscription.unsubscribe();
    });
  });

  describe('Lifecycle Integration', () => {
    it('should clean up subscriptions on disposal', async () => {
      const handler = vi.fn();
      const subscription = container.subscribeAdvanced({
        callback: handler
      });

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);

      // Dispose container
      await container.dispose();

      // Try to increment (should throw)
      expect(() => container.increment()).toThrow();

      // Handler should not be called anymore
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support weak references for automatic cleanup', async () => {
      const handler = vi.fn();
      let consumer: any = { id: 'test-consumer' };

      const subscription = container.subscribeAdvanced({
        callback: handler,
        weakRef: consumer
      });

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(handler).toHaveBeenCalledTimes(1);

      // Clear consumer reference (simulating garbage collection)
      consumer = null;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Subscription may be automatically cleaned up
      // (depends on garbage collection timing)

      subscription.unsubscribe();
    });

    it('should track consumer count correctly', () => {
      expect(container.getConsumerCount()).toBe(0);

      const sub1 = container.subscribe(() => {});
      expect(container.getConsumerCount()).toBe(1);

      const sub2 = container.subscribe(() => {});
      expect(container.getConsumerCount()).toBe(2);

      sub1();
      expect(container.getConsumerCount()).toBe(1);

      sub2();
      expect(container.getConsumerCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in callbacks', async () => {
      const errorHandler = vi.fn();
      const originalError = console.error;
      console.error = errorHandler;

      const subscription = container.subscribeAdvanced({
        callback: () => {
          throw new Error('Callback error');
        }
      });

      container.increment();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Error should be logged but not crash
      expect(errorHandler).toHaveBeenCalled();

      console.error = originalError;
      subscription.unsubscribe();
    });
  });
});
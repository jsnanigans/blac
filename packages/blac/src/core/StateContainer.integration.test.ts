/**
 * Integration tests for StateContainer with new Subscription System
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StateContainer } from './StateContainer';

// Test implementation of StateContainer
class TestContainer extends StateContainer<{ count: number; message: string }> {
  constructor(initialCount: number = 0) {
    super({ count: initialCount, message: 'initial' });
  }

  increment = () => {
    this.update((state) => ({ ...state, count: state.count + 1 }));
  };

  setMessage = (message: string) => {
    this.update((state) => ({ ...state, message }));
  };

  setCount = (count: number) => {
    this.update((state) => ({ ...state, count }));
  };
}

describe('StateContainer with Subscription System', () => {
  let container: TestContainer;

  beforeEach(() => {
    container = new TestContainer(0);
  });

  afterEach(() => {
    container.dispose();
  });

  describe('Basic Subscriptions', () => {
    it('should subscribe to state changes', () => {
      const handler = vi.fn();
      const unsubscribe = container.subscribe(handler);

      container.increment();

      // Synchronous notification
      expect(handler).toHaveBeenCalledWith({ count: 1, message: 'initial' });

      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = container.subscribe(handler1);
      const unsub2 = container.subscribe(handler2);

      container.increment();

      // Synchronous notifications
      expect(handler1).toHaveBeenCalledWith({ count: 1, message: 'initial' });
      expect(handler2).toHaveBeenCalledWith({ count: 1, message: 'initial' });

      unsub1();
      unsub2();
    });

    it('should stop notifications after unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = container.subscribe(handler);

      container.increment();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      container.increment();
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Advanced Subscriptions', () => {
    it('should support path filtering', () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        paths: ['message'],
      });

      // Change count - should not trigger
      container.increment();
      expect(handler).not.toHaveBeenCalled();

      // Change message - should trigger
      container.setMessage('updated');
      expect(handler).toHaveBeenCalledWith({ count: 1, message: 'updated' });

      subscription.unsubscribe();
    });

    it('should support custom filter predicates', () => {
      const handler = vi.fn();

      const subscription = container.subscribeAdvanced({
        callback: handler,
        filter: (current: any, previous: any) => current.count > 5,
      });

      // Small increments - should not trigger
      container.setCount(3);
      expect(handler).not.toHaveBeenCalled();

      // Large value - should trigger
      container.setCount(6);
      expect(handler).toHaveBeenCalledWith({ count: 6, message: 'initial' });

      subscription.unsubscribe();
    });
  });

  describe('Lifecycle Integration', () => {
    it('should clean up subscriptions on disposal', () => {
      const handler = vi.fn();
      const subscription = container.subscribeAdvanced({
        callback: handler,
      });

      container.increment();
      expect(handler).toHaveBeenCalledTimes(1);

      // Dispose container
      container.dispose();

      // Try to increment (should throw)
      expect(() => container.increment()).toThrow();

      // Handler should not be called anymore
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support weak references for automatic cleanup', () => {
      const handler = vi.fn();
      let consumer: any = { id: 'test-consumer' };

      const subscription = container.subscribeAdvanced({
        callback: handler,
        weakRef: consumer,
      });

      container.increment();
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
    it('should handle errors in callbacks', () => {
      const errorHandler = vi.fn();
      const originalError = console.error;
      console.error = errorHandler;

      const subscription = container.subscribeAdvanced({
        callback: () => {
          throw new Error('Callback error');
        },
      });

      container.increment();

      // Error should be logged but not crash (synchronously)
      expect(errorHandler).toHaveBeenCalled();

      console.error = originalError;
      subscription.unsubscribe();
    });
  });
});

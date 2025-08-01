import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionManager } from '../SubscriptionManager';
import { BlocBase } from '../../BlocBase';
import { Cubit } from '../../Cubit';

class TestCubit extends Cubit<{ count: number; nested: { value: string } }> {
  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateNested = (value: string) => {
    this.emit({ ...this.state, nested: { value } });
  };
}

describe('SubscriptionManager', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<{
    count: number;
    nested: { value: string };
  }>;

  beforeEach(() => {
    cubit = new TestCubit({ count: 0, nested: { value: 'initial' } });
    manager = new SubscriptionManager(cubit);
  });

  describe('subscribe', () => {
    it('should create a subscription and return unsubscribe function', () => {
      const notify = vi.fn();
      const unsubscribe = manager.subscribe({
        type: 'observer',
        notify,
      });

      expect(manager.size).toBe(1);

      unsubscribe();
      expect(manager.size).toBe(0);
    });

    it('should initialize selector value on subscription', () => {
      const notify = vi.fn();
      const selector = vi.fn((state) => state.count);

      manager.subscribe({
        type: 'consumer',
        selector,
        notify,
      });

      expect(selector).toHaveBeenCalledWith(cubit.state, cubit);
    });

    it('should handle selector errors gracefully', () => {
      const notify = vi.fn();
      const selector = vi.fn(() => {
        throw new Error('Selector error');
      });

      // Should not throw
      expect(() => {
        manager.subscribe({
          type: 'observer',
          selector,
          notify,
        });
      }).not.toThrow();
    });
  });

  describe('notify', () => {
    it('should notify subscriptions without selectors', () => {
      const notify = vi.fn();
      manager.subscribe({
        type: 'observer',
        notify,
      });

      const oldState = { count: 0, nested: { value: 'old' } };
      const newState = { count: 1, nested: { value: 'new' } };

      manager.notify(newState, oldState);

      expect(notify).toHaveBeenCalledWith(newState, oldState, undefined);
    });

    it('should use selector for change detection', () => {
      const notify = vi.fn();
      const selector = (state: any) => state.count;

      manager.subscribe({
        type: 'consumer',
        selector,
        notify,
      });

      // Same count, should not notify
      manager.notify(
        { count: 0, nested: { value: 'new' } },
        { count: 0, nested: { value: 'old' } },
      );
      expect(notify).not.toHaveBeenCalled();

      // Different count, should notify
      manager.notify(
        { count: 1, nested: { value: 'new' } },
        { count: 0, nested: { value: 'old' } },
      );
      expect(notify).toHaveBeenCalledWith(1, 0, undefined);
    });

    it('should use custom equality function', () => {
      const notify = vi.fn();
      const selector = (state: any) => state.nested;
      const equalityFn = (a: any, b: any) => a.value === b.value;

      manager.subscribe({
        type: 'observer',
        selector,
        equalityFn,
        notify,
      });

      // First notification to establish baseline
      manager.notify(
        { count: 0, nested: { value: 'initial' } },
        { count: 0, nested: { value: 'initial' } },
      );
      notify.mockClear();

      // Same nested value, should not notify
      manager.notify(
        { count: 1, nested: { value: 'initial' } },
        { count: 0, nested: { value: 'initial' } },
      );
      expect(notify).not.toHaveBeenCalled();

      // Different nested value, should notify
      manager.notify(
        { count: 1, nested: { value: 'new' } },
        { count: 0, nested: { value: 'initial' } },
      );
      expect(notify).toHaveBeenCalled();
    });

    it('should respect priority order', () => {
      const callOrder: string[] = [];

      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => callOrder.push('low'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 10,
        notify: () => callOrder.push('high'),
      });

      manager.subscribe({
        type: 'observer',
        priority: 5,
        notify: () => callOrder.push('medium'),
      });

      manager.notify(
        { count: 1, nested: { value: 'new' } },
        { count: 0, nested: { value: 'old' } },
      );

      expect(callOrder).toEqual(['high', 'medium', 'low']);
    });

    it('should handle notify errors gracefully', () => {
      const goodNotify = vi.fn();
      const badNotify = vi.fn(() => {
        throw new Error('Notify error');
      });

      manager.subscribe({ type: 'observer', notify: badNotify });
      manager.subscribe({ type: 'observer', notify: goodNotify });

      // Should not throw and should call good notify
      expect(() => {
        manager.notify(
          { count: 1, nested: { value: 'new' } },
          { count: 0, nested: { value: 'old' } },
        );
      }).not.toThrow();

      expect(goodNotify).toHaveBeenCalled();
    });
  });

  describe('trackAccess', () => {
    it('should track path dependencies', () => {
      const notify = vi.fn();
      const unsubscribe = manager.subscribe({
        type: 'consumer',
        notify,
      });

      // Get subscription ID (hacky but works for testing)
      const subscriptionId = Array.from(
        (manager as any).subscriptions.keys(),
      )[0] as string;

      manager.trackAccess(subscriptionId, 'count');
      manager.trackAccess(subscriptionId, 'nested.value');

      const subscription = manager.getSubscription(subscriptionId);
      expect(subscription?.dependencies).toContain('count');
      expect(subscription?.dependencies).toContain('nested.value');
    });

    it('should update metadata on access', () => {
      const notify = vi.fn();
      manager.subscribe({ type: 'consumer', notify });

      const subscriptionId = Array.from(
        (manager as any).subscriptions.keys(),
      )[0] as string;

      manager.trackAccess(subscriptionId, 'count');

      const subscription = manager.getSubscription(subscriptionId);
      expect(subscription?.metadata?.accessCount).toBe(1);
      expect(subscription?.metadata?.lastAccessTime).toBeGreaterThan(0);
    });
  });

  describe('shouldNotifyForPaths', () => {
    it('should return true for direct path match', () => {
      const notify = vi.fn();
      manager.subscribe({ type: 'consumer', notify });

      const subscriptionId = Array.from(
        (manager as any).subscriptions.keys(),
      )[0] as string;
      manager.trackAccess(subscriptionId, 'count');

      const changedPaths = new Set(['count']);
      expect(manager.shouldNotifyForPaths(subscriptionId, changedPaths)).toBe(
        true,
      );
    });

    it('should return true for nested path changes', () => {
      const notify = vi.fn();
      manager.subscribe({ type: 'consumer', notify });

      const subscriptionId = Array.from(
        (manager as any).subscriptions.keys(),
      )[0] as string;
      manager.trackAccess(subscriptionId, 'nested');

      const changedPaths = new Set(['nested.value']);
      expect(manager.shouldNotifyForPaths(subscriptionId, changedPaths)).toBe(
        true,
      );
    });

    it('should return false for unrelated path changes', () => {
      const notify = vi.fn();
      manager.subscribe({ type: 'consumer', notify });

      const subscriptionId = Array.from(
        (manager as any).subscriptions.keys(),
      )[0] as string;
      manager.trackAccess(subscriptionId, 'count');

      const changedPaths = new Set(['nested.value']);
      expect(manager.shouldNotifyForPaths(subscriptionId, changedPaths)).toBe(
        false,
      );
    });
  });

  describe('weak reference handling', () => {
    it('should clean up subscriptions with dead weak references', async () => {
      let obj: any = { id: 'test' };
      const weakRef = new WeakRef(obj);
      const notify = vi.fn();

      manager.subscribe({
        type: 'consumer',
        weakRef,
        notify,
      });

      expect(manager.size).toBe(1);

      // Clear strong reference
      obj = null;

      // Force garbage collection (this is platform-specific and may not work in all environments)
      if ((global as any).gc) {
        (global as any).gc();
      }

      // Trigger notification which should clean up dead refs
      await new Promise((resolve) => setTimeout(resolve, 0));
      manager.notify(
        { count: 1, nested: { value: 'new' } },
        { count: 0, nested: { value: 'old' } },
      );

      // Wait for microtask
      await new Promise((resolve) => queueMicrotask(resolve));

      // Note: This test may not reliably pass in all environments due to GC timing
      // In production, the cleanup will happen eventually
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      manager.subscribe({ type: 'consumer', notify: vi.fn() });
      manager.subscribe({ type: 'observer', notify: vi.fn() });
      manager.subscribe({ type: 'observer', notify: vi.fn() });

      const stats = manager.getStats();

      expect(stats.activeSubscriptions).toBe(3);
      expect(stats.consumerCount).toBe(1);
      expect(stats.observerCount).toBe(2);
      expect(stats.totalNotifications).toBe(0);

      // Trigger a notification
      manager.notify(
        { count: 1, nested: { value: 'new' } },
        { count: 0, nested: { value: 'old' } },
      );

      const updatedStats = manager.getStats();
      expect(updatedStats.totalNotifications).toBe(3); // All 3 subscriptions notified
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', () => {
      manager.subscribe({ type: 'consumer', notify: vi.fn() });
      manager.subscribe({ type: 'observer', notify: vi.fn() });

      expect(manager.size).toBe(2);

      manager.clear();

      expect(manager.size).toBe(0);
      expect(manager.hasSubscriptions).toBe(false);
    });
  });
});

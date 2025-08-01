import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlocBase } from '../BlocBase';
import { Blac } from '../Blac';

// Test implementation of BlocBase
class TestBloc extends BlocBase<{ count: number; message: string }> {
  constructor(initialState = { count: 0, message: 'initial' }) {
    super(initialState);
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  updateMessage(message: string) {
    this.emit({ ...this.state, message });
  }

  updateBoth(count: number, message: string) {
    this.emit({ count, message });
  }
}

// Test bloc with static properties
class KeepAliveBloc extends BlocBase<string> {
  static keepAlive = true;

  constructor() {
    super('initial');
  }

  update(value: string) {
    this.emit(value);
  }
}

describe('BlocBase Subscription Model', () => {
  let blac: Blac;

  beforeEach(() => {
    blac = new Blac({ __unsafe_ignore_singleton: true });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Subscriptions', () => {
    it('should subscribe to all state changes', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      const unsubscribe = bloc.subscribe(callback);

      bloc.increment();
      expect(callback).toHaveBeenCalledWith({ count: 1, message: 'initial' });

      bloc.updateMessage('updated');
      expect(callback).toHaveBeenCalledWith({ count: 1, message: 'updated' });

      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
      bloc.increment();
      expect(callback).toHaveBeenCalledTimes(2); // No new calls
    });

    it('should track subscription count', () => {
      const bloc = new TestBloc();

      expect(bloc.subscriptionCount).toBe(0);

      const unsub1 = bloc.subscribe(() => {});
      expect(bloc.subscriptionCount).toBe(1);

      const unsub2 = bloc.subscribe(() => {});
      expect(bloc.subscriptionCount).toBe(2);

      unsub1();
      expect(bloc.subscriptionCount).toBe(1);

      unsub2();
      expect(bloc.subscriptionCount).toBe(0);
    });
  });

  describe('Selector-based Subscriptions', () => {
    it('should only notify when selected value changes', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      const unsubscribe = bloc.subscribeWithSelector(
        (state) => state.count,
        callback,
      );

      // Should not be called on subscription
      expect(callback).not.toHaveBeenCalled();

      bloc.increment();
      expect(callback).toHaveBeenCalledWith(1);

      // Message update should not trigger callback
      bloc.updateMessage('updated');
      expect(callback).toHaveBeenCalledTimes(1);

      bloc.increment();
      expect(callback).toHaveBeenCalledWith(2);
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should support custom equality function', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      // Only notify when count changes by more than 2
      const unsubscribe = bloc.subscribeWithSelector(
        (state) => state.count,
        callback,
        (a, b) => Math.abs(a - b) <= 2,
      );

      bloc.increment(); // 0 -> 1 (diff = 1, not notified)
      expect(callback).not.toHaveBeenCalled();

      bloc.increment(); // 1 -> 2 (diff = 1, not notified)
      expect(callback).not.toHaveBeenCalled();

      bloc.updateBoth(5, 'test'); // 2 -> 5 (diff = 3, notified)
      expect(callback).toHaveBeenCalledWith(5);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('should handle complex selectors', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      const unsubscribe = bloc.subscribeWithSelector(
        (state) => ({
          doubled: state.count * 2,
          upper: state.message.toUpperCase(),
        }),
        callback,
      );

      bloc.increment();
      expect(callback).toHaveBeenCalledWith({ doubled: 2, upper: 'INITIAL' });

      bloc.updateMessage('hello');
      expect(callback).toHaveBeenCalledWith({ doubled: 2, upper: 'HELLO' });

      unsubscribe();
    });
  });

  describe('Component Subscriptions', () => {
    it('should support weak reference subscriptions', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();
      let component: any = { id: 'test-component' };
      const weakRef = new WeakRef(component);

      const unsubscribe = bloc.subscribeComponent(weakRef, callback);

      bloc.increment();
      expect(callback).toHaveBeenCalled();

      // Clear strong reference
      component = null;

      // Force garbage collection (platform-specific)
      if ((global as any).gc) {
        (global as any).gc();
      }

      unsubscribe();
    });
  });

  describe('Lifecycle and Disposal', () => {
    it('should dispose when no subscriptions remain', async () => {
      const bloc = new TestBloc();
      const disposeSpy = vi.spyOn(bloc, 'dispose');

      const unsub1 = bloc.subscribe(() => {});
      const unsub2 = bloc.subscribe(() => {});

      unsub1();
      expect(disposeSpy).not.toHaveBeenCalled();

      unsub2();

      // Disposal is scheduled with timeout
      await vi.runAllTimersAsync();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not dispose keep-alive blocs', async () => {
      const bloc = new KeepAliveBloc();
      const disposeSpy = vi.spyOn(bloc, 'dispose');

      const unsubscribe = bloc.subscribe(() => {});
      unsubscribe();

      await vi.runAllTimersAsync();
      expect(disposeSpy).not.toHaveBeenCalled();
    });

    it('should cancel disposal if new subscription added', async () => {
      const bloc = new TestBloc();
      const disposeSpy = vi.spyOn(bloc, 'dispose');

      const unsub1 = bloc.subscribe(() => {});
      unsub1();

      // Disposal scheduled
      expect(bloc.subscriptionCount).toBe(0);

      // Add new subscription before disposal
      const unsub2 = bloc.subscribe(() => {});

      await vi.runAllTimersAsync();
      expect(disposeSpy).not.toHaveBeenCalled();

      unsub2();
      await vi.runAllTimersAsync();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should not allow subscriptions to disposed bloc', async () => {
      const bloc = new TestBloc();
      await bloc.dispose();

      const callback = vi.fn();
      const unsubscribe = bloc.subscribe(callback);

      bloc.increment();
      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('State Updates and Batching', () => {
    it('should batch multiple state updates', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      bloc.subscribe(callback);

      bloc._batchUpdates(() => {
        bloc.increment();
        bloc.increment();
        bloc.updateMessage('batched');
      });

      // Only one notification for the final state
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ count: 2, message: 'batched' });
    });

    it('should not emit undefined states', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();

      bloc.subscribe(callback);

      // Try to emit undefined
      (bloc as any).emit(undefined);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Priority-based Notifications', () => {
    it('should notify subscriptions in priority order', () => {
      const bloc = new TestBloc();
      const order: number[] = [];

      // Direct access to subscription manager for priority testing
      const manager = bloc._subscriptionManager;

      manager.subscribe({
        type: 'observer',
        priority: 1,
        notify: () => order.push(1),
      });

      manager.subscribe({
        type: 'observer',
        priority: 10,
        notify: () => order.push(10),
      });

      manager.subscribe({
        type: 'observer',
        priority: 5,
        notify: () => order.push(5),
      });

      bloc.increment();

      expect(order).toEqual([10, 5, 1]); // Highest priority first
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in subscription callbacks', () => {
      const bloc = new TestBloc();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const goodCallback = vi.fn();
      const badCallback = vi.fn(() => {
        throw new Error('Subscription error');
      });

      bloc.subscribe(badCallback);
      bloc.subscribe(goodCallback);

      bloc.increment();

      expect(goodCallback).toHaveBeenCalled();
      expect(badCallback).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('should handle errors in selectors', () => {
      const bloc = new TestBloc();
      const callback = vi.fn();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      bloc.subscribeWithSelector(() => {
        throw new Error('Selector error');
      }, callback);

      bloc.increment();
      expect(callback).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});

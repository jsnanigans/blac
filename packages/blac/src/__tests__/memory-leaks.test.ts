import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Blac } from '../Blac';
import { Cubit } from '../Cubit';
import { Bloc } from '../Bloc';
import { BlacAdapter } from '../adapter/BlacAdapter';

// Helper to force garbage collection if available
const forceGC = () => {
  if ((global as any).gc) {
    (global as any).gc();
  }
};

// Helper to wait for WeakRef cleanup
const waitForCleanup = async (checkFn: () => boolean, maxWait = 1000) => {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    forceGC();
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (checkFn()) return true;
  }
  return false;
};

// Test state class
class TestState {
  constructor(public value: number) {}
}

// Test Cubit
class TestCubit extends Cubit<TestState> {
  constructor() {
    super(new TestState(0));
  }

  increment = () => {
    this.emit(new TestState(this.state.value + 1));
  };
}

// Test event
class IncrementEvent {
  constructor(public amount: number) {}
}

// Test Bloc
class TestBloc extends Bloc<TestState, IncrementEvent> {
  constructor() {
    super(new TestState(0));
    this.on(IncrementEvent, this.handleIncrement);
  }

  handleIncrement = (
    event: IncrementEvent,
    emit: (state: TestState) => void,
  ) => {
    emit(new TestState(this.state.value + event.amount));
  };
}

describe('Memory Leak Tests', () => {
  let blac: Blac;

  beforeEach(() => {
    blac = Blac.getInstance();
    Blac.enableLog = false; // Disable logging for tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Blac.resetInstance();
  });

  describe('WeakRef Cleanup', () => {
    it('should support component WeakRefs for automatic cleanup', async () => {
      const cubit = blac.getBloc(TestCubit);
      let component: any = { id: 'test-component' };
      const weakRef = new WeakRef(component);

      // Subscribe with component reference
      const unsubscribe = cubit.subscribeComponent(weakRef, () => {});
      expect(cubit.subscriptionCount).toBe(1);

      // Verify the subscription works
      const callback = vi.fn();
      cubit.subscribeComponent(weakRef, callback);
      cubit.increment();
      expect(callback).toHaveBeenCalled();

      // Clean up
      unsubscribe();
    });

    it('should handle multiple subscriptions with weak references', async () => {
      const cubit = blac.getBloc(TestCubit);
      const component1 = { id: 'component-1' };
      const component2 = { id: 'component-2' };
      const component3 = { id: 'component-3' };

      // Add subscriptions with weak refs
      const unsub1 = cubit.subscribeComponent(
        new WeakRef(component1),
        () => {},
      );
      const unsub2 = cubit.subscribeComponent(
        new WeakRef(component2),
        () => {},
      );
      const unsub3 = cubit.subscribeComponent(
        new WeakRef(component3),
        () => {},
      );

      expect(cubit.subscriptionCount).toBe(3);

      // Remove some subscriptions
      unsub1();
      unsub2();

      expect(cubit.subscriptionCount).toBe(1);

      // Clean up remaining
      unsub3();
      expect(cubit.subscriptionCount).toBe(0);
    });
  });

  describe('Bloc Instance Disposal', () => {
    it('should dispose non-keepAlive blocs when no consumers remain', async () => {
      const cubit = blac.getBloc(TestCubit);
      const adapter = new BlacAdapter(
        { blocConstructor: TestCubit, componentRef: { current: {} } },
        {},
      );

      // Subscribe and unsubscribe
      adapter.mount();
      const unsubscribe = adapter.createSubscription({ onChange: () => {} });
      expect(cubit.subscriptionCount).toBe(1);

      unsubscribe();
      adapter.unmount();

      // Wait for disposal
      await vi.runAllTimersAsync();

      // Bloc should be disposed
      expect(cubit.isDisposed).toBe(true);
    });

    it('should not dispose keepAlive blocs when no consumers remain', async () => {
      class KeepAliveCubit extends TestCubit {
        static keepAlive = true;
      }

      const cubit = blac.getBloc(KeepAliveCubit);
      const adapter = new BlacAdapter(
        { blocConstructor: KeepAliveCubit, componentRef: { current: {} } },
        {},
      );

      // Subscribe and unsubscribe
      adapter.mount();
      const unsubscribe = adapter.createSubscription({ onChange: () => {} });
      expect(cubit.subscriptionCount).toBe(1);

      unsubscribe();

      // Wait for potential disposal
      await vi.runAllTimersAsync();

      // Bloc should still be active
      expect(cubit.isDisposed).toBe(false);
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle rapid subscription addition/removal without leaks', async () => {
      const cubit = blac.getBloc(TestCubit);
      const unsubscribes: (() => void)[] = [];

      // Add many subscriptions
      for (let i = 0; i < 1000; i++) {
        const unsub = cubit.subscribe(() => {});
        unsubscribes.push(unsub);
      }

      expect(cubit.subscriptionCount).toBe(1000);

      // Remove half the subscriptions
      for (let i = 0; i < 500; i++) {
        unsubscribes[i]();
      }

      expect(cubit.subscriptionCount).toBe(500);

      // Remove remaining subscriptions
      for (let i = 500; i < 1000; i++) {
        unsubscribes[i]();
      }

      expect(cubit.subscriptionCount).toBe(0);
    });

    it('should handle concurrent bloc creation and disposal', async () => {
      const adapters: BlacAdapter<typeof TestBloc>[] = [];
      const unsubscribes: (() => void)[] = [];

      // Create many blocs through adapters
      for (let i = 0; i < 100; i++) {
        const adapter = new BlacAdapter(
          { blocConstructor: TestBloc, componentRef: { current: {} } },
          { instanceId: `test-bloc-${i}` },
        );
        adapters.push(adapter);
        adapter.mount();
        const unsub = adapter.createSubscription({ onChange: () => {} });
        unsubscribes.push(unsub);
      }

      // Unsubscribe all and unmount
      unsubscribes.forEach((unsub) => unsub());
      adapters.forEach((adapter) => adapter.unmount());

      // Wait for disposal
      await vi.runAllTimersAsync();

      // All blocs should be disposed
      for (const adapter of adapters) {
        expect(adapter.blocInstance.isDisposed).toBe(true);
      }
    });
  });

  describe('Proxy and Cache Cleanup', () => {
    it('should not leak memory through proxy caches', async () => {
      const { ProxyFactory } = await import('../adapter/ProxyFactory');
      const { createStateProxy, getStats, resetStats } = ProxyFactory;
      const stats = getStats();
      const initialProxyCount = stats.stateProxiesCreated || 0;

      // Create many proxied states
      for (let i = 0; i < 100; i++) {
        const cubit = new TestCubit();
        const proxy = createStateProxy({
          target: cubit.state,
          consumerRef: { current: {} },
          consumerTracker: {
            trackAccess: () => {},
          } as any,
        });
        // Access properties to trigger proxy creation
        const _ = proxy.value;
      }

      // Proxies should have been created
      const newStats = getStats();
      expect(newStats.stateProxiesCreated || 0).toBeGreaterThan(
        initialProxyCount,
      );

      // Clear stats
      resetStats();
      const clearedStats = getStats();
      expect(clearedStats.stateProxiesCreated || 0).toBe(0);
    });
  });

  describe('Event Queue Memory Management', () => {
    it('should not accumulate events in queue indefinitely', async () => {
      const bloc = blac.getBloc(TestBloc);

      // Add many events rapidly
      for (let i = 0; i < 1000; i++) {
        bloc.add(new IncrementEvent(1));
      }

      // Wait for processing
      await vi.runAllTimersAsync();

      // Queue should be empty after processing
      expect((bloc as any)._eventQueue.length).toBe(0);
    });

    it('should handle disposal during event processing', async () => {
      const bloc = blac.getBloc(TestBloc);
      const adapter = new BlacAdapter(
        { blocConstructor: TestBloc, componentRef: { current: {} } },
        {},
      );

      // Subscribe
      adapter.mount();
      const unsubscribe = adapter.createSubscription({ onChange: () => {} });

      // Add events and immediately dispose
      for (let i = 0; i < 10; i++) {
        bloc.add(new IncrementEvent(1));
      }

      unsubscribe();
      adapter.unmount();

      // Wait for disposal
      await vi.runAllTimersAsync();

      // Bloc should be disposed and queue cleared
      expect(bloc.isDisposed).toBe(true);
      expect((bloc as any)._eventQueue.length).toBe(0);
    });
  });

  describe('Disposal State Transitions', () => {
    it('should handle concurrent disposal requests safely', async () => {
      const cubit = blac.getBloc(TestCubit);
      const adapter = new BlacAdapter(
        { blocConstructor: TestCubit, componentRef: { current: {} } },
        {},
      );

      // Add multiple consumers
      adapter.mount();
      const unsub1 = adapter.createSubscription({ onChange: () => {} });
      const adapter2 = new BlacAdapter(
        { blocConstructor: TestCubit, componentRef: { current: {} } },
        {},
      );
      adapter2.mount();
      const unsub2 = adapter2.createSubscription({ onChange: () => {} });

      // Remove consumers concurrently
      await Promise.all([
        (async () => {
          unsub1();
          adapter.unmount();
        })(),
        (async () => {
          unsub2();
          adapter2.unmount();
        })(),
      ]);

      // Wait for disposal
      await vi.runAllTimersAsync();

      // Should be disposed exactly once
      expect(cubit.isDisposed).toBe(true);
    });

    it('should prevent state updates after disposal', async () => {
      const cubit = blac.getBloc(TestCubit);
      const adapter = new BlacAdapter(
        { blocConstructor: TestCubit, componentRef: { current: {} } },
        {},
      );

      // Subscribe and start disposal
      adapter.mount();
      const unsub = adapter.createSubscription({ onChange: () => {} });
      unsub();
      adapter.unmount();

      // Wait for disposal to complete
      await vi.runAllTimersAsync();

      expect(cubit.isDisposed).toBe(true);

      // Try to update state after disposal
      const callback = vi.fn();
      const unsubscribe = cubit.subscribe(callback);

      // State should not change
      const initialState = cubit.state;
      cubit.increment();

      // State should remain unchanged
      expect(cubit.state).toBe(initialState);
      expect(callback).not.toHaveBeenCalled();
      unsubscribe();
    });
  });
});

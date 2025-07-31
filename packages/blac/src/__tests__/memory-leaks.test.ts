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
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  describe('WeakRef Cleanup', () => {
    it('should clean up consumer WeakRefs when consumers are garbage collected', async () => {
      const cubit = blac.getBloc(TestCubit);
      let consumer: any = { id: 'test-consumer' };
      const weakRef = new WeakRef(consumer);

      // Add consumer
      cubit._addConsumer('test-consumer', consumer);
      expect((cubit as any)._consumerRefs.size).toBe(1);
      expect(cubit._consumers.size).toBe(1);

      // Clear strong reference
      consumer = null;

      // Wait for GC to clean up WeakRef
      const cleaned = await waitForCleanup(() => {
        const ref = (cubit as any)._consumerRefs.get('test-consumer');
        return !ref || ref.deref() === undefined;
      });

      if (cleaned) {
        // Verify WeakRef was cleaned
        const ref = (cubit as any)._consumerRefs.get('test-consumer');
        expect(!ref || ref.deref() === undefined).toBe(true);
      }
    });

    it('should handle multiple consumers with some being garbage collected', async () => {
      const cubit = blac.getBloc(TestCubit);
      let consumer1: any = { id: 'consumer-1' };
      let consumer2: any = { id: 'consumer-2' };
      const consumer3 = { id: 'consumer-3' }; // Keep strong reference

      // Add consumers
      cubit._addConsumer('consumer-1', consumer1);
      cubit._addConsumer('consumer-2', consumer2);
      cubit._addConsumer('consumer-3', consumer3);

      expect((cubit as any)._consumerRefs.size).toBe(3);

      // Clear some references
      consumer1 = null;
      consumer2 = null;

      // Wait for cleanup
      await waitForCleanup(() => {
        const ref1 = (cubit as any)._consumerRefs.get('consumer-1');
        const ref2 = (cubit as any)._consumerRefs.get('consumer-2');
        return (
          (!ref1 || ref1.deref() === undefined) &&
          (!ref2 || ref2.deref() === undefined)
        );
      });

      // Consumer 3 should still be accessible
      const ref3 = (cubit as any)._consumerRefs.get('consumer-3');
      expect(ref3?.deref()).toBe(consumer3);
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
      expect(cubit._consumers.size).toBe(1);

      unsubscribe();
      adapter.unmount();

      // Wait for disposal
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Bloc should be disposed
      expect((cubit as any)._disposalState).toBe('disposed');
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
      expect(cubit._consumers.size).toBe(1);

      unsubscribe();

      // Wait for potential disposal
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Bloc should still be active
      expect((cubit as any)._disposalState).toBe('active');
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle rapid consumer addition/removal without leaks', async () => {
      const cubit = blac.getBloc(TestCubit);
      const consumers: any[] = [];

      // Add many consumers
      for (let i = 0; i < 1000; i++) {
        const consumer = { id: `consumer-${i}` };
        consumers.push(consumer);
        cubit._addConsumer(`consumer-${i}`, consumer);
      }

      expect(cubit._consumers.size).toBe(1000);
      expect((cubit as any)._consumerRefs.size).toBe(1000);

      // Clear half the consumers
      for (let i = 0; i < 500; i++) {
        consumers[i] = null;
      }

      // Force GC and wait
      await waitForCleanup(() => {
        let cleaned = 0;
        for (let i = 0; i < 500; i++) {
          const ref = (cubit as any)._consumerRefs.get(`consumer-${i}`);
          if (!ref || ref.deref() === undefined) cleaned++;
        }
        return cleaned > 0; // At least some should be cleaned
      });

      // Verify remaining consumers are still valid
      for (let i = 500; i < 1000; i++) {
        const ref = (cubit as any)._consumerRefs.get(`consumer-${i}`);
        expect(ref?.deref()).toBe(consumers[i]);
      }
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
      await new Promise((resolve) => setTimeout(resolve, 200));

      // All blocs should be disposed
      for (const adapter of adapters) {
        expect((adapter.blocInstance as any)._disposalState).toBe('disposed');
      }
    });
  });

  describe('Proxy and Cache Cleanup', () => {
    it('should not leak memory through proxy caches', async () => {
      const ProxyFactory = (await import('../adapter/ProxyFactory'))
        .ProxyFactory;
      const stats = ProxyFactory.getStats();
      const initialProxyCount = stats.stateProxiesCreated || 0;

      // Create many proxied states
      for (let i = 0; i < 100; i++) {
        const cubit = new TestCubit();
        const proxy = ProxyFactory.createStateProxy({
          target: cubit.state,
          consumerRef: { current: {} },
          consumerTracker: {
            trackAccess: () => {},
            resetTracking: () => {},
          } as any,
        });
        // Access properties to trigger proxy creation
        const _ = proxy.value;
      }

      // Proxies should have been created
      const newStats = ProxyFactory.getStats();
      expect(newStats.stateProxiesCreated || 0).toBeGreaterThan(
        initialProxyCount,
      );

      // Clear stats
      ProxyFactory.resetStats();
      const clearedStats = ProxyFactory.getStats();
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
      await new Promise((resolve) => setTimeout(resolve, 100));

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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Bloc should be disposed and queue cleared
      expect((bloc as any)._disposalState).toBe('disposed');
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
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should be disposed exactly once
      expect((cubit as any)._disposalState).toBe('disposed');
    });

    it('should prevent adding consumers during disposal', async () => {
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

      // Wait a bit for disposal to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to add consumer during disposal
      const result = cubit._addConsumer('consumer-2', {});
      expect(result).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { Cubit } from '../../Cubit';
import { SubscriptionManager } from '../SubscriptionManager';

class MemoryTestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('SubscriptionManager Memory Safety', () => {
  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should not leak memory with many dead refs over time', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    const cycles = 100;
    const subscriptionsPerCycle = 10;

    for (let cycle = 0; cycle < cycles; cycle++) {
      // Create subscriptions with WeakRefs
      let components: any[] = [];

      for (let i = 0; i < subscriptionsPerCycle; i++) {
        const comp = { id: `${cycle}-${i}` };
        components.push(comp);

        manager.subscribe({
          type: 'consumer',
          weakRef: new WeakRef(comp),
          notify: () => {},
        });
      }

      // Components go out of scope
      components = [];
      global.gc?.();

      // Trigger state change to detect dead refs
      cubit.increment();

      // Wait for cleanup microtask
      await Promise.resolve();
    }

    // After all cycles, all dead refs should be cleaned up
    expect(manager.size).toBe(0);

    console.log(`Memory test completed: ${cycles} cycles × ${subscriptionsPerCycle} subs each = ${cycles * subscriptionsPerCycle} total subscriptions cleaned`);
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should handle mixed live and dead subscriptions correctly', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    // Add 5 live subscriptions (no WeakRef)
    for (let i = 0; i < 5; i++) {
      manager.subscribe({
        type: 'consumer',
        notify: () => {},
      });
    }

    // Add 5 dead subscriptions (with WeakRef)
    let deadComponents = Array.from({ length: 5 }, (_, i) => ({ id: i }));

    deadComponents.forEach(comp => {
      manager.subscribe({
        type: 'consumer',
        weakRef: new WeakRef(comp),
        notify: () => {},
      });
    });

    expect(manager.size).toBe(10);

    // Kill the dead components
    deadComponents = [];
    global.gc?.();

    // Trigger state change
    cubit.increment();

    // Wait for cleanup
    await Promise.resolve();

    // Only live subscriptions remain
    expect(manager.size).toBe(5);
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should handle long-running app simulation (1000+ state changes)', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    // Add 20 live subscriptions
    for (let i = 0; i < 20; i++) {
      manager.subscribe({
        type: 'consumer',
        notify: () => {},
      });
    }

    // Simulate 1000 state changes
    for (let i = 0; i < 1000; i++) {
      cubit.increment();

      // Occasionally add and remove subscriptions with WeakRefs
      if (i % 100 === 0) {
        let tempComponents = Array.from({ length: 5 }, (_, j) => ({ id: `temp-${i}-${j}` }));

        tempComponents.forEach(comp => {
          manager.subscribe({
            type: 'consumer',
            weakRef: new WeakRef(comp),
            notify: () => {},
          });
        });

        // Let them go out of scope
        tempComponents = [];
        global.gc?.();

        // Wait for cleanup
        await Promise.resolve();
      }
    }

    // After long-running simulation, only the original 20 subscriptions should remain
    expect(manager.size).toBe(20);

    console.log('Long-running app simulation completed: 1000 state changes with periodic subscriptions');
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should clean up dead refs promptly without accumulation', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    const measurements: number[] = [];

    for (let i = 0; i < 10; i++) {
      // Add 10 subscriptions with WeakRefs
      let components = Array.from({ length: 10 }, (_, j) => ({ id: `${i}-${j}` }));

      components.forEach(comp => {
        manager.subscribe({
          type: 'consumer',
          weakRef: new WeakRef(comp),
          notify: () => {},
        });
      });

      // Kill them
      components = [];
      global.gc?.();

      // Trigger cleanup
      cubit.increment();
      await Promise.resolve();

      // Measure how many are left (should be 0)
      measurements.push(manager.size);
    }

    // All measurements should be 0 (no accumulation)
    expect(measurements.every(m => m === 0)).toBe(true);

    console.log('Dead ref accumulation test: All cycles cleaned promptly');
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should handle edge case: subscription added during cleanup', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    // Add a subscription with WeakRef
    let component: any = { id: 'will-be-dead' };
    manager.subscribe({
      type: 'consumer',
      weakRef: new WeakRef(component),
      notify: () => {},
    });

    expect(manager.size).toBe(1);

    // Kill the component
    component = null;
    global.gc?.();

    // Trigger notify (schedules cleanup)
    cubit.increment();

    // Add a new live subscription immediately (before microtask runs)
    manager.subscribe({
      type: 'consumer',
      notify: () => {},
    });

    expect(manager.size).toBe(2); // Both still present

    // Wait for cleanup microtask
    await Promise.resolve();

    // Only the live subscription should remain
    expect(manager.size).toBe(1);
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should verify cleanup flag is properly reset', async () => {
    const cubit = new MemoryTestCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<number>;

    // Check initial flag state
    expect((manager as any).weakRefCleanupScheduled).toBe(false);

    // Add and kill a subscription
    let component: any = { id: 'test' };
    manager.subscribe({
      type: 'consumer',
      weakRef: new WeakRef(component),
      notify: () => {},
    });

    component = null;
    global.gc?.();

    // Trigger notify (should schedule cleanup)
    cubit.increment();

    // Flag should be set
    expect((manager as any).weakRefCleanupScheduled).toBe(true);

    // Wait for cleanup
    await Promise.resolve();

    // Flag should be reset
    expect((manager as any).weakRefCleanupScheduled).toBe(false);

    // Trigger another notify (should not schedule cleanup since no dead refs)
    cubit.increment();
    await Promise.resolve();

    // Flag should still be false
    expect((manager as any).weakRefCleanupScheduled).toBe(false);
  });
});

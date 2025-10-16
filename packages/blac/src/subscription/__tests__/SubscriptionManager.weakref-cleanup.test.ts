import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit } from '../../Cubit';
import { SubscriptionManager } from '../SubscriptionManager';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('SubscriptionManager WeakRef Cleanup (After Line 110 Removal)', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<number>;

  beforeEach(() => {
    cubit = new TestCubit();
    manager = (cubit as any)._subscriptionManager;
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should clean up dead WeakRefs asynchronously', async () => {
    // Create a component with WeakRef
    let component: any = { name: 'test-component' };
    const weakRef = new WeakRef(component);

    manager.subscribe({
      type: 'consumer',
      weakRef: weakRef,
      notify: () => {},
    });

    expect(manager.size).toBe(1);

    // Simulate component being garbage collected
    component = null;
    global.gc?.(); // Force GC if available

    // Trigger notify - should detect dead ref and schedule cleanup
    cubit.emit(1);

    // Cleanup should still be scheduled (not immediate)
    // Dead ref is still in subscriptions map at this point
    expect(manager.size).toBe(1);

    // Wait for microtask to execute
    await Promise.resolve();

    // Now cleanup should have happened
    expect(manager.size).toBe(0);
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should clean up multiple dead WeakRefs in single microtask', async () => {
    // Create 5 subscriptions with WeakRefs
    let components: any[] = [
      { name: 'comp-1' },
      { name: 'comp-2' },
      { name: 'comp-3' },
      { name: 'comp-4' },
      { name: 'comp-5' },
    ];

    components.forEach(comp => {
      manager.subscribe({
        type: 'consumer',
        weakRef: new WeakRef(comp),
        notify: () => {},
      });
    });

    expect(manager.size).toBe(5);

    // All components go out of scope
    components = [];
    global.gc?.();

    // Single notify should detect all dead refs
    cubit.emit(1);

    // Before microtask, dead refs still present
    expect(manager.size).toBe(5);

    // Wait for microtask
    await Promise.resolve();

    // All dead refs should be cleaned up
    expect(manager.size).toBe(0);
  });

  it('should not block notify cycle with cleanup', () => {
    // Add 100 subscriptions
    for (let i = 0; i < 100; i++) {
      manager.subscribe({
        type: 'consumer',
        notify: () => {},
      });
    }

    expect(manager.size).toBe(100);

    // Measure notify time
    const start = performance.now();
    cubit.emit(1);
    const duration = performance.now() - start;

    // Should be fast (not blocked by cleanup)
    // With 100 subscriptions, should be under 5ms
    expect(duration).toBeLessThan(5);

    console.log(`Notify with 100 subs: ${duration.toFixed(3)}ms`);
  });

  // Skipped: GC behavior is unreliable in test environments
  // Can be run manually with NODE_OPTIONS="--expose-gc"
  it.skip('should handle rapid state changes with dead refs correctly', async () => {
    // Create 10 subscriptions with WeakRefs
    let components = Array.from({ length: 10 }, (_, i) => ({
      name: `comp-${i}`,
    }));

    components.forEach(comp => {
      manager.subscribe({
        type: 'consumer',
        weakRef: new WeakRef(comp),
        notify: () => {},
      });
    });

    expect(manager.size).toBe(10);

    // Simulate garbage collection
    components = [];
    global.gc?.();

    // Trigger 10 rapid state changes
    for (let i = 0; i < 10; i++) {
      cubit.emit(i);
    }

    // Before microtask, dead refs still present
    expect(manager.size).toBe(10);

    // Wait for microtask
    await Promise.resolve();

    // All dead refs should be cleaned up (only scheduled once)
    expect(manager.size).toBe(0);
  });

  it('should not schedule cleanup when no dead refs detected', async () => {
    // Spy on scheduleWeakRefCleanup
    let cleanupScheduled = false;
    const originalSchedule = (manager as any).scheduleWeakRefCleanup.bind(manager);
    (manager as any).scheduleWeakRefCleanup = () => {
      cleanupScheduled = true;
      originalSchedule();
    };

    // Add live subscriptions (no WeakRefs)
    for (let i = 0; i < 5; i++) {
      manager.subscribe({
        type: 'consumer',
        notify: () => {},
      });
    }

    expect(manager.size).toBe(5);

    // Trigger notify
    cubit.emit(1);

    // Wait for microtask
    await Promise.resolve();

    // Cleanup should NOT have been scheduled
    expect(cleanupScheduled).toBe(false);

    // Size unchanged
    expect(manager.size).toBe(5);
  });
});

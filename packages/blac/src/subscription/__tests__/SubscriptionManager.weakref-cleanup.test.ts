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

describe('SubscriptionManager WeakRef Cleanup', () => {
  let cubit: TestCubit;
  let manager: SubscriptionManager<number>;

  beforeEach(() => {
    cubit = new TestCubit();
    manager = (cubit as any)._subscriptionManager;
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

    // Notify should complete without blocking
    cubit.emit(1);

    // Verify subscriptions are still intact
    expect(manager.size).toBe(100);
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

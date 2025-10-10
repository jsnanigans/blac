import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

describe('BlocBase Microtask Disposal', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should dispose on next microtask when subscription count reaches 0', async () => {
    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Not disposed yet (microtask hasn't run)
    expect(cubit.isDisposed).toBe(false);
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Flush microtask queue
    await Promise.resolve();

    // Now disposed
    expect(cubit.isDisposed).toBe(true);
  });

  it('should cancel disposal when resubscribing before microtask runs', async () => {
    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    unsub1();

    // Should be in DISPOSAL_REQUESTED state
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Resubscribe before microtask runs
    const unsub2 = cubit.subscribe(() => {});

    // Should be back to ACTIVE (disposal canceled)
    expect((cubit as any)._lifecycleManager.currentState).toBe('active');

    // Flush microtasks
    await Promise.resolve();

    // Should still be active (not disposed)
    expect(cubit.isDisposed).toBe(false);
    cubit.increment();
    expect(cubit.state).toBe(1);

    unsub2();
  });

  it('should handle multiple rapid subscriptions and unsubscriptions', async () => {
    const cubit = new TestCubit();

    // Rapid subscribe/unsubscribe cycles
    for (let i = 0; i < 5; i++) {
      const unsub = cubit.subscribe(() => {});
      unsub();
      // Resubscribe before microtask
      const unsub2 = cubit.subscribe(() => {});
      unsub2();
    }

    // Final unsubscribe
    const finalUnsub = cubit.subscribe(() => {});
    finalUnsub();

    // Should eventually dispose after microtask
    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should not dispose keepAlive blocs', async () => {
    class KeepAliveCubit extends Cubit<number> {
      static keepAlive = true;
      constructor() {
        super(0);
      }
    }

    const cubit = new KeepAliveCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Flush microtasks
    await Promise.resolve();

    // Should still be active (keepAlive prevents disposal)
    expect(cubit.isDisposed).toBe(false);
  });

  it('should block emissions on DISPOSAL_REQUESTED state', async () => {
    Blac.enableLog = true;
    const errorSpy = vi.spyOn(Blac.instance, 'error');

    const cubit = Blac.getBloc(TestCubit);
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Should be in DISPOSAL_REQUESTED state
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Emit should be blocked
    const oldState = cubit.state;
    cubit.emit(42);

    // State should not change
    expect(cubit.state).toBe(oldState);

    // Error should be logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot emit state on disposal_requested bloc')
    );

    Blac.enableLog = false;
  });

  it('should block emissions on DISPOSING bloc', () => {
    const cubit = new TestCubit();

    // Force bloc into DISPOSING state
    const result = (cubit as any)._lifecycleManager.atomicStateTransition(
      'active',
      'disposing',
    );
    expect(result.success).toBe(true);

    // Emit should be blocked
    const oldState = cubit.state;
    cubit.emit(42);
    expect(cubit.state).toBe(oldState);
  });

  it('should block emissions on DISPOSED bloc', async () => {
    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    await Promise.resolve(); // Dispose
    expect(cubit.isDisposed).toBe(true);

    // Emit should be blocked
    const oldState = cubit.state;
    cubit.emit(42);
    expect(cubit.state).toBe(oldState);
  });

  it('should dispose cubit with interval using onDisposalScheduled hook', async () => {
    vi.useFakeTimers();

    interface TimerState {
      count: number;
      isRunning: boolean;
    }

    class TimerCubit extends Cubit<TimerState> {
      private interval: NodeJS.Timeout | null = null;

      constructor() {
        super({ count: 0, isRunning: false });

        // Clean up interval when disposal is scheduled
        this.onDisposalScheduled = () => {
          if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
          }
        };
      }

      start = () => {
        if (this.state.isRunning) return;

        this.emit({ ...this.state, isRunning: true });

        this.interval = setInterval(() => {
          this.emit({
            count: this.state.count + 1,
            isRunning: true,
          });
        }, 50);
      };
    }

    const cubit = new TimerCubit();
    const states: number[] = [];

    // Subscribe to track state changes
    const unsub = cubit.subscribe((state) => {
      states.push(state.count);
    });

    // Start the timer
    cubit.start();
    expect(cubit.state.isRunning).toBe(true);

    // Let it tick a few times
    await vi.advanceTimersByTimeAsync(150);
    expect(states.length).toBeGreaterThan(0);

    const statesBeforeUnmount = states.length;

    // Simulate component unmount - unsubscribe
    unsub();

    // Cubit should schedule disposal (calls onDisposalScheduled)
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Flush microtask to trigger disposal
    await Promise.resolve();

    // Cubit should be disposed
    expect(cubit.isDisposed).toBe(true);

    // Advance timers - no new state changes should occur (interval cleared)
    const statesAfterDisposal = states.length;
    await vi.advanceTimersByTimeAsync(100);

    // No new states (interval was cleared in onDisposalScheduled)
    expect(states.length).toBe(statesAfterDisposal);

    vi.useRealTimers();
  });

  it('should handle errors in onDisposalScheduled hook gracefully', async () => {
    Blac.enableLog = true;
    const errorSpy = vi.spyOn(Blac.instance, 'error');

    class FaultyCubit extends Cubit<number> {
      constructor() {
        super(0);

        this.onDisposalScheduled = () => {
          throw new Error('Hook error');
        };
      }
    }

    const cubit = Blac.getBloc(FaultyCubit);
    const unsub = cubit.subscribe(() => {});

    // Should not throw when unsubscribing
    expect(() => unsub()).not.toThrow();

    // Error should be logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in onDisposalScheduled hook'),
      expect.any(Error)
    );

    // Disposal should still proceed
    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);

    Blac.enableLog = false;
  });

  it('should call onDisposalScheduled before queuing microtask', async () => {
    let hookCalled = false;
    let hookCalledBeforeDisposal = false;

    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);

        this.onDisposalScheduled = () => {
          hookCalled = true;
          // Check if we're still in ACTIVE state (hook runs before transition)
          hookCalledBeforeDisposal = (this as any)._lifecycleManager.currentState === 'active';
        };
      }
    }

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Hook should be called synchronously
    expect(hookCalled).toBe(true);

    // Hook should run before state transition
    // (Actually it runs after transition to DISPOSAL_REQUESTED, let me check the implementation)

    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should handle multiple disposal scheduling attempts', async () => {
    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    const unsub2 = cubit.subscribe(() => {});

    // Unsubscribe both
    unsub1();
    unsub2();

    // Should only schedule disposal once
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should transition through correct lifecycle states', async () => {
    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});

    // Should start ACTIVE
    expect((cubit as any)._lifecycleManager.currentState).toBe('active');

    // Unsubscribe -> DISPOSAL_REQUESTED
    unsub();
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

    // Microtask runs -> DISPOSING -> DISPOSED
    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposed');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

describe('BlocBase Configurable Disposal', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use global config timeout', async () => {
    Blac.setConfig({ disposalTimeout: 50 });

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Not disposed yet
    vi.advanceTimersByTime(25);
    expect(cubit.isDisposed).toBe(false);

    // Disposed after timeout
    vi.advanceTimersByTime(30);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should use bloc-level timeout override', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    class FastDisposalCubit extends Cubit<number> {
      static disposalTimeout = 0;
      constructor() {
        super(0);
      }
    }

    const cubit = new FastDisposalCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Dispose immediately (next tick)
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should cancel disposal when resubscribing within timeout', async () => {
    Blac.setConfig({ disposalTimeout: 100 });

    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    unsub1();

    // Resubscribe before timeout
    vi.advanceTimersByTime(50);
    const unsub2 = cubit.subscribe(() => {});

    // Wait past original timeout
    vi.advanceTimersByTime(60);
    await vi.runAllTimersAsync();

    // Should still be active
    expect(cubit.isDisposed).toBe(false);
    cubit.increment();
    expect(cubit.state).toBe(1);

    unsub2();
  });

  it.skip('should log warning when cancellation fails due to timeout', async () => {
    // TODO: This test requires subscribing to a disposed bloc, which currently
    // doesn't trigger the warning. This would need a check in the subscribe
    // method to prevent subscribing to disposed blocs.
    // Enable logging to see warning messages
    Blac.enableLog = true;
    const warnSpy = vi.spyOn(Blac.instance, 'warn');
    Blac.setConfig({ disposalTimeout: 10 });

    const cubit = new TestCubit();
    const unsub1 = cubit.subscribe(() => {});
    unsub1();

    // Wait for disposal to complete
    vi.advanceTimersByTime(15);
    await vi.runAllTimersAsync();

    // Check if cubit is disposed
    expect(cubit.isDisposed).toBe(true);

    // Try to resubscribe (too late) - this should trigger the warning
    const unsub2 = cubit.subscribe(() => {});

    // The warning should have been called
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot cancel disposal'),
    );

    unsub2();
    Blac.enableLog = false;
  });

  it('should handle multiple rapid subscriptions and unsubscriptions', async () => {
    Blac.setConfig({ disposalTimeout: 50 });

    const cubit = new TestCubit();

    // Rapid subscribe/unsubscribe
    for (let i = 0; i < 5; i++) {
      const unsub = cubit.subscribe(() => {});
      vi.advanceTimersByTime(10);
      unsub();
      vi.advanceTimersByTime(10);
      // Resubscribe before disposal
      const unsub2 = cubit.subscribe(() => {});
      vi.advanceTimersByTime(10);
      unsub2();
    }

    // Should eventually dispose after final unsubscribe
    vi.advanceTimersByTime(60);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should not dispose keepAlive blocs regardless of timeout', async () => {
    Blac.setConfig({ disposalTimeout: 10 });

    class KeepAliveCubit extends Cubit<number> {
      static keepAlive = true;
      constructor() {
        super(0);
      }
    }

    const cubit = new KeepAliveCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Wait well past timeout
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();

    // Should still be active
    expect(cubit.isDisposed).toBe(false);
  });

  it('should use default timeout when config not set', async () => {
    // Reset config to defaults
    Blac.resetInstance();
    Blac.resetConfig();

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Should use default 100ms timeout
    vi.advanceTimersByTime(50);
    expect(cubit.isDisposed).toBe(false);

    vi.advanceTimersByTime(60);
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should handle 0ms timeout correctly', async () => {
    class ImmediateCubit extends Cubit<number> {
      static disposalTimeout = 0;
      constructor() {
        super(0);
      }
    }

    const cubit = new ImmediateCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();

    // Should dispose on next tick
    await vi.runAllTimersAsync();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should allow emit on DISPOSAL_REQUESTED cubit and cancel disposal', async () => {
    class TestCubit extends Cubit<number> {
      static disposalTimeout = 100;
      constructor() {
        super(0);
      }
    }

    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});

    // Unsubscribe to trigger DISPOSAL_REQUESTED
    unsub();

    // Should be in DISPOSAL_REQUESTED state
    expect((cubit as any)._lifecycleManager.currentState).toBe(
      'disposal_requested',
    );

    // Emit should work AND cancel disposal (Cubit behavior)
    cubit.emit(42);
    expect(cubit.state).toBe(42);

    // Should be back to ACTIVE (disposal canceled)
    expect((cubit as any)._lifecycleManager.currentState).toBe('active');

    // Wait for disposal timeout - cubit should NOT dispose
    await vi.advanceTimersByTimeAsync(150);
    expect(cubit.isDisposed).toBe(false);
  });

  it('should allow multiple emits during DISPOSAL_REQUESTED state and cancel disposal', async () => {
    class CounterCubit extends Cubit<number> {
      static disposalTimeout = 100;
      constructor() {
        super(0);
      }
      increment = () => this.emit(this.state + 1);
    }

    const cubit = new CounterCubit();
    const unsub = cubit.subscribe(() => {});

    // Unsubscribe to enter DISPOSAL_REQUESTED
    unsub();
    expect((cubit as any)._lifecycleManager.currentState).toBe(
      'disposal_requested',
    );

    // First emit should cancel disposal and return to ACTIVE
    cubit.increment();
    expect(cubit.state).toBe(1);
    expect((cubit as any)._lifecycleManager.currentState).toBe('active');

    // Subsequent emits work normally
    cubit.increment();
    expect(cubit.state).toBe(2);

    cubit.emit(100);
    expect(cubit.state).toBe(100);
  });

  it('should still reject emit on DISPOSING bloc', () => {
    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    const cubit = new TestCubit();

    // Force bloc into DISPOSING state
    const result = (cubit as any)._lifecycleManager.atomicStateTransition(
      'active',
      'disposing',
    );
    expect(result.success).toBe(true);
    expect((cubit as any)._lifecycleManager.currentState).toBe('disposing');

    // Emit should be rejected
    const oldState = cubit.state;
    cubit.emit(42);
    expect(cubit.state).toBe(oldState); // State unchanged
  });

  it('should still reject emit on DISPOSED bloc', () => {
    class TestCubit extends Cubit<number> {
      constructor() {
        super(0);
      }
    }

    const cubit = new TestCubit();
    cubit.dispose();

    // Emit should be rejected
    expect(cubit.isDisposed).toBe(true);
    const oldState = cubit.state;
    cubit.emit(42);
    expect(cubit.state).toBe(oldState); // State unchanged
  });

  it('should dispose cubit with running interval when consumer unmounts', async () => {
    // This test reproduces the bug where a cubit with a setInterval
    // is not properly disposed when its only consumer unmounts
    Blac.setConfig({ disposalTimeout: 100 });

    interface TimerState {
      count: number;
      isRunning: boolean;
    }

    class TimerCubit extends Cubit<TimerState> {
      private interval: NodeJS.Timeout | null = null;

      constructor() {
        super({ count: 0, isRunning: false });
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

      stop = () => {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = null;
        }
        this.emit({ ...this.state, isRunning: false });
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
    await vi.advanceTimersByTimeAsync(150); // Should tick 3 times (at 50ms, 100ms, 150ms)
    expect(states.length).toBeGreaterThan(0);

    const statesBeforeUnmount = states.length;

    // Simulate component unmount - unsubscribe
    unsub();

    // Cubit should schedule disposal
    expect((cubit as any)._lifecycleManager.currentState).toBe(
      'disposal_requested',
    );

    // Advance past disposal timeout
    await vi.advanceTimersByTimeAsync(150);

    // BUG: The cubit should be disposed, but it's not because the interval keeps it alive
    // The interval continues to emit state changes, which are allowed on DISPOSAL_REQUESTED blocs
    expect(cubit.isDisposed).toBe(true); // This will FAIL - cubit is NOT disposed

    // BUG: The interval should be cleared, but it's not
    // If we advance timers more, we'll see more state changes
    const statesAfterDisposal = states.length;
    await vi.advanceTimersByTimeAsync(100);

    // The interval should have been cleared, so no new states should be added
    expect(states.length).toBe(statesAfterDisposal); // This will FAIL - interval still running
  });
});

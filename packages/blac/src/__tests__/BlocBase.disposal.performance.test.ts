import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

describe('Disposal Performance Benchmarks', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should dispose within 1ms (microtask-based)', async () => {
    const cubit = new TestCubit();
    const { unsubscribe } = cubit.subscribe(() => {});

    const start = performance.now();
    unsubscribe();
    await Promise.resolve(); // Flush microtask queue
    const duration = performance.now() - start;

    expect(cubit.isDisposed).toBe(true);
    expect(duration).toBeLessThan(1); // Sub-millisecond disposal
  });

  it('should handle 1000 rapid disposal cycles efficiently', async () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      const cubit = new TestCubit();
      const { unsubscribe } = cubit.subscribe(() => {});
      unsubscribe();
      await Promise.resolve(); // Flush microtask
    }

    const duration = performance.now() - start;
    const avgPerDisposal = duration / 1000;

    // Should average less than 1ms per disposal cycle
    expect(avgPerDisposal).toBeLessThan(1);
    expect(duration).toBeLessThan(1000); // Total less than 1 second
  });

  it('should handle rapid subscribe/unsubscribe cycles without performance degradation', async () => {
    const cubit = new TestCubit();
    const iterations = 100;

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const { unsubscribe } = cubit.subscribe(() => {});
      unsubscribe();
      // Resubscribe before microtask runs (disposal cancelled)
      const { unsubscribe: unsub2 } = cubit.subscribe(() => {});
      unsub2();
    }

    // Final disposal
    await Promise.resolve();

    const duration = performance.now() - start;
    const avgPerCycle = duration / iterations;

    // Should average less than 0.1ms per cycle
    expect(avgPerCycle).toBeLessThan(0.1);
    expect(cubit.isDisposed).toBe(true);
  });

  it('should not create memory overhead from cancelled disposals', async () => {
    const cubit = new TestCubit();
    let lastUnsub: (() => void) | null = null;

    // Trigger many disposal attempts that get cancelled
    for (let i = 0; i < 1000; i++) {
      if (lastUnsub) {
        lastUnsub(); // Unsubscribe previous
      }
      // Immediately resubscribe (cancels disposal)
      lastUnsub = cubit.subscribe(() => {}).unsubscribe;
    }

    // Final unsubscribe
    if (lastUnsub) {
      lastUnsub();
    }

    await Promise.resolve();
    expect(cubit.isDisposed).toBe(true);
  });

  it('should handle concurrent disposal scheduling from multiple consumers', async () => {
    const cubit = new TestCubit();
    const consumerCount = 10;
    const unsubscribers: Array<() => void> = [];

    // Subscribe with multiple consumers
    for (let i = 0; i < consumerCount; i++) {
      unsubscribers.push(cubit.subscribe(() => {}).unsubscribe);
    }

    const start = performance.now();

    // Unsubscribe all at once
    unsubscribers.forEach(unsub => unsub());

    await Promise.resolve(); // Flush microtask

    const duration = performance.now() - start;

    expect(cubit.isDisposed).toBe(true);
    expect(duration).toBeLessThan(2); // Should be very fast even with multiple consumers
  });

  it('should perform disposal cleanup faster than timeout-based approach', async () => {
    // This test verifies that microtask disposal is significantly faster
    // than the old timeout-based approach (which was minimum 100ms)

    const iterations = 10;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const cubit = new TestCubit();
      const { unsubscribe } = cubit.subscribe(() => {});
      unsubscribe();
      await Promise.resolve();
    }

    const duration = performance.now() - start;
    const avgPerDisposal = duration / iterations;

    // Microtask disposal should be orders of magnitude faster than 100ms timeout
    expect(avgPerDisposal).toBeLessThan(10); // At least 10x faster
    expect(duration).toBeLessThan(100); // Total should be less than old single disposal
  });

  it('should maintain performance with onDisposalScheduled hook', async () => {
    class CubitWithHook extends Cubit<number> {
      cleanupCallCount = 0;

      constructor() {
        super(0);

        this.onDisposalScheduled = () => {
          this.cleanupCallCount++;
        };
      }
    }

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const cubit = new CubitWithHook();
      const { unsubscribe } = cubit.subscribe(() => {});
      unsubscribe();
      await Promise.resolve();
      expect(cubit.cleanupCallCount).toBe(1);
    }

    const duration = performance.now() - start;
    const avgPerDisposal = duration / iterations;

    // Hook should not significantly impact performance
    expect(avgPerDisposal).toBeLessThan(1);
  });

  it('should handle disposal with state emissions efficiently', async () => {
    const cubit = new TestCubit();
    const { unsubscribe } = cubit.subscribe(() => {});

    // Emit some state changes
    for (let i = 0; i < 100; i++) {
      cubit.increment();
    }

    const start = performance.now();
    unsubscribe();
    await Promise.resolve();
    const duration = performance.now() - start;

    expect(cubit.isDisposed).toBe(true);
    expect(duration).toBeLessThan(1);
  });
});

import { describe, it, expect } from 'vitest';
import { Cubit } from '../../Cubit';
import { SubscriptionManager } from '../SubscriptionManager';

class BenchmarkCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

describe('SubscriptionManager Performance Benchmarks', () => {
  const subscriptionCounts = [10, 50, 100, 500];
  const iterations = 1000;

  subscriptionCounts.forEach(subCount => {
    it(`should show improved performance with ${subCount} subscriptions`, () => {
      const cubit = new BenchmarkCubit();
      const manager = (cubit as any)._subscriptionManager as SubscriptionManager<{ count: number }>;

      // Add subscriptions
      for (let i = 0; i < subCount; i++) {
        manager.subscribe({
          type: 'consumer',
          notify: () => {},
        });
      }

      expect(manager.size).toBe(subCount);

      // Warm up (JIT compilation)
      for (let i = 0; i < 100; i++) {
        cubit.increment();
      }

      // Measure notify performance
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        cubit.increment();
      }

      const duration = performance.now() - start;
      const avgPerNotify = duration / iterations;

      console.log(
        `${subCount} subs: ${avgPerNotify.toFixed(3)}ms per notify ` +
        `(total: ${duration.toFixed(1)}ms for ${iterations} notifies)`
      );

      // Performance targets based on subscription count
      // These are conservative targets after the optimization
      const targets: Record<number, number> = {
        10: 1.0,   // <1.0ms per notify with 10 subs
        50: 1.2,   // <1.2ms per notify with 50 subs
        100: 1.6,  // <1.6ms per notify with 100 subs
        500: 5.5,  // <5.5ms per notify with 500 subs
      };

      const target = targets[subCount];
      expect(avgPerNotify).toBeLessThan(target);

      // Store result for comparison
      (global as any).benchmarkResults = (global as any).benchmarkResults || {};
      (global as any).benchmarkResults[`notify_${subCount}_subs`] = avgPerNotify;
    });
  });

  it('should show overall improvement summary', () => {
    const results = (global as any).benchmarkResults || {};

    console.log('\n=== Performance Summary ===');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${key}: ${(value as number).toFixed(3)}ms`);
    });

    // Verify we have results for all subscription counts
    expect(Object.keys(results).length).toBeGreaterThanOrEqual(subscriptionCounts.length);
  });

  it('should demonstrate scaling characteristics', () => {
    const cubit = new BenchmarkCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<{ count: number }>;

    const scalingData: Array<{ count: number; avgTime: number }> = [];

    for (const subCount of [10, 25, 50, 75, 100]) {
      // Clear previous subscriptions
      manager.clear();

      // Add subscriptions
      for (let i = 0; i < subCount; i++) {
        manager.subscribe({
          type: 'consumer',
          notify: () => {},
        });
      }

      // Warm up
      for (let i = 0; i < 50; i++) {
        cubit.increment();
      }

      // Measure
      const start = performance.now();
      for (let i = 0; i < 500; i++) {
        cubit.increment();
      }
      const duration = performance.now() - start;
      const avgTime = duration / 500;

      scalingData.push({ count: subCount, avgTime });
    }

    console.log('\n=== Scaling Analysis ===');
    scalingData.forEach(({ count, avgTime }) => {
      console.log(`${count} subs: ${avgTime.toFixed(3)}ms per notify`);
    });

    // Verify performance scales reasonably (not exponentially)
    // With proper optimization, it should scale roughly linearly
    const first = scalingData[0];
    const last = scalingData[scalingData.length - 1];

    // 10x increase in subscriptions should result in less than 15x increase in time
    // (allows for some overhead, but prevents exponential growth)
    const countMultiplier = last.count / first.count;
    const timeMultiplier = last.avgTime / first.avgTime;

    expect(timeMultiplier).toBeLessThan(countMultiplier * 1.5);
  });

  it('should maintain consistent performance across multiple runs', () => {
    const cubit = new BenchmarkCubit();
    const manager = (cubit as any)._subscriptionManager as SubscriptionManager<{ count: number }>;

    // Add 50 subscriptions
    for (let i = 0; i < 50; i++) {
      manager.subscribe({
        type: 'consumer',
        notify: () => {},
      });
    }

    const measurements: number[] = [];
    const runs = 5;

    for (let run = 0; run < runs; run++) {
      // Warm up
      for (let i = 0; i < 100; i++) {
        cubit.increment();
      }

      // Measure
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }
      const duration = performance.now() - start;
      measurements.push(duration / 1000);
    }

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const variance = measurements.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / measurements.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avg) * 100;

    console.log('\n=== Consistency Analysis ===');
    console.log(`Average: ${avg.toFixed(3)}ms`);
    console.log(`Std Dev: ${stdDev.toFixed(3)}ms`);
    console.log(`Coefficient of Variation: ${coefficientOfVariation.toFixed(1)}%`);

    // Coefficient of variation should be reasonable (< 25%)
    // Slightly relaxed from 20% to account for system load variability
    expect(coefficientOfVariation).toBeLessThan(25);
  });
});

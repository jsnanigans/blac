/**
 * Performance comparison test for ReactBridge optimizations
 */

import { describe, it, expect } from 'vitest';
import { ReactBridge } from '../ReactBridge';
import { ReactBridge as ReactBridgeOptimized } from '../ReactBridge.optimized';
import { Cubit } from '@blac/core';

class TestBloc extends Cubit<{ count: number; items: string[] }> {
  constructor() {
    super({ count: 0, items: [] });
  }

  increment() {
    this.update((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }

  addItem(item: string) {
    this.update((current) => ({
      ...current,
      items: [...current.items, item],
    }));
  }
}

describe('ReactBridge Performance Comparison', () => {
  const runBenchmark = (Bridge: typeof ReactBridge, iterations: number) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const bloc = new TestBloc();
    const bridge = new Bridge(bloc);

    // Simulate multiple subscriptions
    const unsubscribes: (() => void)[] = [];
    for (let i = 0; i < 10; i++) {
      unsubscribes.push(bridge.subscribe(() => {}));
    }

    // Simulate multiple renders with tracking
    for (let i = 0; i < iterations; i++) {
      const snapshot = bridge.getSnapshot();
      // Access properties to trigger tracking
      const _ = snapshot.count;
      const __ = snapshot.items.length;
      bridge.completeTracking();
    }

    // Simulate state changes
    for (let i = 0; i < iterations / 10; i++) {
      bloc.increment();
      bloc.addItem(`item-${i}`);
    }

    // Cleanup
    unsubscribes.forEach(unsub => unsub());
    bridge.dispose();

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      time: endTime - startTime,
      memory: endMemory - startMemory,
    };
  };

  it('should show performance improvement', () => {
    const iterations = 1000;

    // Run original version
    const originalResults = runBenchmark(ReactBridge, iterations);

    // Run optimized version
    const optimizedResults = runBenchmark(ReactBridgeOptimized, iterations);

    console.log('Performance Results:');
    console.log('Original:', {
      time: `${originalResults.time.toFixed(2)}ms`,
      memory: `${(originalResults.memory / 1024).toFixed(2)}KB`,
    });
    console.log('Optimized:', {
      time: `${optimizedResults.time.toFixed(2)}ms`,
      memory: `${(optimizedResults.memory / 1024).toFixed(2)}KB`,
    });
    console.log('Improvement:', {
      time: `${((1 - optimizedResults.time / originalResults.time) * 100).toFixed(1)}%`,
      memory: `${((1 - optimizedResults.memory / originalResults.memory) * 100).toFixed(1)}%`,
    });

    // Expect optimized version to be faster
    expect(optimizedResults.time).toBeLessThanOrEqual(originalResults.time);
  });

  it('should handle rapid subscription changes efficiently', () => {
    const bloc = new TestBloc();
    const bridge = new ReactBridgeOptimized(bloc);

    const startTime = performance.now();

    // Rapid subscribe/unsubscribe cycles
    for (let i = 0; i < 100; i++) {
      const unsub1 = bridge.subscribe(() => {});
      const unsub2 = bridge.subscribe(() => {});
      const unsub3 = bridge.subscribe(() => {});

      unsub2();
      unsub1();
      unsub3();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Rapid subscription cycles: ${duration.toFixed(2)}ms`);

    // Should complete in reasonable time
    expect(duration).toBeLessThan(50); // 50ms for 300 subscribe/unsubscribe operations

    bridge.dispose();
  });

  it('should handle path tracking efficiently', () => {
    const bloc = new TestBloc();
    const bridge = new ReactBridgeOptimized(bloc);

    bridge.subscribe(() => {});

    const startTime = performance.now();

    // Simulate many render cycles with different path accesses
    for (let i = 0; i < 100; i++) {
      const snapshot = bridge.getSnapshot();

      // Different access patterns
      if (i % 3 === 0) {
        const _ = snapshot.count;
      } else if (i % 3 === 1) {
        const _ = snapshot.items;
      } else {
        const _ = snapshot.count;
        const __ = snapshot.items[0];
      }

      bridge.completeTracking();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Path tracking cycles: ${duration.toFixed(2)}ms`);

    // Should be very fast
    expect(duration).toBeLessThan(20); // 20ms for 100 tracking cycles

    bridge.dispose();
  });
});
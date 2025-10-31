/**
 * Performance tests for ReactBridge
 */

import { describe, it, expect } from 'vitest';
import { ReactBridge } from '../ReactBridge.optimized';
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

describe('ReactBridge Performance', () => {
  it('should handle rapid subscription changes efficiently', () => {
    const bloc = new TestBloc();
    const bridge = new ReactBridge(bloc);

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
    const bridge = new ReactBridge(bloc);

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

  it('should handle high volume of renders and state changes', () => {
    const iterations = 1000;
    const startTime = performance.now();

    const bloc = new TestBloc();
    const bridge = new ReactBridge(bloc);

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
    const duration = endTime - startTime;

    console.log(`High volume test (${iterations} renders): ${duration.toFixed(2)}ms`);

    // Should complete in reasonable time (less than 100ms for 1000 iterations)
    expect(duration).toBeLessThan(100);
  });
});

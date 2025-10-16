/**
 * Test file demonstrating subscription ID race condition issue
 *
 * Issue: BlacAdapter retrieves subscription ID using Array.from().pop() which creates
 * a race condition when multiple adapters subscribe concurrently. This causes dependency
 * tracking to be assigned to the wrong subscription.
 *
 * This test file demonstrates the issue BEFORE the return object fix.
 * Tests are expected to FAIL until the fix is implemented.
 */

import { describe, it, expect, jest, beforeEach } from 'vitest';
import { BlacAdapter } from '../BlacAdapter';
import { Cubit } from '../../Cubit';

class TestCubit extends Cubit<{ count: number; doubled: number }> {
  constructor() {
    super({ count: 0, doubled: 0 });
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      count: newCount,
      doubled: newCount * 2,
    });
  };

  get computedValue(): number {
    return this.state.count * 3;
  }
}

describe('BlacAdapter - Subscription ID Race Condition (ISSUE)', () => {
  let cubit: TestCubit;

  beforeEach(() => {
    cubit = new TestCubit();
  });

  it('should demonstrate race condition with concurrent subscriptions', () => {
    const componentRef1 = { current: {} };
    const componentRef2 = { current: {} };

    const adapter1 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef: componentRef1,
    });
    const adapter2 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef: componentRef2,
    });

    // Create subscriptions synchronously (simulates concurrent mounting)
    const onChange1 = jest.fn();
    const onChange2 = jest.fn();

    adapter1.createSubscription({ onChange: onChange1 });
    adapter2.createSubscription({ onChange: onChange2 });

    // Get subscription IDs (using the unsafe method)
    const id1 = (adapter1 as any).subscriptionId;
    const id2 = (adapter2 as any).subscriptionId;

    console.log('Adapter 1 subscription ID:', id1);
    console.log('Adapter 2 subscription ID:', id2);

    // EXPECTED: Different IDs
    // ACTUAL (ISSUE): May get same ID or wrong ID due to Array.from().pop() race!
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('should demonstrate dependency contamination across adapters', () => {
    const componentRef1 = { current: {} };
    const componentRef2 = { current: {} };

    const adapter1 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef: componentRef1,
    });
    const adapter2 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef: componentRef2,
    });

    adapter1.createSubscription({ onChange: jest.fn() });
    adapter2.createSubscription({ onChange: jest.fn() });

    // Adapter 1 accesses 'count'
    adapter1.trackAccess(componentRef1.current, 'state', 'count');

    // Adapter 2 accesses 'doubled'
    adapter2.trackAccess(componentRef2.current, 'state', 'doubled');

    // Get subscription IDs
    const id1 = (adapter1 as any).subscriptionId;
    const id2 = (adapter2 as any).subscriptionId;

    // Get subscriptions from cubit
    const sub1 = cubit._subscriptionManager.getSubscription(id1);
    const sub2 = cubit._subscriptionManager.getSubscription(id2);

    // EXPECTED: Each adapter has only its own dependencies
    // ACTUAL (ISSUE): Dependencies may be contaminated due to ID race!

    console.log('Adapter 1 dependencies:', Array.from(sub1?.dependencies || []));
    console.log('Adapter 2 dependencies:', Array.from(sub2?.dependencies || []));

    // These assertions SHOULD pass but MAY fail due to the race condition
    expect(sub1?.dependencies.has('count')).toBe(true);
    expect(sub1?.dependencies.has('doubled')).toBe(false);

    expect(sub2?.dependencies.has('doubled')).toBe(true);
    expect(sub2?.dependencies.has('count')).toBe(false);
  });

  it('should demonstrate the O(n) performance issue of Array.from().pop()', () => {
    const subscriptionCounts = [10, 50, 100, 500];
    const results: { count: number; avgTime: number }[] = [];

    for (const count of subscriptionCounts) {
      const testCubit = new TestCubit();

      // Create N subscriptions
      const adapters: BlacAdapter<any>[] = [];
      for (let i = 0; i < count; i++) {
        const componentRef = { current: {} };
        const adapter = new BlacAdapter({
          blocConstructor: TestCubit as any,
          componentRef,
        });
        adapter.createSubscription({ onChange: jest.fn() });
        adapters.push(adapter);
      }

      // Measure time to retrieve ID using the unsafe method
      const timings: number[] = [];

      for (let run = 0; run < 100; run++) {
        const start = performance.now();

        // Simulate the ID retrieval operation
        const subscriptions = (testCubit._subscriptionManager as any).subscriptions;
        const _ = Array.from(subscriptions.keys()).pop();  // O(n) operation!

        const duration = performance.now() - start;
        timings.push(duration);
      }

      const avgTime = timings.reduce((a, b) => a + b) / timings.length;
      results.push({ count, avgTime });
    }

    console.log('\n=== Subscription ID Retrieval Performance (O(n)) ===');
    results.forEach(({ count, avgTime }) => {
      console.log(`  ${count} subscriptions: ${avgTime.toFixed(4)}ms avg lookup time`);
    });

    // Performance should scale linearly (BAD!)
    // With O(1) index, it should be constant
    const firstTime = results[0].avgTime;
    const lastTime = results[results.length - 1].avgTime;
    const scaleFactor = lastTime / firstTime;

    console.log(`  Scale factor: ${scaleFactor.toFixed(2)}× (should be ~1.0 for O(1))`);

    // EXPECTED: Constant time (scale factor close to 1.0)
    // ACTUAL (ISSUE): Linear scaling (scale factor >> 1.0)
    expect(scaleFactor).toBeLessThan(2);  // This WILL fail due to O(n) scaling!
  });

  it('should demonstrate React Strict Mode issue', () => {
    const componentRef = { current: {} };

    // Mount 1
    const adapter1 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef,
    });
    const cleanup1 = adapter1.createSubscription({ onChange: jest.fn() });
    const id1 = (adapter1 as any).subscriptionId;

    expect(id1).toBeDefined();

    // Unmount (strict mode)
    cleanup1();

    // Verify subscription was removed
    expect(cubit._subscriptionManager.getSubscription(id1)).toBeUndefined();

    // Remount (strict mode)
    const adapter2 = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef,
    });
    const cleanup2 = adapter2.createSubscription({ onChange: jest.fn() });
    const id2 = (adapter2 as any).subscriptionId;

    // IDs should be different
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);

    // Only adapter2's subscription should exist
    expect(cubit._subscriptionManager.getSubscription(id1)).toBeUndefined();
    expect(cubit._subscriptionManager.getSubscription(id2)).toBeDefined();
  });

  it('should demonstrate unsafe type assertion issue', () => {
    const componentRef = { current: {} };

    const adapter = new BlacAdapter({
      blocConstructor: TestCubit as any,
      componentRef,
    });

    adapter.createSubscription({ onChange: jest.fn() });

    // This is the unsafe code path in the current implementation:
    // const subscriptions = (this.blocInstance._subscriptionManager as any).subscriptions;
    // this.subscriptionId = Array.from(subscriptions.keys()).pop();

    // ISSUE 1: Uses 'as any' to bypass type safety
    // ISSUE 2: Creates unnecessary array (O(n) memory)
    // ISSUE 3: pop() gets wrong ID if multiple subscriptions added concurrently

    // Verify the subscription ID was retrieved
    const subscriptionId = (adapter as any).subscriptionId;
    expect(subscriptionId).toBeDefined();
    expect(typeof subscriptionId).toBe('string');

    // Verify it matches a valid subscription
    const subscription = cubit._subscriptionManager.getSubscription(subscriptionId);
    expect(subscription).toBeDefined();
  });
});

describe('Subscription ID Race - Performance Benchmarks', () => {
  it('should measure Array.from().pop() vs direct ID return', () => {
    const iterations = 10000;

    // Simulate current approach (Array.from + pop)
    const subscriptionIds = Array.from({ length: 100 }, (_, i) => `sub-${i}`);
    const subscriptionMap = new Map(subscriptionIds.map(id => [id, {}]));

    // Benchmark: Array.from().pop()
    const arrayFromStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const _ = Array.from(subscriptionMap.keys()).pop();
    }
    const arrayFromDuration = performance.now() - arrayFromStart;

    // Benchmark: Direct ID return (simulated ideal case)
    const directStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const _ = subscriptionIds[subscriptionIds.length - 1];  // O(1)
    }
    const directDuration = performance.now() - directStart;

    console.log('\n=== Performance Comparison ===');
    console.log(`Array.from().pop(): ${arrayFromDuration.toFixed(2)}ms`);
    console.log(`Direct access: ${directDuration.toFixed(2)}ms`);
    console.log(`Speedup: ${(arrayFromDuration / directDuration).toFixed(2)}×`);

    // Direct access should be MUCH faster
    expect(directDuration).toBeLessThan(arrayFromDuration);
  });
});

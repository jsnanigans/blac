/**
 * Performance Comparison: useBlocNext vs useBlocConcurrent
 *
 * This test compares the ultimate useBlocNext implementation against useBlocConcurrent
 * to validate the performance improvements from using useSyncExternalStore with
 * direct subscriptions and minimal overhead.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBlocConcurrent } from '../useBlocConcurrent';
import { useBlocNext } from '../useBlocNext';

// Test Bloc
class TestCounterBloc extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

// Shared counter for non-isolated tests
class SharedCounterBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe('Performance Comparison: Next vs Concurrent', () => {
  beforeEach(() => {
    TestCounterBloc.release();
    SharedCounterBloc.release();
  });

  it('should compare mount performance', () => {
    console.log('\n🔬 TEST: Mount Performance Comparison\n');

    const NUM_RUNS = 100;

    // Test Concurrent Mode
    const concurrentStart = performance.now();
    for (let i = 0; i < NUM_RUNS; i++) {
      const { unmount } = renderHook(() => useBlocConcurrent(TestCounterBloc));
      unmount();
    }
    const concurrentTime = performance.now() - concurrentStart;

    // Test Next Mode (Ultimate Implementation)
    const nextStart = performance.now();
    for (let i = 0; i < NUM_RUNS; i++) {
      const { unmount } = renderHook(() => useBlocNext(TestCounterBloc));
      unmount();
    }
    const nextTime = performance.now() - nextStart;

    console.log('Mount/Unmount Performance (100 iterations):');
    console.log(`  Concurrent Mode: ${concurrentTime.toFixed(2)}ms (${(concurrentTime / NUM_RUNS).toFixed(3)}ms per mount)`);
    console.log(`  Next Mode:       ${nextTime.toFixed(2)}ms (${(nextTime / NUM_RUNS).toFixed(3)}ms per mount)`);

    // Determine winner
    const winner = nextTime < concurrentTime ? 'Next' : 'Concurrent';
    console.log(`\n🏆 Winner: ${winner} Mode`);

    // Performance comparison
    const improvement = ((concurrentTime / nextTime - 1) * 100);
    console.log('\nPerformance Comparison:');
    if (Math.abs(improvement) < 5) {
      console.log(`  Equivalent performance (within 5%)`);
    } else if (improvement > 0) {
      console.log(`  Next is ${improvement.toFixed(1)}% faster than Concurrent`);
    } else {
      console.log(`  Concurrent is ${Math.abs(improvement).toFixed(1)}% faster than Next`);
    }

    expect(nextTime).toBeGreaterThan(0);
    expect(concurrentTime).toBeGreaterThan(0);
  });

  it('should compare update performance', () => {
    console.log('\n🔬 TEST: Update Performance Comparison\n');

    const NUM_UPDATES = 1000;

    // Concurrent Mode
    const concurrentHook = renderHook(() => useBlocConcurrent(SharedCounterBloc));
    const concurrentBloc = SharedCounterBloc.getOrCreate();

    const concurrentStart = performance.now();
    for (let i = 0; i < NUM_UPDATES; i++) {
      act(() => concurrentBloc.increment());
    }
    const concurrentTime = performance.now() - concurrentStart;
    concurrentHook.unmount();
    SharedCounterBloc.release();

    // Next Mode (Ultimate Implementation)
    const nextHook = renderHook(() => useBlocNext(SharedCounterBloc));
    const nextBloc = SharedCounterBloc.getOrCreate();

    const nextStart = performance.now();
    for (let i = 0; i < NUM_UPDATES; i++) {
      act(() => nextBloc.increment());
    }
    const nextTime = performance.now() - nextStart;
    nextHook.unmount();
    SharedCounterBloc.release();

    console.log(`Update Performance (${NUM_UPDATES} updates):`);
    console.log(`  Concurrent Mode: ${concurrentTime.toFixed(2)}ms (${(concurrentTime / NUM_UPDATES).toFixed(4)}ms per update)`);
    console.log(`  Next Mode:       ${nextTime.toFixed(2)}ms (${(nextTime / NUM_UPDATES).toFixed(4)}ms per update)`);

    // Determine winner
    const winner = nextTime < concurrentTime ? 'Next' : 'Concurrent';
    console.log(`\n🏆 Winner: ${winner} Mode`);

    // Performance improvement
    const improvement = ((concurrentTime / nextTime - 1) * 100);
    console.log('\nPerformance Comparison:');
    if (Math.abs(improvement) < 5) {
      console.log(`  Equivalent performance (within 5%)`);
    } else if (improvement > 0) {
      console.log(`  Next is ${improvement.toFixed(1)}% faster than Concurrent`);
    } else {
      console.log(`  Concurrent is ${Math.abs(improvement).toFixed(1)}% faster than Next`);
    }
  });

  it('should compare performance with 1000 components', () => {
    console.log('\n🔬 TEST: 1000 Components Performance\n');

    const NUM_COMPONENTS = 1000;
    const NUM_UPDATES = 5;

    // Concurrent Mode
    console.log('Testing Concurrent Mode...');
    const concurrentMountStart = performance.now();
    const concurrentHooks = Array.from({ length: NUM_COMPONENTS }, () =>
      renderHook(() => useBlocConcurrent(SharedCounterBloc))
    );
    const concurrentMountTime = performance.now() - concurrentMountStart;

    const concurrentBloc = SharedCounterBloc.getOrCreate();
    const concurrentUpdateStart = performance.now();
    for (let i = 0; i < NUM_UPDATES; i++) {
      act(() => concurrentBloc.increment());
    }
    const concurrentUpdateTime = performance.now() - concurrentUpdateStart;

    concurrentHooks.forEach(h => h.unmount());
    SharedCounterBloc.release();

    // Next Mode (Ultimate Implementation)
    console.log('Testing Next Mode...');
    const nextMountStart = performance.now();
    const nextHooks = Array.from({ length: NUM_COMPONENTS }, () =>
      renderHook(() => useBlocNext(SharedCounterBloc))
    );
    const nextMountTime = performance.now() - nextMountStart;

    const nextBloc = SharedCounterBloc.getOrCreate();
    const nextUpdateStart = performance.now();
    for (let i = 0; i < NUM_UPDATES; i++) {
      act(() => nextBloc.increment());
    }
    const nextUpdateTime = performance.now() - nextUpdateStart;

    nextHooks.forEach(h => h.unmount());
    SharedCounterBloc.release();

    console.log(`\n=== ${NUM_COMPONENTS} Components Results ===\n`);

    console.log('Mount Performance:');
    console.log(`  Concurrent: ${concurrentMountTime.toFixed(2)}ms (${(concurrentMountTime / NUM_COMPONENTS).toFixed(4)}ms per component)`);
    console.log(`  Next:       ${nextMountTime.toFixed(2)}ms (${(nextMountTime / NUM_COMPONENTS).toFixed(4)}ms per component)`);

    console.log(`\nUpdate Performance (${NUM_UPDATES} updates to ${NUM_COMPONENTS} components):`);
    console.log(`  Concurrent: ${concurrentUpdateTime.toFixed(2)}ms (${(concurrentUpdateTime / NUM_UPDATES).toFixed(2)}ms per update)`);
    console.log(`  Next:       ${nextUpdateTime.toFixed(2)}ms (${(nextUpdateTime / NUM_UPDATES).toFixed(2)}ms per update)`);

    // Determine winners
    const mountWinner = nextMountTime < concurrentMountTime ? 'Next' : 'Concurrent';
    const updateWinner = nextUpdateTime < concurrentUpdateTime ? 'Next' : 'Concurrent';

    console.log(`\n🏆 Mount Winner: ${mountWinner}`);
    console.log(`🏆 Update Winner: ${updateWinner}`);

    console.log('\nPerformance Analysis (Next vs Concurrent):');
    const mountImprovement = ((concurrentMountTime / nextMountTime - 1) * 100);
    const updateImprovement = ((concurrentUpdateTime / nextUpdateTime - 1) * 100);

    if (Math.abs(mountImprovement) < 5) {
      console.log(`  Mount:  Equivalent performance (within 5%)`);
    } else if (mountImprovement > 0) {
      console.log(`  Mount:  Next is ${mountImprovement.toFixed(1)}% faster`);
    } else {
      console.log(`  Mount:  Concurrent is ${Math.abs(mountImprovement).toFixed(1)}% faster`);
    }

    if (Math.abs(updateImprovement) < 5) {
      console.log(`  Update: Equivalent performance (within 5%)`);
    } else if (updateImprovement > 0) {
      console.log(`  Update: Next is ${updateImprovement.toFixed(1)}% faster`);
    } else {
      console.log(`  Update: Concurrent is ${Math.abs(updateImprovement).toFixed(1)}% faster`);
    }

    // Assertions
    expect(nextMountTime).toBeGreaterThan(0);
    expect(nextUpdateTime).toBeGreaterThan(0);
    expect(concurrentMountTime).toBeGreaterThan(0);
    expect(concurrentUpdateTime).toBeGreaterThan(0);
  });

  it('should measure memory overhead', () => {
    console.log('\n🔬 TEST: Memory Overhead Comparison\n');

    const NUM_COMPONENTS = 100;

    // Helper to measure heap usage
    const measureHeap = () => {
      if (typeof window !== 'undefined' && (window as any).performance?.memory) {
        return (window as any).performance.memory.usedJSHeapSize;
      }
      return 0;
    };

    // Force garbage collection if available
    const gc = () => {
      if (typeof global !== 'undefined' && (global as any).gc) {
        (global as any).gc();
      }
    };

    // Concurrent Mode
    gc();
    const concurrentHeapBefore = measureHeap();
    const concurrentHooks = Array.from({ length: NUM_COMPONENTS }, () =>
      renderHook(() => useBlocConcurrent(TestCounterBloc))
    );
    const concurrentHeapAfter = measureHeap();
    const concurrentMemory = concurrentHeapAfter - concurrentHeapBefore;
    concurrentHooks.forEach(h => h.unmount());

    // Next Mode (Ultimate Implementation)
    gc();
    const nextHeapBefore = measureHeap();
    const nextHooks = Array.from({ length: NUM_COMPONENTS }, () =>
      renderHook(() => useBlocNext(TestCounterBloc))
    );
    const nextHeapAfter = measureHeap();
    const nextMemory = nextHeapAfter - nextHeapBefore;
    nextHooks.forEach(h => h.unmount());

    console.log(`Memory Usage (${NUM_COMPONENTS} components):`);
    if (concurrentMemory > 0 || nextMemory > 0) {
      console.log(`  Concurrent Mode: ${(concurrentMemory / 1024).toFixed(2)}KB (${(concurrentMemory / NUM_COMPONENTS).toFixed(0)} bytes per component)`);
      console.log(`  Next Mode:       ${(nextMemory / 1024).toFixed(2)}KB (${(nextMemory / NUM_COMPONENTS).toFixed(0)} bytes per component)`);

      if (nextMemory < concurrentMemory) {
        const savings = ((concurrentMemory - nextMemory) / concurrentMemory * 100);
        console.log(`\n🏆 Next Mode uses ${savings.toFixed(1)}% less memory!`);
      } else if (nextMemory > concurrentMemory) {
        const overhead = ((nextMemory - concurrentMemory) / concurrentMemory * 100);
        console.log(`\n⚠️  Next Mode uses ${overhead.toFixed(1)}% more memory`);
      } else {
        console.log('\n✅ Equivalent memory usage');
      }
    } else {
      console.log('  Memory measurement not available in this environment');
    }

    expect(true).toBe(true); // Dummy assertion
  });
});
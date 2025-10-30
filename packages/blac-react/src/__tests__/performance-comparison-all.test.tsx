/**
 * Performance Comparison: useBlocNext vs useBlocConcurrent vs useBlocMinimal
 *
 * Simplified performance comparison focusing on:
 * - Mount/unmount performance
 * - State update performance
 * - Multi-component scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBlocConcurrent } from '../useBlocConcurrent';
import { useBlocNext } from '../useBlocNext';
import { useBlocMinimal } from '../useBlocMinimal';

// ============================================================================
// Simple Statistics
// ============================================================================

interface Stats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

function calculateStats(values: number[]): Stats {
  if (values.length === 0) {
    throw new Error('Cannot calculate statistics on empty array');
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;

  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  const median = n % 2 === 0
    ? (sorted[Math.floor(n / 2) - 1] + sorted[Math.floor(n / 2)]) / 2
    : sorted[Math.floor(n / 2)];

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, median, stdDev, min: sorted[0], max: sorted[n - 1] };
}

function formatStats(stats: Stats, unit: string = 'ms'): string {
  return `Mean: ${stats.mean.toFixed(3)}${unit} ± ${stats.stdDev.toFixed(3)}${unit} | Median: ${stats.median.toFixed(3)}${unit} | Range: [${stats.min.toFixed(3)}-${stats.max.toFixed(3)}]${unit}`;
}

// ============================================================================
// Benchmark Runner
// ============================================================================

async function runBenchmark(fn: () => void, iterations: number = 50, warmupRuns: number = 10): Promise<Stats> {
  const times: number[] = [];

  // Warmup phase - important for JIT optimization and cache warming
  console.log(`  Warmup: ${warmupRuns} runs...`);
  for (let i = 0; i < warmupRuns; i++) {
    fn();
  }

  // Small delay to let GC settle
  await new Promise(resolve => setTimeout(resolve, 10));

  // Measure phase
  console.log(`  Measuring: ${iterations} runs...`);
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  return calculateStats(times);
}

// ============================================================================
// Test Blocs
// ============================================================================

class TestCounterBloc extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

class SharedCounterBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

// ============================================================================
// Results Collection
// ============================================================================

interface TestResult {
  minimal: number;
  concurrent: number;
  next: number;
  winner: string;
  unit?: string;
}

const allResults: Record<string, TestResult> = {};

// ============================================================================
// Tests
// ============================================================================

describe('Performance Comparison: Next vs Concurrent vs Minimal', () => {
  beforeEach(() => {
    TestCounterBloc.release();
    SharedCounterBloc.release();
  });

  it('should compare mount/unmount performance', async () => {
    console.log('\n🔬 Mount/Unmount Performance\n');

    const MOUNTS_PER_RUN = 20;
    const ITERATIONS = 50;
    const WARMUP = 15;

    console.log('Testing Minimal...');
    const minimalStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocMinimal(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log('Testing Concurrent...');
    const concurrentStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocConcurrent(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log('Testing Next...');
    const nextStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocNext(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log(`Minimal:    ${formatStats(minimalStats)} | Per mount: ${(minimalStats.mean / MOUNTS_PER_RUN).toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentStats)} | Per mount: ${(concurrentStats.mean / MOUNTS_PER_RUN).toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextStats)} | Per mount: ${(nextStats.mean / MOUNTS_PER_RUN).toFixed(4)}ms`);

    const winner = [
      { name: 'Minimal', time: minimalStats.mean },
      { name: 'Concurrent', time: concurrentStats.mean },
      { name: 'Next', time: nextStats.mean }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    console.log(`\n🏆 Winner: ${winner.name}`);

    // Store results
    allResults['Mount (per mount)'] = {
      minimal: minimalStats.mean / MOUNTS_PER_RUN,
      concurrent: concurrentStats.mean / MOUNTS_PER_RUN,
      next: nextStats.mean / MOUNTS_PER_RUN,
      winner: winner.name,
      unit: 'ms'
    };

    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should compare update performance', async () => {
    console.log('\n🔬 Update Performance\n');

    const UPDATES_PER_RUN = 100;
    const ITERATIONS = 50;
    const WARMUP = 15;

    console.log('Testing Minimal...');
    const minimalStats = await runBenchmark(() => {
      const hook = renderHook(() => useBlocMinimal(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Concurrent...');
    const concurrentStats = await runBenchmark(() => {
      const hook = renderHook(() => useBlocConcurrent(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Next...');
    const nextStats = await runBenchmark(() => {
      const hook = renderHook(() => useBlocNext(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log(`Minimal:    ${formatStats(minimalStats)} | Per update: ${(minimalStats.mean / UPDATES_PER_RUN).toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentStats)} | Per update: ${(concurrentStats.mean / UPDATES_PER_RUN).toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextStats)} | Per update: ${(nextStats.mean / UPDATES_PER_RUN).toFixed(4)}ms`);

    const winner = [
      { name: 'Minimal', time: minimalStats.mean },
      { name: 'Concurrent', time: concurrentStats.mean },
      { name: 'Next', time: nextStats.mean }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    console.log(`\n🏆 Winner: ${winner.name}`);

    // Store results
    allResults['Update (per update)'] = {
      minimal: minimalStats.mean / UPDATES_PER_RUN,
      concurrent: concurrentStats.mean / UPDATES_PER_RUN,
      next: nextStats.mean / UPDATES_PER_RUN,
      winner: winner.name,
      unit: 'ms'
    };

    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should compare multi-component performance', async () => {
    console.log('\n🔬 Multi-Component Performance\n');

    const NUM_COMPONENTS = 50;
    const NUM_UPDATES = 10;
    const ITERATIONS = 40;
    const WARMUP = 10;

    console.log('Mount Phase:\n');

    console.log('Testing Minimal...');
    const minimalMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocMinimal(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Concurrent...');
    const concurrentMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Next...');
    const nextMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log(`Minimal:    ${formatStats(minimalMountStats)} | Per component: ${(minimalMountStats.mean / NUM_COMPONENTS).toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentMountStats)} | Per component: ${(concurrentMountStats.mean / NUM_COMPONENTS).toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextMountStats)} | Per component: ${(nextMountStats.mean / NUM_COMPONENTS).toFixed(4)}ms`);

    const mountWinner = [
      { name: 'Minimal', time: minimalMountStats.mean },
      { name: 'Concurrent', time: concurrentMountStats.mean },
      { name: 'Next', time: nextMountStats.mean }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    console.log(`🏆 Mount Winner: ${mountWinner.name}\n`);

    // Store mount results
    allResults['Multi-mount (per component)'] = {
      minimal: minimalMountStats.mean / NUM_COMPONENTS,
      concurrent: concurrentMountStats.mean / NUM_COMPONENTS,
      next: nextMountStats.mean / NUM_COMPONENTS,
      winner: mountWinner.name,
      unit: 'ms'
    };

    console.log('Update Phase:\n');

    console.log('Testing Minimal...');
    const minimalUpdateStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocMinimal(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Concurrent...');
    const concurrentUpdateStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Next...');
    const nextUpdateStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log(`Minimal:    ${formatStats(minimalUpdateStats)} | Per update: ${(minimalUpdateStats.mean / NUM_UPDATES).toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentUpdateStats)} | Per update: ${(concurrentUpdateStats.mean / NUM_UPDATES).toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextUpdateStats)} | Per update: ${(nextUpdateStats.mean / NUM_UPDATES).toFixed(4)}ms`);

    const updateWinner = [
      { name: 'Minimal', time: minimalUpdateStats.mean },
      { name: 'Concurrent', time: concurrentUpdateStats.mean },
      { name: 'Next', time: nextUpdateStats.mean }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    console.log(`🏆 Update Winner: ${updateWinner.name}`);

    // Store update results
    allResults['Multi-update (per update)'] = {
      minimal: minimalUpdateStats.mean / NUM_UPDATES,
      concurrent: concurrentUpdateStats.mean / NUM_UPDATES,
      next: nextUpdateStats.mean / NUM_UPDATES,
      winner: updateWinner.name,
      unit: 'ms'
    };

    expect(minimalMountStats.mean).toBeGreaterThan(0);
    expect(concurrentMountStats.mean).toBeGreaterThan(0);
    expect(nextMountStats.mean).toBeGreaterThan(0);
    expect(minimalUpdateStats.mean).toBeGreaterThan(0);
    expect(concurrentUpdateStats.mean).toBeGreaterThan(0);
    expect(nextUpdateStats.mean).toBeGreaterThan(0);
  });

  it('should show relative performance across scenarios', async () => {
    console.log('\n🔬 Relative Performance Summary\n');

    const scenarios = [
      { name: 'Few mounts', mounts: 5, updates: 0 },
      { name: 'Many mounts', mounts: 50, updates: 0 },
      { name: 'Few updates', mounts: 1, updates: 20 },
      { name: 'Many updates', mounts: 1, updates: 100 },
      { name: 'Mixed load', mounts: 10, updates: 50 },
    ];

    console.log('Scenario      | Minimal   | Concurrent | Next      | Fastest');
    console.log('--------------|-----------|------------|-----------|----------');

    for (const scenario of scenarios) {
      const minimalStats = await runBenchmark(() => {
        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocMinimal(SharedCounterBloc)));
        }
        if (scenario.updates > 0) {
          const bloc = SharedCounterBloc.getOrCreate();
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }
        hooks.forEach(h => h.unmount());
        SharedCounterBloc.release();
      }, 10);

      const concurrentStats = await runBenchmark(() => {
        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocConcurrent(SharedCounterBloc)));
        }
        if (scenario.updates > 0) {
          const bloc = SharedCounterBloc.getOrCreate();
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }
        hooks.forEach(h => h.unmount());
        SharedCounterBloc.release();
      }, 10);

      const nextStats = await runBenchmark(() => {
        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocNext(SharedCounterBloc)));
        }
        if (scenario.updates > 0) {
          const bloc = SharedCounterBloc.getOrCreate();
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }
        hooks.forEach(h => h.unmount());
        SharedCounterBloc.release();
      }, 10);

      const winner = [
        { name: 'Min', time: minimalStats.mean },
        { name: 'Con', time: concurrentStats.mean },
        { name: 'Nxt', time: nextStats.mean }
      ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

      console.log(
        `${scenario.name.padEnd(13)} | ${minimalStats.mean.toFixed(2).padStart(9)}ms | ${concurrentStats.mean.toFixed(2).padStart(10)}ms | ${nextStats.mean.toFixed(2).padStart(9)}ms | ${winner.name}`
      );
    }

    expect(true).toBe(true);
  });

  it('should measure memory overhead', { timeout: 30000 }, () => {
    console.log('\n🔬 Memory Overhead\n');

    const NUM_ITERATIONS = 10;
    const NUM_COMPONENTS = 100;

    // Helper to measure heap usage
    const measureHeap = () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
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

    const isMemoryAvailable = measureHeap() > 0;
    const hasGC = typeof global !== 'undefined' && (global as any).gc;

    if (!isMemoryAvailable) {
      console.log('⚠️  Memory measurement not available in this environment\n');
      expect(true).toBe(true);
      return;
    }

    if (!hasGC) {
      console.log('⚠️  GC not available - run with NODE_OPTIONS="--expose-gc" for accurate memory profiling\n');
      expect(true).toBe(true);
      return;
    }

    console.log(`Measuring memory with ${NUM_ITERATIONS} iterations × ${NUM_COMPONENTS} components...\n`);

    const minimalMemory: number[] = [];
    const concurrentMemory: number[] = [];
    const nextMemory: number[] = [];

    // Measure Minimal
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocMinimal(TestCounterBloc))
      );
      const after = measureHeap();
      minimalMemory.push(after - before);
      hooks.forEach(h => h.unmount());
    }

    // Measure Concurrent
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(TestCounterBloc))
      );
      const after = measureHeap();
      concurrentMemory.push(after - before);
      hooks.forEach(h => h.unmount());
    }

    // Measure Next
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(TestCounterBloc))
      );
      const after = measureHeap();
      nextMemory.push(after - before);
      hooks.forEach(h => h.unmount());
    }

    const minimalStats = calculateStats(minimalMemory);
    const concurrentStats = calculateStats(concurrentMemory);
    const nextStats = calculateStats(nextMemory);

    console.log(`Minimal:    ${formatStats(minimalStats, ' bytes')} | Per component: ${(minimalStats.mean / NUM_COMPONENTS).toFixed(0)} bytes`);
    console.log(`Concurrent: ${formatStats(concurrentStats, ' bytes')} | Per component: ${(concurrentStats.mean / NUM_COMPONENTS).toFixed(0)} bytes`);
    console.log(`Next:       ${formatStats(nextStats, ' bytes')} | Per component: ${(nextStats.mean / NUM_COMPONENTS).toFixed(0)} bytes`);

    const winner = [
      { name: 'Minimal', usage: minimalStats.mean },
      { name: 'Concurrent', usage: concurrentStats.mean },
      { name: 'Next', usage: nextStats.mean }
    ].reduce((prev, curr) => prev.usage < curr.usage ? prev : curr);

    console.log(`\n🏆 Winner: ${winner.name} (lowest memory)`);

    // Store results
    allResults['Memory (per component)'] = {
      minimal: minimalStats.mean / NUM_COMPONENTS,
      concurrent: concurrentStats.mean / NUM_COMPONENTS,
      next: nextStats.mean / NUM_COMPONENTS,
      winner: winner.name,
      unit: 'bytes'
    };

    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should display summary table', () => {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log('Test Case                 | Minimal      | Concurrent   | Next         | Winner');
    console.log('--------------------------|--------------|--------------|--------------|----------');

    Object.entries(allResults).forEach(([testName, result]) => {
      const minVal = result.unit === 'bytes'
        ? result.minimal.toFixed(0).padStart(8)
        : result.minimal.toFixed(4).padStart(8);
      const conVal = result.unit === 'bytes'
        ? result.concurrent.toFixed(0).padStart(8)
        : result.concurrent.toFixed(4).padStart(8);
      const nextVal = result.unit === 'bytes'
        ? result.next.toFixed(0).padStart(8)
        : result.next.toFixed(4).padStart(8);
      const unit = result.unit === 'bytes' ? ' bytes' : 'ms';

      console.log(
        `${testName.padEnd(25)} | ${minVal}${unit.padEnd(4)} | ${conVal}${unit.padEnd(4)} | ${nextVal}${unit.padEnd(4)} | ${result.winner}`
      );
    });

    console.log('\n' + '='.repeat(80));

    // Count wins
    const wins = { Minimal: 0, Concurrent: 0, Next: 0 };
    Object.values(allResults).forEach(result => {
      if (result.winner in wins) {
        wins[result.winner as keyof typeof wins]++;
      }
    });

    console.log('\n🏆 Overall Winner Count:');
    console.log(`   Minimal:    ${wins.Minimal} wins`);
    console.log(`   Concurrent: ${wins.Concurrent} wins`);
    console.log(`   Next:       ${wins.Next} wins`);

    const overallWinner = Object.entries(wins).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    console.log(`\n🎉 Overall Champion: ${overallWinner}\n`);
    console.log('='.repeat(80) + '\n');

    expect(Object.keys(allResults).length).toBeGreaterThan(0);
  });
});

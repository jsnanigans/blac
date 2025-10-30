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
import { Cubit, StateContainer } from '@blac/core';
import { useBlocConcurrent } from '../useBlocConcurrent';
import { useBlocNext } from '../useBlocNext';
import { useBlocMinimal } from '../useBlocMinimal';
import { useBlocFunctional } from '../useBlocFunctional';
import { useBlocBaseline } from '../useBlocBaseline';
import { useBlocBaseline2 } from '../useBlocBaseline2';

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
  baseline: number;
  baseline2: number;
  minimal: number;
  functional: number;
  concurrent: number;
  next: number;
  winner: string;
  points: {
    baseline: number;
    baseline2: number;
    minimal: number;
    functional: number;
    concurrent: number;
    next: number;
  };
  unit?: string;
}

const allResults: Record<string, TestResult> = {};

// Scoring helper: assigns points based on ranking (lower time/memory = more points)
function calculatePoints(results: Array<{ name: string; value: number }>): Record<string, number> {
  // Sort by value (ascending - lower is better)
  const sorted = [...results].sort((a, b) => a.value - b.value);

  // Assign points: 6 for 1st, 5 for 2nd, 4 for 3rd, 3 for 4th, 2 for 5th, 1 for 6th
  const points: Record<string, number> = {};
  sorted.forEach((result, index) => {
    points[result.name] = 6 - index;
  });

  return points;
}

// ============================================================================
// Tests
// ============================================================================

describe('Performance Comparison: Next vs Concurrent vs Minimal vs Functional vs Baseline', () => {
  beforeEach(() => {
    // Clear all instances to ensure fresh state for each test
    StateContainer.clearAllInstances();
    TestCounterBloc.release();
    SharedCounterBloc.release();
  });

  it('should compare mount/unmount performance', async () => {
    console.log('\n🔬 Mount/Unmount Performance\n');

    const MOUNTS_PER_RUN = 20;
    const ITERATIONS = 50;
    const WARMUP = 15;

    console.log('Testing Baseline...');
    const baselineStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocBaseline(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log('Testing Baseline2...');
    const baseline2Stats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocBaseline2(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log('Testing Minimal...');
    const minimalStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocMinimal(TestCounterBloc));
        unmount();
      }
    }, ITERATIONS, WARMUP);

    console.log('Testing Functional...');
    const functionalStats = await runBenchmark(() => {
      for (let i = 0; i < MOUNTS_PER_RUN; i++) {
        const { unmount } = renderHook(() => useBlocFunctional(TestCounterBloc));
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

    const perMount = {
      baseline: baselineStats.mean / MOUNTS_PER_RUN,
      baseline2: baseline2Stats.mean / MOUNTS_PER_RUN,
      minimal: minimalStats.mean / MOUNTS_PER_RUN,
      functional: functionalStats.mean / MOUNTS_PER_RUN,
      concurrent: concurrentStats.mean / MOUNTS_PER_RUN,
      next: nextStats.mean / MOUNTS_PER_RUN
    };

    console.log(`Baseline:   ${formatStats(baselineStats)} | Per mount: ${perMount.baseline.toFixed(4)}ms`);
    console.log(`Baseline2:  ${formatStats(baseline2Stats)} | Per mount: ${perMount.baseline2.toFixed(4)}ms`);
    console.log(`Minimal:    ${formatStats(minimalStats)} | Per mount: ${perMount.minimal.toFixed(4)}ms`);
    console.log(`Functional: ${formatStats(functionalStats)} | Per mount: ${perMount.functional.toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentStats)} | Per mount: ${perMount.concurrent.toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextStats)} | Per mount: ${perMount.next.toFixed(4)}ms`);

    const winner = [
      { name: 'Baseline', time: perMount.baseline },
      { name: 'Baseline2', time: perMount.baseline2 },
      { name: 'Minimal', time: perMount.minimal },
      { name: 'Functional', time: perMount.functional },
      { name: 'Concurrent', time: perMount.concurrent },
      { name: 'Next', time: perMount.next }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    const points = calculatePoints([
      { name: 'baseline', value: perMount.baseline },
      { name: 'baseline2', value: perMount.baseline2 },
      { name: 'minimal', value: perMount.minimal },
      { name: 'functional', value: perMount.functional },
      { name: 'concurrent', value: perMount.concurrent },
      { name: 'next', value: perMount.next }
    ]);

    console.log(`\n🏆 Winner: ${winner.name}`);
    console.log(`Points - Baseline: ${points.baseline}, Baseline2: ${points.baseline2}, Minimal: ${points.minimal}, Functional: ${points.functional}, Concurrent: ${points.concurrent}, Next: ${points.next}`);

    // Store results
    allResults['Mount (per mount)'] = {
      baseline: perMount.baseline,
      baseline2: perMount.baseline2,
      minimal: perMount.minimal,
      functional: perMount.functional,
      concurrent: perMount.concurrent,
      next: perMount.next,
      winner: winner.name,
      points: {
        baseline: points.baseline,
        baseline2: points.baseline2,
        minimal: points.minimal,
        functional: points.functional,
        concurrent: points.concurrent,
        next: points.next
      },
      unit: 'ms'
    };

    expect(baselineStats.mean).toBeGreaterThan(0);
    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(functionalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should compare update performance', async () => {
    console.log('\n🔬 Update Performance\n');

    const UPDATES_PER_RUN = 100;
    const ITERATIONS = 50;
    const WARMUP = 15;

    console.log('Testing Baseline...');
    const baselineStats = await runBenchmark(() => {
      // Ensure fresh instances for each iteration
      StateContainer.clearAllInstances();

      const hook = renderHook(() => useBlocBaseline(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);

    // Clean up after all iterations complete
    SharedCounterBloc.release();

    console.log('Testing Baseline2...');
    const baseline2Stats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hook = renderHook(() => useBlocBaseline2(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Minimal...');
    const minimalStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hook = renderHook(() => useBlocMinimal(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Functional...');
    const functionalStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hook = renderHook(() => useBlocFunctional(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Concurrent...');
    const concurrentStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hook = renderHook(() => useBlocConcurrent(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Next...');
    const nextStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hook = renderHook(() => useBlocNext(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_RUN; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    const perUpdate = {
      baseline: baselineStats.mean / UPDATES_PER_RUN,
      baseline2: baseline2Stats.mean / UPDATES_PER_RUN,
      minimal: minimalStats.mean / UPDATES_PER_RUN,
      functional: functionalStats.mean / UPDATES_PER_RUN,
      concurrent: concurrentStats.mean / UPDATES_PER_RUN,
      next: nextStats.mean / UPDATES_PER_RUN
    };

    console.log(`Baseline:   ${formatStats(baselineStats)} | Per update: ${perUpdate.baseline.toFixed(4)}ms`);
    console.log(`Baseline2:  ${formatStats(baseline2Stats)} | Per update: ${perUpdate.baseline2.toFixed(4)}ms`);
    console.log(`Minimal:    ${formatStats(minimalStats)} | Per update: ${perUpdate.minimal.toFixed(4)}ms`);
    console.log(`Functional: ${formatStats(functionalStats)} | Per update: ${perUpdate.functional.toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentStats)} | Per update: ${perUpdate.concurrent.toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextStats)} | Per update: ${perUpdate.next.toFixed(4)}ms`);

    const winner = [
      { name: 'Baseline', time: perUpdate.baseline },
      { name: 'Baseline2', time: perUpdate.baseline2 },
      { name: 'Minimal', time: perUpdate.minimal },
      { name: 'Functional', time: perUpdate.functional },
      { name: 'Concurrent', time: perUpdate.concurrent },
      { name: 'Next', time: perUpdate.next }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    const points = calculatePoints([
      { name: 'baseline', value: perUpdate.baseline },
      { name: 'baseline2', value: perUpdate.baseline2 },
      { name: 'minimal', value: perUpdate.minimal },
      { name: 'functional', value: perUpdate.functional },
      { name: 'concurrent', value: perUpdate.concurrent },
      { name: 'next', value: perUpdate.next }
    ]);

    console.log(`\n🏆 Winner: ${winner.name}`);
    console.log(`Points - Baseline: ${points.baseline}, Baseline2: ${points.baseline2}, Minimal: ${points.minimal}, Functional: ${points.functional}, Concurrent: ${points.concurrent}, Next: ${points.next}`);

    // Store results
    allResults['Update (per update)'] = {
      baseline: perUpdate.baseline,
      baseline2: perUpdate.baseline2,
      minimal: perUpdate.minimal,
      functional: perUpdate.functional,
      concurrent: perUpdate.concurrent,
      next: perUpdate.next,
      winner: winner.name,
      points: {
        baseline: points.baseline,
        baseline2: points.baseline2,
        minimal: points.minimal,
        functional: points.functional,
        concurrent: points.concurrent,
        next: points.next
      },
      unit: 'ms'
    };

    expect(baselineStats.mean).toBeGreaterThan(0);
    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(functionalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should compare multi-component performance', { timeout: 15000 }, async () => {
    console.log('\n🔬 Multi-Component Performance\n');

    const NUM_COMPONENTS = 50;
    const NUM_UPDATES = 10;
    const ITERATIONS = 40;
    const WARMUP = 10;

    console.log('Mount Phase:\n');

    console.log('Testing Baseline...');
    const baselineMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Baseline2...');
    const baseline2MountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline2(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Minimal...');
    const minimalMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocMinimal(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, ITERATIONS, WARMUP);

    console.log('Testing Functional...');
    const functionalMountStats = await runBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocFunctional(SharedCounterBloc))
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

    const perComponentMount = {
      baseline: baselineMountStats.mean / NUM_COMPONENTS,
      baseline2: baseline2MountStats.mean / NUM_COMPONENTS,
      minimal: minimalMountStats.mean / NUM_COMPONENTS,
      functional: functionalMountStats.mean / NUM_COMPONENTS,
      concurrent: concurrentMountStats.mean / NUM_COMPONENTS,
      next: nextMountStats.mean / NUM_COMPONENTS
    };

    console.log(`Baseline:   ${formatStats(baselineMountStats)} | Per component: ${perComponentMount.baseline.toFixed(4)}ms`);
    console.log(`Baseline2:  ${formatStats(baseline2MountStats)} | Per component: ${perComponentMount.baseline2.toFixed(4)}ms`);
    console.log(`Minimal:    ${formatStats(minimalMountStats)} | Per component: ${perComponentMount.minimal.toFixed(4)}ms`);
    console.log(`Functional: ${formatStats(functionalMountStats)} | Per component: ${perComponentMount.functional.toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentMountStats)} | Per component: ${perComponentMount.concurrent.toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextMountStats)} | Per component: ${perComponentMount.next.toFixed(4)}ms`);

    const mountWinner = [
      { name: 'Baseline', time: perComponentMount.baseline },
      { name: 'Baseline2', time: perComponentMount.baseline2 },
      { name: 'Minimal', time: perComponentMount.minimal },
      { name: 'Functional', time: perComponentMount.functional },
      { name: 'Concurrent', time: perComponentMount.concurrent },
      { name: 'Next', time: perComponentMount.next }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    const mountPoints = calculatePoints([
      { name: 'baseline', value: perComponentMount.baseline },
      { name: 'baseline2', value: perComponentMount.baseline2 },
      { name: 'minimal', value: perComponentMount.minimal },
      { name: 'functional', value: perComponentMount.functional },
      { name: 'concurrent', value: perComponentMount.concurrent },
      { name: 'next', value: perComponentMount.next }
    ]);

    console.log(`🏆 Mount Winner: ${mountWinner.name}`);
    console.log(`Points - Baseline: ${mountPoints.baseline}, Baseline2: ${mountPoints.baseline2}, Minimal: ${mountPoints.minimal}, Functional: ${mountPoints.functional}, Concurrent: ${mountPoints.concurrent}, Next: ${mountPoints.next}\n`);

    // Store mount results
    allResults['Multi-mount (per component)'] = {
      baseline: perComponentMount.baseline,
      baseline2: perComponentMount.baseline2,
      minimal: perComponentMount.minimal,
      functional: perComponentMount.functional,
      concurrent: perComponentMount.concurrent,
      next: perComponentMount.next,
      winner: mountWinner.name,
      points: {
        baseline: mountPoints.baseline,
        baseline2: mountPoints.baseline2,
        minimal: mountPoints.minimal,
        functional: mountPoints.functional,
        concurrent: mountPoints.concurrent,
        next: mountPoints.next
      },
      unit: 'ms'
    };

    console.log('Update Phase:\n');

    console.log('Testing Baseline...');
    const baselineUpdateStats = await runBenchmark(() => {
      // Ensure fresh instances for each iteration
      StateContainer.clearAllInstances();

      // Get bloc reference FIRST, before creating hooks
      const bloc = SharedCounterBloc.getOrCreate();

      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline(SharedCounterBloc))
      );

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      // Just unmount, don't release to avoid disposal issues across iterations
      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);

    // Clean up after all iterations complete
    SharedCounterBloc.release();

    console.log('Testing Baseline2...');
    const baseline2UpdateStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline2(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Minimal...');
    const minimalUpdateStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocMinimal(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Functional...');
    const functionalUpdateStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocFunctional(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Concurrent...');
    const concurrentUpdateStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    console.log('Testing Next...');
    const nextUpdateStats = await runBenchmark(() => {
      StateContainer.clearAllInstances();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
    }, ITERATIONS, WARMUP);
    SharedCounterBloc.release();

    const perUpdateMulti = {
      baseline: baselineUpdateStats.mean / NUM_UPDATES,
      baseline2: baseline2UpdateStats.mean / NUM_UPDATES,
      minimal: minimalUpdateStats.mean / NUM_UPDATES,
      functional: functionalUpdateStats.mean / NUM_UPDATES,
      concurrent: concurrentUpdateStats.mean / NUM_UPDATES,
      next: nextUpdateStats.mean / NUM_UPDATES
    };

    console.log(`Baseline:   ${formatStats(baselineUpdateStats)} | Per update: ${perUpdateMulti.baseline.toFixed(4)}ms`);
    console.log(`Baseline2:  ${formatStats(baseline2UpdateStats)} | Per update: ${perUpdateMulti.baseline2.toFixed(4)}ms`);
    console.log(`Minimal:    ${formatStats(minimalUpdateStats)} | Per update: ${perUpdateMulti.minimal.toFixed(4)}ms`);
    console.log(`Functional: ${formatStats(functionalUpdateStats)} | Per update: ${perUpdateMulti.functional.toFixed(4)}ms`);
    console.log(`Concurrent: ${formatStats(concurrentUpdateStats)} | Per update: ${perUpdateMulti.concurrent.toFixed(4)}ms`);
    console.log(`Next:       ${formatStats(nextUpdateStats)} | Per update: ${perUpdateMulti.next.toFixed(4)}ms`);

    const updateWinner = [
      { name: 'Baseline', time: perUpdateMulti.baseline },
      { name: 'Baseline2', time: perUpdateMulti.baseline2 },
      { name: 'Minimal', time: perUpdateMulti.minimal },
      { name: 'Functional', time: perUpdateMulti.functional },
      { name: 'Concurrent', time: perUpdateMulti.concurrent },
      { name: 'Next', time: perUpdateMulti.next }
    ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

    const updatePoints = calculatePoints([
      { name: 'baseline', value: perUpdateMulti.baseline },
      { name: 'baseline2', value: perUpdateMulti.baseline2 },
      { name: 'minimal', value: perUpdateMulti.minimal },
      { name: 'functional', value: perUpdateMulti.functional },
      { name: 'concurrent', value: perUpdateMulti.concurrent },
      { name: 'next', value: perUpdateMulti.next }
    ]);

    console.log(`🏆 Update Winner: ${updateWinner.name}`);
    console.log(`Points - Baseline: ${updatePoints.baseline}, Baseline2: ${updatePoints.baseline2}, Minimal: ${updatePoints.minimal}, Functional: ${updatePoints.functional}, Concurrent: ${updatePoints.concurrent}, Next: ${updatePoints.next}`);

    // Store update results
    allResults['Multi-update (per update)'] = {
      baseline: perUpdateMulti.baseline,
      baseline2: perUpdateMulti.baseline2,
      minimal: perUpdateMulti.minimal,
      functional: perUpdateMulti.functional,
      concurrent: perUpdateMulti.concurrent,
      next: perUpdateMulti.next,
      winner: updateWinner.name,
      points: {
        baseline: updatePoints.baseline,
        baseline2: updatePoints.baseline2,
        minimal: updatePoints.minimal,
        functional: updatePoints.functional,
        concurrent: updatePoints.concurrent,
        next: updatePoints.next
      },
      unit: 'ms'
    };

    expect(baselineMountStats.mean).toBeGreaterThan(0);
    expect(minimalMountStats.mean).toBeGreaterThan(0);
    expect(functionalMountStats.mean).toBeGreaterThan(0);
    expect(concurrentMountStats.mean).toBeGreaterThan(0);
    expect(nextMountStats.mean).toBeGreaterThan(0);
    expect(baselineUpdateStats.mean).toBeGreaterThan(0);
    expect(minimalUpdateStats.mean).toBeGreaterThan(0);
    expect(functionalUpdateStats.mean).toBeGreaterThan(0);
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

    console.log('Scenario      | Baseline  | Baseline2 | Minimal   | Functional | Concurrent | Next      | Fastest');
    console.log('--------------|-----------|-----------|-----------|------------|------------|-----------|----------');

    for (const scenario of scenarios) {
      const baselineStats = await runBenchmark(() => {
        // Ensure fresh instances for each iteration
        StateContainer.clearAllInstances();

        // Get bloc reference FIRST, before creating hooks (if we need it)
        const bloc = scenario.updates > 0 ? SharedCounterBloc.getOrCreate() : null;

        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocBaseline(SharedCounterBloc)));
        }
        if (scenario.updates > 0 && bloc) {
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }

        // Just unmount, don't release to avoid disposal issues across iterations
        hooks.forEach(h => h.unmount());
      }, 10);

      // Clean up after all iterations complete for this scenario
      SharedCounterBloc.release();

      const baseline2Stats = await runBenchmark(() => {
        StateContainer.clearAllInstances();
        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocBaseline2(SharedCounterBloc)));
        }
        if (scenario.updates > 0) {
          const bloc = SharedCounterBloc.getOrCreate();
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }
        hooks.forEach(h => h.unmount());
      }, 10);
      SharedCounterBloc.release();

      const minimalStats = await runBenchmark(() => {
        StateContainer.clearAllInstances();
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
      }, 10);
      SharedCounterBloc.release();

      const functionalStats = await runBenchmark(() => {
        StateContainer.clearAllInstances();
        const hooks: any[] = [];
        for (let i = 0; i < scenario.mounts; i++) {
          hooks.push(renderHook(() => useBlocFunctional(SharedCounterBloc)));
        }
        if (scenario.updates > 0) {
          const bloc = SharedCounterBloc.getOrCreate();
          for (let j = 0; j < scenario.updates; j++) {
            act(() => bloc.increment());
          }
        }
        hooks.forEach(h => h.unmount());
      }, 10);
      SharedCounterBloc.release();

      const concurrentStats = await runBenchmark(() => {
        StateContainer.clearAllInstances();
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
      }, 10);
      SharedCounterBloc.release();

      const nextStats = await runBenchmark(() => {
        StateContainer.clearAllInstances();
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
      }, 10);
      SharedCounterBloc.release();

      const winner = [
        { name: 'Bas', time: baselineStats.mean },
        { name: 'Bs2', time: baseline2Stats.mean },
        { name: 'Min', time: minimalStats.mean },
        { name: 'Fun', time: functionalStats.mean },
        { name: 'Con', time: concurrentStats.mean },
        { name: 'Nxt', time: nextStats.mean }
      ].reduce((prev, curr) => prev.time < curr.time ? prev : curr);

      console.log(
        `${scenario.name.padEnd(13)} | ${baselineStats.mean.toFixed(2).padStart(9)}ms | ${baseline2Stats.mean.toFixed(2).padStart(9)}ms | ${minimalStats.mean.toFixed(2).padStart(9)}ms | ${functionalStats.mean.toFixed(2).padStart(10)}ms | ${concurrentStats.mean.toFixed(2).padStart(10)}ms | ${nextStats.mean.toFixed(2).padStart(9)}ms | ${winner.name}`
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

    const baselineMemory: number[] = [];
    const baseline2Memory: number[] = [];
    const minimalMemory: number[] = [];
    const functionalMemory: number[] = [];
    const concurrentMemory: number[] = [];
    const nextMemory: number[] = [];

    // Measure Baseline
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline(TestCounterBloc))
      );
      const after = measureHeap();
      baselineMemory.push(after - before);
      hooks.forEach(h => h.unmount());
    }

    // Measure Baseline2
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocBaseline2(TestCounterBloc))
      );
      const after = measureHeap();
      baseline2Memory.push(after - before);
      hooks.forEach(h => h.unmount());
    }

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

    // Measure Functional
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const before = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocFunctional(TestCounterBloc))
      );
      const after = measureHeap();
      functionalMemory.push(after - before);
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

    const baselineStats = calculateStats(baselineMemory);
    const baseline2Stats = calculateStats(baseline2Memory);
    const minimalStats = calculateStats(minimalMemory);
    const functionalStats = calculateStats(functionalMemory);
    const concurrentStats = calculateStats(concurrentMemory);
    const nextStats = calculateStats(nextMemory);

    const perComponentMemory = {
      baseline: baselineStats.mean / NUM_COMPONENTS,
      baseline2: baseline2Stats.mean / NUM_COMPONENTS,
      minimal: minimalStats.mean / NUM_COMPONENTS,
      functional: functionalStats.mean / NUM_COMPONENTS,
      concurrent: concurrentStats.mean / NUM_COMPONENTS,
      next: nextStats.mean / NUM_COMPONENTS
    };

    console.log(`Baseline:   ${formatStats(baselineStats, ' bytes')} | Per component: ${perComponentMemory.baseline.toFixed(0)} bytes`);
    console.log(`Baseline2:  ${formatStats(baseline2Stats, ' bytes')} | Per component: ${perComponentMemory.baseline2.toFixed(0)} bytes`);
    console.log(`Minimal:    ${formatStats(minimalStats, ' bytes')} | Per component: ${perComponentMemory.minimal.toFixed(0)} bytes`);
    console.log(`Functional: ${formatStats(functionalStats, ' bytes')} | Per component: ${perComponentMemory.functional.toFixed(0)} bytes`);
    console.log(`Concurrent: ${formatStats(concurrentStats, ' bytes')} | Per component: ${perComponentMemory.concurrent.toFixed(0)} bytes`);
    console.log(`Next:       ${formatStats(nextStats, ' bytes')} | Per component: ${perComponentMemory.next.toFixed(0)} bytes`);

    const winner = [
      { name: 'Baseline', usage: perComponentMemory.baseline },
      { name: 'Baseline2', usage: perComponentMemory.baseline2 },
      { name: 'Minimal', usage: perComponentMemory.minimal },
      { name: 'Functional', usage: perComponentMemory.functional },
      { name: 'Concurrent', usage: perComponentMemory.concurrent },
      { name: 'Next', usage: perComponentMemory.next }
    ].reduce((prev, curr) => prev.usage < curr.usage ? prev : curr);

    const memoryPoints = calculatePoints([
      { name: 'baseline', value: perComponentMemory.baseline },
      { name: 'baseline2', value: perComponentMemory.baseline2 },
      { name: 'minimal', value: perComponentMemory.minimal },
      { name: 'functional', value: perComponentMemory.functional },
      { name: 'concurrent', value: perComponentMemory.concurrent },
      { name: 'next', value: perComponentMemory.next }
    ]);

    console.log(`\n🏆 Winner: ${winner.name} (lowest memory)`);
    console.log(`Points - Baseline: ${memoryPoints.baseline}, Baseline2: ${memoryPoints.baseline2}, Minimal: ${memoryPoints.minimal}, Functional: ${memoryPoints.functional}, Concurrent: ${memoryPoints.concurrent}, Next: ${memoryPoints.next}`);

    // Store results
    allResults['Memory (per component)'] = {
      baseline: perComponentMemory.baseline,
      baseline2: perComponentMemory.baseline2,
      minimal: perComponentMemory.minimal,
      functional: perComponentMemory.functional,
      concurrent: perComponentMemory.concurrent,
      next: perComponentMemory.next,
      winner: winner.name,
      points: {
        baseline: memoryPoints.baseline,
        baseline2: memoryPoints.baseline2,
        minimal: memoryPoints.minimal,
        functional: memoryPoints.functional,
        concurrent: memoryPoints.concurrent,
        next: memoryPoints.next
      },
      unit: 'bytes'
    };

    expect(baselineStats.mean).toBeGreaterThan(0);
    expect(minimalStats.mean).toBeGreaterThan(0);
    expect(functionalStats.mean).toBeGreaterThan(0);
    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });

  it('should display summary table', () => {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log('Test Case                   | Baseline     | Baseline2    | Minimal      | Functional   | Concurrent   | Next         | Winner');
    console.log('----------------------------|--------------|--------------|--------------|--------------|--------------|--------------|------------');

    Object.entries(allResults).forEach(([testName, result]) => {
      const baseVal = result.unit === 'bytes'
        ? result.baseline.toFixed(0).padStart(8)
        : result.baseline.toFixed(4).padStart(8);
      const base2Val = result.unit === 'bytes'
        ? result.baseline2.toFixed(0).padStart(8)
        : result.baseline2.toFixed(4).padStart(8);
      const minVal = result.unit === 'bytes'
        ? result.minimal.toFixed(0).padStart(8)
        : result.minimal.toFixed(4).padStart(8);
      const funVal = result.unit === 'bytes'
        ? result.functional.toFixed(0).padStart(8)
        : result.functional.toFixed(4).padStart(8);
      const conVal = result.unit === 'bytes'
        ? result.concurrent.toFixed(0).padStart(8)
        : result.concurrent.toFixed(4).padStart(8);
      const nextVal = result.unit === 'bytes'
        ? result.next.toFixed(0).padStart(8)
        : result.next.toFixed(4).padStart(8);
      const unit = result.unit === 'bytes' ? ' bytes' : 'ms';

      console.log(
        `${testName.padEnd(27)} | ${baseVal}${unit.padEnd(4)} | ${base2Val}${unit.padEnd(4)} | ${minVal}${unit.padEnd(4)} | ${funVal}${unit.padEnd(4)} | ${conVal}${unit.padEnd(4)} | ${nextVal}${unit.padEnd(4)} | ${result.winner.padEnd(10)}`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 POINTS PER TEST');
    console.log('='.repeat(80) + '\n');

    console.log('Test Case                   | Baseline | Baseline2 | Minimal | Functional | Concurrent | Next');
    console.log('----------------------------|----------|-----------|---------|------------|------------|------');

    Object.entries(allResults).forEach(([testName, result]) => {
      console.log(
        `${testName.padEnd(27)} | ${result.points.baseline.toString().padStart(8)} | ${result.points.baseline2.toString().padStart(9)} | ${result.points.minimal.toString().padStart(7)} | ${result.points.functional.toString().padStart(10)} | ${result.points.concurrent.toString().padStart(10)} | ${result.points.next.toString().padStart(4)}`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('🏆 TOTAL POINTS & NORMALIZED SCORES');
    console.log('='.repeat(80) + '\n');

    // Calculate total points
    const totalPoints = {
      baseline: 0,
      baseline2: 0,
      minimal: 0,
      functional: 0,
      concurrent: 0,
      next: 0
    };

    Object.values(allResults).forEach(result => {
      totalPoints.baseline += result.points.baseline;
      totalPoints.baseline2 += result.points.baseline2;
      totalPoints.minimal += result.points.minimal;
      totalPoints.functional += result.points.functional;
      totalPoints.concurrent += result.points.concurrent;
      totalPoints.next += result.points.next;
    });

    const maxPoints = Math.max(totalPoints.baseline, totalPoints.baseline2, totalPoints.minimal, totalPoints.functional, totalPoints.concurrent, totalPoints.next);

    // Calculate normalized scores (0-100)
    const normalizedScores = {
      baseline: (totalPoints.baseline / maxPoints) * 100,
      baseline2: (totalPoints.baseline2 / maxPoints) * 100,
      minimal: (totalPoints.minimal / maxPoints) * 100,
      functional: (totalPoints.functional / maxPoints) * 100,
      concurrent: (totalPoints.concurrent / maxPoints) * 100,
      next: (totalPoints.next / maxPoints) * 100
    };

    console.log('Implementation | Total Points | Normalized Score | Performance Grade');
    console.log('---------------|--------------|------------------|-------------------');

    const getGrade = (score: number): string => {
      if (score >= 95) return 'A+';
      if (score >= 90) return 'A';
      if (score >= 85) return 'A-';
      if (score >= 80) return 'B+';
      if (score >= 75) return 'B';
      if (score >= 70) return 'B-';
      if (score >= 65) return 'C+';
      if (score >= 60) return 'C';
      return 'C-';
    };

    const implementations = [
      { name: 'Baseline', points: totalPoints.baseline, score: normalizedScores.baseline },
      { name: 'Baseline2', points: totalPoints.baseline2, score: normalizedScores.baseline2 },
      { name: 'Minimal', points: totalPoints.minimal, score: normalizedScores.minimal },
      { name: 'Functional', points: totalPoints.functional, score: normalizedScores.functional },
      { name: 'Concurrent', points: totalPoints.concurrent, score: normalizedScores.concurrent },
      { name: 'Next', points: totalPoints.next, score: normalizedScores.next }
    ].sort((a, b) => b.points - a.points);

    implementations.forEach(impl => {
      console.log(
        `${impl.name.padEnd(14)} | ${impl.points.toString().padStart(12)} | ${impl.score.toFixed(1).padStart(16)}% | ${getGrade(impl.score).padStart(17)}`
      );
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 FINAL RANKINGS\n');

    implementations.forEach((impl, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      const pointDiff = index > 0 ? ` (-${implementations[0].points - impl.points} pts)` : '';
      console.log(`${medal} ${(index + 1).toString()}. ${impl.name.padEnd(12)} | ${impl.points} points (${impl.score.toFixed(1)}%)${pointDiff}`);
    });

    console.log('\n' + '='.repeat(80));

    // Count wins for reference
    const wins = { Baseline: 0, Minimal: 0, Functional: 0, Concurrent: 0, Next: 0 };
    Object.values(allResults).forEach(result => {
      if (result.winner in wins) {
        wins[result.winner as keyof typeof wins]++;
      }
    });

    console.log('\n📊 Win Count (for reference):');
    console.log(`   Baseline:   ${wins.Baseline} wins`);
    console.log(`   Minimal:    ${wins.Minimal} wins`);
    console.log(`   Functional: ${wins.Functional} wins`);
    console.log(`   Concurrent: ${wins.Concurrent} wins`);
    console.log(`   Next:       ${wins.Next} wins`);

    console.log('\n🎯 Champion: ' + implementations[0].name.toUpperCase() + ' (Most Points)\n');
    console.log('='.repeat(80) + '\n');

    expect(Object.keys(allResults).length).toBeGreaterThan(0);
  });
});

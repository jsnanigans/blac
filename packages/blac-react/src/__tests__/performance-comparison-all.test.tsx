/**
 * Performance Comparison: useBlocNext vs useBlocConcurrent
 *
 * This test compares the ultimate useBlocNext implementation against useBlocConcurrent
 * to validate the performance improvements from using useSyncExternalStore with
 * direct subscriptions and minimal overhead.
 *
 * Uses multiple test runs with statistical analysis (mean, median, stdDev, 95% CI)
 * to ensure reliable and reproducible results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBlocConcurrent } from '../useBlocConcurrent';
import { useBlocNext } from '../useBlocNext';

// ============================================================================
// Statistical Utilities - Enhanced for Stability
// ============================================================================

interface Statistics {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  confidenceInterval: [number, number]; // 95% CI
  trimmedMean: number; // Mean after removing outliers
  iqr: number; // Interquartile range
  cv: number; // Coefficient of variation (stdDev/mean)
  outliers: number[]; // Indices of outlier values
  isStable: boolean; // Whether results are stable enough
}

function calculateStats(values: number[]): Statistics {
  if (values.length === 0) {
    throw new Error('Cannot calculate statistics on empty array');
  }

  // Sort for median and quartile calculations
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;

  // Quartiles for IQR and outlier detection
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  // Outlier detection using IQR method
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outlierIndices: number[] = [];
  const nonOutliers: number[] = [];

  values.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) {
      outlierIndices.push(idx);
    } else {
      nonOutliers.push(val);
    }
  });

  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / n;

  // Trimmed mean (using non-outliers or 10% trim if no outliers)
  let trimmedMean: number;
  if (nonOutliers.length > 0 && nonOutliers.length < n) {
    trimmedMean = nonOutliers.reduce((sum, val) => sum + val, 0) / nonOutliers.length;
  } else {
    // 10% trimmed mean as fallback
    const trimCount = Math.floor(n * 0.1);
    const trimmedValues = sorted.slice(trimCount, n - trimCount);
    trimmedMean = trimmedValues.reduce((sum, val) => sum + val, 0) / trimmedValues.length;
  }

  // Median
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (relative standard deviation)
  const cv = mean > 0 ? stdDev / mean : 0;

  // 95% Confidence interval (using t-distribution approximation)
  const tValue = n > 30 ? 1.96 : getTValue(n);
  const marginOfError = tValue * (stdDev / Math.sqrt(n));
  const confidenceInterval: [number, number] = [
    mean - marginOfError,
    mean + marginOfError
  ];

  // Stability check: CV < 0.3 (30% variation) and outliers < 10%
  const isStable = cv < 0.3 && (outlierIndices.length / n) < 0.1;

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    confidenceInterval,
    trimmedMean,
    iqr,
    cv,
    outliers: outlierIndices,
    isStable
  };
}

// Simplified t-distribution values for 95% CI
function getTValue(n: number): number {
  const tValues: Record<number, number> = {
    3: 4.303, 5: 2.776, 10: 2.262, 15: 2.145, 20: 2.093, 30: 2.042
  };

  for (const [sample, tVal] of Object.entries(tValues)) {
    if (n <= parseInt(sample)) return tVal;
  }
  return 1.96; // For n > 30
}

function formatStats(stats: Statistics, unit: string = 'ms'): string {
  const lines = [
    `Mean: ${stats.mean.toFixed(3)}${unit} (±${stats.stdDev.toFixed(3)}${unit})`,
    `Trimmed Mean: ${stats.trimmedMean.toFixed(3)}${unit} (outliers removed)`,
    `Median: ${stats.median.toFixed(3)}${unit}`,
    `Range: [${stats.min.toFixed(3)} - ${stats.max.toFixed(3)}]${unit}`,
    `IQR: ${stats.iqr.toFixed(3)}${unit}`,
    `CV: ${(stats.cv * 100).toFixed(1)}% (variation)`,
    `95% CI: [${stats.confidenceInterval[0].toFixed(3)} - ${stats.confidenceInterval[1].toFixed(3)}]${unit}`,
  ];

  if (stats.outliers.length > 0) {
    lines.push(`Outliers: ${stats.outliers.length} detected`);
  }

  if (!stats.isStable) {
    lines.push(`⚠️  WARNING: High variance detected - results may be unreliable`);
  }

  return lines.join('\n    ');
}

interface BenchmarkResult {
  stats: Statistics;
  runs: number[];
}

/**
 * Generate ASCII histogram for visualizing distribution
 */
function generateHistogram(values: number[], bins: number = 10): string {
  if (values.length === 0) return 'No data';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const binWidth = range / bins;

  // Create bins
  const histogram: number[] = new Array(bins).fill(0);
  values.forEach(val => {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
    histogram[binIndex]++;
  });

  // Find max count for scaling
  const maxCount = Math.max(...histogram);
  const barWidth = 40;

  const lines: string[] = [];
  lines.push('    Distribution:');

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = histogram[i];
    const barLength = Math.round((count / maxCount) * barWidth);
    const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
    const label = `    ${binStart.toFixed(2)}-${binEnd.toFixed(2)}ms`;
    const countStr = `[${count}]`;
    lines.push(`    ${label.padEnd(20)} ${bar} ${countStr}`);
  }

  return lines.join('\n');
}

/**
 * Sleep for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detect system noise by running empty benchmarks
 */
async function detectSystemNoise(): Promise<{ noiseLevel: number; isHighNoise: boolean }> {
  const noiseRuns: number[] = [];

  // Run 20 empty measurements
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    // Empty operation
    const duration = performance.now() - start;
    noiseRuns.push(duration);
  }

  const noiseStats = calculateStats(noiseRuns);
  const noiseLevel = noiseStats.mean;
  const isHighNoise = noiseLevel > 0.01 || noiseStats.cv > 0.5; // >0.01ms or >50% CV

  return { noiseLevel, isHighNoise };
}

/**
 * Run benchmark with multiple batches and delays between batches
 * This reduces variance from system conditions and provides more reliable results
 */
async function runBenchmark(fn: () => void, warmupRuns: number = 5): Promise<BenchmarkResult> {
  // Warmup runs to reduce JIT compilation variance
  for (let i = 0; i < warmupRuns; i++) {
    fn();
  }

  const runs: number[] = [];

  // Batch 1: 20 runs
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  // Wait 1 second
  await sleep(1000);

  // Batch 2: 20 runs
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  // Wait 1 second
  await sleep(1000);

  // Batch 3: 100 runs
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  return {
    stats: calculateStats(runs),
    runs
  };
}

/**
 * Run interleaved benchmark - alternates between two implementations
 * This eliminates bias from system state changes over time
 */
async function runInterleavedBenchmark(
  fnA: () => void,
  fnB: () => void,
  iterations: number = 100,
  warmupRuns: number = 5
): Promise<{ resultA: BenchmarkResult; resultB: BenchmarkResult }> {
  // Warmup both implementations
  for (let i = 0; i < warmupRuns; i++) {
    fnA();
    fnB();
  }

  const runsA: number[] = [];
  const runsB: number[] = [];

  // Interleaved execution
  for (let i = 0; i < iterations; i++) {
    // Alternate which goes first to eliminate ordering bias
    if (i % 2 === 0) {
      const startA = performance.now();
      fnA();
      runsA.push(performance.now() - startA);

      const startB = performance.now();
      fnB();
      runsB.push(performance.now() - startB);
    } else {
      const startB = performance.now();
      fnB();
      runsB.push(performance.now() - startB);

      const startA = performance.now();
      fnA();
      runsA.push(performance.now() - startA);
    }

    // Small pause every 20 iterations
    if (i % 20 === 19) {
      await sleep(100);
    }
  }

  return {
    resultA: { stats: calculateStats(runsA), runs: runsA },
    resultB: { stats: calculateStats(runsB), runs: runsB }
  };
}

/**
 * Run benchmark with fewer iterations for memory-intensive tests
 * Uses 3 + 10 + 10 + 20 = 40 total runs (plus warmup)
 */
async function runMemoryIntensiveBenchmark(fn: () => void, warmupRuns: number = 3): Promise<BenchmarkResult> {
  // Warmup runs
  for (let i = 0; i < warmupRuns; i++) {
    fn();
  }

  const runs: number[] = [];

  // Batch 1: 10 runs
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  await sleep(1000);

  // Batch 2: 10 runs
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  await sleep(1000);

  // Batch 3: 20 runs
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    runs.push(duration);
  }

  return {
    stats: calculateStats(runs),
    runs
  };
}

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

  // Set timeout to 60 seconds for all tests in this suite (140 iterations + pauses)
  const testTimeout = 60000;

  it('should measure relative performance ratios', { timeout: 30000 }, async () => {
    console.log('\n🔬 TEST: Relative Performance Ratios (Most Stable)\n');

    // This test measures relative performance, which is more stable across different systems
    const scenarios = [
      { name: 'Single mount', mounts: 1, updates: 0 },
      { name: '10 mounts', mounts: 10, updates: 0 },
      { name: '100 mounts', mounts: 100, updates: 0 },
      { name: '10 updates', mounts: 1, updates: 10 },
      { name: '100 updates', mounts: 1, updates: 100 },
      { name: 'Mixed (10m/100u)', mounts: 10, updates: 100 },
    ];

    console.log('Running comparative benchmarks across scenarios...\n');

    const results: Array<{
      scenario: string;
      ratio: number;
      concurrentTime: number;
      nextTime: number;
      isStable: boolean;
    }> = [];

    for (const scenario of scenarios) {
      const { resultA: concurrentResult, resultB: nextResult } = await runInterleavedBenchmark(
        () => {
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
        },
        () => {
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
        },
        50, // Fewer iterations for quick comparison
        3   // Less warmup
      );

      const ratio = nextResult.stats.trimmedMean / concurrentResult.stats.trimmedMean;
      const isStable = concurrentResult.stats.isStable && nextResult.stats.isStable;

      results.push({
        scenario: scenario.name,
        ratio,
        concurrentTime: concurrentResult.stats.trimmedMean,
        nextTime: nextResult.stats.trimmedMean,
        isStable
      });
    }

    console.log('=== Relative Performance Summary ===\n');
    console.log('Scenario               | Concurrent | Next      | Ratio  | Winner     | Stable');
    console.log('-----------------------|------------|-----------|--------|------------|-------');

    results.forEach(r => {
      const winner = r.ratio < 1 ? 'Next' : r.ratio > 1 ? 'Concurrent' : 'Tie';
      const winnerStr = winner === 'Next'
        ? `Next +${((1/r.ratio - 1) * 100).toFixed(0)}%`
        : winner === 'Concurrent'
        ? `Conc +${((r.ratio - 1) * 100).toFixed(0)}%`
        : 'Tie';

      console.log(
        `${r.scenario.padEnd(22)} | ${r.concurrentTime.toFixed(3).padStart(10)}ms | ${r.nextTime.toFixed(3).padStart(9)}ms | ${r.ratio.toFixed(3).padStart(6)} | ${winnerStr.padEnd(10)} | ${r.isStable ? '✓' : '⚠️'}`
      );
    });

    console.log('\nInterpretation:');
    console.log('  Ratio < 1.0: Next is faster');
    console.log('  Ratio > 1.0: Concurrent is faster');
    console.log('  Ratio ≈ 1.0: Similar performance\n');

    // Calculate overall trend
    const avgRatio = results.reduce((sum, r) => sum + r.ratio, 0) / results.length;
    const stableCount = results.filter(r => r.isStable).length;

    if (avgRatio < 0.95) {
      console.log(`📊 Overall: Next is ${((1/avgRatio - 1) * 100).toFixed(1)}% faster on average`);
    } else if (avgRatio > 1.05) {
      console.log(`📊 Overall: Concurrent is ${((avgRatio - 1) * 100).toFixed(1)}% faster on average`);
    } else {
      console.log('📊 Overall: Performance is equivalent (within 5%)');
    }

    if (stableCount < results.length) {
      console.log(`\n⚠️  Warning: ${results.length - stableCount} of ${results.length} scenarios showed unstable results`);
    }

    expect(avgRatio).toBeGreaterThan(0);
  });

  it('should compare mount performance', { timeout: testTimeout }, async () => {
    console.log('\n🔬 TEST: Mount Performance Comparison\n');

    // Check system noise first
    const { noiseLevel, isHighNoise } = await detectSystemNoise();
    console.log(`System noise level: ${noiseLevel.toFixed(4)}ms ${isHighNoise ? '⚠️  HIGH' : '✓ Normal'}\n`);

    if (isHighNoise) {
      console.log('⚠️  WARNING: High system noise detected. Results may be less reliable.\n');
    }

    const MOUNTS_PER_ITERATION = 50; // Mounts per test run

    console.log(`Running interleaved test with 100 iterations × ${MOUNTS_PER_ITERATION} mounts/unmounts per iteration...\n`);

    // Use interleaved benchmarking for fair comparison
    const { resultA: concurrentResult, resultB: nextResult } = await runInterleavedBenchmark(
      () => {
        for (let i = 0; i < MOUNTS_PER_ITERATION; i++) {
          const { unmount } = renderHook(() => useBlocConcurrent(TestCounterBloc));
          unmount();
        }
      },
      () => {
        for (let i = 0; i < MOUNTS_PER_ITERATION; i++) {
          const { unmount } = renderHook(() => useBlocNext(TestCounterBloc));
          unmount();
        }
      },
      100, // iterations
      5    // warmup
    );

    console.log('=== Mount/Unmount Performance ===\n');

    console.log('Concurrent Mode:');
    console.log(`    ${formatStats(concurrentResult.stats)}`);
    console.log(`    Per mount: ${(concurrentResult.stats.trimmedMean / MOUNTS_PER_ITERATION).toFixed(4)}ms`);
    if (concurrentResult.stats.cv > 0.2) {
      console.log(generateHistogram(concurrentResult.runs, 8));
    }
    console.log();

    console.log('Next Mode:');
    console.log(`    ${formatStats(nextResult.stats)}`);
    console.log(`    Per mount: ${(nextResult.stats.trimmedMean / MOUNTS_PER_ITERATION).toFixed(4)}ms`);
    if (nextResult.stats.cv > 0.2) {
      console.log(generateHistogram(nextResult.runs, 8));
    }
    console.log();

    // Statistical comparison using trimmed means for robustness
    const improvement = ((concurrentResult.stats.trimmedMean / nextResult.stats.trimmedMean - 1) * 100);
    const winner = nextResult.stats.trimmedMean < concurrentResult.stats.trimmedMean ? 'Next' : 'Concurrent';

    console.log(`🏆 Winner: ${winner} Mode\n`);

    console.log('Performance Analysis:');
    if (Math.abs(improvement) < 5) {
      console.log(`  Equivalent performance (within 5%)`);
    } else if (improvement > 0) {
      console.log(`  Next is ${improvement.toFixed(1)}% faster than Concurrent`);
    } else {
      console.log(`  Concurrent is ${Math.abs(improvement).toFixed(1)}% faster than Next`);
    }

    // Check if confidence intervals overlap (indicates no significant difference)
    const [concurrentLow, concurrentHigh] = concurrentResult.stats.confidenceInterval;
    const [nextLow, nextHigh] = nextResult.stats.confidenceInterval;
    const overlaps = !(concurrentHigh < nextLow || nextHigh < concurrentLow);

    if (overlaps) {
      console.log('  ⚠️  Confidence intervals overlap - difference may not be statistically significant');
    } else {
      console.log('  ✓ Confidence intervals do not overlap - difference is statistically significant');
    }

    // Stability check
    if (!concurrentResult.stats.isStable || !nextResult.stats.isStable) {
      console.log('\n⚠️  One or both tests showed unstable results. Consider re-running.');
    }

    expect(nextResult.stats.mean).toBeGreaterThan(0);
    expect(concurrentResult.stats.mean).toBeGreaterThan(0);
  });

  it('should compare update performance', { timeout: testTimeout }, async () => {
    console.log('\n🔬 TEST: Update Performance Comparison\n');

    const UPDATES_PER_ITERATION = 500; // State updates per test run

    console.log(`Running 3-5 warmup + 20 + 20 + 100 iterations (140 total) × ${UPDATES_PER_ITERATION} updates per iteration...\n`);

    // Test Concurrent Mode
    const concurrentResult = await runBenchmark(() => {
      const hook = renderHook(() => useBlocConcurrent(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_ITERATION; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
      SharedCounterBloc.release();
    }, 5);

    // Test Next Mode (Ultimate Implementation)
    const nextResult = await runBenchmark(() => {
      const hook = renderHook(() => useBlocNext(SharedCounterBloc));
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < UPDATES_PER_ITERATION; i++) {
        act(() => bloc.increment());
      }

      hook.unmount();
      SharedCounterBloc.release();
    }, 5);

    console.log('=== State Update Performance ===\n');

    console.log('Concurrent Mode:');
    console.log(`    ${formatStats(concurrentResult.stats)}`);
    console.log(`    Per update: ${(concurrentResult.stats.mean / UPDATES_PER_ITERATION).toFixed(4)}ms\n`);

    console.log('Next Mode:');
    console.log(`    ${formatStats(nextResult.stats)}`);
    console.log(`    Per update: ${(nextResult.stats.mean / UPDATES_PER_ITERATION).toFixed(4)}ms\n`);

    // Statistical comparison
    const improvement = ((concurrentResult.stats.mean / nextResult.stats.mean - 1) * 100);
    const winner = nextResult.stats.mean < concurrentResult.stats.mean ? 'Next' : 'Concurrent';

    console.log(`🏆 Winner: ${winner} Mode\n`);

    console.log('Performance Analysis:');
    if (Math.abs(improvement) < 5) {
      console.log(`  Equivalent performance (within 5%)`);
    } else if (improvement > 0) {
      console.log(`  Next is ${improvement.toFixed(1)}% faster than Concurrent`);
    } else {
      console.log(`  Concurrent is ${Math.abs(improvement).toFixed(1)}% faster than Next`);
    }

    // Check if confidence intervals overlap
    const [concurrentLow, concurrentHigh] = concurrentResult.stats.confidenceInterval;
    const [nextLow, nextHigh] = nextResult.stats.confidenceInterval;
    const overlaps = !(concurrentHigh < nextLow || nextHigh < concurrentLow);

    if (overlaps) {
      console.log('  ⚠️  Confidence intervals overlap - difference may not be statistically significant');
    } else {
      console.log('  ✓ Confidence intervals do not overlap - difference is statistically significant');
    }

    expect(nextResult.stats.mean).toBeGreaterThan(0);
    expect(concurrentResult.stats.mean).toBeGreaterThan(0);
  });

  it('should compare performance with many components', { timeout: testTimeout }, async () => {
    console.log('\n🔬 TEST: Mass Component Performance\n');

    const NUM_COMPONENTS = 200; // Components per test run
    const NUM_UPDATES = 10; // State updates per test run

    console.log(`Running 3 warmup + 10 + 10 + 20 iterations (40 total) with ${NUM_COMPONENTS} components each...\n`);
    console.log('(Using fewer iterations for memory-intensive test)\n');

    // Test Concurrent Mode - Mount Phase
    console.log('Testing Concurrent Mode mount performance...');
    const concurrentMountResult = await runMemoryIntensiveBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, 3);

    // Test Concurrent Mode - Update Phase
    console.log('Testing Concurrent Mode update performance...');
    const concurrentUpdateResult = await runMemoryIntensiveBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, 3);

    // Test Next Mode - Mount Phase
    console.log('Testing Next Mode mount performance...');
    const nextMountResult = await runMemoryIntensiveBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(SharedCounterBloc))
      );
      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, 3);

    // Test Next Mode - Update Phase
    console.log('Testing Next Mode update performance...');
    const nextUpdateResult = await runMemoryIntensiveBenchmark(() => {
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(SharedCounterBloc))
      );
      const bloc = SharedCounterBloc.getOrCreate();

      for (let i = 0; i < NUM_UPDATES; i++) {
        act(() => bloc.increment());
      }

      hooks.forEach(h => h.unmount());
      SharedCounterBloc.release();
    }, 3);

    console.log(`\n=== ${NUM_COMPONENTS} Components Results ===\n`);

    // Mount performance
    console.log('MOUNT PERFORMANCE:\n');
    console.log('Concurrent Mode:');
    console.log(`    ${formatStats(concurrentMountResult.stats)}`);
    console.log(`    Per component: ${(concurrentMountResult.stats.mean / NUM_COMPONENTS).toFixed(4)}ms\n`);

    console.log('Next Mode:');
    console.log(`    ${formatStats(nextMountResult.stats)}`);
    console.log(`    Per component: ${(nextMountResult.stats.mean / NUM_COMPONENTS).toFixed(4)}ms\n`);

    const mountImprovement = ((concurrentMountResult.stats.mean / nextMountResult.stats.mean - 1) * 100);
    const mountWinner = nextMountResult.stats.mean < concurrentMountResult.stats.mean ? 'Next' : 'Concurrent';

    console.log(`🏆 Mount Winner: ${mountWinner}`);
    if (Math.abs(mountImprovement) < 5) {
      console.log(`  Equivalent performance (within 5%)\n`);
    } else if (mountImprovement > 0) {
      console.log(`  Next is ${mountImprovement.toFixed(1)}% faster\n`);
    } else {
      console.log(`  Concurrent is ${Math.abs(mountImprovement).toFixed(1)}% faster\n`);
    }

    // Check CI overlap for mount
    const [concurrentMountLow, concurrentMountHigh] = concurrentMountResult.stats.confidenceInterval;
    const [nextMountLow, nextMountHigh] = nextMountResult.stats.confidenceInterval;
    const mountOverlaps = !(concurrentMountHigh < nextMountLow || nextMountHigh < concurrentMountLow);

    if (mountOverlaps) {
      console.log('  ⚠️  Confidence intervals overlap - difference may not be statistically significant\n');
    } else {
      console.log('  ✓ Confidence intervals do not overlap - difference is statistically significant\n');
    }

    // Update performance
    console.log('UPDATE PERFORMANCE:\n');
    console.log('Concurrent Mode:');
    console.log(`    ${formatStats(concurrentUpdateResult.stats)}`);
    console.log(`    Per update: ${(concurrentUpdateResult.stats.mean / NUM_UPDATES).toFixed(3)}ms\n`);

    console.log('Next Mode:');
    console.log(`    ${formatStats(nextUpdateResult.stats)}`);
    console.log(`    Per update: ${(nextUpdateResult.stats.mean / NUM_UPDATES).toFixed(3)}ms\n`);

    const updateImprovement = ((concurrentUpdateResult.stats.mean / nextUpdateResult.stats.mean - 1) * 100);
    const updateWinner = nextUpdateResult.stats.mean < concurrentUpdateResult.stats.mean ? 'Next' : 'Concurrent';

    console.log(`🏆 Update Winner: ${updateWinner}`);
    if (Math.abs(updateImprovement) < 5) {
      console.log(`  Equivalent performance (within 5%)\n`);
    } else if (updateImprovement > 0) {
      console.log(`  Next is ${updateImprovement.toFixed(1)}% faster\n`);
    } else {
      console.log(`  Concurrent is ${Math.abs(updateImprovement).toFixed(1)}% faster\n`);
    }

    // Check CI overlap for update
    const [concurrentUpdateLow, concurrentUpdateHigh] = concurrentUpdateResult.stats.confidenceInterval;
    const [nextUpdateLow, nextUpdateHigh] = nextUpdateResult.stats.confidenceInterval;
    const updateOverlaps = !(concurrentUpdateHigh < nextUpdateLow || nextUpdateHigh < concurrentUpdateLow);

    if (updateOverlaps) {
      console.log('  ⚠️  Confidence intervals overlap - difference may not be statistically significant\n');
    } else {
      console.log('  ✓ Confidence intervals do not overlap - difference is statistically significant\n');
    }

    // Assertions
    expect(nextMountResult.stats.mean).toBeGreaterThan(0);
    expect(nextUpdateResult.stats.mean).toBeGreaterThan(0);
    expect(concurrentMountResult.stats.mean).toBeGreaterThan(0);
    expect(concurrentUpdateResult.stats.mean).toBeGreaterThan(0);
  });

  it('should measure memory overhead', () => {
    console.log('\n🔬 TEST: Memory Overhead Comparison\n');

    const NUM_ITERATIONS = 10; // Number of independent memory measurements
    const NUM_COMPONENTS = 200; // Components per measurement

    // Helper to measure heap usage (works in Node.js)
    const measureHeap = () => {
      // Try Node.js process.memoryUsage() first
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
      // Fall back to Chrome's performance.memory (browser only)
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
      console.log('⚠️  Garbage collection not available - run with --expose-gc flag for accurate memory profiling\n');
      expect(true).toBe(true);
      return;
    }

    console.log(`Running ${NUM_ITERATIONS} memory measurements with ${NUM_COMPONENTS} components each...\n`);

    const concurrentMemoryReadings: number[] = [];
    const nextMemoryReadings: number[] = [];

    // Collect multiple memory measurements for Concurrent Mode
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const heapBefore = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocConcurrent(TestCounterBloc))
      );
      const heapAfter = measureHeap();
      const memoryUsed = heapAfter - heapBefore;
      concurrentMemoryReadings.push(memoryUsed);
      hooks.forEach(h => h.unmount());
    }

    // Collect multiple memory measurements for Next Mode
    for (let i = 0; i < NUM_ITERATIONS; i++) {
      gc();
      const heapBefore = measureHeap();
      const hooks = Array.from({ length: NUM_COMPONENTS }, () =>
        renderHook(() => useBlocNext(TestCounterBloc))
      );
      const heapAfter = measureHeap();
      const memoryUsed = heapAfter - heapBefore;
      nextMemoryReadings.push(memoryUsed);
      hooks.forEach(h => h.unmount());
    }

    const concurrentStats = calculateStats(concurrentMemoryReadings);
    const nextStats = calculateStats(nextMemoryReadings);

    console.log('=== Memory Usage ===\n');

    console.log('Concurrent Mode:');
    console.log(`    ${formatStats(concurrentStats, ' bytes')}`);
    console.log(`    Per component: ${(concurrentStats.mean / NUM_COMPONENTS).toFixed(0)} bytes\n`);

    console.log('Next Mode:');
    console.log(`    ${formatStats(nextStats, ' bytes')}`);
    console.log(`    Per component: ${(nextStats.mean / NUM_COMPONENTS).toFixed(0)} bytes\n`);

    // Comparison
    const memoryDiff = ((nextStats.mean - concurrentStats.mean) / concurrentStats.mean * 100);

    if (Math.abs(memoryDiff) < 5) {
      console.log('✅ Equivalent memory usage (within 5%)\n');
    } else if (memoryDiff < 0) {
      console.log(`🏆 Next Mode uses ${Math.abs(memoryDiff).toFixed(1)}% less memory!\n`);
    } else {
      console.log(`⚠️  Next Mode uses ${memoryDiff.toFixed(1)}% more memory\n`);
    }

    // Check CI overlap
    const [concurrentLow, concurrentHigh] = concurrentStats.confidenceInterval;
    const [nextLow, nextHigh] = nextStats.confidenceInterval;
    const overlaps = !(concurrentHigh < nextLow || nextHigh < concurrentLow);

    if (overlaps) {
      console.log('⚠️  Confidence intervals overlap - difference may not be statistically significant');
    } else {
      console.log('✓ Confidence intervals do not overlap - difference is statistically significant');
    }

    expect(concurrentStats.mean).toBeGreaterThan(0);
    expect(nextStats.mean).toBeGreaterThan(0);
  });
});
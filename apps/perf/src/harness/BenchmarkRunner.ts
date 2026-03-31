import { computeStats, removeOutliers } from '../shared/stats';
import type {
  BenchmarkAPI,
  LibraryResults,
  OperationName,
  OperationResult,
  ProfilerMetric,
  PureStateBenchmark,
  PureStateResult,
} from '../shared/types';
import { delay, measureEndToEnd } from './timing';
import type { ProfilerHandle } from './ProfilerWrapper';

export interface RunConfig {
  warmupRuns: number;
  measuredRuns: number;
  operations: OperationName[];
  delayBetweenOps: number;
}

export const DEFAULT_CONFIG: RunConfig = {
  warmupRuns: 5,
  measuredRuns: 20,
  operations: ['run', 'runLots', 'add', 'update', 'clear', 'swapRows'],
  delayBetweenOps: 50,
};

export type ProgressCallback = (
  operation: OperationName,
  phase: 'warmup' | 'measure',
  current: number,
  total: number,
) => void;

export async function runReactBenchmark(
  libraryName: string,
  api: BenchmarkAPI,
  profiler: ProfilerHandle,
  config: RunConfig = DEFAULT_CONFIG,
  onProgress?: ProgressCallback,
): Promise<LibraryResults> {
  const operations: OperationResult[] = [];

  for (const op of config.operations) {
    const triggerFn = getOperationTrigger(api, op);
    const setupFn = getOperationSetup(api, op);

    // warmup
    for (let i = 0; i < config.warmupRuns; i++) {
      onProgress?.(op, 'warmup', i + 1, config.warmupRuns);
      setupFn?.();
      await delay(config.delayBetweenOps);
      profiler.reset();
      triggerFn();
      await delay(config.delayBetweenOps);
    }

    // measured runs
    const endToEndTimes: number[] = [];
    const actualDurations: number[] = [];
    const baseDurations: number[] = [];

    for (let i = 0; i < config.measuredRuns; i++) {
      onProgress?.(op, 'measure', i + 1, config.measuredRuns);
      setupFn?.();
      await delay(config.delayBetweenOps);
      profiler.reset();

      const e2e = await measureEndToEnd(triggerFn);
      endToEndTimes.push(e2e);

      const metrics = profiler.getMetrics();
      const updateMetrics = metrics.filter(
        (m: ProfilerMetric) => m.phase === 'update' || m.phase === 'mount',
      );
      if (updateMetrics.length > 0) {
        const last = updateMetrics[updateMetrics.length - 1];
        actualDurations.push(last.actualDuration);
        baseDurations.push(last.baseDuration);
      }

      await delay(config.delayBetweenOps);
    }

    operations.push({
      operation: op,
      endToEnd: computeStats(removeOutliers(endToEndTimes)),
      renderActual: computeStats(removeOutliers(actualDurations)),
      renderBase: computeStats(removeOutliers(baseDurations)),
    });

    // clear between operations
    api.clear();
    await delay(config.delayBetweenOps * 2);
  }

  return {
    library: libraryName,
    operations,
    timestamp: Date.now(),
  };
}

function getOperationTrigger(api: BenchmarkAPI, op: OperationName): () => void {
  const map: Record<OperationName, () => void> = {
    run: api.run,
    runLots: api.runLots,
    add: api.add,
    update: api.update,
    clear: api.clear,
    swapRows: api.swapRows,
  };
  return map[op];
}

// some operations need rows to exist first
function getOperationSetup(
  api: BenchmarkAPI,
  op: OperationName,
): (() => void) | null {
  switch (op) {
    case 'update':
    case 'swapRows':
    case 'clear':
      return api.run;
    case 'add':
      return api.run;
    default:
      return null;
  }
}

export interface PureStateRunConfig {
  iterations: number;
  warmup: number;
  operations?: Set<string>;
}

export const DEFAULT_PURE_CONFIG: PureStateRunConfig = {
  iterations: 1000,
  warmup: 100,
};

export type PureStateProgressCallback = (
  operation: string,
  phase: 'warmup' | 'measure',
  current: number,
  total: number,
) => void;

export async function runPureStateBenchmark(
  benchmark: PureStateBenchmark,
  config: PureStateRunConfig = DEFAULT_PURE_CONFIG,
  onProgress?: PureStateProgressCallback,
): Promise<PureStateResult[]> {
  const { iterations, warmup, operations: selectedOps } = config;
  const results: PureStateResult[] = [];

  const ops = Object.entries(benchmark.operations).filter(
    ([name]) => !selectedOps || selectedOps.has(name),
  );

  for (const [opName, opFn] of ops) {
    onProgress?.(opName, 'warmup', 0, warmup);
    await delay(100);

    // warmup
    for (let i = 0; i < warmup; i++) {
      const handle = benchmark.setup();
      opFn(handle);
      benchmark.teardown?.(handle);
    }

    onProgress?.(opName, 'measure', 0, iterations);
    await delay(100);

    // measured runs
    const durations: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const handle = benchmark.setup();
      const start = performance.now();
      opFn(handle);
      const end = performance.now();
      durations.push(end - start);
      benchmark.teardown?.(handle);
    }

    onProgress?.(opName, 'measure', iterations, iterations);

    const cleanDurations = removeOutliers(durations);
    const avgDuration = computeStats(cleanDurations);
    const totalTime = cleanDurations.reduce((a, b) => a + b, 0);
    const opsPerSecond =
      totalTime > 0 ? (cleanDurations.length / totalTime) * 1000 : 0;

    results.push({
      library: benchmark.name,
      operation: opName,
      opsPerSecond,
      avgDuration,
    });

    // yield to the main thread between operations
    await delay(100);
  }

  return results;
}

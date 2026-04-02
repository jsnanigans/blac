import { computeStats, removeOutliers } from '../shared/stats';
import type {
  RerenderBenchmarkAPI,
  RerenderOperationResult,
  RerenderScenario,
} from '../shared/types';
import { ALL_RERENDER_SCENARIOS } from '../shared/rerender-scenarios';
import { delay, measureEndToEnd } from './timing';
import type { ProfilerHandle } from './ProfilerWrapper';

export interface RerenderRunConfig {
  warmupRuns: number;
  measuredRuns: number;
  scenarios: RerenderScenario[];
  delayBetweenOps: number;
}

export const DEFAULT_RERENDER_CONFIG: RerenderRunConfig = {
  warmupRuns: 5,
  measuredRuns: 20,
  scenarios: ALL_RERENDER_SCENARIOS,
  delayBetweenOps: 50,
};

export type RerenderProgressCallback = (
  scenario: RerenderScenario,
  phase: 'warmup' | 'measure',
  current: number,
  total: number,
) => void;

export async function runRerenderBenchmark(
  api: RerenderBenchmarkAPI,
  profiler: ProfilerHandle,
  scenario: RerenderScenario,
  config: RerenderRunConfig = DEFAULT_RERENDER_CONFIG,
  onProgress?: RerenderProgressCallback,
): Promise<RerenderOperationResult> {
  // warmup
  for (let i = 0; i < config.warmupRuns; i++) {
    onProgress?.(scenario, 'warmup', i + 1, config.warmupRuns);
    api.resetRenderCounts();
    await delay(config.delayBetweenOps);
    profiler.reset();
    api.trigger();
    await delay(config.delayBetweenOps);
  }

  // measured runs
  const renderCounts: number[] = [];
  const endToEndTimes: number[] = [];
  const actualDurations: number[] = [];

  for (let i = 0; i < config.measuredRuns; i++) {
    onProgress?.(scenario, 'measure', i + 1, config.measuredRuns);
    api.resetRenderCounts();
    await delay(config.delayBetweenOps);
    profiler.reset();

    const e2e = await measureEndToEnd(() => api.trigger());
    endToEndTimes.push(e2e);

    const totalRenders = api.getRenderCounts().reduce((a, b) => a + b, 0);
    renderCounts.push(totalRenders);

    const metrics = profiler.getMetrics();
    const updateMetrics = metrics.filter(
      (m) => m.phase === 'update' || m.phase === 'mount',
    );
    if (updateMetrics.length > 0) {
      const last = updateMetrics[updateMetrics.length - 1];
      actualDurations.push(last.actualDuration);
    }

    await delay(config.delayBetweenOps);
  }

  return {
    scenario,
    totalRenders: computeStats(removeOutliers(renderCounts)),
    optimalRenders: api.getOptimalRenders(),
    endToEnd: computeStats(removeOutliers(endToEndTimes)),
    renderActual: computeStats(
      actualDurations.length > 0 ? removeOutliers(actualDurations) : [0],
    ),
  };
}

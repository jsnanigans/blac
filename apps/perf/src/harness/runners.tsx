import React from 'react';
import { LIST_OPS } from '../shared/list';
import {
  RERENDER_SCENARIOS,
  RerenderTree,
  type RerenderAPI,
} from '../shared/rerender';
import { computeStats, summarize } from '../shared/stats';
import type {
  ListAPI,
  ListLibrary,
  ListResults,
  PureStateLibrary,
  PureStateResult,
  RerenderLibrary,
  RerenderResults,
  RetainedMemoryResult,
} from '../shared/types';
import { measure, settle, yieldToUI } from './measure';
import { mount, type RenderTimer } from './mount';

export interface RunConfig {
  warmup: number;
  samples: number;
}

export type Progress = (text: string) => void;

interface Samples {
  time: number[];
  render: number[];
}

/**
 * Times `trigger` once per sample, after `setup` has rendered and the page has
 * painted. Warns when React commits after the measured window closed, which
 * would mean the window missed work.
 */
async function sampleReact(
  label: string,
  config: RunConfig,
  timer: RenderTimer,
  setup: () => void,
  trigger: () => void,
  progress: Progress,
  afterSample?: () => void,
): Promise<Samples> {
  const out: Samples = { time: [], render: [] };
  const total = config.warmup + config.samples;
  for (let i = 0; i < total; i++) {
    const warm = i < config.warmup;
    progress(`${label} — ${warm ? 'warmup' : 'sample'} ${i + 1}/${total}`);
    await measure(setup);
    await settle();
    timer.reset();
    const time = await measure(trigger);
    const render = timer.total;
    const commits = timer.commits;
    await settle();
    if (timer.commits !== commits) {
      console.warn(`[perf] ${label}: React committed after the timed window`);
    }
    if (warm) continue;
    out.time.push(time);
    out.render.push(render);
    afterSample?.();
  }
  return out;
}

export async function runList(
  lib: ListLibrary,
  ops: string[],
  config: RunConfig,
  host: HTMLElement,
  progress: Progress,
): Promise<ListResults> {
  const { api, timer, unmount } = await mount<ListAPI>(host, (onReady) => (
    <lib.Component onReady={onReady} />
  ));
  const results: ListResults = { library: lib.name, rows: lib.rows, ops: [] };
  try {
    for (const op of ops) {
      const { label, setup, run } = LIST_OPS[op];
      const s = await sampleReact(
        `${lib.name}: ${label}`,
        config,
        timer,
        () => setup(api),
        () => run(api),
        progress,
      );
      results.ops.push({
        op,
        time: summarize(s.time),
        render: summarize(s.render),
      });
    }
  } finally {
    await unmount();
  }
  return results;
}

export async function runRerender(
  lib: RerenderLibrary,
  scenarios: string[],
  config: RunConfig,
  host: HTMLElement,
  progress: Progress,
): Promise<RerenderResults> {
  const results: RerenderResults = { library: lib.name, scenarios: [] };
  for (const key of scenarios) {
    const scenario = RERENDER_SCENARIOS[key];
    const store = lib.create();
    const { api, timer, unmount } = await mount<RerenderAPI>(
      host,
      (onReady) => (
        <RerenderTree store={store} scenario={scenario} onReady={onReady} />
      ),
    );
    try {
      const renders: number[] = [];
      api.takeRenders();
      const s = await sampleReact(
        `${lib.name}: ${scenario.label}`,
        config,
        timer,
        () => api.takeRenders(),
        api.trigger,
        progress,
        () => renders.push(api.takeRenders()),
      );
      results.scenarios.push({
        scenario: key,
        renders: computeStats(renders),
        optimalRenders: scenario.optimalRenders,
        time: summarize(s.time),
      });
    } finally {
      await unmount();
    }
  }
  return results;
}

// `performance.now()` resolves to 5µs when cross-origin isolated. An op faster
// than ten ticks is repeated back to back within each sample until the sample
// spans about 1ms, so ops must cost the same when run again on one handle.
const FAST_OP_MS = 0.05;
const TARGET_SAMPLE_MS = 1;
const MAX_REPS = 1000;

const repetitionsFor = (fastest: number): number =>
  fastest >= FAST_OP_MS
    ? 1
    : Math.min(
        MAX_REPS,
        Math.ceil(TARGET_SAMPLE_MS / Math.max(fastest, 0.001)),
      );

export async function runPureState(
  lib: PureStateLibrary,
  ops: string[],
  config: RunConfig,
  progress: Progress,
): Promise<PureStateResult[]> {
  const results: PureStateResult[] = [];
  for (const name of ops) {
    const op = lib.ops[name];
    if (!op) continue;
    progress(`${lib.name}: ${name}`);
    await yieldToUI();

    const once = (): number => {
      const handle = op.setup();
      const start = performance.now();
      op.run(handle);
      const ms = performance.now() - start;
      op.teardown?.(handle);
      return ms;
    };
    for (let i = 0; i < config.warmup; i++) once();
    const reps = repetitionsFor(Math.min(once(), once(), once()));

    const times: number[] = [];
    for (let i = 0; i < config.samples; i++) {
      const handle = op.setup();
      const start = performance.now();
      for (let r = 0; r < reps; r++) op.run(handle);
      times.push((performance.now() - start) / reps);
      op.teardown?.(handle);
    }
    results.push({
      library: lib.name,
      op: name,
      time: summarize(times),
      repetitions: reps,
    });
  }
  return results;
}

declare global {
  interface Performance {
    measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
  }
}

/**
 * Retained bytes per live instance: agent memory after creating `instances`
 * minus memory before, repeated `samples` times. Chrome only, and only in a
 * cross-origin-isolated page (see the COOP/COEP headers in `vite.config.ts`).
 * The two readings land on different GC cycles; 10k instances keep that
 * jitter under ~25 B per instance.
 */
export async function measureRetainedMemory(
  lib: PureStateLibrary,
  progress: Progress,
  instances = 10_000,
  samples = 5,
): Promise<RetainedMemoryResult | null> {
  const read = performance.measureUserAgentSpecificMemory?.bind(performance);
  if (!lib.retain || !read) return null;
  const perInstance: number[] = [];
  for (let i = 0; i < samples; i++) {
    // Each reading waits for a GC, typically ~10s.
    progress(`${lib.name}: retained memory ${i + 1}/${samples}`);
    const before = (await read()).bytes;
    const release = lib.retain(instances);
    const after = (await read()).bytes;
    release();
    perInstance.push((after - before) / instances);
  }
  return {
    library: lib.name,
    instances,
    bytesPerInstance: computeStats(perInstance),
  };
}

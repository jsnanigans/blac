/**
 * blac-core migration benchmark (G3).
 *
 * Headless Node benchmark measuring the four scenarios from
 * `plans/blac-core-migration/G3-perf-benchmark.md`:
 *
 *   1. N consumers, single emit  (N ∈ {1, 10, 50, 100, 500})
 *   2. Throughput — 1000 emits with N=100 consumers
 *   3. Consumer churn — 100 mount + unmount
 *   4. Microtask coalescing — 100 sync emits, count flushes
 *
 * Run via `vp run benchmark` (or `npx tsx src/migration-bench/run.ts`).
 * Results write to stdout as a markdown table; redirect to the results doc.
 *
 * Notes:
 * - This is the post-migration code path: `Cubit` extends `StateContainer`
 *   extends `StructuralContainer`, which uses a `DirtyChannel` with a
 *   `MicrotaskScheduler` and per-consumer path interest.
 * - We bypass React and measure the channel directly. The mark→flush→cb
 *   path is the same one `useStructural` / `useBloc` ride on, just without
 *   the JSX render overhead — which would be noise here.
 * - Subscriber interest uses `ALL_PATHS` so every mark wakes them; this
 *   matches the spec's "one cubit, N consumers subscribed to items[i]"
 *   shape (no skeleton filtering shortcut helping us).
 */

import { performance } from 'node:perf_hooks';
import { ALL_PATHS, configureBlac, Cubit } from '@blac/core';

// Lift the emit-rate circuit breaker — the throughput scenario intentionally
// emits 1000 times in a tight loop. The breaker is a runtime safety net, not
// a measurement gate.
configureBlac({ maxEmitsPerSecond: Number.POSITIVE_INFINITY });

interface ItemsState {
  items: Array<{ id: number; name: string }>;
}

class ItemsCubit extends Cubit<ItemsState> {
  constructor() {
    super({
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `item-${i}`,
      })),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────

const RUNS_PER_SCENARIO = 10;
const DISCARD_FIRST = 3;

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function summarise(xs: number[]): {
  median: number;
  min: number;
  max: number;
  samples: number;
} {
  const trimmed = xs.slice(DISCARD_FIRST);
  return {
    median: median(trimmed),
    min: Math.min(...trimmed),
    max: Math.max(...trimmed),
    samples: trimmed.length,
  };
}

/** Wait for the next microtask flush. */
const flush = (): Promise<void> => new Promise((r) => queueMicrotask(r));

// ─────────────────────────────────────────────────────────────────────────
// Scenario 1: N consumers, single emit — emit→commit latency
// ─────────────────────────────────────────────────────────────────────────

async function scenario1NConsumers(n: number): Promise<number> {
  const cubit = new ItemsCubit();
  let firedCount = 0;
  let resolveAll: () => void = () => {};
  const allDone = new Promise<void>((r) => {
    resolveAll = r;
  });

  const unsubs: Array<() => void> = [];
  for (let i = 0; i < n; i++) {
    const unsub = cubit.channel.subscribe(
      () => ALL_PATHS,
      () => {
        firedCount += 1;
        if (firedCount === n) resolveAll();
      },
    );
    unsubs.push(unsub);
  }

  // Settle path-set registration; consumers above didn't register paths via
  // registerConsumerPaths (we subscribed directly), so the skeleton stays
  // empty and emit() uses the single-consumer-skip path when n <= 1.
  await flush();
  firedCount = 0;

  const start = performance.now();
  cubit.patch({ items: [{ id: 5, name: 'updated' }] });
  await allDone;
  const elapsed = performance.now() - start;

  for (const u of unsubs) u();
  return elapsed;
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario 2: Throughput — 1000 emits with N=100 consumers
// ─────────────────────────────────────────────────────────────────────────

async function scenario2Throughput(): Promise<number> {
  const n = 100;
  const cubit = new ItemsCubit();
  let firedTotal = 0;
  const unsubs: Array<() => void> = [];
  for (let i = 0; i < n; i++) {
    unsubs.push(
      cubit.channel.subscribe(
        () => ALL_PATHS,
        () => {
          firedTotal += 1;
        },
      ),
    );
  }
  await flush();
  firedTotal = 0;

  const start = performance.now();
  // 1000 awaited emits — one flush per emit so consumers really do wake N
  // times per iteration. (Coalescing is measured separately in scenario 4.)
  for (let i = 0; i < 1000; i++) {
    cubit.patch({ items: [{ id: i % 100, name: `n${i}` }] });
    await flush();
  }
  const elapsed = performance.now() - start;

  for (const u of unsubs) u();
  void firedTotal;
  return elapsed;
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario 3: Consumer churn — 100 mount + unmount
// ─────────────────────────────────────────────────────────────────────────

async function scenario3Churn(): Promise<number> {
  const cubit = new ItemsCubit();

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    const unsub = cubit.channel.subscribe(
      () => ALL_PATHS,
      () => {},
    );
    unsub();
  }
  const elapsed = performance.now() - start;
  return elapsed;
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario 4: Microtask coalescing — 100 sync emits → N flushes
// ─────────────────────────────────────────────────────────────────────────

async function scenario4Coalescing(): Promise<{
  flushes: number;
  elapsed: number;
}> {
  const cubit = new ItemsCubit();
  let flushes = 0;
  // Two consumers — single-consumer-skip would still flush once per emit
  // synchronously enqueued, but the question is "does the channel coalesce
  // 100 marks into one flush?" — that's a channel-level property and applies
  // regardless of consumer count. Using two consumers to keep the skeleton
  // path active.
  const unsubs = [
    cubit.channel.subscribe(
      () => ALL_PATHS,
      () => {
        flushes += 1;
      },
    ),
    cubit.channel.subscribe(
      () => ALL_PATHS,
      () => {},
    ),
  ];
  await flush();
  flushes = 0;

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    cubit.patch({ items: [{ id: i, name: `n${i}` }] });
  }
  // One microtask drain — the MicrotaskScheduler's request() schedules a
  // single queueMicrotask; subsequent marks during the same tick accumulate
  // into the already-scheduled flush.
  await flush();
  // Extra flush in case the channel re-scheduled (re-entrant marks during
  // callback would trigger this); the spec's win-shape is 1 flush total.
  await flush();
  const elapsed = performance.now() - start;

  for (const u of unsubs) u();
  return { flushes, elapsed };
}

// ─────────────────────────────────────────────────────────────────────────
// Driver
// ─────────────────────────────────────────────────────────────────────────

interface Row {
  scenario: string;
  detail: string;
  result: string;
}

async function runRepeated(
  label: string,
  fn: () => Promise<number>,
): Promise<{ label: string; stats: ReturnType<typeof summarise> }> {
  const samples: number[] = [];
  for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
    samples.push(await fn());
  }
  return { label, stats: summarise(samples) };
}

function fmtMs(x: number): string {
  if (x < 0.01) return `${(x * 1000).toFixed(2)}µs`;
  if (x < 1) return `${x.toFixed(3)}ms`;
  return `${x.toFixed(2)}ms`;
}

async function main(): Promise<void> {
  const rows: Row[] = [];

  // ── Scenario 1 ──
  console.error('[bench] Scenario 1 — N consumers, single emit');
  for (const n of [1, 10, 50, 100, 500]) {
    const { stats } = await runRepeated(`N=${n}`, () => scenario1NConsumers(n));
    rows.push({
      scenario: 'S1: N consumers, single emit',
      detail: `N=${n}`,
      result: `${fmtMs(stats.median)} (min ${fmtMs(stats.min)}, max ${fmtMs(stats.max)}, n=${stats.samples})`,
    });
    console.error(`  N=${n}: median=${fmtMs(stats.median)}`);
  }

  // ── Scenario 2 ──
  console.error('[bench] Scenario 2 — Throughput (1000 emits, 100 consumers)');
  {
    const { stats } = await runRepeated('throughput', scenario2Throughput);
    rows.push({
      scenario: 'S2: Throughput (1000 emits, N=100)',
      detail: 'total wall-clock',
      result: `${fmtMs(stats.median)} (min ${fmtMs(stats.min)}, max ${fmtMs(stats.max)}, n=${stats.samples})`,
    });
    console.error(`  total: median=${fmtMs(stats.median)}`);
  }

  // ── Scenario 3 ──
  console.error('[bench] Scenario 3 — Consumer churn (100 mount+unmount)');
  {
    const { stats } = await runRepeated('churn', scenario3Churn);
    rows.push({
      scenario: 'S3: Consumer churn (100 mount+unmount)',
      detail: 'total wall-clock',
      result: `${fmtMs(stats.median)} (min ${fmtMs(stats.min)}, max ${fmtMs(stats.max)}, n=${stats.samples})`,
    });
    console.error(`  total: median=${fmtMs(stats.median)}`);
  }

  // ── Scenario 4 ──
  console.error('[bench] Scenario 4 — Microtask coalescing (100 sync emits)');
  {
    const flushCounts: number[] = [];
    const elapseds: number[] = [];
    for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
      const { flushes, elapsed } = await scenario4Coalescing();
      flushCounts.push(flushes);
      elapseds.push(elapsed);
    }
    const fl = summarise(flushCounts);
    const el = summarise(elapseds);
    rows.push({
      scenario: 'S4: Microtask coalescing (100 sync emits)',
      detail: 'flushes observed',
      result: `median=${fl.median} (min=${fl.min}, max=${fl.max})`,
    });
    rows.push({
      scenario: 'S4: Microtask coalescing (100 sync emits)',
      detail: 'time to drain',
      result: `${fmtMs(el.median)} (min ${fmtMs(el.min)}, max ${fmtMs(el.max)})`,
    });
    console.error(`  flushes median=${fl.median}, drain=${fmtMs(el.median)}`);
  }

  // ── Stdout: machine + markdown ──
  console.log(`# Run output`);
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(``);
  console.log(`| Scenario | Detail | Result |`);
  console.log(`|----------|--------|--------|`);
  for (const r of rows) {
    console.log(`| ${r.scenario} | ${r.detail} | ${r.result} |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

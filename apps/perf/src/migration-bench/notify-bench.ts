/**
 * Real-world per-update cost: the notify/flush path and the per-render
 * tracking tax. This is what actually runs when a user interaction updates
 * one field and N components are mounted — unlike the tight sync-write
 * microbenchmark, it isolates library overhead (no React render noise).
 *
 *   A. Notify path — N consumers each interested in ONE field; update one
 *      field; K wake. Blac auto-track (narrow channel interest +
 *      registerConsumerPaths) vs Zustand+selector (store.subscribe + selector
 *      + Object.is compare, which is what useStore(store, sel) does).
 *   B. trackRender tax — cost of wrapping state in the recording proxy and
 *      reading 1 / 4 / 20 fields, per render. Zustand+selector has no proxy.
 *
 * Run: tsx --tsconfig apps/perf/tsconfig.bench.json \
 *        apps/perf/src/migration-bench/notify-bench.ts
 */
import { performance } from 'node:perf_hooks';
import { Cubit, configureBlac } from '@blac/core';
import { trackRender } from '@dirtytalk/structural';
import { StructuralContainer } from '@dirtytalk/structural';
import { createStore } from 'zustand';
import { createWideState, type WideState } from '../shared/types';

configureBlac({ maxEmitsPerSecond: Number.POSITIVE_INFINITY });

const WARMUP = 200;
const SAMPLES = 500;
const N = 100; // mounted consumers
const UPDATES = 200; // field updates per sample

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function trimHigh(xs: number[]): number[] {
  const s = [...xs].sort((a, b) => a - b);
  return s.slice(0, Math.floor(s.length * 0.95));
}
const fmt = (ms: number) => `${(ms * 1000).toFixed(3)}µs`;
const flush = (): Promise<void> => new Promise((r) => queueMicrotask(r));

class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
}

// ── A. Notify path ─────────────────────────────────────────────────────────
// Per update = (patch + microtask flush) / UPDATES. Reports per-update µs.

async function blacNotify(): Promise<number> {
  const bloc = new WideBloc();
  const interner = bloc.interner;
  let woke = 0;
  const unsubs: Array<() => void> = [];
  // Each consumer interested in exactly one field (round-robin across 20).
  for (let i = 0; i < N; i++) {
    const fieldId = interner.intern(`field${i % 20}`);
    const interest = new Set([fieldId]);
    (bloc as unknown as StructuralContainer<WideState>).registerConsumerPaths(
      `c${i}`,
      interest,
    );
    unsubs.push(
      bloc.channel.subscribe(
        () => interest,
        () => {
          woke++;
        },
      ),
    );
  }
  await flush();
  woke = 0;

  const start = performance.now();
  for (let i = 0; i < UPDATES; i++) {
    bloc.patch({ field0: i });
    await flush(); // one commit per update, like a real interaction
  }
  const elapsed = performance.now() - start;
  for (const u of unsubs) u();
  bloc.dispose();
  void woke;
  return elapsed / UPDATES;
}

async function zustandNotify(): Promise<number> {
  const store = createStore<WideState>(() => createWideState());
  let woke = 0;
  const unsubs: Array<() => void> = [];
  for (let i = 0; i < N; i++) {
    const key = `field${i % 20}` as keyof WideState;
    const selector = (s: WideState) => s[key];
    let last = selector(store.getState());
    unsubs.push(
      store.subscribe(() => {
        const v = selector(store.getState());
        if (!Object.is(v, last)) {
          last = v;
          woke++;
        }
      }),
    );
  }
  woke = 0;

  const start = performance.now();
  for (let i = 0; i < UPDATES; i++) {
    store.setState({ field0: i });
  }
  const elapsed = performance.now() - start;
  for (const u of unsubs) u();
  void woke;
  return elapsed / UPDATES;
}

// ── B. trackRender tax ──────────────────────────────────────────────────────
// Per render = wrap state + read W fields. Reports per-render µs.

function blacTrackRenderTax(widthsRead: number): number {
  const bloc = new WideBloc();
  const interner = bloc.interner;
  const samples: number[] = [];
  const run = () => {
    const { value } = trackRender(bloc.state, interner);
    let sum = 0;
    for (let j = 0; j < widthsRead; j++) {
      sum += value[`field${j}` as keyof WideState] as number;
    }
    return sum;
  };
  for (let i = 0; i < WARMUP * 5; i++) void run();
  for (let i = 0; i < SAMPLES; i++) {
    const start = performance.now();
    for (let k = 0; k < 100; k++) void run(); // 100 renders/sample
    samples.push((performance.now() - start) / 100);
  }
  bloc.dispose();
  return median(trimHigh(samples));
}

function zustandSelectorTax(widthsRead: number): number {
  const store = createStore<WideState>(() => createWideState());
  const samples: number[] = [];
  const run = () => {
    const s = store.getState();
    let sum = 0;
    for (let j = 0; j < widthsRead; j++) {
      sum += s[`field${j}` as keyof WideState] as number;
    }
    return sum;
  };
  for (let i = 0; i < WARMUP * 5; i++) void run();
  for (let i = 0; i < SAMPLES; i++) {
    const start = performance.now();
    for (let k = 0; k < 100; k++) void run();
    samples.push((performance.now() - start) / 100);
  }
  return median(trimHigh(samples));
}

async function main(): Promise<void> {
  console.log(
    `Node ${process.version} — N=${N} consumers, ${UPDATES} updates/sample\n`,
  );

  // A — notify path
  const blacN: number[] = [];
  const zustN: number[] = [];
  for (let i = 0; i < 40; i++) {
    blacN.push(await blacNotify());
    zustN.push(await zustandNotify());
  }
  const b = median(trimHigh(blacN));
  const z = median(trimHigh(zustN));
  console.log(`## A. Notify path (per update, ${N} consumers, 5 wake)`);
  console.log(`| | per update | ratio |`);
  console.log(`|---|---|---|`);
  console.log(`| Blac auto-track | ${fmt(b)} | ${(b / z).toFixed(2)}x |`);
  console.log(`| Zustand+selector | ${fmt(z)} | 1.00x |`);

  // B — trackRender tax
  console.log(`\n## B. Per-render tracking tax (wrap + read W fields)`);
  console.log(
    `| fields read | Blac trackRender | Zustand selector read | ratio |`,
  );
  console.log(`|---|---|---|---|`);
  for (const w of [1, 4, 20]) {
    const bt = blacTrackRenderTax(w);
    const zt = zustandSelectorTax(w);
    console.log(
      `| ${w} | ${fmt(bt)} | ${fmt(zt)} | ${(bt / zt).toFixed(2)}x |`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

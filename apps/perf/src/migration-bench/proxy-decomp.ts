/**
 * Decompose trackRender cost into (a) allocation (new Set + new WeakMap +
 * new Proxy) vs (b) per-property recording work (Reflect.get + intern +
 * Set.add/delete). Proxy reuse can only recover (a); (b) happens every render
 * regardless. This tells us the ceiling on a reuse optimization.
 *
 * Also prototypes a reuse variant: ONE persistent top-level proxy per consumer
 * that reads live from `bloc.state` and resets its paths each render — to
 * measure the actual realized win for flat state.
 *
 * Run: tsx --tsconfig apps/perf/tsconfig.bench.json \
 *        apps/perf/src/migration-bench/proxy-decomp.ts
 */
import { performance } from 'node:perf_hooks';
import { Cubit } from '@blac/core';
import { trackRender, PathInterner } from '@dirtytalk/structural';
import type { PathId } from '@dirtytalk/structural';
import { createWideState, type WideState } from '../shared/types';

const SAMPLES = 600;
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const trimHigh = (xs: number[]): number[] => {
  const s = [...xs].sort((a, b) => a - b);
  return s.slice(0, Math.floor(s.length * 0.95));
};
const fmt = (ms: number) => `${(ms * 1000).toFixed(3)}µs`;

function bench(run: () => void): number {
  for (let i = 0; i < 5000; i++) run();
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const start = performance.now();
    for (let k = 0; k < 100; k++) run();
    samples.push((performance.now() - start) / 100);
  }
  return median(trimHigh(samples));
}

class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
}

// (a) Allocation-only: build the same three objects trackRender allocates,
// but do no property reads.
function allocOnly(interner: PathInterner, state: WideState): void {
  const paths = new Set<PathId>();
  const cache = new WeakMap<object, unknown>();
  const p = new Proxy(state, { get: (t, k, r) => Reflect.get(t, k, r) });
  void paths;
  void cache;
  void p;
}

// Reuse prototype: a single persistent proxy that reads live from the bloc and
// records into a reusable paths set, cleared each "render". Top-level only.
function makeReusableTracker(bloc: WideBloc) {
  const interner = bloc.interner;
  const paths = new Set<PathId>();
  const proxy = new Proxy(
    {},
    {
      get(_t, key) {
        if (typeof key === 'symbol') return undefined;
        paths.add(interner.intern(key as string));
        return (bloc.state as Record<string, unknown>)[key as string];
      },
    },
  ) as WideState;
  return {
    render(widthsRead: number): number {
      paths.clear();
      let sum = 0;
      for (let j = 0; j < widthsRead; j++) {
        sum += proxy[`field${j}` as keyof WideState] as number;
      }
      return sum;
    },
  };
}

function main(): void {
  console.log(`Node ${process.version}\n`);
  const bloc = new WideBloc();
  const interner = bloc.interner;
  const state = bloc.state;

  const alloc = bench(() => allocOnly(interner, state));
  const proxyOnly = bench(() => {
    const p = new Proxy(state, { get: (t, k, r) => Reflect.get(t, k, r) });
    void p;
  });
  const setWmOnly = bench(() => {
    const s = new Set<PathId>();
    const w = new WeakMap<object, unknown>();
    void s;
    void w;
  });
  console.log(`allocation only (Set + WeakMap + Proxy): ${fmt(alloc)}`);
  console.log(`  new Proxy alone:        ${fmt(proxyOnly)}`);
  console.log(`  new Set + new WeakMap:  ${fmt(setWmOnly)}\n`);

  console.log(`| fields | trackRender (fresh) | reuse (live-read) | recording-only est. | max reuse saving |`);
  console.log(`|---|---|---|---|---|`);
  for (const w of [1, 4, 20]) {
    const fresh = bench(() => {
      const { value } = trackRender(bloc.state, interner);
      let sum = 0;
      for (let j = 0; j < w; j++)
        sum += value[`field${j}` as keyof WideState] as number;
      void sum;
    });
    const tracker = makeReusableTracker(bloc);
    const reuse = bench(() => tracker.render(w));
    console.log(
      `| ${w} | ${fmt(fresh)} | ${fmt(reuse)} | ${fmt(fresh - alloc)} | ${fmt(fresh - reuse)} |`,
    );
  }
  bloc.dispose();
}

main();

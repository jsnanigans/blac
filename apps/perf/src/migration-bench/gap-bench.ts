/**
 * High-resolution headless runner for the four "Blac slower than Zustand"
 * pure-state scenarios (multi-store, cross-store, batch, derived).
 *
 * The browser dashboard clamps performance.now() to ~100µs (Spectre
 * mitigation), which quantizes every median and inflates the apparent ratio.
 * Node's performance.now() has sub-µs resolution, so this gives the real
 * per-operation delta. Reuses the exact bench bodies from the dashboard.
 *
 * Run: tsx --tsconfig apps/perf/tsconfig.bench.json \
 *        apps/perf/src/migration-bench/gap-bench.ts
 */
import { performance } from 'node:perf_hooks';
import { blacPureState } from '../libraries/blac/pure-state';
import { zustandPureState } from '../libraries/zustand/pure-state';
import type { PureStateBenchmark } from '../shared/types';

const OPS = [
  'derived state computation',
  'cross-store propagation',
  'multi-store coordination',
  'batch rapid updates',
] as const;

const WARMUP = 200;
const SAMPLES = 400;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
// Drop the top 5% (GC/JIT spikes) for a stable central estimate.
function trimHigh(xs: number[]): number[] {
  const s = [...xs].sort((a, b) => a - b);
  return s.slice(0, Math.floor(s.length * 0.95));
}

function measure(
  suite: PureStateBenchmark,
  op: string,
): { median: number; mean: number } {
  const fn = suite.operations[op];
  for (let i = 0; i < WARMUP; i++) {
    const h = suite.setup();
    fn(h);
    suite.teardown?.(h);
  }
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const h = suite.setup();
    const start = performance.now();
    fn(h);
    const end = performance.now();
    samples.push(end - start);
    suite.teardown?.(h);
  }
  const clean = trimHigh(samples);
  return { median: median(clean), mean: mean(clean) };
}

function fmt(ms: number): string {
  return `${(ms * 1000).toFixed(2)}µs`;
}

function main(): void {
  console.log(`Node ${process.version} — ${SAMPLES} samples/op (top 5% trimmed)\n`);
  console.log(
    `| operation | Blac median | Blac mean | Zustand median | Zustand mean | mean ratio |`,
  );
  console.log(`|---|---|---|---|---|---|`);
  for (const op of OPS) {
    const b = measure(blacPureState, op);
    const z = measure(zustandPureState, op);
    const ratio = z.mean > 0 ? (b.mean / z.mean).toFixed(2) : 'n/a';
    console.log(
      `| ${op} | ${fmt(b.median)} | ${fmt(b.mean)} | ${fmt(z.median)} | ${fmt(z.mean)} | ${ratio}x |`,
    );
  }
}

main();

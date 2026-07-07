# Benchmark workflow — `@dirtytalk/structural` hot paths

Benchmarks live at `packages/dirtytalk-structural/src/hotpath.bench.ts` and are
auto-discovered by vite-plus's vitest bench runner (`*.bench.ts`). They cover
the three hot paths flagged in this plan:

- **P4a** — `emit`'s `diffAlongSkeleton`/`getAt` segment re-derivation cost on
  deep dotted paths (4+ segments), scaled by consumer count.
- **P4b** — `patch`'s `_refineAncestorMarks` `startsWith`-scan over the *whole*
  skeleton, triggered on every atomic-leaf (array/class-instance) replacement.
- **P5** — `registerConsumerPaths`/`unregisterConsumer`'s `_recomputeSkeleton`,
  which unions every registered consumer's path set from scratch on every
  mount/unmount.

> **Two required flags, both learned the hard way:**
> - `--run` — bench **defaults to watch mode** and will hang forever without it.
> - the output/compare path is resolved relative to the **package cwd**
>   (`pnpm --filter … exec` runs inside `packages/dirtytalk-structural`), so the
>   repo-root plan folder is `../../plans/…`, not `plans/…`.

## Capture the BEFORE baseline

Run this against the current, pre-optimization code:

```fish
pnpm --filter @dirtytalk/structural exec vp test bench --run \
  --outputJson ../../plans/dirtytalk-perf-stability/bench-baseline.json
```

If engine source changed since the last build, rebuild it first — `structural`
imports `@dirtytalk/engine`'s built `dist`, not its source:

```fish
pnpm --filter @dirtytalk/engine build
```

## Diff after the optimization work lands

```fish
pnpm --filter @dirtytalk/structural exec vp test bench --run \
  --compare ../../plans/dirtytalk-perf-stability/bench-baseline.json
```

## Reading the output

Each benchmark reports ops/sec ± stddev over its sampling window (`time: 500`
ms per scenario in `hotpath.bench.ts`). `--compare` prints a per-benchmark
speedup/regression ratio against the baseline JSON.

### Captured baseline (2026-07-07, pre-optimization)

The numbers below are this machine's baseline — they demonstrate the findings
the plan targets. Re-capture on your own machine before comparing.

| Scenario | hz (ops/sec) | mean |
|----------|-------------:|-----:|
| P4a emit — 10 consumers | 322,388 | 3.1 µs |
| P4a emit — 100 consumers | 24,823 | 40.3 µs |
| P4a emit — 1000 consumers | 2,070 | 483 µs |
| P4b patch — 10-path skeleton | 437,314 | 2.3 µs |
| P4b patch — 100-path skeleton | 230,659 | 4.3 µs |
| P4b patch — 500-path skeleton | 236,733 | 4.2 µs |
| P5 register+unregister — N=100 | 569 | 1.76 ms |
| P5 register+unregister — N=500 | 5.49 | 182 ms |
| P5 register+unregister — N=1000 | 0.73 | 1.37 s |
| P5 register+unregister — N=2000 | 0.098 | **10.2 s** |

- **P5 is the headline**: N=100 → N=2000 is a **~5800× slowdown** for a 20×
  input increase — the textbook O(N²) signature of the from-scratch union.
- **P4a** shows ~156× from 10 → 1000 consumers (super-linear: per-emit
  `split('.')` re-derivation on deep paths compounds with skeleton size).
- **P4b** stays roughly flat 100 → 500 here because M=20 array descendants
  dominate the refine cost; the `startsWith`-scan overhead is the delta the P4
  fix should erase.

## Caveats

- Numbers are machine-specific. Capture the baseline and the comparison run on
  the **same machine**, ideally the **same session**, with the machine
  otherwise quiesced (no other CPU-heavy processes, laptop plugged in / not
  thermally throttled). Cross-machine or cross-session comparisons are not
  meaningful.
- `hotpath.bench.ts` registers no channel subscribers by design — it isolates
  the diff/union computation itself from wake-dispatch cost.
- **The baseline capture is slow (~3.5 min), almost entirely the P5 group** —
  `N=2000` costs ~10 s *per iteration* precisely because it is the O(N²) blowup
  under measurement. This cost is the "before"; after the P5 fix the same
  scenario should drop to milliseconds and the suite will run in seconds. The
  bench set (names + params) must stay identical across runs — `--compare`
  matches benchmarks by name.

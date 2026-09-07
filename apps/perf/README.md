# React State Management Benchmarks

A browser-based performance comparison tool for React state management libraries.

## Supported Libraries

- **Blac** — BlaC's Cubit + useBloc
- **Zustand** — Zustand store + useStore

More libraries (Redux Toolkit, Jotai, etc.) can be added by implementing the benchmark component contract.

## Quick Start

```bash
pnpm --filter perf dev
```

Open http://localhost:3001/

## Measurement Strategy

### Dual Measurement

Each benchmark operation is measured two ways:

1. **React.Profiler** — captures `actualDuration` (render time with memoization) and `baseDuration` (worst-case render time)
2. **performance.mark/measure** — end-to-end timing from trigger to paint, including state update + React reconciliation + DOM mutation

### Pure State Benchmarks

Raw state management throughput measured without React involvement. Instantiates state containers directly and measures operation speed.

### Statistical Rigor

- Configurable warmup runs (default: 5, discarded)
- Configurable measured runs (default: 20)
- Outlier removal (2.5 sigma from median via MAD)
- Reports: min, median, mean, p95, max, stddev

### Reading the numbers — caveats

Know these before drawing conclusions from a run:

- **Timer resolution is 5µs.** `vite.config.ts` sets COOP/COEP so `performance.now()` gets
  5µs resolution instead of the default 100µs clamp, but every measurement is still a
  multiple of 5µs. A row showing `StdDev 0µs / CV 0.0%` is **below the timer's resolution**,
  not perfectly stable. Treat differences under ~15µs (3 ticks) as noise, and don't chase
  a "1.10x slower" that is one tick wide.
- **Each pure-state sample is one run of the whole op body.** Most op bodies contain their
  own internal 1000-iteration loop, so the reported median is the cost of ~1000 operations,
  not one. Per-operation cost is roughly `median / 1000`.
- **`setup()` runs inside the measured loop**, once per sample, but outside the timed
  region. Only Blac defines a `teardown` (it disposes its containers); Zustand and Redux
  define none, so they leave their stores to GC.
- **Cross-library ops must do equivalent work.** Ops with no counterpart in another library
  are reported separately without ratios — see "Registry Lifecycle" in the generated report.
  When adding an op, make the comparison fair or mark it per-library.
- **Read-only ops measure JS property access.** `.state` / `getState()` is an O(1) field
  read in all three libraries, so `read 20 fields (baseline)` mostly measures the 20 dynamic
  `field${j}` lookups in the benchmark loop itself.

## Adding a New Library

1. Create `src/libraries/<name>/FrameworkBenchmark.tsx` — a React component accepting `onReady: (api: BenchmarkAPI) => void`
2. Create `src/libraries/<name>/pure-state.ts` — implements `PureStateBenchmark` interface
3. Register in `src/libraries/registry.ts`

The `BenchmarkAPI` contract:

- `run()` — create 1,000 rows
- `runLots()` — create 10,000 rows
- `add()` — append 1,000 rows
- `update()` — update every 10th row
- `clear()` — clear all rows
- `swapRows()` — swap rows at index 1 and 998

## Project Structure

```
apps/perf/
├── main.tsx                          # Entry point
├── index.html                        # HTML template
├── src/
│   ├── App.tsx                       # Root component
│   ├── shared/
│   │   ├── types.ts                  # BenchmarkAPI, result types
│   │   ├── data.ts                   # Shared data generation
│   │   └── stats.ts                  # Statistical analysis
│   ├── harness/
│   │   ├── BenchmarkRunner.ts        # Orchestration + measurement
│   │   ├── ProfilerWrapper.tsx       # React.Profiler wrapper
│   │   └── timing.ts                 # performance.mark/measure helpers
│   ├── libraries/
│   │   ├── blac/                     # Blac implementation
│   │   ├── zustand/                  # Zustand implementation
│   │   └── registry.ts              # Library lookup
│   ├── ui/
│   │   ├── Dashboard.tsx             # Main dashboard
│   │   ├── ResultsTable.tsx          # React benchmark results
│   │   ├── PureStateResults.tsx      # Pure state results
│   │   └── dashboard.css             # Styles
│   └── benchmarks/
│       └── JSFrameworkBenchmark.tsx   # Original standalone benchmark (preserved)
```

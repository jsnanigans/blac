# Plan: Generic React State Management Benchmarking Tool

## Decision

**Approach**: Build a harness with two contract interfaces (PureStateBenchmark + ReactBenchmark) where each library provides idiomatic implementations. The harness orchestrates runs, collects metrics via performance.now() and React.Profiler, computes statistics, and renders results in a tabbed dashboard.

**Why**: Idiomatic implementations avoid the adapter trap. Two separate contracts (pure state vs React) keep measurement layers clean and independently useful.

**Risk Level**: Medium (React.Profiler timing accuracy varies across React versions; GC noise requires statistical mitigation)

## TypeScript Contracts

```ts
// src/types.ts

interface DataItem {
  id: number;
  label: string;
}

type OperationName =
  | 'create1k'
  | 'create10k'
  | 'append1k'
  | 'updateEvery10th'
  | 'swapRows'
  | 'selectRow'
  | 'removeRow'
  | 'clear';

// --- Pure State Benchmark ---
interface PureStateBenchmark {
  name: string; // e.g. "blac"
  setup: () => void;
  teardown: () => void;
  operations: Record<OperationName, () => void>;
  getRowCount: () => number; // to verify correctness
}

// --- React Benchmark ---
interface ReactScenario {
  name: string;
  // The component tree to render (wraps its own Provider if needed)
  Root: React.ComponentType;
  // Returns trigger functions after mount. Called once after initial render.
  getTriggers: () => Record<OperationName, () => void>;
  // Reset state to empty for clean runs
  reset: () => void;
}

interface LibraryDefinition {
  id: string; // "blac" | "rtk" | "zustand"
  displayName: string;
  pureState: PureStateBenchmark;
  react: ReactScenario;
}

// --- Results ---
interface TimingSample {
  wallClock: number; // ms, performance.now() delta
  actualDuration?: number; // ms, from React.Profiler
  baseDuration?: number; // ms, from React.Profiler
}

interface AggregatedResult {
  operation: OperationName;
  library: string;
  samples: number;
  min: number;
  median: number;
  mean: number;
  p95: number;
  max: number;
  stddev: number;
}
```

## File Structure

```
apps/perf/
  main.tsx                          # app entry, renders <Dashboard />
  main.css                          # keep existing
  src/
    types.ts                        # contracts above
    data.ts                         # shared buildData(), word lists (extract from existing)
    stats.ts                        # statistical aggregation functions
    harness/
      PureStateRunner.ts            # runs PureStateBenchmark N times, returns AggregatedResult[]
      ReactRunner.tsx               # wraps ReactScenario in Profiler, triggers ops, collects
      RunnerConfig.ts               # { warmupRuns: 5, iterations: 50, gcDelay: 50 }
    libraries/
      registry.ts                   # exports LibraryDefinition[] from all libraries
      blac/
        pure.ts                     # PureStateBenchmark for Blac
        react.tsx                   # ReactScenario for Blac (refactored from existing)
        index.ts                    # exports LibraryDefinition
      rtk/
        pure.ts
        react.tsx
        index.ts
      zustand/
        pure.ts
        react.tsx
        index.ts
    ui/
      Dashboard.tsx                 # top-level: library picker, run controls, results
      ResultsTable.tsx              # table of AggregatedResult[] with bar charts via CSS
      BarCell.tsx                   # inline CSS bar for visual comparison
      RunControls.tsx               # start/stop, iteration count, warmup toggle
      StatusIndicator.tsx           # running/idle/complete
    benchmarks/
      JSFrameworkBenchmark.tsx      # KEEP as-is, accessible via tab for manual testing
```

## Implementation Steps

### Phase 1: Foundation (4 files)

1. **Create `src/types.ts`** - All interfaces above. This is the single source of truth.
2. **Create `src/data.ts`** - Extract `DataItem`, word arrays (A, C, N), `random()`, `buildData()`, and `nextId` counter from `JSFrameworkBenchmark.tsx`. Add a `resetIdCounter()` for deterministic runs.
3. **Create `src/stats.ts`** - Functions: `median(nums)`, `mean(nums)`, `stddev(nums)`, `percentile(nums, p)`, `aggregate(samples: TimingSample[], operation, library) => AggregatedResult`.
4. **Create `src/harness/RunnerConfig.ts`** - Default config object: `{ warmupRuns: 5, iterations: 30, gcDelayMs: 50, discardOutliers: true, outlierThreshold: 2.5 }` (2.5 sigma).

### Phase 2: Pure State Harness + Blac (3 files)

5. **Create `src/harness/PureStateRunner.ts`** - Takes a `PureStateBenchmark` + config. For each operation: calls `setup()`, runs `warmupRuns` executions (discarded), then runs `iterations` executions collecting `performance.now()` deltas. Between each run: calls `teardown()` then `setup()`. Optionally awaits a short setTimeout for GC opportunity. Returns `AggregatedResult[]`.
6. **Create `src/libraries/blac/pure.ts`** - Instantiates `Cubit` directly, implements all operations using `emit()`/`patch()`. Uses `buildData()` from shared `data.ts`. No React involved.
7. **Create `src/libraries/blac/index.ts`** - Exports `LibraryDefinition` (react scenario added in Phase 3).

### Phase 3: React Harness + Blac React (3 files)

8. **Create `src/harness/ReactRunner.tsx`** - Component that:
   - Accepts a `ReactScenario` and `RunnerConfig`
   - Renders `<React.Profiler id={scenario.name} onRender={collectMetric}>` wrapping `<scenario.Root />`
   - After mount, gets triggers via `scenario.getTriggers()`
   - Runs operations sequentially: for each operation, calls `scenario.reset()`, does warmup, then N iterations, collecting both `performance.now()` wall-clock AND Profiler's `actualDuration`/`baseDuration` from the `onRender` callback
   - Uses `requestAnimationFrame` + `setTimeout` between iterations to let React commit and flush
   - Reports results via callback prop `onComplete(results: AggregatedResult[])`
9. **Create `src/libraries/blac/react.tsx`** - Refactor existing `JSFrameworkBenchmark.tsx` into a `ReactScenario`. The component tree stays idiomatic (useBloc, memo, borrow). `getTriggers()` returns functions that call `borrow(DemoBloc).run()` etc. `reset()` calls `borrow(DemoBloc).clear()`.
10. **Keep `src/benchmarks/JSFrameworkBenchmark.tsx`** unchanged as a standalone manual test page.

### Phase 4: UI Dashboard (5 files)

11. **Create `src/ui/RunControls.tsx`** - Checkboxes for which libraries to include, iteration count input, "Run Pure State" and "Run React" buttons, warmup toggle.
12. **Create `src/ui/BarCell.tsx`** - Renders a `<td>` with an inline CSS `background: linear-gradient(...)` proportional to value vs max in column. Pure CSS, no chart library.
13. **Create `src/ui/ResultsTable.tsx`** - Renders `AggregatedResult[]` as an HTML table. Rows = operations, columns = libraries. Each cell shows median (bold) with p95 in smaller text. BarCell for visual comparison. Sortable by clicking column headers.
14. **Create `src/ui/StatusIndicator.tsx`** - Shows "Idle" / "Running: create1k (3/30)" / "Complete".
15. **Create `src/ui/Dashboard.tsx`** - Tabs: "Benchmark" (run controls + results) | "JS Framework Benchmark" (existing manual page). Holds all state in a simple `useState`/`useReducer`. No state library for the dashboard itself.

### Phase 5: RTK + Zustand Libraries (4 files)

16. **Create `src/libraries/rtk/pure.ts`** - Uses `configureStore` + `createSlice`. Dispatch actions directly. `createEntityAdapter` for normalized state.
17. **Create `src/libraries/rtk/react.tsx`** - `<Provider store={store}>` wrapper, `useSelector` + `useDispatch` in row components. Idiomatic RTK patterns.
18. **Create `src/libraries/zustand/pure.ts`** - `create()` store with actions. Call actions directly for pure state.
19. **Create `src/libraries/zustand/react.tsx`** - `useStore(selector)` pattern. No provider.

### Phase 6: Wire Up (2 files)

20. **Create `src/libraries/registry.ts`** - Imports all LibraryDefinitions, exports array. Adding a new library = add directory + add to registry.
21. **Update `main.tsx`** - Render `<Dashboard />` instead of `<JSFrameworkBenchmark />`.

## New Dependencies

Add to `package.json` dependencies:

- `@reduxjs/toolkit` (includes redux, immer, reselect)
- `react-redux`
- `zustand`

## React.Profiler Integration Detail

The `onRender` callback fires asynchronously after React commits. The ReactRunner must correlate profiler callbacks with the operation that triggered them:

1. Set a `currentOperation` ref before calling the trigger
2. In `onRender`, push `{ actualDuration, baseDuration }` to the current operation's sample array
3. After triggering, wait for `requestAnimationFrame(() => setTimeout(resolve, 0))` to ensure commit has happened and profiler has fired
4. This gives one sample per trigger call

For operations like "create10k" that cause a single large commit, this works directly. For operations that might batch or split commits, sum all profiler calls between trigger and next idle.

## Statistical Approach

- Warmup: 5 runs discarded (JIT compilation, lazy initialization)
- Iterations: 30 by default (configurable)
- Outlier removal: discard samples beyond 2.5 standard deviations from mean, then recompute
- Report: min, median, mean, p95, max, stddev
- Primary comparison metric: **median** (robust to outliers)
- GC mitigation: optional 50ms delay between iterations via `setTimeout`

## Acceptance Criteria

- [ ] Pure state benchmarks run for all 3 libraries producing AggregatedResult[]
- [ ] React benchmarks capture Profiler actualDuration for all operations
- [ ] Results table shows median/p95/stddev per operation per library
- [ ] Bar cells visually indicate relative performance
- [ ] Adding a 4th library requires only: new directory under `libraries/`, register in `registry.ts`
- [ ] Existing JSFrameworkBenchmark still accessible (tab or route)
- [ ] No adapter pattern -- each library's code reads idiomatically
- [ ] buildData shared across all libraries (identical data generation)

## Risks & Mitigations

**Main Risk**: React.Profiler `actualDuration` may not capture full paint cost; it only measures React's render phase work.
**Mitigation**: Report wall-clock alongside Profiler metrics. Label clearly what each measures.

**Risk**: GC pauses during iteration corrupt individual samples.
**Mitigation**: Outlier removal + median as primary metric + configurable GC delay.

**Risk**: RTK's `createEntityAdapter` normalized shape makes operations semantically different from array-based Blac/Zustand.
**Mitigation**: RTK implementation should use plain array state (like Blac/Zustand) as the primary benchmark, with an optional normalized variant as a separate scenario.

## Out of Scope

- Automated CI benchmarking / regression detection
- Memory profiling (heap snapshots)
- Server-side rendering benchmarks
- Concurrent React features (useTransition, Suspense)
- Chart library integration (CSS bars only)
- Persistent result storage / history comparison

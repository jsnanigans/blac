# Re-render Benchmark Implementation Plan

## Goal

Benchmark blac's automatic change detection (Proxy-based auto-tracking in `useBloc`) against other libraries. The key metric is **render count**: how many consumer components re-render when only a subset of state changes. Secondary metrics are render time and end-to-end time.

## Libraries to Compare

| Variant                   | Library            | Pattern                                             | Expected Behavior                                          |
| ------------------------- | ------------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| **Blac**                  | `@blac/react`      | `useBloc(Bloc)` — auto-tracked, no selectors        | Only consumers whose accessed properties changed re-render |
| **Zustand (selector)**    | `zustand`          | `useStore(store, s => s.fieldN)` — manual selectors | Only consumers whose selected value changed re-render      |
| **Zustand (no selector)** | `zustand`          | `useStore(store)` — no selector                     | ALL consumers re-render on any state change                |
| **React Context**         | `react`            | `useContext(Ctx)` — no selector mechanism           | ALL consumers re-render on any context value change        |
| **Redux Toolkit**         | `@reduxjs/toolkit` | `useSelector(s => s.fieldN)` — manual selectors     | Only consumers whose selected value changed re-render      |

This demonstrates that Blac achieves selector-level optimization **without writing selectors**.

## Benchmark Scenarios

### Scenario 1: `singleField`

- **State**: `WideState` (20 number fields: `field0`..`field19`)
- **Consumers**: 20 components, `Consumer_i` reads ONLY `state.field{i}`
- **Operation**: Update `field0` to `field0 + 1`
- **Optimal renders**: 1 (only `Consumer_0`)
- **Naive renders**: 20 (all consumers)

### Scenario 2: `manyConsumers`

- **State**: `WideState` (20 fields)
- **Consumers**: 100 components, `Consumer_i` reads `state.field{i % 20}` (5 consumers per field)
- **Operation**: Update `field0` to `field0 + 1`
- **Optimal renders**: 5 (consumers 0, 20, 40, 60, 80)
- **Naive renders**: 100 (all consumers)

### Scenario 3: `nestedPaths`

- **State**: `{ user: { profile: { name: string, age: number }, settings: { theme: string, lang: string } } }`
- **Consumers**: 4 components reading:
  - `Consumer_0`: `state.user.profile.name`
  - `Consumer_1`: `state.user.profile.age`
  - `Consumer_2`: `state.user.settings.theme`
  - `Consumer_3`: `state.user.settings.lang`
- **Operation**: Update `user.settings.theme` to new value
- **Optimal renders**: 1 (only `Consumer_2`)
- **Naive renders**: 4 (all consumers)

### Scenario 4: `mixedReads`

- **State**: `WideState` (20 fields)
- **Consumers**: 15 components with varied read patterns:
  - `Consumer_0..4` (narrow): each reads 1 field (`field0`..`field4`)
  - `Consumer_5..9` (medium): each reads 4 fields (`5→field0-3`, `6→field4-7`, `7→field8-11`, `8→field12-15`, `9→field16-19`)
  - `Consumer_10..14` (wide): each reads ALL 20 fields
- **Operation**: Update `field0` to `field0 + 1`
- **Optimal renders**: 7 (`Consumer_0` + `Consumer_5` + `Consumer_10..14`)
- **Naive renders**: 15 (all consumers)

### Scenario 5: `unrelatedUpdate`

- **State**: `WideState` (20 fields)
- **Consumers**: 10 components, `Consumer_i` reads ONLY `state.field{i}` (fields 0-9)
- **Operation**: Update `field15` to `field15 + 1` (NO consumer reads this field)
- **Optimal renders**: 0
- **Naive renders**: 10 (all consumers)

---

## Architecture

### New Tab in Dashboard

Add a 4th tab: **"Re-render Benchmarks"** alongside existing React Benchmarks, Pure State, and Detailed Report.

### Separate Registry

Re-render benchmarks have 5 library variants (vs 3 for existing benchmarks) and a different component shape, so they use a separate registry.

### Component Pattern

Each library variant exports a single component that accepts a `scenario` prop and dynamically renders the appropriate consumer tree:

```
<RerenderBenchmarkComponent scenario="singleField" onReady={api => ...} />
```

The component:

1. Sets up the state container for the given scenario
2. Renders consumer components with render counting
3. Exposes a `RerenderBenchmarkAPI` via `onReady` callback

### Render Counting

Each consumer increments a counter (stored in a shared ref array) in its render body. This is effectively free (single number increment) and doesn't interfere with timing measurements.

```tsx
// In each consumer's render body (NOT in useEffect):
renderCounts[consumerIndex] = (renderCounts[consumerIndex] ?? 0) + 1;
```

The parent component owns the ref and exposes it via the API.

### Harness

A new `runRerenderBenchmark()` function orchestrates measurement:

```
for each scenario:
  warmup:
    resetRenderCounts() → trigger() → delay()
  measured (N runs):
    resetRenderCounts() → profiler.reset() → measureEndToEnd(trigger) → collect renders + profiler metrics
  aggregate stats
```

---

## File Manifest

```
MODIFY  src/shared/types.ts                              — Add rerender types
CREATE  src/shared/rerender-scenarios.ts                  — Scenario definitions
CREATE  src/libraries/rerender-registry.ts                — Registry for rerender library variants
CREATE  src/libraries/blac/RerenderBenchmark.tsx           — Blac rerender component
CREATE  src/libraries/zustand/RerenderBenchmark.tsx        — Zustand (selector) rerender component
CREATE  src/libraries/zustand-no-selector/RerenderBenchmark.tsx — Zustand (no selector)
CREATE  src/libraries/react-context/RerenderBenchmark.tsx  — React Context rerender component
CREATE  src/libraries/redux-toolkit/RerenderBenchmark.tsx  — Redux Toolkit rerender component
CREATE  src/harness/RerenderRunner.ts                     — Rerender benchmark orchestration
CREATE  src/ui/RerenderResultsTable.tsx                   — Results display for rerender benchmarks
MODIFY  src/ui/Dashboard.tsx                              — Add rerender tab + controls
```

---

## Phase 1: Types & Shared Infrastructure

### 1A. Add types to `src/shared/types.ts`

Append after the existing types (after line 151):

```ts
// ── Re-render Benchmark Types ──

export type RerenderScenario =
  | 'singleField'
  | 'manyConsumers'
  | 'nestedPaths'
  | 'mixedReads'
  | 'unrelatedUpdate';

export const RERENDER_SCENARIO_LABELS: Record<RerenderScenario, string> = {
  singleField: 'Single Field Update (20 consumers)',
  manyConsumers: 'Many Consumers (100 consumers)',
  nestedPaths: 'Nested Path Tracking (4 consumers)',
  mixedReads: 'Mixed Read Patterns (15 consumers)',
  unrelatedUpdate: 'Unrelated Update (10 consumers)',
};

export interface RerenderBenchmarkAPI {
  trigger(): void;
  getRenderCounts(): number[];
  resetRenderCounts(): void;
  getConsumerCount(): number;
  getOptimalRenders(): number;
}

export interface RerenderBenchmarkProps {
  scenario: RerenderScenario;
  onReady: (api: RerenderBenchmarkAPI) => void;
}

export interface RerenderOperationResult {
  scenario: RerenderScenario;
  totalRenders: StatResult;
  optimalRenders: number;
  endToEnd: StatResult;
  renderActual: StatResult;
}

export interface RerenderLibraryResults {
  library: string;
  scenarios: RerenderOperationResult[];
  timestamp: number;
}

export interface RerenderLibraryDefinition {
  name: string;
  Component: React.ComponentType<RerenderBenchmarkProps>;
}
```

### 1B. Create `src/shared/rerender-scenarios.ts`

Defines the scenario metadata so components and harness can reference it:

```ts
import type { RerenderScenario } from './types';

export interface ScenarioConfig {
  scenario: RerenderScenario;
  consumerCount: number;
  optimalRenders: number;
  description: string;
}

export const SCENARIO_CONFIGS: Record<RerenderScenario, ScenarioConfig> = {
  singleField: {
    scenario: 'singleField',
    consumerCount: 20,
    optimalRenders: 1,
    description: '20 fields, 20 consumers each reading 1 field, update field0',
  },
  manyConsumers: {
    scenario: 'manyConsumers',
    consumerCount: 100,
    optimalRenders: 5,
    description: '20 fields, 100 consumers (5 per field), update field0',
  },
  nestedPaths: {
    scenario: 'nestedPaths',
    consumerCount: 4,
    optimalRenders: 1,
    description: 'Nested state, 4 consumers on different paths, update theme',
  },
  mixedReads: {
    scenario: 'mixedReads',
    consumerCount: 15,
    optimalRenders: 7,
    description:
      '15 consumers with varied read widths (1/4/20 fields), update field0',
  },
  unrelatedUpdate: {
    scenario: 'unrelatedUpdate',
    consumerCount: 10,
    optimalRenders: 0,
    description: '10 consumers reading fields 0-9, update field15 (unread)',
  },
};

export const ALL_RERENDER_SCENARIOS: RerenderScenario[] = [
  'singleField',
  'manyConsumers',
  'nestedPaths',
  'mixedReads',
  'unrelatedUpdate',
];
```

### 1C. Nested state type

Add to `src/shared/types.ts` (near the existing `NestedState`):

```ts
export interface DeepNestedState {
  user: {
    profile: { name: string; age: number };
    settings: { theme: string; lang: string };
  };
}

export function createDeepNestedState(): DeepNestedState {
  return {
    user: {
      profile: { name: 'Alice', age: 30 },
      settings: { theme: 'dark', lang: 'en' },
    },
  };
}
```

---

## Phase 2: Library Implementations

Each library creates a `RerenderBenchmark.tsx` file that exports a single React component conforming to `RerenderBenchmarkProps`. The component must handle ALL 5 scenarios.

### General Pattern

Every library's component follows this structure:

```tsx
export const XxxRerenderBenchmark: React.FC<RerenderBenchmarkProps> = ({
  scenario,
  onReady,
}) => {
  const renderCountsRef = useRef<number[]>([]);

  // Reset counts helper
  const resetRenderCounts = () => {
    renderCountsRef.current = new Array(
      SCENARIO_CONFIGS[scenario].consumerCount,
    ).fill(0);
  };

  // Initialize counts on mount
  useEffect(() => {
    resetRenderCounts();
  }, [scenario]);

  // State setup (library-specific)
  // ...

  // Expose API via onReady
  useEffect(() => {
    onReady({
      trigger: () => {
        /* library-specific state update */
      },
      getRenderCounts: () => [...renderCountsRef.current],
      resetRenderCounts,
      getConsumerCount: () => SCENARIO_CONFIGS[scenario].consumerCount,
      getOptimalRenders: () => SCENARIO_CONFIGS[scenario].optimalRenders,
    });
  }, [scenario]);

  // Render consumer tree based on scenario
  return <div>{/* scenario-specific consumers */}</div>;
};
```

Each consumer component does this in its render body (NOT in useEffect):

```tsx
renderCounts[myIndex] = (renderCounts[myIndex] ?? 0) + 1;
```

**CRITICAL**: Do NOT wrap consumer components in `React.memo()`. The benchmark tests library-level change detection, not React.memo.

**CRITICAL**: Consumer components must subscribe to state DIRECTLY via the library's hook (useBloc, useStore, useContext, useSelector), NOT receive data as props from the parent.

### 2A. Blac — `src/libraries/blac/RerenderBenchmark.tsx`

**State containers** (define inside the file):

```ts
class WideBloc extends Cubit<WideState> {
  constructor() {
    super(createWideState());
  }
  updateField0 = () => this.patch({ field0: this.state.field0 + 1 });
  updateField15 = () => this.patch({ field15: this.state.field15 + 1 });
}

class NestedBloc extends Cubit<DeepNestedState> {
  constructor() {
    super(createDeepNestedState());
  }
  updateTheme = () => {
    const current = this.state.user.settings.theme;
    this.emit({
      user: {
        ...this.state.user,
        settings: {
          ...this.state.user.settings,
          theme: current === 'dark' ? 'light' : 'dark',
        },
      },
    });
  };
}
```

**Consumer components** — use `useBloc()` with default auto-tracking:

```tsx
// For wide state scenarios
function WideFieldConsumer({
  index,
  fieldIndex,
  renderCounts,
}: {
  index: number;
  fieldIndex: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(WideBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  // Access ONLY the target field — auto-track records this
  const value = state[`field${fieldIndex}` as keyof WideState];
  return <div data-consumer={index}>{value}</div>;
}

// For nested state scenario
function NestedConsumer({
  index,
  path,
  renderCounts,
}: {
  index: number;
  path: 'name' | 'age' | 'theme' | 'lang';
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(NestedBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  // Access ONLY the target nested path
  let value: unknown;
  switch (path) {
    case 'name':
      value = state.user.profile.name;
      break;
    case 'age':
      value = state.user.profile.age;
      break;
    case 'theme':
      value = state.user.settings.theme;
      break;
    case 'lang':
      value = state.user.settings.lang;
      break;
  }
  return <div data-consumer={index}>{String(value)}</div>;
}

// For mixedReads — MEDIUM consumer reads 4 fields
function MixedMediumConsumer({
  index,
  startField,
  renderCounts,
}: {
  index: number;
  startField: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(WideBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  // Access 4 consecutive fields
  const v0 = state[`field${startField}` as keyof WideState];
  const v1 = state[`field${startField + 1}` as keyof WideState];
  const v2 = state[`field${startField + 2}` as keyof WideState];
  const v3 = state[`field${startField + 3}` as keyof WideState];
  return (
    <div data-consumer={index}>
      {v0},{v1},{v2},{v3}
    </div>
  );
}

// For mixedReads — WIDE consumer reads all 20 fields
function MixedWideConsumer({
  index,
  renderCounts,
}: {
  index: number;
  renderCounts: React.MutableRefObject<number[]>;
}) {
  const [state] = useBloc(WideBloc);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  // Access ALL fields
  let sum = 0;
  for (let i = 0; i < 20; i++) {
    sum += state[`field${i}` as keyof WideState] as number;
  }
  return <div data-consumer={index}>{sum}</div>;
}
```

**Trigger functions** by scenario:

| Scenario          | Trigger                            | Bloc         |
| ----------------- | ---------------------------------- | ------------ |
| `singleField`     | `borrow(WideBloc).updateField0()`  | `WideBloc`   |
| `manyConsumers`   | `borrow(WideBloc).updateField0()`  | `WideBloc`   |
| `nestedPaths`     | `borrow(NestedBloc).updateTheme()` | `NestedBloc` |
| `mixedReads`      | `borrow(WideBloc).updateField0()`  | `WideBloc`   |
| `unrelatedUpdate` | `borrow(WideBloc).updateField15()` | `WideBloc`   |

**Rendering logic**: Switch on `scenario` prop to render the appropriate consumer tree.

- `singleField`: 20x `WideFieldConsumer` with `fieldIndex={i}`
- `manyConsumers`: 100x `WideFieldConsumer` with `fieldIndex={i % 20}`
- `nestedPaths`: 4x `NestedConsumer` with paths `['name','age','theme','lang']`
- `mixedReads`: 5x narrow `WideFieldConsumer(field0..4)` + 5x `MixedMediumConsumer(startField=0,4,8,12,16)` + 5x `MixedWideConsumer`
- `unrelatedUpdate`: 10x `WideFieldConsumer` with `fieldIndex={i}` (fields 0-9)

**IMPORTANT**: Each scenario uses fresh Cubit instances. Use `instanceId` on `useBloc` calls to isolate per-scenario, OR create new Cubit classes per scenario to prevent state leakage. The simplest approach: create the Cubit classes at module level, but use `borrow()` with unique class references. Since the component unmounts between scenarios, the Cubit gets disposed and recreated.

### 2B. Zustand (selector) — `src/libraries/zustand/RerenderBenchmark.tsx`

**Store creation**:

```ts
function createWideStore() {
  return createStore<
    WideState & { updateField0: () => void; updateField15: () => void }
  >((set) => ({
    ...createWideState(),
    updateField0: () => set((s) => ({ field0: s.field0 + 1 })),
    updateField15: () => set((s) => ({ field15: s.field15 + 1 })),
  }));
}
```

**Consumer**: Uses selector to extract only the needed field:

```tsx
function WideFieldConsumer({ index, fieldIndex, store, renderCounts }) {
  const value = useStore(store, (s) => s[`field${fieldIndex}`]);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{value}</div>;
}
```

**For medium consumers (mixedReads)**: Use `useStore` with `shallow` from `zustand/shallow` to select multiple fields:

```tsx
import { shallow } from 'zustand/shallow';

function MixedMediumConsumer({ index, startField, store, renderCounts }) {
  const values = useStore(
    store,
    (s) => [
      s[`field${startField}`],
      s[`field${startField + 1}`],
      s[`field${startField + 2}`],
      s[`field${startField + 3}`],
    ],
    shallow,
  );
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{values.join(',')}</div>;
}
```

**For wide consumers**: `useStore(store)` with no selector (selects everything) — or use `shallow` on all 20 fields. Since wide consumers read ALL fields, any change triggers re-render regardless. Use `useStore(store, (s) => s)` which is functionally `useStore(store)`.

**For nested scenario**: Create a nested store, use selector to drill into the nested path:

```tsx
const value = useStore(nestedStore, (s) => s.user.settings.theme);
```

**Store**: Use `useRef(createWideStore())` in the component to create a fresh store per mount. Pass the store as a prop to consumers.

### 2C. Zustand (no selector) — `src/libraries/zustand-no-selector/RerenderBenchmark.tsx`

Same as 2B but consumers use `useStore(store)` WITHOUT any selector:

```tsx
function WideFieldConsumer({ index, fieldIndex, store, renderCounts }) {
  const state = useStore(store); // NO selector — subscribes to everything
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value = state[`field${fieldIndex}`];
  return <div data-consumer={index}>{value}</div>;
}
```

This is the "easy/naive" Zustand usage — same amount of code as Blac but without the optimization.

### 2D. React Context — `src/libraries/react-context/RerenderBenchmark.tsx`

**No external dependencies** — uses only React's built-in Context API.

**State management**: `useState` in the parent component, provided via `createContext`:

```tsx
const WideStateContext = createContext<WideState>(createWideState());
const NestedStateContext = createContext<DeepNestedState>(
  createDeepNestedState(),
);

export const ContextRerenderBenchmark: React.FC<RerenderBenchmarkProps> = ({
  scenario,
  onReady,
}) => {
  const [wideState, setWideState] = useState(createWideState);
  const [nestedState, setNestedState] = useState(createDeepNestedState);
  const renderCountsRef = useRef<number[]>([]);

  useEffect(() => {
    onReady({
      trigger: () => {
        if (scenario === 'nestedPaths') {
          setNestedState((prev) => ({
            user: {
              ...prev.user,
              settings: {
                ...prev.user.settings,
                theme: prev.user.settings.theme === 'dark' ? 'light' : 'dark',
              },
            },
          }));
        } else if (scenario === 'unrelatedUpdate') {
          setWideState((prev) => ({ ...prev, field15: prev.field15 + 1 }));
        } else {
          setWideState((prev) => ({ ...prev, field0: prev.field0 + 1 }));
        }
      },
      // ... other API methods
    });
  }, [scenario]);

  // Render consumers inside the Provider
  if (scenario === 'nestedPaths') {
    return (
      <NestedStateContext.Provider value={nestedState}>
        {/* 4 nested consumers */}
      </NestedStateContext.Provider>
    );
  }

  return (
    <WideStateContext.Provider value={wideState}>
      {/* scenario-specific consumers */}
    </WideStateContext.Provider>
  );
};
```

**Consumer**: Uses `useContext()` — always re-renders when provider value changes:

```tsx
function WideFieldConsumer({ index, fieldIndex, renderCounts }) {
  const state = useContext(WideStateContext); // re-renders on ANY change
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  const value = state[`field${fieldIndex}`];
  return <div data-consumer={index}>{value}</div>;
}
```

### 2E. Redux Toolkit — `src/libraries/redux-toolkit/RerenderBenchmark.tsx`

**Store setup**:

```ts
const wideSlice = createSlice({
  name: 'wide',
  initialState: createWideState(),
  reducers: {
    updateField0(state) {
      state.field0 += 1;
    },
    updateField15(state) {
      state.field15 += 1;
    },
  },
});

const nestedSlice = createSlice({
  name: 'nested',
  initialState: createDeepNestedState(),
  reducers: {
    updateTheme(state) {
      state.user.settings.theme =
        state.user.settings.theme === 'dark' ? 'light' : 'dark';
    },
  },
});
```

**Consumer**: Uses `useSelector` — only re-renders when selected value changes:

```tsx
function WideFieldConsumer({ index, fieldIndex, renderCounts }) {
  const value = useSelector((state: RootState) => state[`field${fieldIndex}`]);
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{value}</div>;
}
```

**Component**: Wraps in `<Provider store={store}>`, uses `useRef(createStore())` for fresh instances.

**For medium consumers (mixedReads)**: Use `useSelector` with `shallowEqual` from react-redux:

```tsx
import { shallowEqual } from 'react-redux';

function MixedMediumConsumer({ index, startField, renderCounts }) {
  const values = useSelector(
    (state: RootState) => [
      state[`field${startField}`],
      state[`field${startField + 1}`],
      state[`field${startField + 2}`],
      state[`field${startField + 3}`],
    ],
    shallowEqual,
  );
  renderCounts.current[index] = (renderCounts.current[index] ?? 0) + 1;
  return <div data-consumer={index}>{values.join(',')}</div>;
}
```

### 2F. Create `src/libraries/rerender-registry.ts`

```ts
import type { RerenderLibraryDefinition } from '../shared/types';
import { BlacRerenderBenchmark } from './blac/RerenderBenchmark';
import { ZustandSelectorRerenderBenchmark } from './zustand/RerenderBenchmark';
import { ZustandNoSelectorRerenderBenchmark } from './zustand-no-selector/RerenderBenchmark';
import { ContextRerenderBenchmark } from './react-context/RerenderBenchmark';
import { ReduxRerenderBenchmark } from './redux-toolkit/RerenderBenchmark';

export const rerenderLibraries: RerenderLibraryDefinition[] = [
  { name: 'Blac', Component: BlacRerenderBenchmark },
  { name: 'Zustand (selector)', Component: ZustandSelectorRerenderBenchmark },
  {
    name: 'Zustand (no selector)',
    Component: ZustandNoSelectorRerenderBenchmark,
  },
  { name: 'React Context', Component: ContextRerenderBenchmark },
  { name: 'Redux Toolkit', Component: ReduxRerenderBenchmark },
];
```

---

## Phase 3: Benchmark Harness

### Create `src/harness/RerenderRunner.ts`

```ts
import type { ProfilerHandle } from './ProfilerWrapper';
import type {
  RerenderBenchmarkAPI,
  RerenderLibraryResults,
  RerenderOperationResult,
  RerenderScenario,
} from '../shared/types';
import { ALL_RERENDER_SCENARIOS } from '../shared/rerender-scenarios';
import { computeStats, removeOutliers } from '../shared/stats';
import { delay, measureEndToEnd } from './timing';

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
```

**Main function**: `runRerenderBenchmark()`

This function is called ONCE per (library × scenario) combination. The Dashboard is responsible for mounting the correct component for each combination.

```ts
export async function runRerenderBenchmark(
  libraryName: string,
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

    // Collect render counts
    const totalRenders = api.getRenderCounts().reduce((a, b) => a + b, 0);
    renderCounts.push(totalRenders);

    // Collect profiler metrics
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
```

**IMPORTANT**: The Dashboard orchestrates the outer loop (for each library, for each scenario: mount component → wait for onReady → call runRerenderBenchmark → unmount). This is different from the existing CRUD benchmarks where one component handles all operations.

---

## Phase 4: Results Display

### Create `src/ui/RerenderResultsTable.tsx`

Displays a table with:

- **Rows**: Scenarios
- **Columns**: Library variants
- **Cell content**: Render count (primary, large), timing (secondary, small)
- **Color coding**: Based on how close render count is to optimal

```tsx
interface Props {
  results: RerenderLibraryResults[];
}
```

**Layout**: TWO tables (matching existing ResultsTable pattern):

**Table 1: Render Counts**

| Scenario                  | Blac    | Zustand (sel) | Zustand (no sel) | Context | Redux   |
| ------------------------- | ------- | ------------- | ---------------- | ------- | ------- |
| Single Field (optimal: 1) | **1.0** | **1.0**       | 20.0             | 20.0    | **1.0** |
| ...                       | ...     | ...           | ...              | ...     | ...     |

**Table 2: End-to-End Timing** (same layout as existing ResultsTable)

**Cell rendering for render counts**:

```tsx
function RenderCountCell({
  stat,
  optimal,
}: {
  stat: StatResult;
  optimal: number;
}) {
  const isOptimal = Math.abs(stat.median - optimal) < 0.5;
  const ratio =
    optimal > 0 ? stat.median / optimal : stat.median === 0 ? 1 : Infinity;
  const color = isOptimal
    ? 'var(--color-fastest)' // green — optimal
    : ratio <= 2
      ? 'var(--color-ok)' // orange — close
      : 'var(--color-slow)'; // red — many unnecessary renders

  return (
    <td style={{ color }}>
      <strong>{stat.median.toFixed(1)}</strong>
      <span className="stat-detail"> / {optimal} optimal</span>
      <br />
      <span className="stat-detail">±{stat.stddev.toFixed(1)}</span>
    </td>
  );
}
```

Special handling for `unrelatedUpdate` scenario: optimal is 0, so ratio calculation needs a guard. If optimal is 0 and actual is 0, it's green. If optimal is 0 and actual > 0, it's red.

---

## Phase 5: Dashboard Integration

### Modify `src/ui/Dashboard.tsx`

**Changes needed**:

1. **Add tab**: Change `Tab` type to include `'rerender'`:

   ```ts
   type Tab = 'react' | 'rerender' | 'pure-state' | 'report';
   ```

2. **Add state**:

   ```ts
   const [rerenderResults, setRerenderResults] = useState<
     RerenderLibraryResults[]
   >([]);
   const [selectedRerenderLibs, setSelectedRerenderLibs] = useState<
     Set<string>
   >(() => new Set(rerenderLibraries.map((l) => l.name)));
   const [selectedScenarios, setSelectedScenarios] = useState<
     Set<RerenderScenario>
   >(() => new Set(ALL_RERENDER_SCENARIOS));
   const [rerenderConfig, setRerenderConfig] = useState<RerenderRunConfig>(
     DEFAULT_RERENDER_CONFIG,
   );
   ```

3. **Add rerender tab button** between "React Benchmarks" and "Pure State" tabs.

4. **Add controls** for rerender tab:
   - Library checkboxes (5 variants from `rerenderLibraries`)
   - Scenario checkboxes (5 scenarios from `ALL_RERENDER_SCENARIOS` with labels)
   - Config inputs: warmup runs, measured runs

5. **Add orchestration function** `runRerenderBenchmarks()`:

```ts
const runRerenderBenchmarks = async () => {
  setRunning(true);
  setRerenderResults([]);
  const results: RerenderLibraryResults[] = [];

  const activeLibs = rerenderLibraries.filter((l) =>
    selectedRerenderLibs.has(l.name),
  );
  const activeScenarios = [...selectedScenarios];

  for (const lib of activeLibs) {
    const scenarioResults: RerenderOperationResult[] = [];

    for (const scenario of activeScenarios) {
      // Mount the library's component with current scenario
      // This requires a state variable to track: { lib, scenario }
      mountedRerenderRef.current = { lib: lib.name, scenario };
      setMountedRerender({ lib: lib.name, scenario });
      rerenderApiRef.current = null;

      // Wait for component to mount and call onReady
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (rerenderApiRef.current) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });

      if (!rerenderApiRef.current || !profilerRef.current) continue;

      setProgress(`${lib.name}: ${RERENDER_SCENARIO_LABELS[scenario]}...`);
      const result = await runRerenderBenchmark(
        lib.name,
        rerenderApiRef.current,
        profilerRef.current,
        scenario,
        { ...rerenderConfig, scenarios: activeScenarios },
        (s, phase, current, total) => {
          setProgress(
            `${lib.name}: ${RERENDER_SCENARIO_LABELS[s]} — ${phase} ${current}/${total}`,
          );
        },
      );
      scenarioResults.push(result);
    }

    results.push({
      library: lib.name,
      scenarios: scenarioResults,
      timestamp: Date.now(),
    });
  }

  setMountedRerender(null);
  setRerenderResults(results);
  setProgress('');
  setRunning(false);
};
```

6. **Add state for mounted rerender component**:

   ```ts
   const [mountedRerender, setMountedRerender] = useState<{
     lib: string;
     scenario: RerenderScenario;
   } | null>(null);
   const mountedRerenderRef = useRef<{
     lib: string;
     scenario: RerenderScenario;
   } | null>(null);
   const rerenderApiRef = useRef<RerenderBenchmarkAPI | null>(null);
   ```

7. **Render the mounted rerender component** (in the benchmark-viewport div):

   ```tsx
   {
     tab === 'rerender' && mountedRerender && MountedRerenderComponent && (
       <div className="benchmark-viewport">
         <ProfilerWrapper
           id={`${mountedRerender.lib}-${mountedRerender.scenario}`}
           ref={profilerRef}
         >
           <MountedRerenderComponent
             scenario={mountedRerender.scenario}
             onReady={(api) => {
               rerenderApiRef.current = api;
             }}
           />
         </ProfilerWrapper>
       </div>
     );
   }
   ```

   Where `MountedRerenderComponent` is resolved from the registry:

   ```ts
   const MountedRerenderComponent = mountedRerender
     ? rerenderLibraries.find((l) => l.name === mountedRerender.lib)?.Component
     : null;
   ```

8. **Render results**:

   ```tsx
   {
     tab === 'rerender' && <RerenderResultsTable results={rerenderResults} />;
   }
   ```

9. **Update the Run button** to call `runRerenderBenchmarks` when on the rerender tab:

   ```tsx
   onClick={
     tab === 'react' ? runReactBenchmarks
       : tab === 'rerender' ? runRerenderBenchmarks
       : runPureBenchmarks
   }
   ```

10. **Update export function** to include rerender results:
    ```ts
    const data = {
      react: reactResults,
      rerender: rerenderResults,
      pureState: pureResults,
      // ...
    };
    ```

---

## Implementation Order

Agents should implement in this order (phases can be parallelized where noted):

### Step 1: Types & Infrastructure (Phase 1)

- Modify `src/shared/types.ts` — add all new types
- Create `src/shared/rerender-scenarios.ts`

### Step 2: Library Implementations (Phase 2) — can parallelize across libraries

- Create `src/libraries/blac/RerenderBenchmark.tsx`
- Create `src/libraries/zustand/RerenderBenchmark.tsx`
- Create `src/libraries/zustand-no-selector/RerenderBenchmark.tsx`
- Create `src/libraries/react-context/RerenderBenchmark.tsx`
- Create `src/libraries/redux-toolkit/RerenderBenchmark.tsx`
- Create `src/libraries/rerender-registry.ts`

### Step 3: Harness (Phase 3)

- Create `src/harness/RerenderRunner.ts`

### Step 4: UI (Phases 4-5) — depends on Steps 1-3

- Create `src/ui/RerenderResultsTable.tsx`
- Modify `src/ui/Dashboard.tsx`

---

## Key Constraints & Gotchas

1. **No `React.memo` on consumer components** — we're testing the library's change detection, not React's memoization.

2. **Render counting in render body, not useEffect** — `useEffect` runs after paint and doesn't count correctly with batching. The counter must be incremented synchronously during render.

3. **Fresh state per mount** — each scenario mount must start with fresh state. For Blac, the Cubit is auto-created when `useBloc` runs and disposed on unmount. For Zustand/Redux, use `useRef(createStore())`. For Context, use `useState(createInitialState)`.

4. **The `trigger()` function must be stable** — it should reference the store/bloc via ref or closure, not via state. The `onReady` callback fires once on mount; the trigger must work for the lifetime of the component.

5. **Blac instance isolation** — since multiple scenarios use `WideBloc`, but the component unmounts between scenarios, the Cubit is naturally disposed and recreated. However, if Blac uses singleton pattern, you may need `instanceId` to force separate instances. Test this — if state leaks between scenario mounts, add unique `instanceId` per scenario.

6. **Zustand `shallow` import** — use `import { shallow } from 'zustand/shallow'` for the medium/wide consumer selectors in the Zustand (selector) variant. Verify this package is available (it's part of zustand).

7. **React Context re-render guarantee** — `useContext` ALWAYS re-renders when the provider value changes (object identity). Since `useState` returns a new object on each `setState`, all consumers will re-render. This is the expected "naive" baseline.

8. **profileRef sharing** — the same `profilerRef` from the Dashboard can be reused for rerender benchmarks. The ProfilerWrapper wraps the mounted component.

9. **Run button visibility** — the Run button should appear on the rerender tab. Currently it only shows for react/pure-state tabs because the report tab has `{tab !== 'report' && ...}`. Change to `{tab !== 'report' && ...}` which already includes rerender.

10. **State type for `field0` etc.** — the existing `WideState` in types.ts has `field0: number` through `field19: number`. Use dynamic access: `state[`field${i}` as keyof WideState]`. The consumer only needs to READ the value to trigger auto-tracking.

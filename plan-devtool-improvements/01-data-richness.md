# Data Richness — Dependency Graph, Action Tracking & Performance Metrics

Make the devtools capture and surface the *full picture* of what's happening inside a BlaC app, not just state snapshots.

---

## Phase 1: Action / Event Tracking

**Goal:** Show *why* state changed, not just *what* changed. For Blocs this means the event that triggered the transition; for Cubits it means the method name.

### Tasks

- [ ] **Core: capture trigger metadata in `onStateChanged` hook**
  - Add an optional `trigger` field to the `onStateChanged` plugin callback signature: `{ type: 'event' | 'method', name: string, payload?: unknown }`
  - For Blocs: intercept `add(event)` to attach the event class name and payload before the state transition fires
  - For Cubits: use the callstack (already partially captured) to extract the method name that called `emit()`
  - Ensure backward compatibility — trigger is optional, existing plugins don't break

- [ ] **devtools-connect: propagate trigger through the pipeline**
  - Add `trigger` to `StateSnapshot` type
  - Serialize trigger payload with `safeSerialize()` (same depth/size limits)
  - Include trigger in `instance-updated` events sent to subscribers
  - Add trigger to `DevToolsStateManager` snapshot storage

- [ ] **devtools-extension: forward trigger in messages**
  - Add `trigger` to `PanelInstance` and `AtomicUpdate` message types
  - Transform trigger in inject-script's format conversion layer

- [ ] **devtools-ui: display trigger in StateHistoryView**
  - Show trigger badge next to each history entry (e.g. `CounterIncremented` or `increment()`)
  - Add trigger detail expansion (click to see full event payload)
  - Add trigger column to LogsView with filtering by trigger name

- [ ] **devtools-ui: add "Actions" tab (optional, can be Phase 2)**
  - Dedicated timeline view grouped by trigger → resulting state change
  - Replay button: re-dispatch the same event to the bloc

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `@blac/core` | `StateContainer.ts`, `Bloc.ts`, `Cubit.ts` | Emit trigger metadata |
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Capture & store trigger |
| `devtools-connect` | `DevToolsStateManager.ts` | Add trigger to snapshot |
| `devtools-connect` | `types/index.ts` | New `Trigger` type |
| `devtools-extension` | `inject/inject-script.ts`, `panel/comm.ts` | Forward trigger |
| `devtools-ui` | `StateHistoryView.tsx`, `LogsView.tsx` | Render trigger |

---

## Phase 2: Dependency Graph

**Goal:** Visualize which blocs depend on each other via `this.depend()`, so developers can trace cascading updates and understand coupling.

### Tasks

- [ ] **Core: track dependency registrations**
  - In `StateContainer.depend()`, emit a plugin hook: `onDependencyRegistered(dependent, dependency)`
  - Store the dependency edge: `{ from: instanceId, to: instanceId, fromClass: string, toClass: string }`

- [ ] **devtools-connect: collect dependency edges**
  - Add `dependencies` field to `InstanceMetadata`: `Array<{ targetId: string, targetClass: string }>`
  - On `onDependencyRegistered`, update the instance's metadata and emit event
  - New event type: `'dependency-registered'`
  - Handle disposal: when a dependency target is disposed, mark the edge as broken

- [ ] **devtools-connect: expose dependency data in global API**
  - Add `getDependencyGraph()` method to `window.__BLAC_DEVTOOLS__`
  - Returns `{ nodes: InstanceNode[], edges: DependencyEdge[] }`

- [ ] **devtools-extension: forward dependency data**
  - Include dependency edges in `INITIAL_STATE` payload
  - Forward `dependency-registered` as atomic update

- [ ] **devtools-ui: dependency list in StateViewer**
  - Add a "Dependencies" collapsible section in StateViewer
  - List direct dependencies with links (click to navigate to that instance)
  - List reverse dependencies ("depended on by")

- [ ] **devtools-ui: graph visualization (new tab or modal)**
  - Add a "Graph" tab to DevToolsHeader
  - Render a directed graph using a lightweight layout algorithm (dagre or custom force-directed)
  - Keep it simple: nodes = instances (colored by class), edges = depend() relationships
  - No external graph library — use SVG with simple positioning to keep bundle small
  - Highlight path when an instance is selected
  - Show update propagation animation: when a state change cascades, animate the edges

### Dependency graph rendering approach

Keep it minimal — no heavy graph library. Options:

1. **SVG + dagre-lite layout** — compute positions server-side (in a bloc), render SVG nodes/edges. ~5KB.
2. **CSS grid tree** — if the graph is mostly tree-shaped, a simple recursive grid layout works.
3. **Canvas** — better for large graphs (100+ nodes) but harder to make interactive.

Recommend option 1 for Phase 2, upgrade to canvas in Phase 4 if needed.

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `@blac/core` | `StateContainer.ts` | Emit dependency hook |
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Track edges |
| `devtools-connect` | `types/index.ts` | `DependencyEdge` type |
| `devtools-ui` | `StateViewer.tsx` | Dependencies section |
| `devtools-ui` | `components/DependencyGraph.tsx` | New component |
| `devtools-ui` | `blocs/DevToolsDependencyBloc.ts` | New bloc for graph state |

---

## Phase 3: Performance Metrics

**Goal:** Surface quantitative data about bloc behavior — update frequency, state size, render cost — so developers can spot performance problems.

### Tasks

- [ ] **devtools-connect: collect timing data**
  - Record `Date.now()` on every `onStateChanged` call per instance
  - Compute rolling metrics (last 60 seconds): updates/sec, avg interval between updates, max burst rate
  - Estimate serialized state size (`JSON.stringify(state).length`) — cache to avoid repeated serialization
  - Store metrics in `DevToolsStateManager` alongside instance state
  - Expose via `getPerformanceMetrics(instanceId?)` on global API

- [ ] **devtools-connect: detect anomalies**
  - Flag instances updating more than N times/sec (configurable threshold, default 30)
  - Flag instances with state size > 100KB
  - Flag instances with circular dependency chains
  - Emit `'performance-warning'` event type

- [ ] **devtools-ui: metrics bar in StateViewer**
  - Enhance existing metrics bar (currently shows created time, change count, last update)
  - Add: updates/sec sparkline (tiny inline chart), state size badge, warning indicators
  - Color-code: green (normal), yellow (elevated), red (anomaly)

- [ ] **devtools-ui: performance overview panel**
  - Add a "Performance" tab to DevToolsHeader
  - Table view: all instances sorted by update frequency or state size
  - Columns: instance, class, updates/sec, total updates, state size, warnings
  - Click row to navigate to instance detail
  - Highlight rows with active warnings

- [ ] **devtools-ui: update frequency timeline**
  - Simple horizontal bar chart showing update density over time (last 60s)
  - One row per active instance
  - Helps spot "thundering herd" patterns where many blocs update simultaneously

### Metrics data model

```typescript
interface InstanceMetrics {
  instanceId: string;
  totalUpdates: number;
  updatesPerSecond: number;       // rolling 5s window
  avgUpdateInterval: number;      // ms
  maxBurstRate: number;           // peak updates/sec in any 1s window
  stateSizeBytes: number;         // estimated
  lastUpdateTimestamp: number;
  warnings: PerformanceWarning[];
}

interface PerformanceWarning {
  type: 'high-frequency' | 'large-state' | 'circular-dependency';
  message: string;
  threshold: number;
  actual: number;
}
```

### Files to modify

| Package | File | Change |
|---------|------|--------|
| `devtools-connect` | `DevToolsBrowserPlugin.ts` | Collect timing data |
| `devtools-connect` | `DevToolsStateManager.ts` | Store metrics |
| `devtools-connect` | `types/index.ts` | Metrics types |
| `devtools-ui` | `StateViewer.tsx` | Enhanced metrics bar |
| `devtools-ui` | `components/PerformancePanel.tsx` | New component |
| `devtools-ui` | `components/UpdateTimeline.tsx` | New component |
| `devtools-ui` | `blocs/DevToolsMetricsBloc.ts` | New bloc |

---

## Phase 4: Async Operation Tracking (Future)

**Goal:** Track async operations within blocs — loading states, in-flight requests, error recovery.

### Tasks (scoped but not scheduled)

- [ ] Instrument `AsyncCubit` / async event handlers to emit `operation-started` and `operation-completed` events
- [ ] Show in-flight operations in StateViewer with elapsed time
- [ ] Timeline view of async operations with waterfall visualization
- [ ] Correlate async operations with state changes they produce

This phase depends on core async primitives being stabilized first.

---

## Success Criteria

- A developer can open devtools and immediately see *what event* caused a state change, not just the before/after diff
- Dependency relationships are visible without reading source code
- Performance problems (tight update loops, oversized state) are surfaced automatically with warnings
- All new data flows through the existing plugin → extension → UI pipeline with no new communication channels

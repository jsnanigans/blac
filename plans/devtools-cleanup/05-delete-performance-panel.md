---
task: 05-delete-performance-panel
lane: B (UI package, serial)
parallel_safe: false
model: haiku
effort: low
depends_on: [04-delete-dependency-graph]
---

# 05 — Delete PerformancePanel (the tab)

PerformancePanel is being removed as a separate tab. The most useful signals (large state size, high update rate) will be surfaced inline next to each instance in task `07`. This task deletes the tab; task `07` adds the replacement.

We also delete `DevToolsMetricsBloc` here — task `07` will introduce a lighter inline computation rather than reuse this bloc.

## Files to delete

- `packages/devtools-ui/src/components/PerformancePanel.tsx`
- `packages/devtools-ui/src/blocs/DevToolsMetricsBloc.ts`

## Files to edit

- `packages/devtools-ui/src/components/index.ts` — remove `PerformancePanel` export (line ~13).
- `packages/devtools-ui/src/blocs/index.ts` — remove `DevToolsMetricsBloc` export and the `InstanceMetrics` type re-export.
- `packages/devtools-ui/src/DevToolsPanel.tsx`:
  - Remove `PerformancePanel` from the `components` import (line 22).
  - Remove `DevToolsMetricsBloc` from the `blocs` import (line 14).
  - Remove the `useBloc(DevToolsMetricsBloc)` call (line 156).
  - Remove the `activeTab === 'Performance'` branch (lines 189–192).
  - Remove the `DevToolsMetricsBloc` re-export at the bottom (line 208).
- `packages/devtools-ui/src/components/DevToolsHeader.tsx` — remove `'Performance'` from `TABS` (line 7).
- `packages/devtools-ui/src/blocs/DevToolsLayoutBloc.ts` — remove `'Performance'` from `TabName`.
- `packages/devtools-ui/src/index.tsx`:
  - Remove `DevToolsMetricsBloc` export (line 29).
  - Remove `InstanceMetrics` from the type re-export on line 41.
- `packages/devtools-ui/src/DraggableOverlay.tsx` — if any code feeds the metrics bloc (probably via event subscription on state changes), remove it. Search for `metricsBloc` / `DevToolsMetricsBloc` / `recordUpdate`.

## Check (before editing)

```sh
grep -rn "PerformancePanel\|DevToolsMetricsBloc\|InstanceMetrics\|recordUpdate\|'Performance'" packages/devtools-ui
```

Every hit should be something this task removes.

## Verify

```sh
pnpm --filter @blac/devtools-ui typecheck
```

## Commit

```
chore(devtools-ui): remove PerformancePanel and metrics bloc
```

Body (optional): "Replaced in 07-instance-insights by inline insight badges on each instance row."

## Checklist

- [x] Deleted `PerformancePanel.tsx` and `DevToolsMetricsBloc.ts`.
- [x] Removed `'Performance'` tab from `DevToolsHeader` and `DevToolsPanel`.
- [x] Removed metrics-feeding code from `DraggableOverlay`.
- [x] Removed exports from `index.tsx`, `components/index.ts`, `blocs/index.ts`.
- [x] `TabName` no longer includes `'Performance'`.
- [x] No remaining references to deleted symbols.
- [x] Typecheck passes.
- [x] Committed.

## Completion

SHA: (pending)
Files deleted: 2 (PerformancePanel.tsx, DevToolsMetricsBloc.ts)
Files modified: 9
Typecheck: devtools-ui (pre-existing TS2686 noise), devtools-extension (passing)
Note: Replaced by inline insights in 07-instance-insights.

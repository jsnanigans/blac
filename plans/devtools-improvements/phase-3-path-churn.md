# Phase 3 — Path churn heatmap

**Model:** Sonnet 4.6 (escalate to Opus 4.8 only if the ring-buffer/aggregation
design fights you) · **Effort:** medium-high · **Runs:** after Phase 2
**Changeset:** ✔ (`@blac/devtools-ui`)

This phase also edits `StateViewer.tsx`, so it must run **after Phase 2 commits**
(they'd otherwise collide on that file).

## Goal
Show *which state paths change most* over a rolling window, as a small per-path
heatmap/bar list in the detail panel. Pairs with the existing 10s update-rate
buffer: that tells you *how often* an instance changes; this tells you *what*.

## Design
- New **`DevToolsChurnBloc`** keeps, per instanceId, a rolling window
  (reuse the 10s window + ring-buffer approach from `DevToolsInstancesBloc`'s
  `updateTimestamps`) of `{ path, timestamp }` records. The changed paths per
  update already arrive on `instance-updated` (`d.paths`) and are routed in the
  panel — feed them to the churn bloc from the same routing sites.
- A getter `getChurn(instanceId): { path: string; count: number }[]` returns paths
  ranked by change frequency in the window (drop `'all'` updates or bucket them
  under a synthetic `<all>` row — your call; document it).
- New **`PathChurnView`** component renders the ranked paths as horizontal bars
  (width ∝ count, `T.bgAccent` fill) with the count. Cap to top N (e.g. 8) and
  `log()`-style note "+M more" if truncated — never silently drop.
- Wire a collapsible **"Path churn"** section into `StateViewer` using the
  `isChurnExpanded` toggle (added in Phase 0).

## Files
- `packages/devtools-ui/src/blocs/DevToolsChurnBloc.ts` *(new)*
- `packages/devtools-ui/src/blocs/index.ts` (export the new bloc)
- `packages/devtools-ui/src/components/PathChurnView.tsx` *(new)*
- `packages/devtools-ui/src/components/StateViewer.tsx` (insert section)
- `apps/devtools-extension/src/panel/index.tsx` (feed churn bloc on `instance-updated`)
- `packages/devtools-ui/src/DraggableOverlay.tsx` (feed churn bloc — overlay path)

## Key context (verify against current code)
- `DevToolsInstancesBloc.updateInstanceState` already receives `lastPaths` and
  keeps a 10s `updateTimestamps` ring buffer (`UPDATE_RATE_WINDOW_MS = 10_000`,
  `UPDATE_RING_MAX = 200`) — **copy that pruning pattern** for per-path records.
- Both `panel/index.tsx` (`instance-updated` case) and `DraggableOverlay.tsx`
  (`instance-updated` case) decode `d.paths`/`paths` and call
  `updateInstanceState`. Add a parallel `churnBloc.record(id, paths, now)` call at
  both sites. Acquire `DevToolsChurnBloc` the same way other panel blocs are
  acquired (`acquire(DevToolsChurnBloc, { refId })`) and release on cleanup.
- The detail panel reads the selected instance's churn via the bloc (mirror how
  `getUpdatesIn10s` is read in `StateViewer`).

## Tests (required for the bloc logic)
Unit-test `DevToolsChurnBloc`: recording paths increments counts; entries outside
the window are pruned; `getChurn` returns descending order; `'all'` handled per
your documented choice. `import { describe, it, expect } from 'vite-plus/test'`.

## Cycle
Shared protocol, scoped to `@blac/devtools-ui`:
`format → format:check → lint → typecheck → test`.
- Changeset: `@blac/devtools-ui` `patch` — "Per-path churn heatmap in detail panel."
- Commit: `feat(devtools-ui): add per-path churn heatmap`
- `panel/index.tsx` / `DraggableOverlay.tsx` edits in `@blac/devtools-ext`/`-ui`
  respectively; only `@blac/devtools-ui` is published → one changeset.

## Done when
- Churn bloc tracks per-path frequency in a pruned rolling window with tests.
- Detail panel shows a ranked, truncation-honest path heatmap for the selection.
- Both the extension panel and in-app overlay feed the bloc. Listed files only.

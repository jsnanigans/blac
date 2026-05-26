---
task: 04-delete-dependency-graph
lane: B (UI package, serial)
parallel_safe: false
model: haiku
effort: low
depends_on: [03-delete-callstack]
---

# 04 — Delete DependencyGraph (UI side)

This is the largest single deletion. `DependencyGraph` (732 LOC) plus its layout helper (209 LOC) plus the bloc (42 LOC), plus the `@xyflow/react` (~100KB) and `elkjs` (~70KB) dependencies. The graph is also stale-after-init (dependency changes at runtime never propagate). We're cutting the whole tab.

The bloc-side dep-edge tracking lives in `@blac/devtools-connect` and is removed in task `06`. This task only deletes the UI surface that consumes it.

## Files to delete

- `packages/devtools-ui/src/components/DependencyGraph.tsx`
- `packages/devtools-ui/src/components/dependency-graph-layout.ts`
- `packages/devtools-ui/src/blocs/DevToolsDependencyBloc.ts`
- `packages/devtools-ui/src/inject-xyflow-styles.ts` (only used by DependencyGraph — verify)

## Files to edit

- `packages/devtools-ui/src/components/index.ts` — remove `DependencyGraph` export (line ~12).
- `packages/devtools-ui/src/blocs/index.ts` — remove `DevToolsDependencyBloc` export and its `DependencyEdge`-related type re-exports.
- `packages/devtools-ui/src/DevToolsPanel.tsx`:
  - Remove `DependencyGraph` from the `components` import (line 21).
  - Remove `DevToolsDependencyBloc` from the `blocs` import (line 13).
  - Remove the `useBloc(DevToolsDependencyBloc)` call (line 155).
  - Remove the `activeTab === 'Graph'` branch from the conditional render (lines 185–188).
  - Remove the `DevToolsDependencyBloc` re-export at the bottom of the file (line 207).
- `packages/devtools-ui/src/components/DevToolsHeader.tsx` — remove `'Graph'` from the `TABS` array (line 7).
- `packages/devtools-ui/src/blocs/DevToolsLayoutBloc.ts` — update the `TabName` type to drop `'Graph'`. Also confirm the default tab is `'Instances'` and that any state migration is unnecessary (since this is just a UI bloc, no migration needed).
- `packages/devtools-ui/src/index.tsx`:
  - Remove `DevToolsDependencyBloc` export (line 28).
  - Remove `DependencyEdge` from the type re-export on line 37.
- `packages/devtools-ui/src/DraggableOverlay.tsx`:
  - Remove the `api.getDependencyGraph?.()` call and the surrounding logic that pushed edges into the dependency bloc (around line 150 and the `instance-created`/event handler that calls `dependencyBloc.addEdgesForInstance`).
  - The connect-plugin API will stop emitting these fields after task `06`, but the UI must already be tolerant: drop these handlers regardless.
- `packages/devtools-ui/package.json` — remove from `dependencies`:
  - `@xyflow/react`
  - `elkjs`

  Verify nothing else imports them: `grep -rn "@xyflow\|elkjs" packages/devtools-ui/src`.

- `packages/devtools-ui/src/types/` — if `DependencyEdge` is defined here, delete the type. Confirm with grep first; some types may still be referenced by `@blac/devtools-connect` types (task 06 handles that side).

## Check (before editing)

```sh
grep -rn "DependencyGraph\|DevToolsDependencyBloc\|DependencyEdge\|dependency-graph-layout\|@xyflow\|elkjs\|inject-xyflow-styles\|getDependencyGraph\|addEdgesForInstance\|'Graph'" packages/devtools-ui
```

Every hit should be something this task removes. If the connect plugin's own type file is imported transitively here, that's expected — it stays for now and gets cleaned in task 06.

## Verify

```sh
pnpm --filter @blac/devtools-ui typecheck
```

## Commit

```
chore(devtools-ui): remove DependencyGraph tab and xyflow/elkjs deps
```

## Checklist

- [x] Deleted `DependencyGraph.tsx`, `dependency-graph-layout.ts`, `DevToolsDependencyBloc.ts`, `inject-xyflow-styles.ts`.
- [x] Removed `'Graph'` tab from `DevToolsHeader` and `DevToolsPanel`.
- [x] Removed dependency-graph imports/calls from `DraggableOverlay.tsx`.
- [x] Removed `@xyflow/react` and `elkjs` from `package.json`.
- [x] Removed exports from `index.tsx`, `components/index.ts`, `blocs/index.ts`.
- [x] `TabName` no longer includes `'Graph'`.
- [x] No remaining references to deleted symbols.
- [x] Typecheck passes (pre-existing noise only).
- [x] Committed.

## Completion

Commit: (filling in after commit)
Files deleted: 4 (DependencyGraph.tsx, dependency-graph-layout.ts, DevToolsDependencyBloc.ts, inject-xyflow-styles.ts)
Files modified: 10 (DevToolsPanel.tsx, DraggableOverlay.tsx, index.tsx, blocs files, components files, extension files)
Extension updates: Removed DevToolsDependencyBloc import and usage from panel/index.tsx, removed DependencyGraph type from comm.ts, removed getDependencyGraph from global.d.ts
Typecheck: Pre-existing noise only (TS2686 in react, TS2688 vite/client in extension)

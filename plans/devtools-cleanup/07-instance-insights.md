---
task: 07-instance-insights
lane: B (UI package)
parallel_safe: false
model: sonnet
effort: high
depends_on:
  [
    04-delete-dependency-graph,
    05-delete-performance-panel,
    06-strip-dep-tracking-from-connect,
  ]
---

# 07 — Inline instance insights

Replace the deleted PerformancePanel and the deleted dep listings with two surface changes:

1. **Consumer count badge** on each instance row (`InstanceListItem`). Just the number. No list of which components, no list of which blocs.
2. **Insight badges** on each instance row when warnings apply. Initially:
   - **Large state** — when serialized state size exceeds a threshold (default: 50 KB).
   - **High update rate** — when the instance has emitted more than N updates in the last 10 seconds (default: 30).

   Other cheap-to-compute insights can be added later; design the API so adding one is mechanical.

Also strip the dependency / dependents lists from `StateViewer`, replacing them with the consumer count (and ref-holder count, if it isn't already there).

## Design

Compute insights in the UI, per-instance, from data already in `DevToolsInstancesBloc`:

- `consumerCount` and `refHolderCount` — already part of the instance payload (from connect plugin). Use as-is.
- `stateSizeBytes` — derive on the fly from the most recent state. `new Blob([JSON.stringify(state)]).size` is fine; or just `JSON.stringify(state).length` (UTF-16 code units — close enough for a warning threshold). Cache the result per `(instanceId, stateRevision)` so we don't recompute on every render. The instance payload likely already has a revision counter / lastUpdatedAt — use it as the cache key.
- `updateRate` — track a small ring buffer of update timestamps per instance, scoped to the UI. Add a tiny helper in `DevToolsInstancesBloc` (or a new `insights` slice in its state) that records the timestamp every time an instance's state-changed event arrives, prunes timestamps older than 10s, and exposes `updatesIn10s` per instance.

Define insight shape in `packages/devtools-ui/src/types/` (or co-located with `InstanceListItem`):

```ts
type Insight =
  | { kind: 'large-state'; sizeBytes: number; threshold: number }
  | { kind: 'high-update-rate'; updatesPer10s: number; threshold: number };
```

Thresholds live as exported `const`s — easy to tune. No user config surface for now.

A small pure function `computeInsights(instance, updateRate): Insight[]` should live next to `InstanceListItem`. It is the single place where rules are added.

## Files to edit

- `packages/devtools-ui/src/blocs/DevToolsInstancesBloc.ts` — add the update-timestamp ring buffer per instance, and expose `getUpdatesIn10s(instanceId)` or include it in the instance object. Prune on read. Keep memory bounded (cap timestamps per instance, e.g. 200, since older than 10s are dropped anyway).
- `packages/devtools-ui/src/components/InstanceListItem.tsx`:
  - Show consumer count as a small badge (e.g., `👥 3` or `3 consumers` — pick one; match the existing visual language of the row).
  - Show ref-holder count if non-zero.
  - Render an `Insights` row beneath the title when `computeInsights(...)` returns any entries. Each insight is a compact pill with an icon + short label (`52 KB state`, `42 updates/10s`). Use a warning color from `theme.ts` (e.g., `T.warning`).
  - Add a `title` / tooltip with detail (exact size, exact rate, threshold) so the row stays compact.
- `packages/devtools-ui/src/components/InstanceListItem.tsx` (or sibling file) — new `computeInsights.ts` helper with the rule list and thresholds.
- `packages/devtools-ui/src/components/StateViewer.tsx`:
  - Remove any rendering of "dependencies" / "dependents" lists (these came from the connect plugin's `dependencies` field, which task `06` deletes — make sure the UI no longer reads it). Grep for `dependencies` and `dependents` inside this file.
  - Show consumer count and ref-holder count (already present? if so, leave alone; if not, add as a small header line — exact value, not just a badge).
  - Show the same insight pills at the top of the detail view (mirrors the row), so a user inspecting one instance sees the warnings front-and-center.

## Check (before editing)

```sh
grep -rn "dependencies\|dependents\|DepCard\|InitiatorSection" packages/devtools-ui/src
```

Confirm where dep-list UI lives in `StateViewer.tsx` (likely a `DepCard` sub-component or similar). Remove or repurpose.

Also verify the instance payload after task `06`:

```sh
grep -rn "consumerCount\|refHolderCount\|consumers\|refHolders" packages/devtools-connect/src/types packages/devtools-ui/src/types
```

Make sure the fields the UI will read actually exist post-`06`. If they need renaming for clarity, do it now in **both** packages within this task.

## Test

- `packages/devtools-ui` does not currently have tests for these components. Don't add a full test suite as part of this task. Do add **one** focused unit test for `computeInsights` (pure function, trivial to test):

```sh
packages/devtools-ui/src/components/computeInsights.test.ts
```

Covers: no insights, large state only, high update rate only, both.

- Run the typecheck and the new test:

```sh
pnpm --filter @blac/devtools-ui typecheck
pnpm --filter @blac/devtools-ui test
```

## Verify

Beyond typecheck/test, do a structural review before committing:

- The instance row still fits in the existing left-panel width without overflow when 2 insights are present.
- `StateViewer` no longer references `dependencies` or `dependents`.
- The insight thresholds are exported `const`s, not inline magic numbers.

## Commit

```
feat(devtools-ui): surface state-size and update-rate insights on instances
```

Body:

```
Replaces the deleted PerformancePanel with inline insight pills on each
instance row and at the top of the StateViewer detail view. Adds
consumer count and ref-holder count to the row. Removes the dep/
dependent lists from StateViewer (data source removed in 06).

Insights are computed by a single pure function (computeInsights) with
exported thresholds; adding a new rule is one switch case.
```

## Checklist

- [x] Consumer count visible on each instance row.
- [x] Ref-holder count visible when non-zero.
- [x] `computeInsights` helper + unit test.
- [x] `InstanceListItem` renders insight pills when applicable.
- [x] `StateViewer` shows counts and the same insight pills; no more dep/dependent lists.
- [x] Update-rate tracking lives in `DevToolsInstancesBloc` (or sibling), memory-bounded.
- [x] Thresholds exported as named constants.
- [x] Typecheck + new test pass.
- [x] Committed.

## Completion

- Commit: `facd036d`
- Files touched: 2 added (`computeInsights.ts`, `computeInsights.test.ts`), 4 modified (`DevToolsInstancesBloc.ts`, `InstanceListItem.tsx`, `InstanceList.tsx`, `StateViewer.tsx`); plus `package.json` + `pnpm-lock.yaml` (added `vitest: catalog:` devDep) and two non-null-assertion refactors caught by the pre-commit lint hook on first attempt.
- Typecheck: only pre-existing TS2686 in `@blac/react` — no new errors
- Tests: 4/4 passed (`computeInsights` unit tests)

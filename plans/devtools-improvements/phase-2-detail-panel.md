# Phase 2 — Detail-panel integration

**Model:** Sonnet 4.6 · **Effort:** medium-high · **Runs:** after Phase 1A
**Changeset:** ✔ (`@blac/devtools-ui`) · **Owns:** `StateViewer.tsx`

This lane is the **sole owner of `StateViewer.tsx`** in Phase 2 — bundle all
detail-panel additions here so nothing else edits the file concurrently.

## Files

- `packages/devtools-ui/src/components/StateViewer.tsx`
- `packages/devtools-ui/src/components/CurrentStateView.tsx`
- `packages/devtools-ui/src/components/EditableJsonTree.tsx` (collapse/expand-all hook)
- Consume (do not edit): `CopyButton` (Phase 0), `componentLabel` field (Phase 1A),
  `SectionHeader`, `PathChips`, layout toggles `isDebugInfoExpanded` /
  `isRefHoldersExpanded` (Phase 0).

## Key context (verify against current code)

- `StateViewer.tsx` renders sections via `SectionHeader` + a conditional body
  (see `ComputedGettersSection`, `ConsumersSection`). Follow that exact pattern.
- Header (~line 335) already shows `N ref holder(s)` from `refIds.length`.
- `CurrentStateView.tsx` has a "Raw JSON" button (~line 84) and uses
  `EditableJsonTree` (editable) or `JsonView` (read-only) by whether
  `onTimeTravel` is set.
- `InstanceData` now carries: `consumers`, `lastPaths`, `refIds`, `refHolders`
  (each with optional `componentLabel` after 1A), `createdFrom`.
- **Note:** Phase 1E may have added `consumers` to the `computeInsights(...)` call
  in this file — preserve it; don't revert.

## Implement

1. **Copy buttons** — add `CopyButton` to:
   - Current State section header → `value={() => JSON.stringify(state, null, 2)}`.
   - Computed Getters → copy the getters object.
   - Consumers section → copy the consumer→paths map as JSON.
     Keep them inline in each `SectionHeader`'s `trailing` slot.
2. **Collapse-all / Expand-all** — in the Current State header, two small buttons
   that drive the JSON tree's expand depth. Implement via a prop on
   `EditableJsonTree` (and the read-only `JsonView` path) — e.g. a
   `collapseSignal`/`expandAll` controlled prop, or reset `collapsed` depth. Keep
   the existing auto-collapse-at-depth default.
3. **Consumer vs ref-holder count** — in the header metadata row, show both when
   they differ: `{consumers.length} consumers · {refIds.length} refs`. Consumers =
   auto-tracking `useBloc` callers; refs = all holders incl. `keepAlive`/manual.
   Tooltip explaining the difference.
4. **Debug Info section** (`createdFrom`) — new collapsible `SectionHeader`
   ("Debug Info", `isDebugInfoExpanded`) rendering `selectedInstance.createdFrom`
   in a `<pre>` (mono, `T.bg3`, wrapping) + a CopyButton. Render nothing if
   `createdFrom` is absent.
5. **Ref Holders section** — new collapsible ("Ref Holders", `isRefHoldersExpanded`,
   badge = `refHolders.length`). Each row: `componentLabel` (or `refId` fallback),
   relative `acquiredAt` (reuse `formatRelative`), and an expandable raw
   `stackTrace` (`<pre>`). Render nothing if no `refHolders`.
   - Also enrich the existing **Consumers** rows: prefix each with
     `consumer.componentLabel` when present (fallback to `consumerId`).

## Tests

View-heavy. No new pure logic expected; ensure the devtools-ui suite passes. If
you add a controlled expand/collapse prop with non-trivial logic, add a minimal
test for that prop's behavior.

## Cycle

Shared protocol, scoped to `@blac/devtools-ui`:
`format → format:check → lint → typecheck → test`.

- Changeset: `@blac/devtools-ui` `patch` — "Detail-panel copy, collapse-all, debug
  info, ref holders, consumer labels."
- Commit: `feat(devtools-ui): enrich detail panel (copy, refs, debug info)`

## Done when

- All five additions render; sections hide gracefully when their data is absent.
- Consumer/ref rows show component labels when 1A has populated them.
- 1E's insights call (if present) is intact. Only listed files changed.

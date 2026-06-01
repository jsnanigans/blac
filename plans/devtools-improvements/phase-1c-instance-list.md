# Phase 1C — Instance list: sort + quick filters + copy-id

**Model:** Sonnet 4.6 · **Effort:** medium · **Parallel-safe** with 1A/1D/1E
**Changeset:** ✔ (`@blac/devtools-ui`) · **Depends on:** Phase 0 (layout/search state)

## Goal
Make the instance list navigable for large apps: a sort selector, toggleable
quick-filters, and copy-instance-id. Sort/filter UI **state already exists**
(Phase 0 added `instanceSort` + `quickFilters` to the appropriate bloc — confirm
which bloc; Phase 0 leaves a note at the top of this file if it chose
`DevToolsSearchBloc`).

## Files
- `packages/devtools-ui/src/components/InstanceList.tsx`
- `packages/devtools-ui/src/components/InstanceListItem.tsx`
- `packages/devtools-ui/src/blocs/DevToolsInstancesBloc.ts` (sort getter)
- `packages/devtools-ui/src/blocs/DevToolsSearchBloc.ts` (read existing search)
- `packages/devtools-ui/src/components/CopyButton.tsx` (consume — created in Phase 0)

## Key context (verify against current code)
- `InstanceList.tsx` already filters via `DevToolsSearchBloc` (fuzzy match on
  class/id/name). Sort/filter must compose with that search, not replace it.
- `DevToolsInstancesBloc.sortedInstances` getter (~line 198) currently sorts by
  `createdAt`. `getUpdatesIn10s(id)` exists for update-rate. `measureStateBytes`
  lives in `components/computeInsights.ts` for size.
- `InstanceListItem.tsx` (~line 126) renders the `R:N` badge and insight pills.

## Implement
1. **Sort** — replace/extend `sortedInstances` to honor `instanceSort` from the
   layout/search bloc:
   - `created` → `createdAt` asc (current behavior, default)
   - `updated` → `lastStateChangeTimestamp` desc
   - `size` → `measureStateBytes(state)` desc
   - `updateRate` → `getUpdatesIn10s(id)` desc
   - `className` → `className` localeCompare
   Add a compact `<select>` (or segmented control matching panel style) in the
   `InstanceList` header bound to `setInstanceSort`.
2. **Quick filters** — a row of small toggle chips above/below the search input:
   `Hydrating`, `Errors`, `Large State`, `High Update Rate`. Each toggles a key in
   `quickFilters` via `toggleQuickFilter`. Apply as an AND filter on top of search:
   - `Hydrating` → `hydrationStatus === 'hydrating'`
   - `Errors` → `hydrationStatus === 'error'`
   - `Large State` → reuse the `large-state` insight threshold (import from
     `computeInsights` — don't hardcode the 50KB number twice)
   - `High Update Rate` → reuse the `high-update-rate` threshold likewise
   Active chips use `T.bgAccent`/`T.borderAccent`; inactive use `T.border1`.
3. **Copy id** — add a `<CopyButton value={instance.id} />` in `InstanceListItem`
   (e.g. next to the shortened id), stopping propagation so it doesn't select.

## Tests
View-heavy; a unit test on the sort comparator is worthwhile if you extract it as
a pure function (recommended). Otherwise ensure existing instances-bloc tests
still pass.

## Cycle
Shared protocol, scoped to `@blac/devtools-ui`:
`format → format:check → lint → typecheck → test`.
- Changeset: `@blac/devtools-ui` `patch` — "Instance list sort, quick filters, copy id."
- Commit: `feat(devtools-ui): sort + quick-filter the instance list`

## Done when
- Sort selector + quick-filter chips compose with existing fuzzy search.
- Thresholds reused from `computeInsights` (no duplicated magic numbers).
- Copy-id works without selecting the row. Only the listed files changed.

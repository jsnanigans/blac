# Phase 1D — Logs: fold + expand callstack + copy

**Model:** Sonnet 4.6 · **Effort:** medium · **Parallel-safe** with 1A/1C/1E
**Changeset:** ✔ (`@blac/devtools-ui`) · **Depends on:** Phase 0 (CopyButton)

## Goal

Cut log noise and expose data already captured but hidden:

1. **Fold** consecutive same-(type, instance) events into one collapsible row
   (`▸ 5× state-changed on CounterCubit`) that expands to the individual entries.
2. **Expand callstack** — `state-changed` rows capture `callstack` but only show
   the trigger name. Add a per-row collapsible to reveal the formatted callstack.
3. **Copy** — a `CopyButton` on a row to copy the event JSON (trigger, paths,
   states).

## Files

- `packages/devtools-ui/src/components/LogsView.tsx` (~673 lines)
- `packages/devtools-ui/src/blocs/DevToolsLogsBloc.ts` (~233 lines)
- `packages/devtools-ui/src/components/CopyButton.tsx` (consume — Phase 0)

## Key context (verify against current code)

- `LogsView` already has multi-select filters: event type, class name, instance id
  (with in-dropdown search). Folding/expansion must layer on top of the filtered
  list, not the raw list.
- `DevToolsLogsBloc` `LogEntry` carries `callstack?`, `trigger?`, `paths?` (added
  earlier). The callstack is the already-formatted multi-line string from the
  plugin's `captureCallstack`.
- Existing `ChangedPathsChips`/`PathChips` (in `components/PathChips.tsx`) render
  paths — reuse for any path display.

## Implement

1. **Folding** — group the _currently visible_ (post-filter) entries: collapse a
   run of adjacent entries sharing `(eventType, instanceId)` into a summary row
   with a count and an expand toggle that reveals the underlying rows. Keep it
   purely presentational (a `useMemo` over the filtered list + local
   `Set<groupId>` expanded state); do **not** mutate stored logs. Add a header
   toggle "Group similar" (default on) so users can see the flat list too.
2. **Callstack expansion** — for rows with `callstack`, render a small "stack"
   affordance; on expand, show the callstack in a `<pre>` with `T.fontMono`,
   `T.bg3`, wrapping. Collapsed by default.
3. **Copy** — `<CopyButton value={() => JSON.stringify(entry.data ?? entry, null, 2)} />`
   on each leaf row; stop propagation.

## Tests

View-heavy. If you extract the grouping into a pure helper
(`groupAdjacent(entries): Group[]`), add a unit test for it (recommended — it's
the only non-trivial logic). Ensure `DevToolsLogsBloc` tests still pass.

## Cycle

Shared protocol, scoped to `@blac/devtools-ui`:
`format → format:check → lint → typecheck → test`.

- Changeset: `@blac/devtools-ui` `patch` — "Group logs, expand callstacks, copy event."
- Commit: `feat(devtools-ui): fold + expand-callstack in logs view`

## Done when

- Adjacent same-type/instance events fold with an accurate count and expand back.
- Callstacks (already captured) are viewable per row; copy works.
- "Group similar" toggle flips between folded/flat. Only listed files changed.

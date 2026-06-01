# Phase 1A — Backend component-label enrichment

**Model:** Sonnet 4.6 · **Effort:** medium · **Parallel-safe** with 1C/1D/1E
**Changeset:** ✔ (`@blac/devtools-connect`) · **Depends on:** Phase 0 (field exists)

## Goal
Turn the opaque `useBloc-3` consumer ids and raw ref-holder stack traces into
human-readable source labels (e.g. `CounterView` or `Counter.tsx:42`) so the
Consumers and Ref Holders sections (Phase 2) read well. Populate the
`componentLabel` field added in Phase 0.

## Files
- `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts` **(only file)**

## Key context (verify against current code)
- `onRefAcquired` (~line 368) captures `stackTrace = new Error().stack` **raw**
  (not run through `captureCallstack`), stored in `refHolders: Map<instanceId, Map<refId, RefHolderInfo>>`.
- `refId` convention from blac-react: `refId === 'useBloc@' + consumerId` where
  `consumerId` is the structural registry key (e.g. `useBloc-3`). So a consumer's
  ref holder is `refHolders.get(instanceId)?.get('useBloc@' + consumerId)`.
- `decodeConsumers(instance)` (added in the prior feature) builds `ConsumerInfo[]`
  from `instance.getConsumerPaths()`. `getConsumersForInstance(instanceId)` looks
  the container up via `liveContainers`.
- `formatStackLine` (~line 743) and `captureCallstack` (~line 685) already contain
  the frame-filtering heuristics (skip `blac-core`, `blac-react`, `react-dom`,
  `node_modules`, `.vite/deps`, etc.). **Reuse that filter logic** — do not write a
  second divergent filter.

## Implement
1. Add a private helper `deriveComponentLabel(stackTrace?: string): string | undefined`:
   - Reuse the same skip-list used by `captureCallstack` to find the **first app
     frame** (the first line that isn't blac/react/node internals).
   - Return a compact label: prefer the function/component name if present
     (`at CounterView (…)` → `CounterView`); else fall back to `file.tsx:line`
     from the parsed frame; else `undefined`.
   - Factor the shared skip predicate out of `captureCallstack` into a private
     method (e.g. `isInternalFrame(line)`) and use it in both places, so the two
     never drift.
2. In `decodeConsumers`, for each consumer look up its ref holder by
   `'useBloc@' + consumerId`, run `deriveComponentLabel(holder?.stackTrace)`, and
   set `componentLabel` on the `ConsumerInfo` when defined.
3. In `getRefHoldersForInstance` (~line 574) / wherever `RefHolderInfo[]` is built
   for emission, attach `componentLabel: deriveComponentLabel(holder.stackTrace)`
   to each holder (don't drop the raw `stackTrace`; add alongside).

## Tests
Add a focused unit test in `packages/devtools-connect/src/plugin/` (new
`*.test.ts` or extend the existing `DevToolsBrowserPlugin.test.ts`) for
`deriveComponentLabel` covering: an app frame present, only-internal frames
(→ `undefined`), and the `file:line` fallback. If the method is private, test it
via a tiny exported helper or a `// @internal` export — match how the package
already tests internals (check existing test file first).

## Cycle
Shared protocol, scoped to `@blac/devtools-connect`:
`format → format:check → lint → typecheck → test`.
- Changeset (`.changeset/devtools-component-labels.md`): `@blac/devtools-connect` `patch`
  — "Derive component-name labels for devtools consumers and ref holders."
- Commit: `feat(devtools-connect): label consumers/refs with source frame`

## Done when
- `ConsumerInfo` / `RefHolderInfo` emitted by the plugin carry `componentLabel`
  when a usable app frame exists; raw `stackTrace` is unchanged.
- Frame-filter logic is shared with `captureCallstack` (single source of truth).
- New unit test passes; no other file touched.

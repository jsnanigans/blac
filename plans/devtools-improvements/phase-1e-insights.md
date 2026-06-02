# Phase 1E — Insights: over-render & consumer-count flags

**Model:** Haiku 4.5 · **Effort:** low · **Parallel-safe** with 1A/1C/1D
**Changeset:** ✔ (`@blac/devtools-ui`) · **Depends on:** Phase 0 (none strictly; consumer data already on `InstanceData`)

## Goal

Two new heuristics surfaced as insight pills (they auto-render wherever
`computeInsights` output is mapped — InstanceList + StateViewer — so **no view
edits needed**):

1. **`all-watcher`** — one or more consumers watch `'all'` paths (select-mode or
   raw subscriber). Flags a likely over-render: that consumer re-renders on every
   change regardless of what it reads.
2. **`many-consumers`** — consumer count exceeds a threshold (suggest ~8) — a
   coordination hotspot worth noticing.

This is a near-mechanical extension of an established pattern.

## Files

- `packages/devtools-ui/src/components/computeInsights.ts`
- `packages/devtools-ui/src/components/computeInsights.test.ts`

## Key context (verify against current code)

- `Insight` is a union type; `computeInsights(args)` is a `switch`/sequence of
  threshold checks returning `Insight[]`. Existing kinds: `large-state` (>50KB),
  `high-update-rate` (>30 updates/10s). Thresholds are module constants.
- The argument object currently includes `state`, `stateSizeBytes`,
  `updatesIn10s`. **You must thread consumer data in.** Add a `consumers?:
ConsumerInfo[]` field to the `computeInsights` args and pass it from the call
  site in `StateViewer.tsx` (`selectedInstance.consumers`) and, if InstanceList
  computes insights too, from there. Keep the arg optional so existing callers/
  tests don't break.
- `InsightPill` (in `InstanceListItem.tsx`) renders by `kind`; add display
  text/color for the two new kinds where the pill maps kind → label (search for
  the existing kinds to find the map). This is the one small view touch allowed
  for this lane — it's in `InstanceListItem.tsx`; **coordinate with 1C** which
  also edits that file. If 1C is running concurrently, do the `InstanceListItem`
  pill-label edit as the _last_ step and stage only your hunk, or hand the pill
  label to 1C. Prefer: keep all pill rendering generic if possible (pill already
  renders `insight.label`/color from the insight object) so no `InstanceListItem`
  edit is needed — **check first**; only edit it if pills are keyed by a hardcoded
  kind map.

## Implement

1. Add constants `MANY_CONSUMERS_THRESHOLD = 8` (tune in PR).
2. Add `'all-watcher'` and `'many-consumers'` to the `Insight` union with
   label/severity matching the existing shape.
3. In `computeInsights`: if any `consumers[].paths === 'all'` → push `all-watcher`
   (label e.g. "over-render: N watch all"). If `consumers.length >
MANY_CONSUMERS_THRESHOLD` → push `many-consumers`.
4. Thread `consumers` through the args + call sites (see context).

## Tests (required — this is pure logic)

Extend `computeInsights.test.ts`: cases for an `all`-watcher present, none present,
and the consumer-count boundary (threshold, threshold+1). Use
`import { describe, it, expect } from 'vite-plus/test'`.

## Cycle

Shared protocol, scoped to `@blac/devtools-ui`:
`format → format:check → lint → typecheck → test`.

- Changeset: `@blac/devtools-ui` `patch` — "Over-render and consumer-count insights."
- Commit: `feat(devtools-ui): add over-render + consumer-count insights`

## Done when

- New insights compute correctly with unit coverage; existing insight tests pass.
- Pills appear without bespoke view code (or a minimal, coordinated
  `InstanceListItem` label edit). Only listed files changed (+ minimal call-site).

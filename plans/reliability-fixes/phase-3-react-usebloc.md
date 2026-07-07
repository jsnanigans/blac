# Phase 3 — R2/T6 + R3 + R4: `useBloc` mount gap & ref-count leaks (high)

**Goal:** (a) no emit is lost in the render→effect window; (b) ownership refs are
acquired/released in perfectly paired sites so no memo re-run or abandoned render
leaks a ref.

Packages: `@blac/react` (`useBloc.ts`) + `@dirtytalk/structural` (`react-hook.ts`).
**One agent, sequential in-file** (R3/R4 first, then R2). Model: **opus/high** —
concurrent-React correctness is subtle.

## Root cause (verified)

- **R2** `useBloc.ts:249-300` subscription in a **passive** effect; render snapshots
  `bloc.state` at `:330`; `dirty-channel.ts:58-70` subscribe never replays. Emits
  between render read and passive effect are lost. `useLayoutEffect` at `:380` only
  refreshes interest, never `force()`s. Select-mode same gap (`:336-341`).
- **R3** memo keyed on `JSON.stringify(args)` (order-dependent, all fields) at `:224`;
  acquire's resolved key uses `structuralKey`(sorted)/`static key`(identity-only) via
  `resolveInstanceKey`. Divergence → memo re-runs → re-`acquire` same refId →
  `StateContainerRegistry.ts:317-319` `refs.set(refId, count+1)`; release effect keyed
  on `[bloc, instanceKey]` never re-fires → leak.
- **R4** primary `acquire(countRef:true)` in memo at `:184`; deps acquire in `.track()`
  during JSX at `:596-603`. Releases are effect-only → abandoned/uncommitted renders
  leak; StrictMode masks it.

## Decision (Q1 → Option B, unified)

Move ownership out of render. R3 becomes moot once acquire leaves the memo.

## Verify (phase entry)

- Confirm `:184` acquire uses `countRef:true` inside `useMemo`; confirm release effect
  key `[bloc, instanceKey]`; confirm dep `.track()` at `:596-603`.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent | Report-back | Done-check |
|---|------|-------|-----------|-----------|-------|-------------|-----------|
| 3.1 | **R4/R3 primary:** in the memo, replace `acquire(countRef:true)` with an **ensure** (create if absent, `countRef:false`). Take the ownership ref in a **`useLayoutEffect`** keyed on `[bloc, instanceKey]` (setup: `acquire(...,{countRef:true,refId})`; cleanup: `release`). Guarantees paired acquire/release; memo re-runs no longer double-count. | `useBloc.ts` | seq | — | quick-build opus/high | structured summary | Render does not `countRef`; ref taken+released in layout effect |
| 3.2 | **R4 deps:** move dep ownership `acquire` out of `.track()` (JSX/render) into the layout-effect **reconcile pass** (which already runs per commit and knows added/dropped deps). `.track()` in render only reads/ensures. | `useBloc.ts:~556-603` | seq | 3.1 | quick-build opus/high | same | No `countRef:true` acquire remains in render/JSX |
| 3.3 | **R2 auto-track:** after `channel.subscribe(...)` in the subscription effect, recheck: if live `bloc.state` !== the render-time snapshot, call `force()`. Seed the snapshot in render, read it in the effect. | `useBloc.ts:249-300, 330` | seq | 3.1 | quick-build opus/high | same | Post-subscribe mismatch triggers `force()` |
| 3.4 | **R2 select-mode:** same recheck — after subscribe, recompute the selector against live state and compare to `lastSelectionRef`; if changed, `force()`. Also reset `lastSelectionRef` when bloc identity changes. | `useBloc.ts:336-341` | seq | 3.3 | quick-build opus/high | same | Select-mode rechecks post-subscribe |
| 3.5 | **T6:** apply the identical recheck-after-subscribe fix in `react-hook.ts:26-41` (`useStructural`). | `dirtytalk-structural/src/react-hook.ts` | seq | — | quick-build opus/high | same | `useStructural` rechecks post-subscribe |
| 3.6 | Regression tests: (a) emit fired in a sibling's `useLayoutEffect` during commit → subscriber not stale after paint; (b) StrictMode double-invoke leaves refcount balanced; (c) `static key` + a non-key arg toggled N times → refcount stays 1 and instance disposes on unmount; (d) select-mode mount-window emit not missed. | react test files (`*lifecycle*`, `*shared-instances*`, `*select*`) + core refcount test | seq | 3.5 | quick-build opus/high | same | 4 regression tests added |

All sequential (single hot file). Parallel with phases 1/2/4 (disjoint files —
`react-hook.ts` ≠ phase 1's structural files).

## Sanity check (phase exit, orchestrator)

- Grep `useBloc.ts` for `countRef: true` — must appear only inside effects, never in
  `useMemo`/render/JSX. Confirm every `acquire` has a paired `release` in the same
  effect's cleanup. Confirm `force()` call added after each `subscribe`.

## Commit

`[<ticket>] fix(react): pair bloc ownership in effects and close mount-gap`

## Done-check

- [ ] No `countRef:true` acquire in render/memo/JSX (primary or deps).
- [ ] Ownership ref taken in `useLayoutEffect`, released in its cleanup.
- [ ] Post-subscribe `force()` recheck in auto-track, select-mode, and `useStructural`.
- [ ] `lastSelectionRef` reset on bloc-identity change.
- [ ] 4 regression tests added.

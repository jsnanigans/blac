# Phase 2 — E1: shared-scheduler deadlock (high, latent)

**Goal:** A scheduler shared by two channels flushes **both**; single-channel
re-request still runs exactly once.

Package: `@dirtytalk/engine`.

## Root cause (verified)

- `scheduler.ts:20-36, 42-66, 73-120`: `ManualScheduler`, `MicrotaskScheduler`,
  `RAFScheduler` each store one `#flush`, overwritten per `request()`.
- `dirty-channel.ts:52-55`: `#scheduled` flag blocks re-request → the overwritten
  channel deadlocks permanently.
- Not triggered today (every call site builds a fresh scheduler: `container.ts:89`,
  `scene-root.ts:74`) — latent bug in an exported primitive.

## Verify (phase entry)

- Confirm the three schedulers still hold a single `#flush` field.
- Read `scheduler.test.ts:65-74` — the "request→request→pump runs once" case with
  two distinct fns encodes the OLD semantics and must change.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent | Report-back | Done-check |
|---|------|-------|-----------|-----------|-------|-------------|-----------|
| 2.1 | Replace each scheduler's `#flush: (()=>void)\|null` with `#pending: Set<()=>void>`. `request(fn)` adds fn (Set dedups identical fn); the drain (`pump`/microtask/RAF callback) snapshots + clears the Set and calls each. Preserve cancel/scheduled semantics. | `scheduler.ts` | seq | — | quick-build sonnet/medium | structured summary in final response | All 3 schedulers drain-all |
| 2.2 | Update `scheduler.test.ts:65-74`: two distinct fns → **both** run on pump. Add: same-fn requested twice → runs once (dedup). Add: two channels sharing one scheduler → both flushes fire. | `scheduler.test.ts` | seq | 2.1 | quick-build sonnet/medium | same | Old expectation flipped; dedup + shared-channel tests added |

Sequential (one file-cluster, one agent). Parallel with phases 1/3/4.

## Sanity check (phase exit, orchestrator)

- Diff confined to `scheduler.ts` + `scheduler.test.ts`. No `dirty-channel.ts` change
  needed (its `#scheduled` guard is fine once drain-all is in place).

## Commit

`[<ticket>] fix(engine): drain all pending flushes per scheduler tick`

## Done-check

- [ ] `ManualScheduler`, `MicrotaskScheduler`, `RAFScheduler` all use a pending Set.
- [ ] Identical fn dedups; distinct fns both run.
- [ ] `cancel()`/scheduled flag behavior preserved.
- [ ] Old single-slot test updated; dedup + shared-channel tests added.

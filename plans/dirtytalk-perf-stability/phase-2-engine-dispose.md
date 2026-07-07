# Phase 2 — Engine: DirtyChannel teardown (Unit X)

**Goal:** `DirtyChannel` gets a `dispose()` that cancels any pending
scheduler flush and drops references so an embedder can cleanly kill a
channel; `mark()`/`#flush()` are guarded so a stale scheduler entry (from a
scheduler without `cancel()`) can't resurrect or fire a disposed channel.

**Parallel:** runs ∥ Phase 1 (disjoint package). **Blocks Phase 3** (F calls
the `dispose()` this phase adds). One agent, tasks sequential.

**Owner:** quick-build, **sonnet/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- `rg -n 'dispose' packages/dirtytalk-engine/src/dirty-channel.ts` → no hit (E3 open).
- `rg -n 'cancel' packages/dirtytalk-engine/src/scheduler.ts` → confirms
  `MicrotaskScheduler.cancel()`/`RAFScheduler.cancel()` exist;
  `ManualScheduler`/`SyncScheduler` have none (optional `cancel?()` on the
  `Scheduler` interface) — `dispose()` must tolerate both.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| X1 | **E3** — add `#disposed = false;` field to `DirtyChannel`. Add `dispose(): void`: if already `#disposed`, return (idempotent); else set `#disposed = true`, then if `#scheduled` call `this.#scheduler.cancel?.()` and set `#scheduled = false`, then `this.#accumulated = this.#space.empty()` and `this.#subscribers.clear()`. Guard `mark()` (`:50-63`): if `#disposed`, return immediately before any accumulate/schedule — this is what prevents a post-dispose `mark()` from re-requesting the scheduler and resurrecting the channel. Guard `#flush()` (`:79-150`): return immediately if `#disposed` (defensive — a scheduler without `cancel()`, e.g. `ManualScheduler`/`SyncScheduler`, may still invoke a stale `#boundFlush` after dispose; this guard makes that a no-op instead of running subscriber callbacks on a torn-down channel). Guard `subscribe()` (`:65-77`): if `#disposed`, return a no-op unsubscribe function without registering the entry (keeps the documented "disposed channel has zero live subscribers" invariant, matching the `#subscribers.clear()` in `dispose()`). | `dirty-channel.ts` | sequential | — | quick-build (sonnet/high) | sync final response | `dispose()` calls `scheduler.cancel()` when the scheduler has one and a flush was pending; calling `dispose()` when nothing was scheduled doesn't call `cancel` at all; `mark()`/`subscribe()` after `dispose()` are no-ops (no throw, no scheduler interaction, no new subscriber recorded); calling `dispose()` twice is safe; pre-dispose behavior is byte-identical to current. |
| X2 | **Tests** — extend `dirty-channel.test.ts`: (a) with a spy scheduler (`request`/`cancel` mocked), `mark()` then `dispose()` calls `cancel()` once; (b) `dispose()` with nothing pending doesn't call `cancel`; (c) after `dispose()`, `mark()` is a no-op (spy scheduler's `request` not called again) and a `subscribe()` call's callback never fires even if the caller still holds the returned unsubscribe fn; (d) `dispose()` called twice doesn't throw or double-invoke `cancel`; (e) pre-dispose flush/error/AggregateError behavior (existing suite) stays green. | `dirty-channel.test.ts` | sequential | X1 | quick-build (sonnet/high) | sync final response | New cases exist for all five points above; `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff --stat` limited to `packages/dirtytalk-engine/src/dirty-channel.ts` + its test.
- `rg -n 'dispose' packages/dirtytalk-engine/src/dirty-channel.ts` → present (method + `#disposed` field + guards in `mark`/`#flush`/`subscribe`).
- Confirm `scheduler.ts` untouched by this phase (E1/E1b already shipped in the prior plan; this phase only calls the existing optional `cancel?()`).
- Confirm `onError` behavior (prior plan's E2) untouched — `dispose()` doesn't add a new error path.

## Commit (orchestrator)

`feat(engine): add DirtyChannel.dispose() teardown`. Subagent does not commit.

## Done-check

- [ ] E3: `dispose()` cancels a pending flush when the scheduler supports it, clears subscribers/accumulated state, and is idempotent.
- [ ] `mark()`/`#flush()`/`subscribe()` are no-ops post-dispose — a disposed channel cannot be resurrected by a stray `mark()` or fire via a stale scheduler entry.
- [ ] Pre-dispose behavior (mark/flush/subscribe/onError) unchanged.

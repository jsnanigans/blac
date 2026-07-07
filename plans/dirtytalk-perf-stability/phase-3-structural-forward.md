# Phase 3 — Structural container: forward teardown to DirtyChannel (Unit F)

**Goal:** `StructuralContainer` gets a minimal additive `dispose()` that
forwards to `this.channel.dispose()`, closing the embedder-level gap E3's
docstring calls out ("StructuralContainer... can't cleanly kill a channel").

**Parallel:** **after Phase 1 and Phase 2** — edits `container.ts` (same file
as Phase 1's P4/P5 work, must apply after it) and calls `channel.dispose()`
(must exist in engine source, added by Phase 2). One agent, tasks sequential.

**Owner:** quick-build, **sonnet/high**. Do **not** commit; do **not** run
tests/typecheck/lint/build. Extend existing tests, don't rewrite.

## Verify (phase entry — orchestrator)

- Phase 1 applied: `rg -n '_pathRefCounts' packages/dirtytalk-structural/src/container.ts` → present.
- Phase 2 applied (source-level — no build needed yet, that happens at final
  validation): `rg -n 'dispose' packages/dirtytalk-engine/src/dirty-channel.ts` → present.
- `rg -n 'dispose\|teardown\|destroy' packages/dirtytalk-structural/src/container.ts` → no hit (confirms `StructuralContainer` has no teardown path today).

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent (model/effort) | Report-back | Done-check |
|---|------|-------|-----------|-----------|---------------------|-------------|------------|
| F1 | **Forward** — add `dispose(): void` to `StructuralContainer`, placed near the other public accessors (after `channel` getter, `:123-125`). Body: `this._channel.dispose();`. No other state is touched — `_consumerPaths`/`_skeleton` clearing is explicitly out of scope for this minimal forward (see plan.md non-goals). Add a one-line class-docstring note (near `:61-70`) that `dispose()` exists for embedders that need to tear down a container's channel. | `container.ts` | sequential | Phase 1, Phase 2 | quick-build (sonnet/high) | sync final response | `StructuralContainer.dispose()` exists and calls `this._channel.dispose()`; no behavior change to `emit`/`patch`/`registerConsumerPaths` when `dispose()` is never called. |
| F2 | **Tests** — extend `container.test.ts`: `container.dispose()` forwards to the underlying channel (construct with a spy/mock scheduler that has a `cancel` spy, mark dirty so a flush is pending, call `container.dispose()`, assert `cancel` was invoked — proving the forward actually reaches the channel's teardown, not just a same-named no-op); calling `container.dispose()` twice is safe (relies on the channel's own idempotency from Phase 2). | `container.test.ts` | sequential | F1 | quick-build (sonnet/high) | sync final response | New dispose-forward case exists; `import { ... } from 'vite-plus/test'`. |

## Sanity check (phase exit — orchestrator, best-effort)

- `git diff` on `container.ts`: only an additive `dispose()` method + one docstring line; no changes to Phase 1's P4/P5 code paths.
- `rg -n 'dispose' packages/dirtytalk-structural/src/container.ts` → present, forwards to `this._channel.dispose()`.

## Commit (orchestrator)

`feat(structural): forward container teardown to DirtyChannel.dispose()`.
Subagent does not commit.

**Note for orchestrator validation (not for the subagent):** this unit's code
is written against `@dirtytalk/engine`'s *source*, which is sufficient for the
subagent to write correct TypeScript. But `@dirtytalk/structural` actually
type-checks/tests against engine's **built** `dist/index.d.ts`
(`workspace:^`) — `tsc --noEmit`/`vp test run` on structural will not see
`DirtyChannel.dispose()` until `pnpm --filter @dirtytalk/engine build` runs.
This is handled in `plan.md`'s final validation block, not here.

## Done-check

- [ ] `StructuralContainer.dispose()` exists, forwards to `channel.dispose()`, is additive (no behavior change when unused).
- [ ] Test proves the forward actually reaches the channel (not a same-named stub).

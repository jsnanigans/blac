# Build log — reliability-fixes

Deferred/small issues logged during `/clean-build-plan`. Review with `/review-plan-status`.

- [phase 2] E1 drain loops lack per-fn error isolation — `packages/dirtytalk-engine/src/scheduler.ts` ManualScheduler.pump / MicrotaskScheduler.#drain / RAFScheduler.#drain (`for (const fn of fns) fn()`) — a throwing bound-flush aborts the loop and starves the remaining pending fns for that tick. Out of E1's stated scope (slot-overwrite deadlock is fixed; `DirtyChannel#flush` rethrows by design, so wrapping each call in try/catch would change error-propagation semantics — its own decision). Latent today (fresh scheduler per channel). Suggested fix: collect per-fn throws in the drain and rethrow as AggregateError after draining all, mirroring `dirty-channel.ts:127-134`. Flagged to user.

- [phase 3] T6 `useStructural` recheck initially shipped with zero test coverage in `packages/dirtytalk-structural/src/react-hook.test.ts` — addressed in the phase-3 re-brief (see below).

- [phase 3] Same-commit ownership-handoff regression (introduced by Q1-Option-B ensure-in-render + acquire-in-layout-effect) — addressed in the phase-3 re-brief before commit.

- [validation] Pre-existing tracked files fail `pnpm format:check`, unrelated to this work and not modified here: `packages/blac-core/reports/verify-depend-identity.md`, `packages/blac-core/reports/verify-dispose-eventbus.md`. Left untouched (out of scope). Suggested fix: run `vp fmt` on them in a separate cleanup.

- [validation] `pnpm lint` (pre-build run) flagged `packages/dirtytalk-spatial/src/scene-root.ts:81` TS7006 implicit-any on `dirty` param — pre-existing in an untouched package (spatial is zero-consumer, out of plan scope). The other spatial lint errors were module-resolution (resolved once packages were built).

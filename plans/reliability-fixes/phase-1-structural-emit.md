# Phase 1 — R1/T1: `emit()` under-marks the dirty set (critical)

**Goal:** `emit()`/`update()` wake every `ALL_PATHS` subscriber (watch, select,
plugins, blac's system-event bridge) even when the changed field is outside every
consumer's skeleton — while leaf-interest consumers stay asleep for irrelevant fields.

Package: `@dirtytalk/structural` (+ nothing in `@dirtytalk/engine`; the fix is in
structural's `emit`, not the channel).

## Root cause (verified)

- `container.ts:135-155` `emit`: `_consumerPaths.size <= 1` → `ALL_PATHS`; else
  `diffAlongSkeleton(prev,next,skeleton)` (`diff.ts:55-75`) which returns an **empty
  Set** when the changed field is outside every skeleton path.
- Empty set → `dirty-channel.ts:80` empty fast-path `return` before the subscriber
  loop → ALL_PATHS subscribers starved. `subscribe()` does not register a consumer
  path, so bridge/plugins/watch never raise `size`.
- No root/sentinel PathId exists today; only the ancestor prefix `'\0a:'`
  (`path-interner.ts:19`). `intersects` (`path-set.ts:37-48`): an ALL_PATHS interest
  wakes on any non-empty set; a leaf `Set` needs a shared id.
- blac's dangling `_pendingChange` **auto-resolves** once emit wakes ALL_PATHS (the
  bridge callback drains it) — no blac-core change needed. `patch()` already correct.

## Verify (phase entry)

- Confirm `emit`'s else branch still returns the raw `diffAlongSkeleton` result.
- Confirm `path-interner.ts` NUL-prefix decode logic and `path-set.ts` `intersects`.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent | Report-back | Done-check |
|---|------|-------|-----------|-----------|-------|-------------|-----------|
| 1.1 | Add a reserved **root-sentinel** PathId to the interner: e.g. `ROOT_SENTINEL` const + `rootId()` accessor; ensure `lookup`/decode + ancestor (`'\0a:'`) logic never mis-decode it (add explicit guard/branch). | `path-interner.ts` (+ `path-set.ts` if intersect/decode touches sentinel) | seq | — | quick-build sonnet/high | structured summary in final response | Sentinel id round-trips; `'\0a:'` decode unaffected |
| 1.2 | In `emit`'s `size>=2` else branch (`container.ts:~152`): after computing the skeleton diff, if it is **empty** and `!Object.is(prev,next)`, union in the root-sentinel id before `mark()`. Conditional union only (not always-union). | `container.ts` | seq | 1.1 | quick-build sonnet/high | same | Empty-diff + changed state now marks sentinel |
| 1.3 | Regression tests: (a) 2 auto-track consumers on `count`; `emit` changing only `serverData` → an `ALL_PATHS` `subscribe()` callback fires; (b) leaf consumer of `count` does **not** re-render on the `serverData` emit; (c) `Object.is`-equal emit still no-ops. | `container.test.ts` and/or `integration.test.ts` | seq | 1.2 | quick-build sonnet/high | same | New tests assert wake + non-wake + no-op |

Sequential (all one file-cluster, one agent).

## Sanity check (phase exit, orchestrator)

- Diff touches only structural files listed. Grep for `ROOT_SENTINEL`/`rootId`
  usages — confined to interner + `emit`. No blac-core edit present.

## Commit

`[<ticket>] fix(structural): wake ALL_PATHS subscribers on off-skeleton emit`

## Done-check

- [ ] Sentinel PathId added, decode-safe against `'\0a:'`.
- [ ] `emit` unions sentinel only when skeleton diff empty AND state changed.
- [ ] `patch()` path untouched.
- [ ] 3 regression tests added and asserting the stated behavior.

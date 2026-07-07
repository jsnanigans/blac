# Phase 4 — R5: `watch()` args-drop, leak, silent-death (high)

**Goal:** `watch()` initializes its target with the given args, keeps it alive for
the watcher's lifetime, releases it on cleanup, and survives (resubscribes) if the
target is disposed elsewhere.

Package: `@blac/core` (`watch/watch.ts` + internal `BlocRef`/`resolveBloc`).
**Runs before Phase 5** (both may touch `StateContainerRegistry.ts`).

## Decision (Q3 → full-ref)

Behavior change accepted: `watch()` now keeps its target bloc alive until the
watcher is disposed.

## Root cause (verified)

- `watch.ts`: `BlocRef` (`:19-24`) has no `args` field; `instance()` (`:44`) discards
  args to a key string; `resolveBloc` (`:106`) calls `registry.ensure(class, instanceId)`
  with **no args** → first creator does `init(undefined)`.
- `ensure` → `acquire` with `countRef:false` → zero refs, no keepAlive → never disposed
  (leak).
- Subscription is to a **fixed** container ref; if disposed elsewhere the watch dies
  silently (no re-resolve, no error).

## Verify (phase entry)

- Confirm `BlocRef` shape and that `resolveBloc` omits args to `ensure`.
- Confirm `registry.acquire` already accepts `{ countRef, refId, args }` (reuse it).
- Confirm a public `registry.on('disposed', …)` lifecycle event exists to key on.

## Tasks

| # | Task | Files | Parallel? | Depends on | Agent | Report-back | Done-check |
|---|------|-------|-----------|-----------|-------|-------------|-----------|
| 4.1 | Add `args` to internal `BlocRef`; carry args from `instance(Class, args)` through to `resolveBloc`. | `watch/watch.ts` | seq | — | quick-build sonnet/high | structured summary | args threaded to `resolveBloc` |
| 4.2 | In `resolveBloc`, replace the arg-less `ensure` with `registry.acquire(class, key, { countRef:true, refId, args })`; store the `refId`. Release it in the `watch()` cleanup path (`:201-207`). | `watch/watch.ts` (+ `StateContainerRegistry.ts` only if an `ensure`-with-args overload is genuinely required) | seq | 4.1 | quick-build sonnet/high | same | Real ref acquired + released on cleanup |
| 4.3 | Subscribe `registry.on('disposed', …)` filtered to the watched instance: on external dispose, tear down the stale channel subscription and re-resolve/resubscribe (or invoke the callback / surface an error per existing watch contract). | `watch/watch.ts` | seq | 4.2 | quick-build sonnet/high | same | External dispose no longer silent |
| 4.4 | Tests: (a) `watch(Bloc,{args})` on a not-yet-created instance → `init` receives args (not undefined); (b) watched instance stays alive while watched, disposes after cleanup; (c) instance disposed elsewhere → watch resubscribes/notifies, not silent. Adjust any existing watch test that asserted disposal-while-watched. | `watch.test.ts`, `watch.edge-cases.test.ts` | seq | 4.3 | quick-build sonnet/high | same | 3 tests added; stale assertions updated |

Sequential (one file-cluster, one agent). Parallel with phases 1/2/3.

## Sanity check (phase exit, orchestrator)

- Confirm every `acquire` added has a matching `release` in cleanup. Confirm the
  `disposed` subscription is unsubscribed in cleanup too (no listener leak). If
  `StateContainerRegistry.ts` was touched, note it for Phase 5's rebase-awareness.

## Commit

`[<ticket>] fix(core): watch forwards args, holds a ref, resubscribes on dispose`

## Done-check

- [ ] `init` receives args for watch-first-created instances.
- [ ] Watch holds a real ref; released on cleanup; instance disposes after.
- [ ] External dispose triggers resubscribe/notify, not silent death.
- [ ] `disposed` listener unsubscribed on cleanup.
- [ ] 3 tests added; stale disposal assertions updated.

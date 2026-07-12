# Audit: @blac/core (reliability, memory, architecture, perf-gaps)

Scope: `packages/blac-core/src`, commit `31df4ae9` (2026-07-12). Perf findings
already open in `reports/perf-improve-blac-core-2026-07-12.md` (F1-F6) are
excluded; only NEW perf gaps are reported here (none found beyond a minor
dead-code note).

## Findings (ranked impact ÷ risk)

**R1 — HIGH / Reliability+Memory — `getAll()` returns disposed "zombie"
instances forever; direct `.dispose()` on a registry-owned instance never
prunes the registry Map.**
`StateContainerRegistry.ts:535-544` (`getAll`) pushes every entry with no
`disposed` filter, while `forEach` (`:552-570`) explicitly skips disposed
instances — an inconsistency between the two enumeration APIs. Root cause:
the registry's `instancesByConstructor` Map is only pruned by `release()`'s
ref-to-zero path, `clear()`/`clearAll()`, or the lazy self-heal check inside
`acquire()` (`:306-309`, only triggers on the *next* acquire for that exact
key). `dispose()` is a public method (exported, and directly tested in
`StateContainer.disposal.test.ts:22-26` for the *standalone* case) with no
guard steering registry-owned instances toward `release()` instead. Calling
`instance.dispose()` directly on an `acquire()`-obtained instance leaves the
Map entry (and the instance object, its closures, its state) retained
indefinitely — a real leak — and `getAll()`/`hasInstance()`/`getRefCount()`
keep reporting the zombie as live. `PluginManager.queryInstances`
(`PluginManager.ts:427-431`) calls `getAll()` directly, so a devtools/plugin
consumer would see disposed instances too.
Fix: (a) filter `disposed` in `getAll()` to match `forEach` (S, no risk); (b)
have the registry self-prune on its own `disposed` event (or have `dispose()`
notify the registry directly) so direct-dispose no longer orphans the Map
entry — guard against double-delete when `release()` already handled it.
Effort M, risk low-med.

**R2 — HIGH / Memory — `ensure()`-created cross-bloc dependencies are only
ever cleaned up through one narrow code path.**
`depend()` (`StateContainer.ts:303-319`) resolves deps via
`registry.ensure()`, which never adds a ref (`countRef: false`,
`StateContainerRegistry.ts:434-438`). The *only* cleanup for such a
dependency instance is the orphan-sweep inside `release()`'s normal
ref-to-zero branch (`StateContainerRegistry.ts:504-527`), which walks
`entry.instance.$blac.dependencies` for the instance *being released*. Three
other disposal paths skip this sweep entirely: `forceDispose` returns early
before reaching it (`:463-470`), `clear()`/`clearAll()` dispose+delete
without ever touching deps (`:576-586`), and any direct `.dispose()` call
(same as R1) never goes through `release()` at all. Concrete leak: a
`keepAlive` bloc that `depend()`s on a non-`keepAlive` helper creates the
helper once via `ensure()`, and since the `keepAlive` owner's own refcount
never reaches zero (that branch never runs for `keepAlive` classes), the
helper is **never** disposed for the app's lifetime — same for any owner
that is force-disposed, `clear()`-ed, or manually `.dispose()`-d.
Fix: extract the dependency-cleanup loop into a shared helper and invoke it
from `clear()`, `clearAll()`, and the `forceDispose` branch too; wiring it
into a direct-dispose path ties into R1's registry self-prune fix. Effort M,
risk low (pure addition; doesn't change any currently-passing behavior).

**R3 — MED / Reliability — `PluginManager.install()` doesn't backfill state
bridges for instances that already exist at install time.**
`setupLifecycleHooks()` (`PluginManager.ts:217-253`) only reacts to *future*
`created`/`disposed`/etc events; `install()` (`:98-138`) never walks
`registry.getTypes()`/`getAll()` to attach a bridge (`attachStateBridge`,
`:264-279`) or fire `onCreated` for pre-existing instances. Practical impact:
installing a devtools/logging plugin after any bloc already exists — a
realistic ordering if plugin setup is lazy-loaded or conditional — silently
misses `onStateChange`/`onCreated` for those instances until they happen to
be recreated. No crash, just quietly incomplete plugin coverage.
Fix: after registering hooks in `install()`, iterate `registry.getTypes()`
and backfill `attachStateBridge` + `onCreated` for each live instance.
Effort S/M, risk low.

**R4 — LOW/MED / Architecture — Two teardown paths (`dispose()` vs
`release()`) with no documentation or runtime signal steering callers to the
registry-safe one.**
Directly related to R1/R2: `dispose()` is public and legitimately used
standalone (untracked instances, per the disposal test), but for
registry-owned instances it's a footgun with no warning. Fix: either fold
into R1's registry self-prune (makes the distinction moot) or add a dev-only
warning in `dispose()` when the instance is found registered under its
constructor's Map, pointing at `release()`. Effort S, risk very low
(dev-only, no behavior change).

**R5 — LOW / dead code, minor memory — `generateId()`'s `globalCounters` Map
(`idGenerator.ts:9`) grows one entry per distinct `prefix`, never evicted
outside test-only `__resetIdCounters()`.** Verified `generateId()` has zero
callers in `blac-core` src (`rg -n "generateId\(" src` only matches its own
definition/docstring) — `StateContainer` uses `generateSimpleId()` instead,
which doesn't touch `globalCounters`. Currently dead weight, not a live leak;
flag for removal, or note if it's a half-finished API. Effort S, risk none.

## Verified FINE (no action needed)

- `dispose()` ordering (`StateContainer.ts:403-440`): `_disposed = true` is
  set *before* `emitSystemEvent('dispose', ...)` fires, so any dispose
  handler that calls `emit()`/`patch()` correctly throws rather than
  re-entering half-torn-down state. Channel bridge unsub, system-event
  handler `Map.clear()`, and `_pendingChange = null` all run before
  `registry.emit('disposed', ...)` — no leaked subscriptions, no stale
  system-event delivery to a disposed instance.
- `_drainPending()` (`:565-589`): takes a `size` snapshot and a manual
  `++count > size` break guard specifically to prevent a handler that
  subscribes a *new* handler mid-drain from having that new handler invoked
  in the same flush — correct re-entrancy guard for `Set` live-iteration
  semantics.
- Hydration state machine (`_beginHydration`/`_applyHydratedState`/
  `_finishHydration`/`_failHydration`, `:599-714`): dispose-during-hydrating
  correctly transitions to `'error'` and rejects the hydration promise
  (covered by `StateContainer.disposal.test.ts:47-54`); promise
  settle-guards (`_hydrationPromiseSettled`) prevent double
  resolve/reject.
- `PluginManager`'s per-container bridge bookkeeping
  (`containerBridges: WeakMap`, `:78-81`) is correctly torn down on
  `disposed` (`detachStateBridge`, `:281-286`) and keyed by a `WeakMap` so a
  GC'd container (if ever un-referenced without an explicit dispose) doesn't
  pin bridge state.
- `patch()`'s pre-spread skip (`StateContainer.ts:483-501`) is intentionally
  shallow/top-level-only; deep no-op detection is correctly deferred to
  `super.patch`'s path-diff, so it can't produce false-skip on nested
  changes.
- `structuralKey()` (`utils/structural-key.ts`) sorts object keys for
  order-independence and throws (unconditionally, not just dev) on
  functions — correct, matches its documented contract of "serializable args
  only, functions belong in `deps`".
- `watch()`'s per-target `registry.on('disposed', ...)` listener
  (`watch/watch.ts:275-286`) is the O(watchers × app-disposals) cost already
  flagged as F6 in the perf report — re-checked here only for *correctness*:
  the resubscribe path correctly re-acquires under the same `refId` via
  microtask (avoiding mid-mutation reentry during e.g. `clearAll()`), and
  since a force-dispose deletes the whole registry entry (refs Map
  included), there's no double-counted/stale ref left behind on
  resubscribe.

## Next Steps

1. R1: add the `disposed` filter to `getAll()` (trivial, ships independently
   of the harder registry-self-prune half).
2. R1+R2+R4: design a single "registry listens to its own disposed event to
   self-prune + sweep deps" mechanism — this closes all three at once rather
   than three separate patches.
3. R3: backfill existing instances in `PluginManager.install()`.
4. R5: confirm `generateId()`/`globalCounters` are genuinely unused
   repo-wide (check `@blac/react`, `@blac/lit`, devtools packages) before
   deleting.

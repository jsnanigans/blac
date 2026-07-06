# Verification: blac-feedback reports 01 & 06 vs actual `@blac/core@2.0.18` source

Source checked at `packages/blac-core/src`, package.json version `2.0.18` (matches
the version the feedback reports cite). Note: report "01" per README is
`01-fold-compat-fixes-upstream.md` ("Ship a typed cross-cutting event bus"),
not a file literally named `01-typed-event-bus.md`.

## A. Real public registry API — VERIFIED

`registry/index.ts:1-14` re-exports:
`acquire, resolveInstanceKey, borrow, borrowSafe, ensure, release, hasInstance,
getRefCount, getRefIds, getAll, forEach, clear, clearAll, register, getRegistry,
setRegistry, getStats`.

Exact signatures:
- `acquire(BlocClass, opts?: { args?, refId? }): InstanceType<T>` (`registry/acquire.ts:16-28`)
- `release(BlocClass, opts?: { args?, refId?, forceDispose? }): void` (`registry/release.ts:15-22`)
- `borrow(BlocClass, target?: { args? }): InstanceType<T>` (`registry/borrow.ts:26-31`)
- `ensure(BlocClass, opts?: { args? }): InstanceType<T>` (`registry/ensure.ts:11-18`)
- `getAll(BlocClass): InstanceReadonlyState<T>[]`, `forEach(BlocClass, cb): void` (`registry/queries.ts:35-46`)
- `clear(BlocClass): void`, `clearAll(): void` (`registry/management.ts:4-10`)

The report's own reconstructed code (`getAll`/`forEach`/`release`) matches the real names exactly — the primitives it describes as existing are real.

## B. Auto-dispose on last-ref-release — VERIFIED

`core/StateContainerRegistry.ts:487-514` (`release()`): decrements the ref map,
then:
```
const keepAlive = isKeepAliveClass(Type);
if (entry.refs.size === 0 && !keepAlive) {
  ... entry.instance.dispose(); instances.delete(instanceKey);
  // + cascades to ensure()-created deps with 0 refs (lines 500-513)
}
```
`keepAlive` is checked via `isKeepAliveClass` (`utils/static-props.ts:31-35`),
which reads the static prop right before the dispose branch. Confirms "dispose
when last subscriber unsubscribes, unless keepAlive."

## C. Tag/group/predicate disposal — CONFIRMED ABSENT

`rg -in "disposeTag|disposeWhere|registerLifecycleTag|lifecycleTag|\bTag\b"` across
`packages/blac-core/src` (excluding tests) and `packages/blac-react/src`: zero
matches. `StateContainerRegistry` has no concept of tags/groups; disposal is
strictly per-(Type, resolvedKey) via `release`/`clear`/`clearAll`
(`core/StateContainerRegistry.ts:439-573, 632-640`). Report 06's claim that
consumers must hand-write per-class sweep loops (its `disposeWorkspaceScopedCubits`
example) is consistent with the real API — `forEach`/`release` are real and
per-class, and there is no cross-class predicate/tag primitive to compose them.

## D. `keepAlive` set/checked; no middle-ground lifetime — VERIFIED

Set via `@blac({ keepAlive: true })` (`decorators/blac.ts:50-52`, sets
`BLAC_STATIC_PROPS.KEEP_ALIVE` on the class) or directly via
`static keepAlive = true` (read the same way — `isKeepAliveClass` just reads
the static prop by name, `utils/static-props.ts:31-35`, no decorator required).
Checked only in `release()` (B above). There is no other lifetime option
anywhere in `StateContainerRegistry`/`registry/*` — only "0 refs → dispose" vs
"keepAlive → never." No TTL, no ref-count floor, no scope/tag-based option.
Report 06's "no middle option between dispose-immediately and never" is accurate.

## E. `_dispose()` override / `super._dispose()` footgun — FALSE (describes an outdated/non-core API)

Current core has **no** `_dispose()` method or hook anywhere:
`rg -n "_dispose\("` across all of `packages/blac-core/src` (including tests)
returns zero matches. Full git history of `StateContainer.ts`
(`git log -p --follow`) also has zero occurrences of `_dispose()` — it never
existed in this file's history. The actual public dispose surface is:
- `dispose(): void` (`core/StateContainer.ts:403-440`) — the concrete,
  non-overridable teardown method (clears deps, sets `_disposed`, fires the
  `'dispose'` system event, tears down the channel bridge, emits registry
  `'disposed'`).
- `protected onSystemEvent('dispose', handler)` (`core/StateContainer.ts:719-731`)
  — an additive, composable subscription API, not an overridable method.
  Multiple independent `onSystemEvent('dispose', ...)` registrations coexist
  without conflict; there is nothing to "forget to call `super()`" on, since
  consumers *subscribe* rather than *override*.

Report 06's code example (`_dispose() { ...; super._dispose(); }`) does not
match any API this version of `@blac/core` ships. It's most likely describing
either the reporter's own `blac-compat` shim (a v0/v1-era pattern) or a stale
mental model — not a v2 core footgun. `blac-compat` does not exist in this
repo (`fd blac-compat` under the monorepo finds nothing), so it can't be
checked directly, but nothing in current `@blac/core` requires or even exposes
a `_dispose()` hook to override.

## F. Built-in typed pub/sub event bus (`Blac.emit`/`Blac.on`, `BlacEvent`) — CONFIRMED ABSENT

`rg -in "eventbus|BlacEvent|pubsub|pub-sub"` across `blac-core/src` and
`blac-react/src`: zero matches. The only `emit`/`on` in the registry are the
fixed, closed `LifecycleEvent` union — `'created' | 'stateChanged' | 'disposed'
| 'refAcquired' | 'refReleased' | 'depsChanged'`
(`core/StateContainerRegistry.ts:32-38, 685-758`) — internal lifecycle
notifications about registry/instance state, not an arbitrary
application-event channel. There is no way to `emit`/`on` a custom event type;
the `emit` overloads are explicitly typed to only the six lifecycle events
(lines 720-743). Report 01's claim (F/genuine gap) is accurate.

## G. `clearAll()` / `clear(Type)` — VERIFIED, names match exactly

`clear<T>(BlocClass: T): void` and `clearAll(): void`
(`registry/management.ts:4-10`, re-exported `registry/index.ts:13`,
`index.ts:43-44`). Underlying registry methods:
`StateContainerRegistry.clear(Type)` disposes+clears one type's instance map
(`core/StateContainerRegistry.ts:563-573`); `clearAll()` iterates all
registered types calling `clear`, then resets type tracking
(`core/StateContainerRegistry.ts:632-640`). The report names these correctly
— no renaming needed.

## H. `watch()` — arrays of blocs + keyed instances — VERIFIED

`watch/watch.ts`:
- Single: `watch(BlocClass, cb)` (`WatchSingleFn`, lines 72-79).
- Array: `watch([BlocA, BlocB] as const, ([a, b]) => ...)` (`WatchMultipleFn`
  / combined `WatchFn`, lines 84-101, 165-173, implementation loop
  `for (const inst of instances)` at 201-203).
- Keyed instance: `instance(BlocClass, args)` returns a `BlocRef` whose
  `instanceId` is resolved via `resolveInstanceKey` (lines 37-46); `watch`
  accepts `T | BlocRef<T>` and resolves it through `registry.ensure(...,
  input.instanceId)` in `resolveBloc` (lines 103-112). Example at
  lines 146-154 (`watch(instance(UserBloc, { userId: 'user-123' }), ...)`).
  `ensure` does not take a ref, so `watch` doesn't keep the instance alive by
  itself (relevant nuance: `watch`-only consumers don't pin lifetime).

## Fix-design implications

- **Tag-based disposal** would hook in at `StateContainerRegistry` alongside
  `clear`/`clearAll` (`core/StateContainerRegistry.ts:559-640`): a new
  `Map<tag, Set<{Type, resolvedKey}>>` populated by a
  `registerLifecycleTag`-style call from `StateContainer` (would need a new
  public method there, e.g. near `depend()`, `core/StateContainer.ts:252-310`
  where `_dependencies` is already tracked per-instance) and consulted by a new
  `disposeTag(tag)` free function beside `clear`/`clearAll`
  (`registry/management.ts`). It composes naturally with the existing
  ensure-created-dependency cleanup cascade already in `release()`
  (`core/StateContainerRegistry.ts:500-513`), which is the closest existing
  precedent for "dispose related instances together."
- A **middle-ground lifetime** (report 06 D) could reuse the same tag concept
  as a ref-count floor or explicit `disposeTag` trigger, rather than adding a
  third `keepAlive`-like static flag — avoids a proliferation of lifetime
  enums.
- **Event bus**: since `StateContainerRegistry`'s `on`/`emit`
  (lines 685-758) already implements a typed, closed pub/sub primitive
  (Set-based listeners, try/catch-wrapped dispatch, unsubscribe closures), the
  cleanest addition is a *second*, open-ended event map on the same singleton
  (`globalRegistry`, `core/StateContainerRegistry.ts:793`) — e.g.
  `emitEvent<T>(type, payload)` / `onEvent<T>(type, handler)` — reusing the
  existing `Map<key, Set<listener>>` pattern rather than the fixed
  `LifecycleEvent` union. It should live on the registry singleton (not a
  standalone export) so `configureBlac`/`setRegistry` test-isolation
  (`registry/config.ts:6-14`) resets it the same way it already resets
  instances, matching the existing "everything hangs off the registry" design.

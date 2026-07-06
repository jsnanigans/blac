# Reliability & Bugs

Severity: **critical** > **high** > medium > low. Confidence: `confirmed` = verified by tracing the actual code paths end-to-end; `plausible` = strong reading, would want a repro test to be certain.

---

## R1 · critical · `emit()` drops changes outside the consumer skeleton — starves watch/select/plugins/system-events

`confirmed` — `packages/dirtytalk-structural/src/container.ts:135-155`, `packages/dirtytalk-engine/src/dirty-channel.ts:80`, `packages/blac-core/src/core/StateContainer.ts:553`

`StructuralContainer.emit` computes the dirty set two ways:

- `_consumerPaths.size <= 1` → `ALL_PATHS` (everyone wakes — safe).
- `size >= 2` → `diffAlongSkeleton(prev, next, this._skeleton, …)` — which diffs **only** the union of registered auto-track consumer paths (`diff.ts:55-75` walks only skeleton ids).

Only auto-track `useBloc` consumers ever call `registerConsumerPaths`. Select-mode consumers, `watch()`, the `StateContainer` stateChanged bridge, and `PluginManager` all subscribe with `ALL_PATHS` interest but **never contribute to the skeleton**. If an `emit()` changes only fields no auto-track consumer read, the diff returns an **empty set**, `channel.mark(empty)` is a no-op, and `#flush` early-returns before touching any subscriber (`dirty-channel.ts:80`). Interest is irrelevant — the flush never runs.

**Failure scenario.** `MyBloc` state `{ count, serverData }`. Two components auto-track `count` (skeleton = `{count}`). Then:

```ts
bloc.emit({ ...bloc.state, serverData: fresh });   // count unchanged
```

- `watch(MyBloc, cb)` — never fires.
- `useBloc(MyBloc, { select: s => [s.serverData] })` — never re-renders. The selected field is invisible.
- A persist/devtools plugin's `onStateChange` — never fires; persisted state is silently stale.
- `onSystemEvent('stateChanged')` — never fires, **and** `_pendingChange` is left dangling in `StateContainer` (`StateContainer.ts:547-551`): the *next* real change drains it with a `prev` from before the dropped change, so the eventual event spans two mutations with a misleading `previousState`.

`patch()` is immune — `changedPathsFromPatch` is deliberately skeleton-independent, and its docstring even states the invariant `emit` violates: *"independent of any consumer skeleton, so raw channel subscribers wake correctly"* (`diff.ts:129-131`). `emit`/`update` — the primary Cubit mutation API — break that invariant whenever ≥2 auto-track consumers exist.

**Fix direction.** In `emit`, when the skeleton diff returns empty but `Object.is(prev, next)` is false, mark a root/sentinel id (root `''` or a dedicated "state-changed" lane) so `ALL_PATHS` subscribers still wake while skeleton consumers stay asleep. Alternatively union the skeleton diff with a root mark unconditionally — `ALL_PATHS` interest intersects any non-empty set, and leaf consumers' interests won't contain the root id.

---

## R2 · high · `useBloc` mount gap: passive-effect subscription, no post-subscribe recheck

`confirmed` — `packages/blac-react/src/useBloc.ts:249-300, 330`; `dirty-channel.ts:58-70` (subscribe does not replay)

The render body snapshots `bloc.state` (line 330); the channel subscription is created in a **passive** `useEffect` (line 249). `DirtyChannel.subscribe` never replays the current state, and nothing after subscription compares live state against the render snapshot.

Any flush that lands between the render-time read and the passive effect is missed and the component renders stale **until some future emit happens to intersect its interest**:

- An emit from any component's `useLayoutEffect` during the same commit: microtasks queued during layout effects drain when the commit task's stack unwinds — *before* React's separately-scheduled passive-effects pass.
- Concurrent rendering: time-sliced or suspended trees can have arbitrary delay between render and effects; emits in that window (e.g. a fast fetch resolving from `init()`) are lost.
- Select-mode has the same gap (its `lastSelectionRef` is seeded during render, subscription attached later).

**Fix direction.** After `channel.subscribe(...)` inside the effect, recheck: if `bloc.state` is no longer the snapshot rendered (or a version counter on the container advanced), call `force()`. That is exactly the contract `useSyncExternalStore` encodes; adopting uSES for the wake-up signal (keeping the path-tracking proxy for interest computation) would fix R2 and the tearing exposure in one move.

---

## R3 · high · Ref-count leak when the memo re-runs but the mount effect doesn't re-key

`confirmed` — `packages/blac-react/src/useBloc.ts:130-141, 170-224, 308-320`

The acquire lives in `useMemo` keyed on `[BlocClass, ownArgsKey, providerArgsKey]` where `ownArgsKey = JSON.stringify(args)`. The paired release lives in an effect keyed on `[bloc, instanceKey]`. These keys are **not equivalent**:

- A class with `static key = (args) => args.id` (documented feature: exclude non-identity fields) — `useBloc(B, { args: { id: 1, showArchived } })`. Every `showArchived` flip changes `ownArgsKey` → memo re-runs → `registry.acquire(..., { refId })` again → same entry, same refId → `refs.set(refId, count + 1)` (`StateContainerRegistry.ts:319`). The resolved key and instance are unchanged, so the `[bloc, instanceKey]` effect does **not** re-fire, and unmount's single `release` decrements the count by exactly 1 (`StateContainerRegistry.ts:463-468`). Every toggle leaks one count; the instance survives unmount forever.
- Same mechanics if `JSON.stringify` key order differs across renders (`{a,b}` vs `{b,a}` — `ownArgsKey` is *not* sorted, unlike `structuralKey`).

Neither circuit breaker catches it: `assertRefLimit` counts **distinct refIds** (`refs.size`), and the count piles up under one refId.

**Fix direction.** Track the last acquired `(Type, key, refId)` in a ref; when the memo re-runs and resolves to the same key, skip the re-acquire (or release the redundant count immediately). Longer term, move ownership acquisition out of render entirely (see R4).

---

## R4 · high · Registry acquisition during render leaks on abandoned renders

`confirmed` (mechanism) / `plausible` (frequency) — `packages/blac-react/src/useBloc.ts:184` (primary), `useBloc.ts:596-603` (dep `.track()`)

`registry.acquire(..., countRef: true)` runs inside `useMemo` (primary bloc) and inside dep-handle `.track()` during JSX evaluation (deps). React is explicitly allowed to invoke render without committing (startTransition preemption, Suspense throw-away, Offscreen prerender). An abandoned render's acquires have no paired effect cleanup → counts accumulate under the consumer's refId and unmount releases only one.

StrictMode dev happens to balance — `useMemo` double-invoke acquires twice, and the effects' setup→cleanup→setup plus final unmount release twice — but that's coincidence, not design; nothing asserts it (worth a regression test at minimum).

**Fix direction.** The render phase should at most *ensure* (create without ref, `countRef: false`); ownership should be taken in `useEffect`/`useLayoutEffect` where React guarantees paired cleanup. Deps can be acquired in the layout-effect reconcile (which already runs per commit) instead of inside `.track()`.

---

## R5 · high · `watch()` creates instances without args; watched instances leak and go silent

`confirmed` — `packages/blac-core/src/watch/watch.ts:37-46, 103-112, 201-207`

Three related defects:

1. **Args dropped.** `instance(UserBloc, { userId })` stores only the *resolved key*; `resolveBloc` then calls `registry.ensure(blocClass, instanceId)` with **no third argument**. If the instance doesn't exist yet, it is created with `args: undefined` → `init(undefined)` — a bloc keyed as `{userId:…}` but initialized without its userId. Any args-requiring bloc reached first through `watch` is constructed broken.
2. **Leak.** `ensure` takes no ref. A watch-created instance has zero refs and no keepAlive; nothing ever disposes it (release-time orphan cleanup only reaches recorded `depend()` deps). It lives, with `watch`'s channel subscription and closure pinning it, until `clearAll()`.
3. **Silent death.** If the watched instance *is* disposed elsewhere (a `useBloc` consumer unmounts and the refcount hits 0), the channel never flushes again. `watch` keeps its subscription to the dead container and never fires, never errors, never re-resolves the replacement instance created under the same key later. Callers have no signal.

**Fix direction.** Forward `args` through `BlocRef` and `resolveBloc`; either acquire a real ref for the watch's lifetime (release in the returned cleanup) or document borrow semantics; resubscribe (or at least invoke the callback / error) on the container's `dispose` system event — `onSystemEvent` is `protected`, so this also needs a small core surface (registry `disposed` event filtered by instance works today).

---

## R6 · high · `onHydrationChange` plugin hook is documented but never dispatched

`confirmed` — `packages/blac-core/src/plugin/BlacPlugin.ts:134`, `plugin/README.md:30,47`, `apps/web-docs/.../core/plugins.md:46,63`; no dispatch site exists (`rg onHydrationChange` finds only the declaration, docs, and tests)

`PluginManager.setupLifecycleHooks` wires `created` / `disposed` / `refAcquired` / `refReleased` / `depsChanged`; state changes ride the per-container channel bridge. Nothing subscribes to hydration transitions — the registry has no `hydrationChanged` lifecycle event and the manager never attaches to containers' `onSystemEvent('hydrationChanged')` (it couldn't: it's `protected`). A persist plugin implementing the documented hook silently never runs.

**Fix direction.** Emit a registry-level `hydrationChanged` from `StateContainer.setHydrationStatus` (mirroring `depsChanged` at `StateContainer.ts:216`), and dispatch it in `PluginManager`. 

---

## R7 · medium · Registry `stateChanged` listener count can over-count permanently

`confirmed` — `packages/blac-core/src/core/StateContainerRegistry.ts:685-714`

`on('stateChanged', fn)` increments `_stateChangedListenerCount` unconditionally, but the backing `Set` dedupes. Add the same function twice: count = 2, set size = 1. The first returned unsubscriber's `delete` succeeds (count → 1); the second's `delete` returns `false` and does not decrement. Count is now stuck ≥ 1 with zero listeners:

- `hasStateChangedListeners` stays `true` forever → every `emit`/`patch` on every container calls `notifyStateChanged`, allocates the pending tuple array, and schedules a microtask flush that emits to nobody (`StateContainer.ts:522, 555`; `StateContainerRegistry.ts:765-777`). Permanent per-emit overhead.

**Fix.** Increment only when `instance.add` actually grew the set (check `size` before/after), or track counts per listener.

---

## R8 · medium · Hydration state machine: re-`begin()` orphans waiters; `finish()` erases `error`

`confirmed` — `packages/blac-core/src/core/StateContainer.ts:599-641, 685-704`

1. `begin()` while status is already `'hydrating'`: `_beginHydration` nulls `_hydrationPromise` and replaces the resolve/reject closures. Anyone `await`ing the *previous* `wait()` promise holds a promise whose settle functions were discarded — it **never settles**; the awaiter hangs forever. (Waiters from a *settled* previous cycle are fine — the settled-guard handles that.)
2. `finish()` when status is `'error'`: `_finishHydration` falls through, mints a fresh promise via `ensureHydrationPromise`, sets status `'hydrated'`, and resolves. An error cycle can be silently converted to success by a late/buggy `finish()` call — e.g. a plugin's `finally` block. No warning fires.

**Fix direction.** In `begin()`, settle (reject with a "superseded" error) or reuse the outstanding promise before resetting. In `finish()`, either treat `error → hydrated` as invalid (dev-warn + no-op) or make the transition explicit.

---

## R9 · medium · Orphan-dep cleanup misses whole classes of ensure-created deps

`confirmed` — `packages/blac-core/src/core/StateContainer.ts:303-340`, `StateContainerRegistry.ts:493-514`

Release-time cleanup walks `entry.instance.$blac.dependencies` — a `Map<DepCtor, key>` written **once per `depend()` call**:

- **One key per Type.** `depend(PriceBloc, {sku: 'a'})` and `depend(PriceBloc, {sku: 'b'})` in one bloc: the second `set` overwrites the first — only `'b'` gets cleaned; the `'a'` instance (ensure-created, zero refs) leaks.
- **Per-call args never recorded.** `handle.track({ args })` / `untracked({ args })` resolve and `ensure`-create arbitrary instances at access time (`StateContainer.ts:315-319`); none are added to `_dependencies`. Every dynamically-addressed dep instance is invisible to cleanup and leaks until `clearAll`.
- **Depth-1 only.** Cleanup disposes a dep with zero refs but does not recurse into *that* dep's own ensure-created deps. A → B → C: disposing A cleans B; C (created by B) stays.

**Fix direction.** Record every resolved (Type, key) in `_dependencies` at `resolve()` time (a Set of composite keys rather than Map<Type, key>), and make the registry cleanup iterative over a work queue instead of a single-level loop.

---

## R10 · medium · `acquire` emits `created` (and runs `init()`) before the entry is registered

`confirmed` — `packages/blac-core/src/core/StateContainerRegistry.ts:338-346`, `StateContainer.ts:368-397`

`new Type()` → `instance[INIT_CONFIG](config)` — which emits the registry `created` event **and runs user `init()`** — happens before `instances.set(resolvedKey, entry)`:

- `onCreated` plugins that call `ctx.queryInstances(...)` / `getStats()` / `hasInstance()` don't see the instance that the event is about.
- If `init()` (user code) re-enters `acquire`/`ensure` for the **same Type+key** — e.g. seeding state from a helper that ensures its own bloc — the map has no entry yet, so a *second* instance is constructed, `INIT_CONFIG`'d, inserted… and then the outer call's `instances.set` clobbers it. Two live instances; one unreachable and undisposed. `plausible` in practice, but nothing guards it.

**Fix.** Insert the entry (or a placeholder) before `INIT_CONFIG`, or split "construct+register" from "run init".

---

## R11 · medium · Dispose drops the final `stateChanged` for system-event subscribers but not registry listeners

`confirmed` — `packages/blac-core/src/core/StateContainer.ts:403-440`

Sequence for `bloc.emit(x); bloc.dispose();` in one tick: `applyState` sets `_pendingChange` and (if listeners) queues the registry microtask notification. `dispose()` then unsubscribes the bridge and sets `_pendingChange = null` — when the channel flush arrives, the `stateChanged` **system event** never fires. But the already-queued registry-level `notifyStateChanged` still flushes *after* dispose → `registry.on('stateChanged')` listeners (and anything downstream) observe a state change *after* the `disposed` event for the same container. Two observers of "the same" event stream disagree about whether the final change happened, and ordering is inverted for one of them.

**Fix direction.** Drain `_pendingChange` synchronously at the top of `dispose()` (fire the final `stateChanged` before `dispose`), and/or tag-and-drop the queued registry notification for disposed containers.

---

## R12 · medium · `types` Set pins constructors forever (HMR / dynamic classes leak); `register()` keys by `constructor.name`

`confirmed` — `packages/blac-core/src/core/StateContainerRegistry.ts:86-88, 109-129, 349`

- `instancesByConstructor` is a `WeakMap` *specifically* so unused constructors can be collected — but `registerType` (called on every create) adds the constructor to the strong `types` Set, defeating the WeakMap. Under HMR every hot update produces a new class identity: the old constructor, its instance map, and any live disposed-or-not instances stay reachable for the session. Same for dynamically created classes in tests that bypass `clearAll`.
- `register()` dedupes on `constructor.name`. Two distinct classes with the same name (two modules both defining `UserBloc`; or *any* minified production bundle where classes become `e`, `t`, …) throw a spurious "already registered". Nothing else consumes `registeredTypeNames`.

**Fix direction.** Make `types` hold weak refs (or prune on `clear`/dispose-of-last-instance); key `register()` by constructor identity, or drop the name-registry entirely (see S-list — it guards nothing).

---

## R13 · medium · `structuralKey` silently collides on non-JSON args

`confirmed` — `packages/blac-core/src/utils/structural-key.ts:17-40`

Functions throw (good), but everything else JSON-degrades silently:

- `Map`, `Set`, class instances → `{}` — `args: new Set(['a'])` and `args: new Set(['b'])` share one instance.
- `{ a: undefined }` → `{}` — collides with no-args-object.
- `Date` → ISO string (fine), `NaN`/`Infinity` → `null` (collide with each other and with `null`).
- Cyclic args → raw `TypeError: Converting circular structure to JSON` with no blac context.

`useBloc`'s memo key (`JSON.stringify`, unsorted) shares the cyclic-throw and adds key-order sensitivity (feeds R3).

**Fix direction.** Dev-mode validation walk (like the function check) rejecting Map/Set/class instances and cycles with a `[BlaC]`-prefixed error naming the bloc; sort keys in `useBloc`'s memo key or reuse `structuralKey` there (it's exported via `resolveInstanceKey` already — compute the resolved key once in render and use *it* as the memo dep, killing R3's divergence at the root).

---

## R14 · medium · Registry-level `stateChanged` and channel flush deliver in different ticks with different payloads

`confirmed` — `StateContainer.ts:516-524, 547-557`, `StateContainerRegistry.ts:765-787`

Per mutation, `notifyStateChanged` queues `(container, prev, next)` per-call, flushed by its own microtask; the channel coalesces per-container and the `stateChanged` *system event* uses the coalesced `_pendingChange` (first prev / last next). Registry listeners can therefore see two events (A→B, B→C) where system-event/plugin subscribers see one (A→C), and the relative ordering of the registry flush vs. the channel flush depends on which microtask was queued first. Not a bug in isolation, but the two audiences observe different histories — devtools built on one disagree with persistence built on the other. Consolidation is an architecture item (A3), listed here because it produces observable inconsistency.

---

## R15 · low-medium · `PluginManager.destroy()` leaves channel bridges attached and the global singleton dangling

`confirmed` — `packages/blac-core/src/plugin/PluginManager.ts:78-81, 201-207`, `StateContainerRegistry.ts:798-808`

- `containerBridges` is a `WeakMap` — `destroy()` cannot iterate it, so per-container channel subscriptions stay attached; every future flush on every live container still calls `dispatchStateChange` (loop over an empty plugin map). Cost, not correctness — but it also means `destroy()` doesn't actually detach the manager from the system.
- `_globalPluginManager` is never reset — after `destroy()`, `getPluginManager()` returns the destroyed instance whose lifecycle hooks are dead; `install()` on it half-works (plugins get registered, `created` bridges for *new* containers never attach because the registry unsubs are gone).
- The singleton is bound to `globalRegistry` at first call, ignoring `setRegistry` — a test or app that swaps registries gets a plugin manager watching the wrong registry.

**Fix direction.** Track bridge unsubs in a side `Set` (also keyed for delete-on-dispose), reset the singleton on destroy, and derive the manager from `getRegistry()` (or hang it off the registry instance).

---

## R16 · low-medium · Per-consumer dep caches grow without pruning

`confirmed` — `packages/blac-react/src/useBloc.ts:166-168, 556-561`

- `makeDepWrapper`'s `perDep: Map<StateContainer, {ref, proxy}>` caches a tracked proxy per resolved dep instance. With call-time args derived from changing state (`this.user.track({ args: { id: state.selectedId } })`), every distinct id adds an entry; disposed dep instances are never evicted, and each entry pins the dead container + its proxy for the component's lifetime.
- `depWrapperCacheRef` persists across `useMemo` re-acquisitions (the comment "allocated once per bloc acquisition (in the memo)" is wrong — it's a component-lifetime `useRef`); handles from a *previous* bloc instance (old args) stay cached, pinning the disposed primary's handles.

**Fix.** Evict on the dep-drop path of the layout-effect reconcile (it already knows which containers left the session), or consult `$blac.disposed` on cache hit.

---

## R17 · low-medium · Reconciled deps keep dropped keys forever as `undefined`-valued own properties

`confirmed` — `packages/blac-core/src/core/StateContainer.ts:198-222`

`reconcileDeps` carries every previously-seen key into the next view as an explicit `undefined` so `onDepsChanged` sees the removal — but it does this on **every** reconcile, so once a key has existed it remains an own key of `_deps` permanently. `'x' in bloc.deps` stays `true` after the owner unmounted; `Object.keys(deps)` grows monotonically across the instance's life. Also means `shallowEqualRecord`'s key-count fast path degrades over time.

**Fix.** Include the `undefined` tombstones only in the object passed to `onDepsChanged(next, prev)`, not in the stored `_deps`.

---

## R18 · low · Select-mode edge cases in `useBloc`

`confirmed` — `packages/blac-react/src/useBloc.ts:249-300, 332-341`

- Mode is latched per `[bloc, consumerId]` effect: toggling `select` between defined/undefined across renders does not resubscribe. Going select→auto leaves an `ALL_PATHS` subscription whose callback now just `force()`s (over-renders); going auto→select keeps the path-scoped subscription and the new selector is only consulted... it isn't — the auto-track branch's callback ignores the selector entirely. Mixed-mode behavior is undefined; nothing warns.
- `lastSelectionRef` is not reset when the bloc identity changes (args change): the first flush on the new instance compares its selection against the *old instance's* cached selection — if equal, the re-render is skipped even though it's a different bloc. `plausible` in effect, low frequency.
- Dev-warn suggestion: `select` returning a non-array (typed away, but JS callers) makes `shallowArrayEqual` misbehave silently.

---

## R19 · low · `_drainPending`'s "fixed-size snapshot" isn't one

`confirmed` — `packages/blac-core/src/core/StateContainer.ts:565-589`

The comment claims iteration against a fixed snapshot, but it iterates the **live** Set with a `++count > size` guard. If a handler *removes* a not-yet-visited handler and *adds* a new one, Set iteration order visits the new one within the original size budget — exactly what the guard meant to prevent. Also `emitSystemEvent` (dispose/hydration) has no guard at all. Cosmetic in practice; either snapshot with `Array.from` (N is small) or drop the misleading comment.

---

## R20 · low · Testing helpers bypass type registration → `clearAll()` misses stubs

`confirmed` — `StateContainerRegistry.ts:162-178` (`insertInstance` never calls `registerType`), `blac-core/src/testing.ts:70-84`

`registerOverride`/`renderWithBloc` insert entries into a constructor bucket that `clearAll` (which iterates `this.types`) never visits. In a suite mixing stub-based and real acquisitions with a shared registry, stubs survive `clearAll` and bleed between tests. (Mitigated when helpers swap whole registries, which they do — but `registerOverride` is also usable standalone against the global registry.)

---

## R21 · low · Equality function is captured at construction/INIT_CONFIG time

`confirmed` — `StateContainer.ts:265, 376-379`

`configureBlac({ equality })` after any instance exists doesn't affect that instance; stubs created via `new` + no `INIT_CONFIG` keep the constructor-time capture. Fine as a design choice, but undocumented — a test that configures equality after a `keepAlive` bloc was created will silently use the old function.

---

## R22 · low · Channel flush rethrows subscriber errors as unhandled microtask exceptions

`confirmed` — `dirty-channel.ts:127-134`

A throwing `watch` callback or `onStateChange`-adjacent subscriber becomes a bare throw (or `AggregateError`) inside `queueMicrotask` → `window.onerror` / process `uncaughtException`, with no blac-side handler or context. `StateContainer` shields its own system-event handlers and `PluginManager` shields plugin hooks, but raw `channel.subscribe` users (public API via `bloc.channel`) and `watch` callbacks are unshielded. Consider a `configureBlac({ onError })` sink; at minimum shield `watch`'s `runCallback`.

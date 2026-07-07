# Investigation: watch()/plugin/useStructural recon (R5, R6, T6)

## Bottom Line
All three defects verified in source. R5 = args-drop + leak + silent-death in `watch`; R6 = `onHydrationChange` is a fully dead hook (no registry event, no dispatch); T6 = `useStructural` shares R2's passive-effect mount gap.

---

## R5 — watch() drops args, leaks, goes silent (High)
`packages/blac-core/src/watch/watch.ts`

Verified code:
- `instance()` (37-46) stores only `instanceId: resolveInstanceKey(BlocClass, args)`. Args are collapsed to a key string and **discarded** — `BlocRef` (19-24) has no `args` field.
- `resolveBloc` (103-112): for a `BlocRef` calls `registry.ensure(input.blocClass, input.instanceId)` — **no third `args` arg**. `ensure` (StateContainerRegistry.ts:416-426) → `acquire(...,{canCreate:true,countRef:false,args:undefined})` → `new Type(); instance[INIT_CONFIG]({instanceId, args:undefined})`. So when watch is *first* to create the instance, it inits with `args:undefined`.
- Leak: `countRef:false` means zero refs. With no `keepAlive`, nothing ever disposes it (release only disposes at `refs.size===0` *after* a decrement, and no ref exists). Instance lives forever.
- Silent death: `watchImpl` (182,201-206) resolves instances once, subscribes to `inst.channel`. If that container is disposed elsewhere, the sub points at a dead container; no re-resolve, no error, callback never fires again.

Reference behavior to mirror: `acquire()` (registry/acquire.ts:16-28) resolves key once and calls `registry.acquire(...,{countRef:true, refId, args})`; consumer later calls `release` with the same key/refId.

Exact fix (recommend full-ref):
1. `BlocRef` (watch.ts:19-24): add `args?: unknown`. `instance()` (41-45): store `args`.
2. `resolveBloc` (103-112): return a ref-acquiring path. Use `registry.acquire(blocClass, instanceId, {countRef:true, refId, args})` (args from the `BlocRef`; for the bare-class branch pass the resolved key + `args:undefined`). Return `{instance, release}`.
3. `watchImpl` (182-208): collect the `release` fns; in `cleanup()` (187-192) call each `registry.release(Type, key, false, refId)` alongside `unsub()`.
4. Silent death: subscribe to registry `disposed` (filtered to the watched instance) and either re-resolve+resubscribe or invoke cleanup. `onSystemEvent` is protected, so use `registry.on('disposed', ...)`.

Open decision — full-ref vs documented-borrow: **recommend full-ref** (acquire/release keyed by a watch-owned `refId`). It fixes both the leak and the arg-init correctness (creation carries args), and matches `useBloc`. Borrow-only would need docs saying "watch never creates/keeps instances alive" — weaker and still leaves the arg-drop creation bug.

Tests: `watch.test.ts`, `watch.edge-cases.test.ts`. No existing test asserts args reach `init` via `instance()`, ref acquisition, or resubscribe-on-dispose — add these.

---

## R6 — onHydrationChange documented but never dispatched (High)
`BlacPlugin.ts:134-138`, `PluginManager.ts`, `StateContainer.ts`

Verified:
- Hook exists: `onHydrationChange?(ctx, status, previousStatus)` (BlacPlugin.ts:134-138).
- `PluginManager.setupLifecycleHooks` (217-242) wires only `created/disposed/refAcquired/refReleased/depsChanged`. No hydration wiring.
- `StateContainerRegistry` `LifecycleEvent` union (32-38) has **no** `hydrationChanged`; no matching `LifecycleListener` (44-64) or `emit` overload (720-743).
- `StateContainer.setHydrationStatus` (672-683) only calls `this.emitSystemEvent('hydrationChanged', {...})` (StateContainer-local, consumed via `onSystemEvent`). It does **not** call `this._registry.emit(...)` — unlike `reconcileDeps` (216-221) which emits registry `depsChanged`.
- Only refs to the hook: declaration + `plugin/README.md`, `apps/web-docs/.../core/plugins.md`, and a test that uses the *system* event `onSystemEvent('hydrationChanged')`, not the plugin hook.

Exact wire-up (mirror depsChanged, recommended):
1. `StateContainerRegistry.ts`: add `'hydrationChanged'` to `LifecycleEvent` (32-38); add `LifecycleListener` branch `(container, status, previousStatus)` (44-64); add `emit` overload (720-743).
2. `StateContainer.ts:setHydrationStatus` (672-683): after the `emitSystemEvent`, add `this._registry.emit('hydrationChanged', this, status, previousStatus)`.
3. `PluginManager.setupLifecycleHooks` (217-242): add `this.registry.on('hydrationChanged', (i, status, prev) => this.notifyPlugins('onHydrationChange', i, status, prev))`. `notifyPlugins` already forwards extra args.

Payload matches hook signature exactly (`status, previousStatus`).

Open decision — wire vs delete: **recommend wire-up**; delete option = remove hook from BlacPlugin.ts + both docs. Wire-up is small and docs already promise it.

Tests: `PluginManager.test.ts`, `PluginManager.edge-cases.test.ts` (add an `onHydrationChange` dispatch assertion); hydration tests in `StateContainer.hydration-edge-cases.test.ts`, `StateContainer.test.ts`, `StateContainer.disposal.test.ts`, `__tests__/StateContainer.meta.test.ts`.

---

## T6 — useStructural mount gap (High, same as R2)
`packages/dirtytalk-structural/src/react-hook.ts:26-41`

Confirmed: subscription is created in a passive `useEffect` (26-38). State that changes between render and effect commit is not re-checked, so a wakeup is missed. `registerConsumerPaths` re-runs in a `useLayoutEffect` (49-51) but no post-subscribe force/recheck exists. Fix is the same shape as R2: after `container.subscribe(...)` in the effect, compare current state/paths against `pathRef.current` snapshot and call `force()` if diverged. Not deep-dived per instructions.

Tests: `react-hook.test.ts`, `integration.test.ts`.

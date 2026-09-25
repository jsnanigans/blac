# Review: `@blac/core` and `@blac/react`

Date: 2026-09-25 · Base: `main` @ `e768acf6`

The architecture holds up and the ownership model has clearly been thought through. Six real bugs were found, each reproduced with a throwaway test (since deleted). Most come from `packages/blac-react/src/useBloc.ts`, where effects and memos coordinate through shared mutable state and their dependency lists have drifted apart.

Suggested fix order: 1, 5, 2, 4, 3, 6, then the plugin environment check. The first five are small, local changes.

---

## 1. Confirmed bugs (reproduced)

### 1.1 StrictMode breaks cross-bloc `.track()`

`packages/blac-react/src/useBloc.ts:548`, `:401`

- During StrictMode's double-invoke, the passive unmount effect releases and clears `consumer.depSubs`.
- The reconcile layout effect then skips its work because `consumer.lastReconcile` hasn't changed, so the dep is never re-subscribed or re-acquired.
- It only recovers when the primary bloc itself gets rebound, i.e. when it isn't `keepAlive` (it is disposed and recreated too).

**Repro:** a `keepAlive` primary bloc with a getter calling `this.p.track()`, rendered inside `<StrictMode>`. The dep gets disposed while still on screen, and `borrow(Price)` throws `instance "default" not found and creation is disabled`.

**Fix:** set `consumer.lastReconcile = null` in that cleanup, or move dep teardown into a cleanup on the reconcile effect.

### 1.2 Dep instances leak when a render never commits (SSR or a discarded render)

`packages/blac-react/src/useBloc.ts:804`

- `makeDepWrapper`'s `resolve` calls `registry.ensure`, which never schedules a sweep.
- The primary bloc is created with `sweepIfUnowned: true`; deps are not.

**Repro:** `renderToString(<Comp />)` where `Comp`'s bloc tracks a dep. After microtasks drain, `hasInstance(Main) === false` but `hasInstance(Dep) === true`, and the dep is never disposed.

**Fix:** acquire deps during render with `countRef: false, sweepIfUnowned: true`, like the primary.

### 1.3 Select mode compares against a stale selection

`packages/blac-react/src/useBloc.ts:354`

- `consumer.selection` is only set on the first render (`if (consumer.selection === null)`).
- If the selector depends on props or closure values, or the args change to a different instance, later emits are compared against the old result and needed re-renders are skipped.

**Repro:** `select: (s) => [s[key]]` with `key` in component state. `setA(5)`, switch `key` to `'b'`, then `setB(5)`. The new selection `[5]` equals the stale `[5]`, so the component keeps showing `0`.

**Fix:** recompute `consumer.selection` on every render.

### 1.4 Swapping the registry on `RegistryProvider` leaves the component subscribed to the old instance

`packages/blac-react/src/useBloc.ts:283`

- The `subscribe` memo's dependency list is `[BlocClass, instanceKey, consumerId, rebindNonce]`. It is missing `registry`.
- The instance memo (`:216`) and the ownership effect (`:335`) both include it.

**Repro:** render under `<RegistryProvider registry={r1}>`, rerender with `r2`, then emit on `r2.borrow(Counter)`. The component never re-renders.

**Fix:** add `registry` to the dependency list.

### 1.5 Instance-id collisions across classes with the same name

`packages/blac-core/src/core/StateContainerRegistry.ts:141`, `:262`

- `_entryById` is keyed by `$blac.id`, which is `${name}:${key}`.
- In minified builds classes shrink to names like `e` and `t`, and most blocs use the `default` key. Two same-named classes in dev collide the same way.
- When two entries collide, `_pruneEntry` finds the other class's entry and returns `false`.
- `_handleDisposed` then never releases the disposed bloc's `depend()` links, so the blocs it depended on are never disposed.
- `getRefIdsById` (used by `PluginContext.getRefIds`) also returns the wrong instance's refs.

**Repro:** two distinct `class Owner` definitions, each `depend(Dep)`, both acquired at `default`. Release the first owner and `Dep` stays alive. A control run without the second class passes.

**Fix:** look entries up by instance (a `WeakMap<container, entry>`), and keep an id map only for `getRefIdsById`, or make ids unique.

### 1.6 Dep accessors called after the owner is disposed pin the dep forever

`packages/blac-core/src/core/StateContainer.ts:438`, `StateContainerRegistry.ts:505`

- `untracked()` or `track()` after dispose (for example, an async method resolving after unmount) calls `acquire` with `dependent: this`.
- The owner's `disposed` event has already fired, so nothing ever removes that dependent. The dep's `dependents` set keeps the dead owner, and the dep is never disposed.

**Repro:** acquire the owner, release it (disposes), then call `owner.d.untracked()`. `Dep`'s `dependents.size === 1` permanently.

**Fix:** in `resolve`, don't register the owner as a dependent (or warn) when `this._disposed` is true.

---

## 2. Likely bugs (from reading the code, not reproduced)

### 2.1 Dev-only plugins may install in production

`packages/blac-core/src/plugin/PluginManager.ts:545`

- `getCurrentEnvironment()` returns `'development'` when `typeof process === 'undefined'`.
- In a browser production bundle, bundlers replace `process.env.NODE_ENV` but `process` itself doesn't exist, so plugins marked `environment: 'development'` (devtools) would install.
- It also disagrees with `IS_DEV` in `constants.ts`, which treats an unknown environment as production.

**Fix:** reuse `nodeEnv` from `constants.ts`.

### 2.2 Cleanup sweep vs. concurrent rendering

`packages/blac-core/src/core/StateContainerRegistry.ts:579`, `packages/blac-react/src/useBloc.ts:297`

- The comment says layout effects run before the sweep's microtask. That only holds for synchronous renders.
- With `startTransition`, time-slicing or Suspense, render and commit can land in separate tasks. The new instance can be swept before commit, then recreated in the layout effect.
- It recovers through the rebind path, but `init()` runs twice and there is an extra render.

### 2.3 `watch()` leaks on error

`packages/blac-core/src/watch/watch.ts:280`, `:351`

- If the first callback throws, or acquiring a later target throws, the refs and subscriptions taken so far are never released, because `cleanup` is never returned.
- It releases through the `registry` captured at call time, but `resolveBloc`, `resolveBlocPassive` and `toWatchTarget` each call `getRegistry()` again. If `setRegistry` runs in between, acquire and release hit different registries.

### 2.4 React test helpers leave the global registry swapped

`packages/blac-react/src/testing.ts:43`, `:78`

- `renderWithBloc` and `renderWithRegistry` restore the global registry only in the overridden `unmount`.
- Testing Library's automatic `cleanup()` unmounts roots directly, so the global registry is never restored between tests.
- If `createCubitStub` or `registerOverride` throws, the registry isn't restored either.

**Fix:** wrap the UI in `<RegistryProvider>` instead of mutating the global registry.

### 2.5 `structuralKey` edge cases

`packages/blac-core/src/utils/structural-key.ts`

- It caches keys by object identity, so mutating an args object after first use gives a stale key.
- `Map`, `Set` and class instances all serialize to `{}`, so different args silently share a key.
- `{ a: undefined }` and `{}` produce the same key; `NaN` and `Infinity` both become `null`.
- The header says it throws on non-plain objects "in dev". It doesn't, and the function check throws in production too.

### 2.6 Test stubs diverge from real behavior

- Per-class `equality` is only applied through `[INIT_CONFIG]` (`StateContainer.ts:525`). A bare `new`, or `createCubitStub` without args, ignores `@blac({ equality })`, and `init()` never runs.
- `createCubitStub` and `withBlocState` (`packages/blac-core/src/testing.ts`) silently drop the `state` option for classes that aren't `Cubit`.

### 2.7 `release()` with an unknown `refId`

`StateContainerRegistry.ts:697`

- It still emits `refReleased`, and can dispose an instance created with `ensure()` (no refs, no dependents).
- The docs say releasing an already-removed ref is an idempotent no-op.

### 2.8 Ref-limit check order

`StateContainerRegistry.ts:500`

- `assertRefLimit` throws after the ref has already been added, and that ref is never released.

---

## 3. Stale or incorrect docs

| Location                                | Says                                                                                    | Actually                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `blac-core/src/config.ts` JSDoc         | defaults `maxInstancesPerType` 1000, `maxRefsPerInstance` 1000, `maxEmitsPerSecond` 100 | 100000, 100000, 1000                                                                   |
| `blac-react/src/types.ts` (`select`)    | a fresh selector function re-keys the subscription                                      | `select` is read from the consumer every render; the subscription doesn't depend on it |
| `blac-react/src/useBloc.ts` JSDoc       | returns `[state, bloc, ref]`                                                            | returns `[state, bloc]`                                                                |
| `blac-react/src/BlocProvider.tsx`       | map is "WeakMap-keyed"                                                                  | it's a `Map`                                                                           |
| `blac-core/src/utils/idGenerator.ts`    | "collision-resistant", "timestamp + counter"                                            | no counter; the lazy `$blac.id` is `Name:main` for every unregistered instance         |
| `blac-core/src/utils/structural-key.ts` | throws on non-plain objects, "(dev)"                                                    | see 2.5                                                                                |

---

## 4. Refactoring and improvements

### `@blac/react`

- **Restructure `useBloc.ts` (923 lines).**
  - It is one memo plus four effects sharing a ~30-field mutable `Consumer`. Correctness depends on ordering rules that live only in comments (`rebindNonce`, `lastReconcile`, layout effects vs. microtasks).
  - Bugs 1.1, 1.3 and 1.4 all come from dependency lists or state drifting apart.
  - Extract the dep-session reconcile into a unit that owns its own cleanup.
  - Share one dependency tuple `[registry, BlocClass, instanceKey, rebindNonce]` across the memo, `subscribe` and the ownership effect.
- **Use one hashing scheme for args.** The memo keys on `JSON.stringify(args)` while the registry uses `structuralKey` or `static key`. Key the memo on `resolveInstanceKey(...)` (already cached per object) and drop `ownArgsKey`, `ownArgsKeyFor`, `providerArgsKey` and `providerArgsKeyFor`.
- **Check the acquired dep instance.** Reconcile pass 2 (`useBloc.ts:501`) ignores the instance `acquire` returns. If the dep was replaced between render and commit, the ref lands on one instance and the subscription on another.
- **`buildTrackedProxy`:** bound methods are cached by key only, so a method reassigned on the instance (e.g. `withBlocMethod`) returns the stale bound function. There is no `set` trap, so setters using `#private` fail the brand check.
- **`BlocProvider`:** keyed on the resolved instance key, so when only fields ignored by `static key` change, `useProvidedArgs` returns the old args object.

### `@blac/core`

- **Registry read methods allocate.** `hasInstance`, `getRefCount`, `getAll`, `forEach`, `clear` and `release` all go through `ensureInstancesMap`. Use `getInstancesMap` instead. `hasInstance` also returns true for stale disposed entries.
- **Duplicated block in `StateContainer`.** `patch` and `applyState` repeat the same emit-rate, hydration-flag, pending-change and notify logic. Extract a single `_afterChange(prev, next, source)`.
- **Inconsistent handler iteration.** `_drainPending` iterates a snapshot of handlers but `emitSystemEvent` doesn't. Make them match.
- **`onSystemEvent` is an arrow-function class field**, so every instance allocates a closure. Make it a method. It also doesn't guard against being called after dispose.
- **Eager `_createdAt`.** `_createdAt = Date.now()` runs for every instance, while `_instanceId` is made lazy specifically to avoid `Date.now()`.
- **Redundant check.** `notifyStateChanged` re-checks `hasStateChangedListeners` after every caller already has.
- **Plugin state bridge.**
  - `PluginManager` attaches an all-paths channel subscription to every container on `created`, even when no installed plugin implements `onStateChange`, and `uninstall` never detaches it. That defeats the single-consumer optimization in `StructuralContainer`. Attach lazily.
  - If `onInstall` throws, the plugin is removed but its `onCreated` backfill has already run.
  - Plugins only observe `globalRegistry`, so instances in scoped registries (`RegistryProvider`) are invisible to devtools.
- **Two notions of "current registry".** The core helper functions (`acquire`, `borrow`, `ensure`, `release`, queries, `watch`) always use the module-global registry, while React uses context. Either unify them or document the difference.
- **Dead code.**
  - Nothing in the repo uses `ExtractConstructorArgs`, `BlocInstanceType` or `BlocConstructor`.
  - `getStaticProp`'s `defaultValue` parameter is never passed.
  - `register` / `registerType` is a split with little value.
- **Error messages** use `Type.name` instead of `getBlacName`, so they show minified names.
- **Decorator** `'x' in options && options.x` checks are redundant; `keepAlive?: true` cannot override an inherited `keepAlive`.
- **`flush()` test helper** awaits two microtasks. That's fragile when a flush triggers further emits.
- **`blacTestSetup`** swaps the registry but never disposes the test registry's instances, so `onActivate` timers can leak across tests.

### Both packages

- **Internal exports.** Symbols such as `APPLY_DEPS`, `REMOVE_DEPS_OWNER`, `INIT_CONFIG`, `ON_DISPOSE`, `WITH_TRACKED_STATE`, `DEP_BRAND` and `insertInstance` ship from the main barrel. Consider a `@blac/core/internal` subpath.
- **Comment density.** Many comments run to several paragraphs and describe history ("the pre-uSES hook…", "R3/R4"). Trimming them would make both packages much easier to review.

---

## 5. What's good

- Clean layering: `StructuralContainer` (paths and channel) → `StateContainer` (lifecycle, deps, hydration) → registry → framework adapters.
- A careful ownership model:
  - Render only ensures the instance exists, and the layout effect takes the ref.
  - Each ref ID is released by the same code that acquired it.
  - Uncommitted renders are swept.
  - `depend()` links are cleaned up on dispose.
  - Activation passes an `AbortSignal`, and there is a single teardown path.
- Scoped registries work because the creating registry is passed into each instance.
- The `$blac` namespace keeps userland names free, and getters run against the real instance through `WITH_TRACKED_STATE`, so `#private` fields work.
- Performance-aware without being cryptic: lazy allocation, near-zero cost when nothing is listening, getters cached per prototype, a shared abort reason.
- Error messages are actionable: the instance/ref limits, the emit-rate warning and the warning on mutating after dispose all say what to do.
- The test suite is broad (ownership fuzzing, StrictMode, a React Compiler config), and the packages also run API Extractor and size-limit checks.

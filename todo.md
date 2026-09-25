# TODO: `@blac/core` and `@blac/react` fixes

Derived from `review.md`. Section numbers in brackets point back to it. Each bug fix needs a small regression test; the repros in `review.md` are the starting point.

## P0 — Confirmed bugs

- [x] **StrictMode drops dep `.track()` subscriptions** [1.1]
  - `packages/blac-react/src/useBloc.ts:548`: reset `consumer.lastReconcile = null` in the unmount cleanup (or move dep teardown into the reconcile effect's cleanup).
  - Test: `keepAlive` primary + getter using `this.dep.track()` in `<StrictMode>`; dep emit re-renders and the dep stays alive.
- [ ] **Instance-id collision breaks dispose cleanup** [1.5]
  - `packages/blac-core/src/core/StateContainerRegistry.ts:141`, `:262`: prune by instance (`WeakMap<container, entry>`) instead of `$blac.id`.
  - Keep an id map only for `getRefIdsById`, or make ids unique per instance.
  - Test: two same-named classes at `default`, releasing one disposes its `depend()` dep.
- [ ] **Dep instances leak from uncommitted renders / SSR** [1.2]
  - `packages/blac-react/src/useBloc.ts:804`: resolve deps during render with `countRef: false, sweepIfUnowned: true`.
  - Test: `renderToString` leaves neither primary nor dep registered.
- [ ] **Registry swap leaves stale subscription** [1.4]
  - `packages/blac-react/src/useBloc.ts:283`: add `registry` to the `subscribe` memo deps.
  - Test: swap `RegistryProvider` registry, emit on the new one, component updates.
- [ ] **Select mode compares against stale selection** [1.3]
  - `packages/blac-react/src/useBloc.ts:354`: recompute `consumer.selection` every render.
  - Test: props-dependent selector keeps updating after the prop changes.
- [ ] **Disposed owner pins deps via accessors** [1.6]
  - `packages/blac-core/src/core/StateContainer.ts:438`: when `this._disposed`, don't pass `dependent: this` (and dev-warn).
  - Test: `untracked()` after dispose leaves `dependents` empty.

## P1 — Likely bugs

- [ ] **Plugin environment detection** [2.1]
  - `packages/blac-core/src/plugin/PluginManager.ts:545`: derive the environment from `nodeEnv` in `constants.ts`; treat unknown as production.
- [ ] **Sweep vs. concurrent rendering** [2.2]
  - Verify with a `startTransition` / Suspense test whether the instance is swept before commit and `init()` runs twice.
  - If confirmed, delay the sweep past commit (e.g. macrotask) or claim a provisional owner during render.
  - Correct the comment at `packages/blac-react/src/useBloc.ts:297`.
- [ ] **`watch()` leaks on error** [2.3]
  - `packages/blac-core/src/watch/watch.ts:280`, `:351`: run `cleanup()` if a target acquire or the initial callback throws, then rethrow.
  - Pass the captured `registry` into `toWatchTarget`, `resolveBloc` and `resolveBlocPassive`.
- [ ] **React test helpers leak the global registry** [2.4]
  - `packages/blac-react/src/testing.ts`: wrap `ui` in `<RegistryProvider>` instead of `setRegistry`; restore state if stub setup throws.
- [ ] **`structuralKey` edge cases** [2.5]
  - `packages/blac-core/src/utils/structural-key.ts`: throw (or dev-warn) on `Map`, `Set` and non-plain objects instead of serializing to `{}`.
  - Decide whether to keep the identity cache; if kept, document that args must not be mutated.
  - Fix the header comment.
- [ ] **Test stubs diverge from real behavior** [2.6]
  - Resolve per-class equality at construction (not only in `[INIT_CONFIG]`), or always run `[INIT_CONFIG]` in `createCubitStub`.
  - `createCubitStub` / `withBlocState`: support non-`Cubit` containers or throw instead of silently ignoring `state`.
- [ ] **`release()` with an unknown `refId`** [2.7]
  - `StateContainerRegistry.ts:697`: return early (no event, no dispose) when the `refId` isn't held.
- [ ] **Ref-limit check order** [2.8]
  - `StateContainerRegistry.ts:500`: check the limit before adding the ref.

## P2 — Stale or incorrect docs [3]

- [ ] `blac-core/src/config.ts`: correct the default values in the JSDoc (100000 / 100000 / 1000).
- [ ] `blac-react/src/types.ts`: remove the claim that a fresh `select` re-keys the subscription.
- [ ] `blac-react/src/useBloc.ts`: the return value is `[state, bloc]`, not `[state, bloc, ref]`.
- [ ] `blac-react/src/BlocProvider.tsx`: "WeakMap-keyed" → `Map`.
- [ ] `blac-core/src/utils/idGenerator.ts`: drop "collision-resistant" / "counter"; document the `Name:main` lazy id.

## P3 — Refactoring

### `@blac/react`

- [ ] Split `useBloc.ts`: extract the dep-session reconcile into a unit that owns its own cleanup.
- [ ] Share one dependency tuple `[registry, BlocClass, instanceKey, rebindNonce]` across the instance memo, `subscribe` and the ownership effect.
- [ ] Key the memo on `resolveInstanceKey(...)`; remove `ownArgsKey`, `ownArgsKeyFor`, `providerArgsKey`, `providerArgsKeyFor`.
- [ ] Reconcile pass 2 (`useBloc.ts:501`): check the instance returned by `acquire` matches the subscribed dep container.
- [ ] `buildTrackedProxy`: invalidate the bound-method cache when the underlying function changes; add a `set` trap with the real instance as receiver.
- [ ] `BlocProvider`: decide whether `useProvidedArgs` should return the latest args object when only non-identity fields change.

### `@blac/core`

- [ ] Registry read methods (`hasInstance`, `getRefCount`, `getAll`, `forEach`, `clear`, `release`): use `getInstancesMap` instead of `ensureInstancesMap`.
- [ ] `hasInstance`: return `false` for stale disposed entries.
- [ ] `StateContainer`: extract the shared `patch` / `applyState` post-change logic into `_afterChange(prev, next, source)`.
- [ ] Make `_drainPending` and `emitSystemEvent` iterate handlers the same way.
- [ ] Convert `onSystemEvent` from an arrow class field to a method; guard it after dispose.
- [ ] Make `_createdAt` lazy or accept it as eager and drop the perf rationale on `_instanceId`.
- [ ] Remove the redundant `hasStateChangedListeners` check in `notifyStateChanged` or at its call sites.
- [ ] `PluginManager`: attach the all-paths state bridge only while at least one plugin implements `onStateChange`; detach on `uninstall`.
- [ ] `PluginManager.install`: don't run the `onCreated` backfill (or undo it) when `onInstall` throws.
- [ ] Decide on plugin support for scoped registries (per-registry plugin manager, or document the limitation).
- [ ] Unify or document the "current registry" split between the core helper functions and React context.
- [ ] Remove the unused `ExtractConstructorArgs`, `BlocInstanceType`, `BlocConstructor` exports.
- [ ] Remove the unused `defaultValue` parameter from `getStaticProp`.
- [ ] Merge or justify the `register` / `registerType` split.
- [ ] Use `getBlacName(Type)` instead of `Type.name` in registry error messages.
- [ ] Decorator: drop the redundant `'x' in options` checks; decide whether `keepAlive: false` should override an inherited value.
- [ ] `flush()` test helper: drain until the channel is idle instead of a fixed two microtasks.
- [ ] `blacTestSetup`: `clearAll()` the test registry in `afterEach`.

### Both packages

- [ ] Move the internal symbols (`APPLY_DEPS`, `REMOVE_DEPS_OWNER`, `INIT_CONFIG`, `ON_DISPOSE`, `WITH_TRACKED_STATE`, `DEP_BRAND`) and `insertInstance` to a `@blac/core/internal` subpath.
- [ ] Trim comments: remove history narration ("the pre-uSES hook…", "R3/R4") and multi-paragraph explanations.
- [ ] Add changesets for each user-visible fix.
- [ ] Run `vp check` and `vp test` in both packages after each group of changes.

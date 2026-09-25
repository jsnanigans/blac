# TODO: `@blac/core` and `@blac/react` fixes

Derived from `review.md`. Section numbers in brackets point back to it. Each bug fix needs a small regression test; the repros in `review.md` are the starting point.

## Progress

- Branch `fix/review-p0-bugs`. P0 complete (1.1 committed in `596d44e0`; 1.2–1.6 uncommitted).
- Git commit hooks removed: `.vite-hooks/pre-commit` in `47d63034`; the `staged` config and `prepare` script removal is uncommitted. Run `vp check` manually before committing.
- Next: P1, starting with plugin environment detection [2.1].

## P0 — Confirmed bugs

- [x] **StrictMode drops dep `.track()` subscriptions** [1.1] — done in `596d44e0`
  - Unmount cleanup resets `consumer.lastReconcile = null`.
  - Reconcile pass 2 skips a disposed dep and bumps, so the re-render resolves the live instance (the StrictMode unmount disposes the dep).
  - Test: `useBloc.track-lifecycle.test.tsx` › "track() in StrictMode". Changeset: `strictmode-dep-track.md`.
- [x] **Instance-id collision breaks dispose cleanup** [1.5]
  - `_pruneEntry` looks entries up in a new `_entryByInstance` `WeakMap`; `_entryById` is kept only for `getRefIdsById` (still ambiguous on collisions).
  - Test: `StateContainerRegistry.ownership.test.ts` › "owner disposal releases dependents when another class shares its name". Changeset: `registry-prune-by-instance.md`.
- [x] **Dep instances leak from uncommitted renders / SSR** [1.2]
  - `makeDepWrapper`'s `resolve` acquires with `countRef: false` and `sweepIfUnowned` while rendering; outside render it keeps plain `ensure` semantics.
  - Test: `useBloc.track-lifecycle.test.tsx` › "track() during SSR". Changeset: `ssr-dep-sweep.md`.
- [x] **Registry swap leaves stale subscription** [1.4]
  - Added `registry` to the `subscribe` memo deps.
  - Test: `RegistryProvider.test.tsx` › "re-subscribes to the new registry when the provider swaps it". Changeset: `registry-swap-resubscribe.md`.
- [x] **Select mode compares against stale selection** [1.3]
  - `consumer.selection` is recomputed every render.
  - Test: `useBloc.select.test.tsx` › "compares against the selection of the latest render". Changeset: `select-latest-selection.md`.
- [x] **Disposed owner pins deps via accessors** [1.6]
  - `depend()`'s `resolve` passes no `dependent` once `this._disposed`, adds `sweepIfUnowned` so a dep it creates isn't leaked, and dev-warns.
  - Test: `StateContainerRegistry.ownership.test.ts` › "dep accessed through a disposed owner is not pinned". Changeset: `disposed-owner-dep.md`.

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
- [ ] Add changesets for each user-visible fix. (Done for every P0 fix.)
- [ ] Run `vp check` and `vp test` in both packages after each group of changes.

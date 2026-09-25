# TODO: `@blac/core` and `@blac/react` fixes

Derived from `review.md`. Section numbers in brackets point back to it. Each bug fix needs a small regression test; the repros in `review.md` are the starting point.

## Progress

- Branch `fix/review-p0-bugs`. P0 complete and committed.
- Git commit hooks removed; run `vp check` manually before committing.
- Next: test stubs diverge from real behavior [2.6].

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

- [x] **Plugin environment detection** [2.1]
  - `constants.ts` exports `readNodeEnv()`, used by both `IS_DEV` and `PluginManager.getCurrentEnvironment()` (read per call, so tests can still switch `NODE_ENV`). Unknown counts as production.
  - Test: `PluginManager.test.ts` › "treats an unset NODE_ENV as production". Changeset: `plugin-env-detection.md`.
- [x] **Sweep vs. concurrent rendering** [2.2]
  - Confirmed: a time-sliced transition constructed the bloc twice. A macrotask sweep did not help (time slicing yields between macrotasks).
  - The sweep now runs after `configureBlac({ unownedSweepDelayMs })` (default 5000) on a per-entry timer; a speculative re-acquire of a still-pending entry restarts it. A bare `ensure()` is still never swept.
  - Corrected the ownership-effect comment in `useBloc.ts`; added the option to `etc/core.api.md` and the docs defaults table.
  - Tests: `useBloc.concurrent.test.tsx`, `StateContainerRegistry.sweep.test.ts` (fake timers, restart case). Changeset: `sweep-grace-period.md`.
- [x] **`watch()` leaks on error** [2.3]
  - Setup (acquire, subscribe, first callback) runs in a `try`; on error it calls `cleanup()` and rethrows. `cleanup` releases only the targets actually acquired.
  - `toWatchTarget`, `resolveBloc` and `resolveBlocPassive` take the captured `registry`.
  - Tests: `watch.test.ts` › "releases its refs when the first callback throws", "releases earlier refs when a later target fails to acquire". Changeset: `watch-error-cleanup.md`.
- [x] **React test helpers leak the global registry** [2.4]
  - Setup runs in `withTestRegistry` (restores even on throw, and stubs bind to the test registry at construction); the UI renders via a `RegistryProvider` wrapper. The `unmount` override is gone.
  - Renamed `testing.ts` → `testing.tsx` for the JSX wrapper (build entry in `packages/blac-react/vite.config.ts` and the `apps/examples` alias updated).
  - Behavior change: core helpers called from the test body no longer see the test registry. Docs updated in `apps/web-docs/.../testing/react.md`.
  - Test: `renderWithBloc.testing.test.tsx` › "leaves the global registry untouched". Changeset: `react-test-helpers-provider.md`.
- [x] **`structuralKey` edge cases** [2.5]
  - Throws in dev on non-plain objects (`Map`, `Set`, class instances without `toJSON`; `Date` still works via `toJSON`). Production unchanged; functions still throw everywhere.
  - Kept the identity cache (hot path); documented that mutating args keeps the old key, plus the JSON `undefined`/`NaN` semantics. Header comment fixed.
  - Test: `structural-key.test.ts` › "throws in dev on non-plain objects…". Changeset: `structural-key-non-plain.md`.
- [ ] **Test stubs diverge from real behavior** [2.6]
  - Resolve per-class equality at construction (not only in `[INIT_CONFIG]`), or always run `[INIT_CONFIG]` in `createCubitStub`.
  - `createCubitStub` / `withBlocState`: support non-`Cubit` containers or throw instead of silently ignoring `state`.
- [ ] **`release()` with an unknown `refId`** [2.7]
  - `StateContainerRegistry.ts:697`: return early (no event, no dispose) when the `refId` isn't held.
- [ ] **Ref-limit check order** [2.8]
  - `StateContainerRegistry.ts:500`: check the limit before adding the ref.

## P2 — Stale or incorrect docs [3]

- [ ] `blac-core/src/config.ts`: correct the default values in the JSDoc (100000 / 100000 / 1000). The defaults table in `apps/web-docs/src/content/docs/core/configuration.md` is stale the same way.
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

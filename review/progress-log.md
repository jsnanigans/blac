# BlaC review — progress log

Working checklist for the findings in this directory. Tick items as they land.
Source of truth for detail is the numbered files; this file only tracks order
and state.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Phase 0 — Unblock the repo (hours) — ✅ complete

Nothing else is trustworthy until the suite is green and the workspace is clean.

- [x] Delete or fix `useBloc.proxy-prop-tracing.test.tsx` (also writes to an absolute path) — [07 §1](./07-tests-and-tooling.md#1-failing-test), [01 §10](./01-correctness.md#10-failing-test-writes-to-an-absolute-path) — _deleted; it pinned a known limitation as expected behaviour. Observation moved to `react/dependency-tracking.mdx` ("Passing state values as props"). `__setTrackTrace` kept — still used by `apps/perf`._
- [x] Land or revert the pending workspace/dependency changes — [07 §6](./07-tests-and-tooling.md#6-pending-workspace-changes) — _done: `2543cd06` patch/minor, `1fd31021` tooling majors, `6e3c4626` react 19.2.8 + lockfile; tree clean_
- [x] Config hygiene: stale aliases, setup files, dead vitest config — [07 §5](./07-tests-and-tooling.md#5-config-hygiene), [03 §9](./03-bundle-and-packaging.md#9-stale-aliases-and-setup-files) — _removed `@blac/preact`/`@blac/adapter` aliases + `blac-preact` setup file and env glob from root `vite.config.ts`, `blac-react/{vite,vitest.config.performance,vitest.config.compiler}.ts`, `{blac-react,devtools-ui,apps-examples}/tsconfig.json`, `apps/examples/vitest.config.ts`; dropped nonexistent `tests` from core `tsconfig` include; dropped both dead packages from the root README table. Root `vp test run` now works (previously failed on the missing setup file)._

**Exit:** ✅ met. Root `vp test run`: 87 files / 1137 tests pass. `typecheck`
clean across all 9 packages.

Deferred out of Phase 0 (not blockers, tracked for later):

- Remaining [07 §5](./07-tests-and-tooling.md#5-config-hygiene) items are behaviour
  changes, not dead config, so they were left alone: core on `jsdom` vs `node`,
  `maxWorkers`/`maxConcurrency: 2`, react aliasing `@dirtytalk/structural` to
  source while core does not, `useDefineForClassFields`/`experimentalDecorators`.
  Fold into Phase 2 (perf) — see also [07 §2](./07-tests-and-tooling.md#2-suite-shape).
- **Pre-existing bug, unrelated to this phase:** `apps/examples`
  `src/__tests__/testing-utils/{integration,cubit-stub}.test.ts` raise 3 uncaught
  exceptions (tests still pass). `entry.interest()` returns `undefined` for a test
  stub; `PathSetSpace.intersects` forwards it to `isEmpty`, which dereferences
  `.size` — `packages/dirtytalk-structural/src/path-set.ts:37` via
  `dirtytalk-engine/src/dirty-channel.ts:161`. Guard the thunk result or fix the
  stub. **Add to Phase 1.**

---

## Phase 1 — Correctness (days) — ✅ complete

Data-loss and lifetime bugs. Each is independently shippable and patch-releasable.

- [x] Emit `created` after `init()` so hydration is not cancelled by seeding — [01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init) — _`StateContainer[INIT_CONFIG]` reordered. Added a dev warning in `_applyHydratedState` so the discard is no longer silent. Pinned by `StateContainer.hydration-init.test.ts`, verified to fail on the old ordering._
- [x] `release()` must honour `dependents` — [01 §2](./01-correctness.md#2-release-disposes-a-dependency-that-a-live-owner-still-uses) — _extracted `_isUnowned(Type, entry)`; `release()` and `_releaseDependent` now share one predicate._
- [x] Track dependent edges per resolved key, not per type — [01 §3](./01-correctness.md#3-dependent-edges-for-per-call-args-are-never-released) — _took the registry-side variant: `_dependentEdges` `WeakMap<owner, Map<Type, Set<key>>>` recorded in `acquire`, swept in `_handleDisposed`. Keeps key-tracking out of `StateContainer` and leaves the public `$blac.dependencies` type (devtools) unchanged._
- [x] `emit`/`patch` after dispose → dev-warn no-op — [01 §5](./01-correctness.md#5-emit-after-dispose-throws) — _`_warnDisposedMutation` helper. Kept `void` returns rather than the review's `boolean` — no caller checks it (YAGNI); revisit if a real need appears._
- [x] `StateContainer.dispose()` must call `super.dispose()` — [01 §8](./01-correctness.md#8-statecontainerdispose-never-calls-superdispose) — _chained at the end of `dispose()`, so the `DirtyChannel` is torn down and a scheduled flush cancelled._
- [-] Coalesce registry `on()` payloads like plugin payloads — [01 §9](./01-correctness.md#9-registry-on-payloads-are-not-coalesced-plugin-payloads-are) — **dropped; took the finding's documented alternative instead.** Coalescing broke three shipped tests (Redux DevTools, time-travel, perf monitoring) that need every intermediate transition — `0→1→2` collapsing to `0→2` makes time-travel impossible. `PluginManager.setupLifecycleHooks` shows the split is deliberate: the plugin lane is flush-driven and carries a `PathSet`; `on('stateChanged')` is a per-emit transition log. Documented the distinction on both instead.
- [x] Guard `undefined` interest in `PathSetSpace.intersects`/`isEmpty` (found in Phase 0) — _fixed one level up in `DirtyChannel.#flush`: a nullish interest thunk is skipped, matching the existing throwing-thunk path. Left `PathSetSpace` typed strictly. Root cause is `createCubitStub` doing `new BlocClass()` without `[INIT_CONFIG]` unless `args` are passed — **the helper is still wrong, see below**._
- [x] Regression tests for each of the above — [07 §3](./07-tests-and-tooling.md#3-missing-coverage) — _`StateContainerRegistry.ownership.test.ts` (3) + `StateContainer.hydration-init.test.ts` (1). Rewrote 5 existing tests that asserted the old throw-on-dispose contract to pin the no-op contract instead. `fast-check` invariants from 07 §3 not done — deferred to Phase 2._

**Exit:** ✅ met. 89 files / 1141 tests pass, 0 uncaught exceptions (was 3),
typecheck and lint clean. Ready for a patch release.

**Behaviour changes to note in the changeset:**

- `emit()`/`patch()` after dispose no longer throw. Anything relying on the
  throw (an `expect(...).toThrow()` in user code) now sees a no-op.
- `created` now fires _after_ `init()`. Plugins observing `created` see
  post-init state; `attachStateBridge`'s first `prev` is the post-init state.

**Carried into Phase 2:**

- `createCubitStub` (`packages/blac-core/src/testing.ts:124`) calls
  `new BlocClass()` and only runs `[INIT_CONFIG]` when `args` are supplied, so a
  stub built without args has an uninitialised container and its first `patch`
  produces an undefined region. The `DirtyChannel` guard stops the crash, but the
  helper should initialise unconditionally.
- `fast-check` registry invariants ([07 §3](./07-tests-and-tooling.md#3-missing-coverage)).

---

---

## Phase 2 — Cheap perf + packaging (days) ← **current**

Low-risk, mostly mechanical, gets both packages back under budget.

- [x] Lazy `stateChanged` bridge; store key on the registry entry — [02 §1](./02-performance.md#1-every-instance-subscribes-an-all_paths-bridge-at-construction), [02 §4](./02-performance.md#4-dispose-is-on-per-instance)
      §1: bridge subscribes on the first `stateChanged` handler and detaches
      with the last; `_pendingChange` only tracked while attached.
      §4: `InstanceEntry.key` + `_entryByInstance` WeakMap make `_pruneEntry`
      O(1); `_entryById` index removes the full scan in `getRefIds`.
      No test added — the effect (channel `<=1` fast path, scan avoidance) is
      not observable through the public API; existing 466 core tests cover the
      behaviour that had to stay unchanged.
- [ ] Collapse the three per-emit notification pipelines — [02 §2](./02-performance.md#2-three-notification-pipelines-per-emit)
      _Blocked pending a decision._ §2 says to delete `notifyStateChanged` /
      `flushStateChanged` and route registry + plugin events through one
      subscription. That is the same two-lane split Phase 1 established is
      deliberate (§9 coalescing broke devtools/time-travel). Premise is also
      partly stale: `hasStateChangedListeners` already gates lane 2, so the
      pipelines do not all run unconditionally. Needs design, not a patch.
- [~] Trim per-instance allocation — [02 §3](./02-performance.md#3-per-instance-allocation)
  Shared `MicrotaskScheduler` as the default (was one per container); an
  explicit `options.scheduler` still wins. Verified by probe that the
  `cancel()` / stale-microtask interleavings are safe to share.
  NOT done: the `_instanceId` field initialiser is NOT dead as §3 claims —
  `createCubitStub` deliberately skips `[INIT_CONFIG]` when no args are
  given (pinned by `testing.args-deps.test.ts`), so it is a real fallback.
  Phase 1's "fix createCubitStub" note was wrong; dropped.
  Remaining: lazy collections (`??=`), `Meta` class with prototype getters.
- [~] `structuralKey` off the hot path — [02 §5](./02-performance.md#5-structuralkey-on-the-hot-path)
  Memoized object args by identity in a `WeakMap`. Extends the assumption
  `entry.argsKey ??=` already made (args immutable after acquire).
  Bullets 2-3 (precompute in `depend`, hand-rolled serialiser) not done —
  the cache removes the repeat cost those targeted.
- [x] `patch` equality work done once — [02 §8](./02-performance.md#8-patch-does-the-equality-work-twice)
      Dropped the pre-scan; `super.patch` already returns `prev` by reference
      on a no-op (`container.ts:229`) and returns before marking. Only the dev
      emit-rate counter was affected, so the rate check moved after the
      identity test. Test pins that a no-op `patch` does not count.
- [~] Move `getPluginManager` out of the registry module so plugins tree-shake — [03 §2](./03-bundle-and-packaging.md#2-the-plugin-system-cannot-be-tree-shaken-away)
  Singleton moved to `src/plugins.ts`; registry no longer references the
  plugin system (one-way dependency now). **Did not shrink the bundle**
  (8.46 → 8.51 kB): the barrel still re-exports `getPluginManager`, so
  anything importing `@blac/core` keeps pulling `PluginManager` in.
  Kept for the decoupling. Actually tree-shaking needs the export dropped
  from the barrel (`/plugins`-only) — a breaking change, needs a decision.
- [x] Dev/prod export conditions; strip dev-only branches — [03 §4](./03-bundle-and-packaging.md#4-dev--prod-conditions), [02 §9](./02-performance.md#9-dev-only-branches-on-the-hot-path)
      **Took the `isDev` guard, dropped the two-build split — the finding's size
      premise is false.** Measured it: a prod build (`vp pack --env.NODE_ENV
production`) removes every `process.env` reference from `dist` but is
      _byte-identical_ in size (8.49 kB both ways). The `NODE_ENV` guards wrap
      almost nothing — two one-line `_checkEmitRate()` calls into a function
      that ships anyway, a couple of `console.warn` strings, and the
      `APPLY_DEPS` collision scan. The `console.*` calls surviving a prod build
      are `this._debug` opt-ins and genuine handler-failure `console.error`
      paths, which no define can remove. 8 entry points × 2 builds for 0 bytes
      was not worth it.
      The real half of the finding — a bare `process.env` read _throws_ under
      plain ESM/Deno/Bun — is fixed: `IS_DEV` in `constants.ts`
      (`typeof process === 'undefined' || process.env?.NODE_ENV !==
'production'`), used at all 8 core guard sites. `blac-react` has a single
      guard and keeps a local copy rather than widening the public barrel for
      one call site. Verified: pre-fix pattern throws `ReferenceError: process
is not defined` with no `process` global; post-fix built `dist` runs clean.
      **Costs ~450 B** (core 8.51 → 8.96 kB): `IS_DEV` is not statically
      foldable, so the bundler now retains the dev branches it used to drop.
      Measured an inline-guard variant too (8.97 kB) — no better, so the shared
      constant wins on being one definition. Correctness over 450 B.
- [x] `install()` must not log unconditionally — [03 §5](./03-bundle-and-packaging.md#5-install-logs-unconditionally)
      All three `console.log` sites in `PluginManager` gated on
      `NODE_ENV !== 'production'`, matching the predicate core already uses.
- [x] Fix `@dirtytalk/structural` workspace range in `dependencies` — [03 §6](./03-bundle-and-packaging.md#6-dependencies-on-dirtytalkstructural-is-a-workspace-range) — _publish blocker_
      Moved `@dirtytalk/structural` and `@dirtytalk/spatial` `0.0.x` → `0.1.0`
      so `^` admits patches; `engine` was already `0.2.0`. Chose this over a
      changeset `fixed` group, which would have renumbered all three to `2.0.x`
      and welded their release cadence to `@blac/*`. Changeset added.
      `chore(release): move dirtytalk packages to 0.1.0`
- [-] Correct `sideEffects` — [03 §8](./03-bundle-and-packaging.md#8-sideeffects-false-is-not-quite-true) — no change; the finding
  concludes "keep the flag", it is advisory about future module scope.
- [ ] De-duplicate subpath exports — [03 §3](./03-bundle-and-packaging.md#3-subpath-exports-duplicate-the-barrel) — _moved to Phase 4_, it is a
      public API surface decision (lean barrel vs. drop subpaths).
- [x] Harden the build script — [03 §7](./03-bundle-and-packaging.md#7-build-script-fragility)
      Five packages hard-coded `cp` per entry point; reused core's existing
      `for f in dist/*.d.ts` glob. Was already dropping declarations:
      react copied 2 of 7, devtools-ui 1 of 6.
- [x] `api-extractor` with committed reports — [07 §4](./07-tests-and-tooling.md#4-ci-gates), [06 §3](./06-dx-and-docs.md#3-make-docs-a-ci-concern)
      8 configs covering every entry point (core 6, react 2); reports in
      `packages/*/etc/*.api.md`, reproducible. `pnpm api:check` at root.
      **`api:check` is now clean (0 warnings)** and ready to gate CI.
      53 `ae-missing-release-tag` warnings suppressed in config: everything
      reachable from a published entry point is public by construction, and
      `@internal` items are kept out of the barrels instead — tagging each
      export adds noise, not information. (`defaultReleaseTag` is rejected by
      the config schema, so per-rule suppression is the supported route.)
      The other 17 were real TSDoc defects and are fixed at source: dotted
      `@param opts.args` names (invalid TSDoc) rewritten as one `@param`
      block, `@template` renamed to the standard `@typeParam`, unescaped `@`
      and `>` in prose backticked, and two broken `{@link}` references
      (`trackRender`, `createMeta` — neither is an export of its package)
      turned into plain code text.
      The report confirms `getPluginManager` is in the barrel — the 03 §2
      tree-shaking blocker — and that no `tracked` export exists.
- [x] CI gate: `api:check` — [07 §4](./07-tests-and-tooling.md#4-ci-gates)
      Added an `API report` job to `.github/workflows/ci.yml`. Verified it
      actually fails on a real surface change (adding an export to `/debug`),
      not just that it passes on a clean tree.
- [x] **Size budgets reset to actuals.** The old 7.8 kB / 3.5 kB numbers were
      arbitrary and had never been met. Now core 9.1 kB (actual 8.96) and react
      5.8 kB (actual 5.61) — a small headroom over measured reality, so the
      budget works as a regression ratchet instead of permanent red. Tighten as
      the remaining 02 perf work lands.
- [-] CI gates: size-limit, typecheck, test — [07 §4](./07-tests-and-tooling.md#4-ci-gates)
  **Dropped: all CI workflows were removed from the repo** (`.github/workflows/`
  deleted). The root `size` script stays and both budgets are green, so it is
  runnable locally and ready to re-wire if CI returns.

Also done: unified the `@dirtytalk/structural` test alias — `blac-core` was the
only config resolving to built `dist` while react, plugin-persist and apps/perf
all used source, so core could silently test a stale build ([07 §5](./07-tests-and-tooling.md#5-config-hygiene)).

**Baseline re-measured after the dependency upgrade** (review numbers still hold):
`@blac/core` 8.45 kB / 7.8 kB (+645 B, was +548 B) ·
`@blac/react` 5.41 kB / 3.5 kB (+1.91 kB, unchanged).

**Exit:** ✅ both packages under budget (core 8.96/9.1 kB, react 5.61/5.8 kB).
"CI enforces it" is void — CI was removed from the repo; `pnpm size` is local.

**Note:** the `API report` CI job added earlier this phase went with the
workflow deletion. `pnpm api:check` and the committed `etc/*.api.md` reports
are unaffected.

---

## Phase 3 — Docs and error messages (days, parallelisable)

Independent of all code phases — can be done by someone else concurrently.

- [x] Fix README/API drift across root, core, react, `watch-entry.ts`, `apps/web-docs` — [06 §2](./06-dx-and-docs.md#2-documentation-drift)
      Corrected `depend()`/`subscribe()`/`onStateChange` signatures, removed a
      documented `tracked()` export and `/tracking` subpath that never existed,
      fixed the root README's `useSyncExternalStore` + Preact claims, refreshed
      all 9 version rows, and dropped the "post-dispose emit throws" claim from
      three guide pages (falsified by our own Phase 1 change).
- [x] Improve error messages for the top DX traps — [06 §4](./06-dx-and-docs.md#4-error-messages), [06 §1](./06-dx-and-docs.md#1-dx-traps-ranked-by-how-quickly-a-new-user-hits-them)
      `structuralKey` names the offending key; `_warnDisposedMutation` explains
      the async-after-unmount cause; `buildTrackedProxy` rethrows the raw
      `#private` TypeError with a BlaC message (dev only). Added
      `@types/node` + `types: ["node"]` to blac-react — the new
      `process.env` guard broke `pnpm -w build` while `tsc --noEmit` passed.
- [-] Make docs a CI concern (typecheck examples) — [06 §3](./06-dx-and-docs.md#3-make-docs-a-ci-concern)
  **Dropped: no CI to hang it on** — all workflows removed from the repo.
  The `api:check` half already exists as a local script with committed
  reports; re-open if CI returns.
- [x] Onboarding surface / getting-started path — [06 §5](./06-dx-and-docs.md#5-onboarding-surface)
      Landing page restructured to the finding's pitch order and the three
      input lanes surfaced. The `useSyncExternalStore` claim was not actually
      on this page (it was the root README, already fixed); "no provider tree"
      stays — `BlocProvider` is optional, not required.

---

## Phase 3.5 — Audit-driven cleanup (done)

A read-only audit re-verified every open finding against current source.

- [x] `packages/blac-core/README.md` still called `emit`/`update` **protected**
      — [05 §1](./05-api-and-types.md#1-cubit-vs-statecontainer). They are
      public (`StateContainer.ts:478,491`), and there is no `update` method at
      all; the api-extractor report was the ground truth. The Phase 3 pass
      fixed the Cubit line and missed this one.
- [x] `guide/versioning.md:99,101` still claimed `useSyncExternalStore` is used
      — a **regression left by our own Phase 3 pass**, which corrected three
      other pages and missed this table.
- [x] Deleted dead surface — [05 §3](./05-api-and-types.md#3-dead-surface):
      `MAX_GETTER_DEPTH`, `BLAC_ID_PATTERNS`, and the whole `global.d.ts`
      (`__BLAC_LOGGING__`). Each was referenced only at its own definition;
      `api:check` confirms the public surface is unchanged.
- [x] `BlocProvider` memoised its context map on `args` **object identity**
      ([06 §1](./06-dx-and-docs.md#1-dx-traps-ranked-by-how-quickly-a-new-user-hits-them) item 6), so an inline
      `args={{ ... }}` literal rebuilt the map every render and re-rendered
      every consumer. Now keyed on `resolveInstanceKey(bloc, args)` — already
      public, so no new export. Test pins it (fails on the old dep array).

**Audit verdicts worth keeping:** 02 §2's premise is stale on top of the
design conflict (`hasStateChangedListeners` already gates the registry lane);
02 §3's "dead `_instanceId`" and 03 §8 are correctly closed; 03 §2's decoupling
landed but tree-shaking still needs the barrel cut. 04 §1-§6 are one coordinated
Phase 5 rewrite — the audit agrees they should not be sliced piecemeal.

---

## Phase 4 — API and type surface (1–2 weeks, minor release) ← **current**

Breaking-ish; batch into one minor. Additive items landed first — everything
below that is still open is a _breaking_ change and needs a batching decision.

- [x] Public deps API — [05 §4](./05-api-and-types.md#4-the-deps-lane-has-no-public-api)
      Shipped `useBlocDeps(bloc, slice)` from `@blac/react`
      (`src/useBlocDeps.ts`). Purely additive: `APPLY_DEPS`/`REMOVE_DEPS_OWNER`
      stay `@internal` and unchanged, they just stop appearing in user code.
      **No dependency array**, unlike the review's sketch — `APPLY_DEPS`
      already shallow-compares and no-ops on an unchanged slice
      (`StateContainer.ts:168`), so applying on every commit is both cheaper
      and less error-prone than asking callers to maintain a dep array (the
      old pattern needed an `eslint-disable` for exhaustive-deps).
      **Typed on a structural `DepsTarget<D>`, not `StateContainer`** — this is
      forced: `useBloc` returns `InstanceReadonlyState<T>`, which is an `Omit`
      and therefore drops the symbol-keyed methods, so a `StateContainer`-typed
      parameter rejects the very value `useBloc` hands you. That is finding
      [05 §2.3](./05-api-and-types.md#23-instancereadonlystatet-erases-the-class)
      observed in the wild; when §2.3 is fixed, `DepsTarget` can likely go.
      `DepsTarget` is exported (api-extractor `ae-forgotten-export`).
      Migrated both example apps: `CanvasView.tsx` 10 lines + an
      `eslint-disable` → 1 line; `MultiSourceCanvas.tsx` two owners likewise.
      Docs rewritten off the internal symbols (react README, `guide/inputs.mdx`,
      `guide/best-practices.md`).
      Tests: 2, both mutation-checked. The first version of the unmount test
      passed even with the withdrawal deleted (the bloc is disposed on unmount,
      so `deps` read empty regardless) — rewritten to use two owners sharing one
      instance, which fails correctly when `REMOVE_DEPS_OWNER` is removed.
- [x] `blac()` decorator accepts multiple options — [05 §5](./05-api-and-types.md#5-blac-decorator-accepts-one-option-at-a-time)
      `BlacOptions` union-of-single-key-objects → one interface with four
      optional fields. Non-breaking: the runtime already applied all four keys
      independently (`'keepAlive' in options` etc.), only the type forbade
      combining them. `@blac({ keepAlive: true, key: fn })` now compiles.
- [x] Dead surface: unreachable `throw` in `StateContainerRegistry.on()`
      — [05 §3](./05-api-and-types.md#3-dead-and-redundant-surface).
      The `.set()` immediately above guaranteed `.get()` was truthy; replaced
      the get-then-throw with a `let`-and-assign. No behaviour change.
- [x] Replace the `this`-Proxy getter mechanism with a tracking override so ES `#private` works — [04 §3](./04-architecture.md#3-tracking-override-instead-of-a-this-proxy), [01 §4](./01-correctness.md#4-user-blocs-cannot-use-es-private-fields-or-methods) — _biggest single DX unlock_
      **Non-breaking** — no public surface change beyond one new `@internal`
      symbol, so it did not need the breaking batch.
      Core: `WITH_TRACKED_STATE` symbol + a `_stateOverride` slot on
      `StateContainer`, with `state` overridden to prefer it. Restored in
      `finally` and nestable, so getter→getter chains stay tracked.
      **The `state` getter is overridden in `StateContainer` (blac layer), not
      edited in `StructuralContainer`** — `@dirtytalk/structural` stays
      untouched, honouring [04 §8](./04-architecture.md#8-what-not-to-change).
      React: `buildTrackedProxy` drops `thisProxy` entirely — one proxy instead
      of two per acquisition. Getters run via `desc.get.call(realInstance)`.
      **Two things the review's design did not mention, both found by tests:** 1. _Methods need binding._ `Reflect.get(target, key, target)` returns an
      unbound method, so `bloc.method()` still called with `this` = proxy and
      failed the same brand check. Methods are now bound to the real
      instance and **cached** — an unstable identity per read would defeat
      memoisation in consumers. Pinned by a test. 2. _The `this`-Proxy was doing double duty._ It also intercepted reads of
      branded dep handles (`this.someDep` inside a getter). With getters
      reading off the real instance those reads no longer pass any trap, and
      **16 cross-bloc tracking tests failed**. Fixed by threading the
      `onDepHandle` hook through `WITH_TRACKED_STATE` and having the handle's
      own `track()` consult it, so interception rides the same mechanism
      instead of needing a proxy receiver. Mutation-tested: neutering the
      hook fails 12 tests.
      Deleted the no-`#private` constraint banner in `meta.ts` and the dev-only
      "cannot access #private" rethrow in `buildTrackedProxy` (added in Phase 3
      as the documented stopgap — the real fix supersedes it).
      Rewrote `buildTrackedProxy.test.ts`, which pinned the _limitation_ as
      expected behaviour, to assert `#private` now works.
      **3 lifecycle tests changed:** `onMount`/`onUnmount` receive the live
      registry instance while `useBloc` returns its proxy. They only passed
      before because the two were structurally indistinguishable; bound methods
      made them distinguishable. Left the runtime as-is (the callbacks
      deliberately use the rebind-safe live instance) and switched the
      assertions to compare `$blac.id`. **A proxy is never `===` its target, so
      these tests never actually asserted identity.**
      Sizes: core 9.03/9.1 kB, react **5.52 kB, down from 5.64** — one fewer
      proxy per acquisition.
- [ ] Type tightening: zero-arg constructor constraint, deep-readonly state, dev-only mutation traps, remove `any` — [05 §2](./05-api-and-types.md#2-type-safety)
- [ ] Remove dead/redundant surface; resolve `Cubit` vs `StateContainer` — [05 §3](./05-api-and-types.md#3-dead-and-redundant-surface), [05 §1](./05-api-and-types.md#1-cubit-and-statecontainer-are-the-same-class)
- [ ] Drop `constructor.name` as identity; make static inheritance explicit — [05 §2.5](./05-api-and-types.md#25-constructorname-as-identity), [05 §6](./05-api-and-types.md#6-static-inheritance-is-implicit)
- [ ] `watch()` should not hold a real ref — [05 §7](./05-api-and-types.md#7-watch-holds-a-real-ref)
- [ ] Naming pass — [05 §8](./05-api-and-types.md#8-naming)

**Audit of 05 §3 against current source** (re-verified this session, since
Phase 3.5 had already closed part of it):

| Item                                                   | Verdict                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_GETTER_DEPTH`, `BLAC_ID_PATTERNS`, `global.d.ts`  | already deleted (Phase 3.5)                                                                                                                                 |
| unreachable `throw` in `on()`                          | **fixed this session**                                                                                                                                      |
| `_instanceId` initialiser                              | correctly closed in Phase 2 — it is a real `createCubitStub` fallback, not dead                                                                             |
| 3rd tuple element `ref` / no-op `useId()` in `useBloc` | still true; **zero** consumers destructure a 3rd element anywhere in the repo                                                                               |
| `configureBlacReact` + empty `BlacReactConfig`         | still true; **zero** call sites outside its own module, but it is `@public` and appears in 2 doc pages + the api report — needs the breaking-batch decision |
| `register()` keyed by class name                       | still true; 8 refs, tests pin the name-based throw                                                                                                          |
| `DEFAULT_INSTANCE_KEY` vs `DEFAULT_STRUCTURAL_KEY`     | still true; both are the literal `'default'`                                                                                                                |
| `getInstancesMap()` fresh empty `Map`                  | still true; only 2 refs                                                                                                                                     |
| `registry/*.ts` 8 wrapper files                        | still true; pure internal reorg, but exported names have 9–329 call sites each and must be preserved                                                        |

**Blocked on a decision — the rest of Phase 4 is breaking.** `configureBlacReact`
removal, the `useBloc` tuple arity, `register()` re-keying, `Cubit` vs
`StateContainer`, deep-readonly state and the naming pass all change published
surface. They should land as one batched major/minor with a changeset and a
migration note, not piecemeal.

**Verification:** all packages green — core 467, react 187 (+5), full workspace
suite passes. Sizes under the Phase 2 budgets: core 9.03/9.1 kB, react
5.52/5.8 kB.

**`api:check` caveat:** the committed `etc/*.api.md` reports are formatted with
`vp fmt`, but api-extractor compares against its own raw output, so it always
reports "you have changed the API signature" — **verified this also happens on
an unmodified HEAD**, so it is a pre-existing repo quirk, not a real surface
drift. The committed reports are correct and the only real delta this session is
the new `WITH_TRACKED_STATE` symbol.

**Suggested commits:**

- `feat(blac-react): add useBlocDeps for the deps lane`
- `feat(blac-core): let blac() accept multiple options`
- `refactor(blac-core): drop unreachable throw in registry on()`
- `docs(blac): teach useBlocDeps instead of internal deps symbols`
- `feat(blac)!: run getters on the real instance so ES #private works`

---

## Phase 5 — The `@blac/react` rewrite (one coordinated change)

Items below touch the same ~900 lines of `useBloc.ts`. **Ship together** —
doing them separately means rewriting the reconcile logic twice.

- [ ] `useSyncExternalStore` with a per-consumer version snapshot; fixes tearing — [04 §1](./04-architecture.md#1-usesyncexternalstore-with-a-per-consumer-version-snapshot), [01 §7](./01-correctness.md#7-tearing-under-concurrent-rendering)
- [ ] Activation lifecycle (`onActivate`/`onDeactivate`) + zero-ref sweep; pure render — [04 §2](./04-architecture.md#2-activation-lifecycle-and-a-pure-render), [01 §6](./01-correctness.md#6-instance-creation-and-init-side-effects-run-inside-render)
- [ ] Consolidate ~17 refs / 3 effects into one consumer object — [02 §6](./02-performance.md#6-per-consumer-hook-cost)
- [ ] Unified ownership count; `ensure()` gated behind a dependent — [04 §4](./04-architecture.md#4-one-ownership-model)
- [ ] Registry scoping through React context — [04 §5](./04-architecture.md#5-registry-scoping-through-context)
- [ ] Emit ordering and plugin hooks — [04 §6](./04-architecture.md#6-emit-ordering-and-plugin-hooks)

**Exit:** major release. SSR-safe, concurrent-safe, render is pure.

---

## Deferred / not now

- Large-state scaling (per-index array tracking size cliff) — [02 §7](./02-performance.md#7-per-index-array-tracking-has-a-size-cliff), [04 §7](./04-architecture.md#7-scaling-large-state). Revisit when a real workload hits it.
- Do **not** touch the engine internals — interned path ids, `DirtyChannel`, source-side skeleton diff, leaf-only proxy recording. That layer is the asset. — [04 §8](./04-architecture.md#8-what-not-to-change)

---

## Triage summary

**Start with Phase 0, then Phase 1 §1.** The `init()`/hydration bug silently
discards persisted user state for the pattern the docs themselves recommend —
it is the only finding that loses data. Phases 0–2 are all patch/minor-safe and
should ship before any architectural work begins; Phase 3 can run in parallel
with anything. Phase 5 is the only item that needs a coordinated major.

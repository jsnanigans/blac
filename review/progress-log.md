# BlaC review — progress log

Working checklist for the findings in this directory. Tick items as they land.
Source of truth for detail is the numbered files; this file only tracks order
and state.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Phase 0 — Unblock the repo (hours)

Nothing else is trustworthy until the suite is green and the workspace is clean.

- [ ] Delete or fix `useBloc.proxy-prop-tracing.test.tsx` (also writes to an absolute path) — [07 §1](./07-tests-and-tooling.md#1-failing-test), [01 §10](./01-correctness.md#10-failing-test-writes-to-an-absolute-path)
- [ ] Land or revert the pending workspace/dependency changes — [07 §6](./07-tests-and-tooling.md#6-pending-workspace-changes)
- [ ] Config hygiene: stale aliases, setup files, dead vitest config — [07 §5](./07-tests-and-tooling.md#5-config-hygiene), [03 §9](./03-bundle-and-packaging.md#9-stale-aliases-and-setup-files)

**Exit:** both packages green, `tsc --noEmit` clean, no uncommitted drift.

---

## Phase 1 — Correctness (days) ← **start here after Phase 0**

Data-loss and lifetime bugs. Each is independently shippable and patch-releasable.

- [ ] Emit `created` after `init()` so hydration is not cancelled by seeding — [01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init) — _highest impact: silent data loss_
- [ ] `release()` must honour `dependents` — [01 §2](./01-correctness.md#2-release-disposes-a-dependency-that-a-live-owner-still-uses)
- [ ] Track dependent edges per resolved key, not per type — [01 §3](./01-correctness.md#3-dependent-edges-for-per-call-args-are-never-released)
- [ ] `emit`/`patch` after dispose → dev-warn no-op — [01 §5](./01-correctness.md#5-emit-after-dispose-throws)
- [ ] `StateContainer.dispose()` must call `super.dispose()` — [01 §8](./01-correctness.md#8-statecontainerdispose-never-calls-superdispose)
- [ ] Coalesce registry `on()` payloads like plugin payloads — [01 §9](./01-correctness.md#9-registry-on-payloads-are-not-coalesced-plugin-payloads-are)
- [ ] Regression tests for each of the above — [07 §3](./07-tests-and-tooling.md#3-missing-coverage)

**Exit:** patch release. No behaviour change for correct code; bugs gone.

---

## Phase 2 — Cheap perf + packaging (days)

Low-risk, mostly mechanical, gets both packages back under budget.

- [ ] Lazy `stateChanged` bridge; store key on the registry entry — [02 §1](./02-performance.md#1-every-instance-subscribes-an-all_paths-bridge-at-construction), [02 §4](./02-performance.md#4-dispose-is-on-per-instance)
- [ ] Collapse the three per-emit notification pipelines — [02 §2](./02-performance.md#2-three-notification-pipelines-per-emit)
- [ ] Trim per-instance allocation — [02 §3](./02-performance.md#3-per-instance-allocation)
- [ ] `structuralKey` off the hot path — [02 §5](./02-performance.md#5-structuralkey-on-the-hot-path)
- [ ] `patch` equality work done once — [02 §8](./02-performance.md#8-patch-does-the-equality-work-twice)
- [ ] Move `getPluginManager` out of the registry module so plugins tree-shake — [03 §2](./03-bundle-and-packaging.md#2-the-plugin-system-cannot-be-tree-shaken-away)
- [ ] Dev/prod export conditions; strip dev-only branches — [03 §4](./03-bundle-and-packaging.md#4-dev--prod-conditions), [02 §9](./02-performance.md#9-dev-only-branches-on-the-hot-path)
- [ ] `install()` must not log unconditionally — [03 §5](./03-bundle-and-packaging.md#5-install-logs-unconditionally)
- [ ] Fix `@dirtytalk/structural` workspace range in `dependencies` — [03 §6](./03-bundle-and-packaging.md#6-dependencies-on-dirtytalkstructural-is-a-workspace-range) — _publish blocker, do early_
- [ ] Correct `sideEffects`; de-duplicate subpath exports — [03 §8](./03-bundle-and-packaging.md#8-sideeffects-false-is-not-quite-true), [03 §3](./03-bundle-and-packaging.md#3-subpath-exports-duplicate-the-barrel)
- [ ] Harden the build script — [03 §7](./03-bundle-and-packaging.md#7-build-script-fragility)
- [ ] CI gates: size-limit, typecheck, test — [07 §4](./07-tests-and-tooling.md#4-ci-gates)

**Exit:** both packages under budget, CI enforces it.

---

## Phase 3 — Docs and error messages (days, parallelisable)

Independent of all code phases — can be done by someone else concurrently.

- [ ] Fix README/API drift across root, core, react, `watch-entry.ts`, `apps/web-docs` — [06 §2](./06-dx-and-docs.md#2-documentation-drift)
- [ ] Improve error messages for the top DX traps — [06 §4](./06-dx-and-docs.md#4-error-messages), [06 §1](./06-dx-and-docs.md#1-dx-traps-ranked-by-how-quickly-a-new-user-hits-them)
- [ ] Make docs a CI concern (typecheck examples) — [06 §3](./06-dx-and-docs.md#3-make-docs-a-ci-concern)
- [ ] Onboarding surface / getting-started path — [06 §5](./06-dx-and-docs.md#5-onboarding-surface)

---

## Phase 4 — API and type surface (1–2 weeks, minor release)

Breaking-ish; batch into one minor.

- [ ] Replace the `this`-Proxy getter mechanism with a tracking override so ES `#private` works — [04 §3](./04-architecture.md#3-tracking-override-instead-of-a-this-proxy), [01 §4](./01-correctness.md#4-user-blocs-cannot-use-es-private-fields-or-methods) — _biggest single DX unlock_
- [ ] Public deps API (`useBlocDeps` or a `deps` option) — [05 §4](./05-api-and-types.md#4-the-deps-lane-has-no-public-api)
- [ ] Type tightening: zero-arg constructor constraint, deep-readonly state, dev-only mutation traps, remove `any` — [05 §2](./05-api-and-types.md#2-type-safety)
- [ ] Remove dead/redundant surface; resolve `Cubit` vs `StateContainer` — [05 §3](./05-api-and-types.md#3-dead-and-redundant-surface), [05 §1](./05-api-and-types.md#1-cubit-and-statecontainer-are-the-same-class)
- [ ] `blac()` decorator to accept multiple options — [05 §5](./05-api-and-types.md#5-blac-decorator-accepts-one-option-at-a-time)
- [ ] Drop `constructor.name` as identity; make static inheritance explicit — [05 §2.5](./05-api-and-types.md#25-constructorname-as-identity), [05 §6](./05-api-and-types.md#6-static-inheritance-is-implicit)
- [ ] `watch()` should not hold a real ref — [05 §7](./05-api-and-types.md#7-watch-holds-a-real-ref)
- [ ] Naming pass — [05 §8](./05-api-and-types.md#8-naming)

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

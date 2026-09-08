# Registry scoping & lifecycle bugs

Investigation date: 2026-09-08. Baseline at investigation time: `4e19b485`, both
suites green (blac-core 682 tests / 39 files, blac-react 191 tests / 31 files).
Every finding below was confirmed with a failing probe test against the real
public API, then the probes were deleted.

## Summary

Three confirmed bugs, one root cause dominating. `StateContainer` binds the
module-global registry at construction, so every instance owned by a
non-global registry routes its lifecycle through the wrong one. That single
line breaks `RegistryProvider` (a documented public API), plugins on scoped
registries, dispose-time pruning, and `depend()` isolation.

A fourth (`insertInstance` ordering) was investigated, "fixed", then found on
review to be no bug at all and reverted — see Bug 4.

| #   | Bug                                                           | Severity | Status                |
| --- | ------------------------------------------------------------- | -------- | --------------------- |
| 1   | `StateContainer` ignores its owning registry                  | High     | [x] fixed             |
| 2   | `hasStateChangedListeners` sticks `true` forever              | Medium   | [x] fixed             |
| 3   | `PluginManager.destroy()` leaks per-container channel bridges | Medium   | [x] fixed             |
| 4   | `insertInstance` ordering for `_entryById`                    | —        | withdrawn — not a bug |
| 5   | Testing-setup cleanup                                         | —        | [x] done              |

Branch: `fix/registry-scoping-lifecycle`. Suites after the work:
core 690 pass (was 682), react 192 pass (was 191), **workspace 1389 pass —
fully green**, including the pre-existing `apps/examples` failure that was
present at baseline (see the last section).

Every fix was verified to be load-bearing by disabling it and confirming the
new tests fail — a passing test that does not discriminate the fix is not
coverage.

---

## Bug 1 — `StateContainer` ignores its owning registry

`packages/blac-core/src/core/StateContainer.ts:325`

```ts
private _registry = getRegistry();
```

Captured at construction from the module-global. All nine use sites talk to
that registry regardless of which one actually owns the instance:
`:275` (`depsChanged`), `:419`/`:424`/`:428` (`depend()` resolve+acquire),
`:523` (`created`), `:579` (`disposed`), `:651`/`:687` (`notifyStateChanged`),
`:831` (`hydrationChanged`).

`RegistryProvider` is public API documented for "test isolation, SSR isolation,
and micro-frontends that must not share bloc instances with the host page".
None of that holds.

### Confirmed consequences

- **Lifecycle events reach the wrong registry.** Rendering
  `<RegistryProvider registry={scoped}><View/></RegistryProvider>` stores the
  instance in `scoped` but fires `created` on `globalRegistry`
  (`globalSeen: ['Counter']`, `scopedSeen: []`).
- **Plugins never fire on a scoped registry.** `PluginManager` wires itself via
  `registry.on('created')`, so a manager on a scoped registry receives zero
  events and never attaches a state bridge: `dispatchStateChange` call count 0
  on scoped vs 1 on global.
- **`_handleDisposed` never runs.** A directly-disposed instance is never pruned
  from `instancesByConstructor` / `_entryById`, and its `depend()` dependent
  edges are never swept — the whole dep subtree leaks.
- **`depend()` escapes the sandbox.** A scoped bloc's deps resolve through the
  global registry: `scoped.getInstancesMap(Dep).size === 0` while the dep
  instance lands in `globalRegistry`.

### Fix approach

`StateContainerRegistry.ts:525` (`instance[INIT_CONFIG](config)`) is the only
production `INIT_CONFIG` call site, so it is a clean injection point. Add the
owning registry to `StateContainerConfig`, set `_registry` from it in
`[INIT_CONFIG]`, and keep `getRegistry()` as the bare-`new` fallback.

Watch out for: `packages/blac-core/src/testing.ts:129` also calls
`[INIT_CONFIG]`, and `insertInstance` deliberately does not.

### Progress notes

- [x] Thread owning registry through `StateContainerConfig` (`registry?` field,
      marked `@internal`); type-only import so no runtime cycle
- [x] Set `_registry` in `[INIT_CONFIG]` **before** `init()` runs — `init()` may
      `depend()` or emit, and both must resolve against the owner
- [x] `acquire` passes `registry: this` at the single production create site
- [x] Verify: scoped `created`/`disposed` fire on scoped registry only
- [x] Verify: `depend()` from a scoped bloc resolves within that registry
- [x] Verify: direct `dispose()` prunes the scoped registry's maps + dep edges
- [x] Verify: dependent-edge sweep disposes deps when a scoped owner is disposed
- [x] Verify: `stateChanged` delivered to the owning registry
- [x] React-level: `RegistryProvider` routes lifecycle events to the scoped
      registry (added to `RegistryProvider.test.tsx`)

Tests: `packages/blac-core/src/core/StateContainerRegistry.scoping.test.ts`
(new, 7 tests — 5 scoping + 2 for Bug 2) + 1 added to
`blac-react/src/__tests__/RegistryProvider.test.tsx`. Confirmed load-bearing:
all 5 scoping tests fail with the `[INIT_CONFIG]` binding disabled, and the
React one does too.

Cleaned up on review: the file originally carried an `afterEach(clearAll())`
that cleaned the _global_ registry while every test uses its own local one — it
cleaned nothing (verified: suite is green without it, over three full runs).
The `stateChanged` test also had leftover probe debris (a stray
acquire/dispose, an unused second key) and an `as unknown as { emit }` cast
that reimplemented what `Cubit` already exists for — its doc comment names
"test helpers" as the use case. Now uses `Cubit` and asserts the global
listener was _not_ called, which is the stronger claim.

Note on the React dep lane: `RegistryProvider.test.tsx`'s existing `.track()`
test already passed before the fix, because the React dep-wrapper resolves via
`registry.ensure()` on the scoped registry. It was the **core** `depend()` lane
(`.untracked()`, and any use outside a render) that escaped to the global
registry. Worth remembering — the React tests alone cannot catch this class of
bug.

`createCubitStub` intentionally still falls back to `getRegistry()`: stubs are
standalone by design and `insertInstance` documents that it does not configure
the instance. Left as-is.

---

## Bug 2 — `hasStateChangedListeners` sticks `true` forever

`packages/blac-core/src/core/StateContainerRegistry.ts:906-932`

`on()` increments `_stateChangedListenerCount` unconditionally, but `listeners`
is a `Set`: registering the same function twice increments twice and adds once.
First unsubscribe deletes and decrements; the second sees `deleted === false`
and skips. Net effect — count stuck at 1 with an empty listener set, so every
`emit`/`patch` permanently pays `notifyStateChanged` plus a microtask flush
that delivers to nobody.

Fix taken: **deleted the counter** and derived `hasStateChangedListeners` from
`listeners.get('stateChanged').size`. Guarding the increment would have fixed
this instance; removing the parallel counter removes the whole drift class.
`notifyStateChanged` now reads the same getter.

### Progress notes

- [x] Drop `_stateChangedListenerCount`; derive from the listener Set
- [x] Point `notifyStateChanged` at the getter
- [x] Regression test: duplicate register/unregister returns to `false`
      (confirmed load-bearing against the old counter logic)

---

## Bug 3 — `PluginManager.destroy()` leaks per-container channel bridges

`packages/blac-core/src/plugin/PluginManager.ts:225-230, 313-318`

`destroy()` unsubscribes the registry lifecycle hooks but never calls
`detachStateBridge`, which only runs on a container's `disposed`. The
per-container `ALL_PATHS` subscription survives: after `destroy()`,
`dispatchStateChange` still fires on every flush (verified 1 call before, 1
after). Long-lived containers keep an `ALL_PATHS` subscriber for the app's
lifetime after plugins are gone — and per the class's own comment, that is the
subscription whose cost "defeats the single-consumer-skip optimization".

`uninstall()` / `clear()` have the same shape: bridges attached by
`backfillPlugin` are never released when the last `onStateChange` plugin goes.

Correction to the finding above: the "1 call before, 1 after" evidence was
weaker than it reads. `destroy()` calls `clear()`, so a surviving bridge
dispatches to no enabled plugins — the leak is a live subscription, not a
visible dispatch. It is still a real leak (the subscriber and its
single-consumer-skip cost persist), just not observable through any public
surface. See the test note below.

Fix taken: `containerBridges` changed from `WeakMap` to `Map` so `destroy()`
can enumerate and unsubscribe every live bridge, then clear.

Why a strong `Map` is safe here: an entry is added at `created` and removed at
`disposed`, and the owning registry holds a strong reference across exactly
that same window — so this pins no container beyond its registry lifetime. (A
`WeakRef`-in-`Set` would preserve weakness but buys nothing given that window,
and there is no other `WeakRef` usage in the repo to match.) Note this
reasoning depends on `disposed` actually reaching the manager's registry, which
is what Bug 1 broke — so Bug 1 had to land first.

`uninstall()` / `clear()` left alone deliberately: a bridge is per-container,
not per-plugin, and re-attaching on the next install is correct
(`backfillPlugin` does it). Only manager teardown needs to detach.

### Progress notes

- [x] Make bridged containers enumerable for teardown (`WeakMap` -> `Map`)
- [x] Detach every bridge in `destroy()`
- [x] `uninstall()` / `clear()`: no change needed — reasoning above
- [x] Regression test in `PluginManager.edge-cases.test.ts`

Test-design note worth keeping — three candidate assertions, all rejected
before settling on the private-field one:

1. `onStateChange` not called after `destroy()` — does not discriminate;
   `destroy()` uninstalls the plugins, so nothing dispatches either way.
2. Re-install a plugin and check the dispatch count — no good either;
   `backfillPlugin` legitimately re-attaches a bridge, so 2 calls is correct
   behaviour, not a leak. (My first version of this test asserted 1 and was
   simply wrong.)
3. Re-install and check `prev` is not stale — also passes both ways, because
   `destroy()` drops the lifecycle hooks so `backfillPlugin` sees no
   registered types and never re-attaches.

So the test asserts `containerBridges.size === 0` on the private map, with a
comment saying why. Not ideal — it couples to the implementation — but the
bridge is a `channel.subscribe` (invisible to `consumerCount`, and
`DirtyChannel` exposes no subscriber count), so there is genuinely no public
observable. Verified it fails without the fix and passes with it.

---

## Bug 4 — `insertInstance` ordering — WITHDRAWN, not a bug

`packages/blac-core/src/core/StateContainerRegistry.ts:351-364`

Original claim: replacing an entry disposes the old instance _before_
`_entryById.set(...)`, and since ids derive from the key the two instances
usually share one — so the dispose-time prune could delete the incoming
mapping. I called it "latent" and hardened it anyway.

**That was wrong, and the hardening has been reverted.** The sequence is
inherently safe, not accidentally so: `insertInstance` disposes _before_ it
writes, so any prune-by-id necessarily happens before the `set`. Verified by
probe against the original code, including the exact collision case
(outgoing instance registry-created, incoming `[INIT_CONFIG]`'d to the same
key so `$blac.id` is identical — confirmed equal) — the live entry stays
reachable by id in every arrangement I could construct.

Lesson for next time: "I can't construct a failure but it looks fragile" is
not a bug. The change added a `delete`, a nesting level and a three-line
comment to defend an unreachable state — net negative on readability, and
exactly what YAGNI warns about. Left as it was.

### Progress notes

- [x] Reverted the speculative change; `insertInstance` is untouched
- [x] Verified the original ordering is correct (probe, then deleted)
- [x] No test added — there is no defect to pin

---

## Bug 5 — Testing setup cleanup

A prior audit (`review/07-tests-and-tooling.md` §2, §5) had already flagged the
environment and worker settings and explicitly deferred them to "Phase 2
(perf)", where they were never picked up. Done now.

### What changed

**`blac-core`: `environment: 'jsdom'` -> `'node'`.** Core is
framework-agnostic and touches no DOM API. Checked every apparent DOM
reference: all hits for `window`/`document` were the word "window" in prose
comments. The real platform globals it uses — `DOMException` (the shared
deactivation abort reason), `AbortController`, `queueMicrotask` — are all Node
builtins, verified directly.

**Dropped `maxConcurrency: 2` / `maxWorkers: 2` from both packages.** The
suites were CPU-bound on environment setup, so the throttle was capping
parallelism for no benefit.

Measured, 690 core tests passing throughout:

| Suite | Before                   | After                     |
| ----- | ------------------------ | ------------------------- |
| core  | 8.20s (12.62s env setup) | **0.55s** (2ms env setup) |
| react | 5.37s                    | **1.24s**                 |

Roughly 15x on core, 4x on react. Confirmed stable over three consecutive runs
each — worth checking, since removing a worker throttle can surface flakiness
from shared global-registry state, and did not here.

**Removed both `onConsoleLog` hooks.** They were dead code in opposite
directions: core's allowlisted only logs starting with `UNIT`, and _no test in
the package uses that prefix_ — so its sole effect was suppressing all console
output, including genuine `console.warn`/`console.error` from code under test.
React's returned `true` unconditionally, which is just the default. Verified
the core suite emits no console noise once unfiltered, so removing it costs
nothing today and stops a future real warning from being swallowed.

**Dropped `jsdom` from `blac-core` devDependencies.** The environment switch
left it unreferenced anywhere in the package. Note `@testing-library/jest-dom`,
`@testing-library/user-event`, `arktype`, `fast-check` and `valibot` are _also_
unimported in `blac-core/src`, but they were already unused before this work
and `fast-check` is earmarked by `review/07` §3 — left alone rather than
widening scope.

### Not changed, with reasons

- **The three `blac-react` vitest configs are all live**, not dead weight —
  `vitest.config.performance.ts` backs `test:performance` + `test:memory`, and
  `vitest.config.compiler.ts` backs `test:compiler` + `test:watch:compiler`.
  My initial suspicion was wrong. (`review/07` §4 separately notes these are
  manual-only and will rot; that's a CI question, not a config one.)
- **`npx vitest` does not work** in this repo — it resolves a different vitest
  and dies on a missing `jsdom`. `vp test run <file>` is the invocation. Not
  fixed, but worth knowing before debugging a phantom failure.

### Progress notes

- [x] blac-core test environment jsdom -> node
- [x] Drop the `maxWorkers`/`maxConcurrency` throttle in both packages
- [x] Remove both dead `onConsoleLog` hooks
- [x] Audit the extra blac-react vitest configs (all in use — no change)
- [x] Add scoped-registry isolation coverage (see Bug 1)
- [x] Both suites green; workspace green apart from the pre-existing failure

### Still worth doing (not in this pass)

From `review/07-tests-and-tooling.md`, still open:

- Inconsistent test layout: `core/*.test.ts` alongside `core/__tests__/*.test.ts`,
  plus `testing.args-deps.test.ts` at the package root.
- `fast-check` is a core devDependency that no core test imports; registry
  ownership invariants are the obvious use for it.
- `test:performance` / `test:memory` / `test:compiler` are manual-only — either
  schedule them or delete them.

Already resolved, so ignore `review/07` on these: it claims core does not alias
`@dirtytalk/structural` to source while react does. Both alias structural _and_
engine to source identically today (core's comment even says "matches
blac-react/vite.config.ts"), so the two suites do run against the same code.

---

## Pre-existing failure (fixed)

`apps/examples/src/__tests__/testing-utils/cubit-stub.test.ts` —
"supports observation/emit like real instances".

The test called `createCubitStub(CounterCubit)` and then
`watch(CounterCubit, listener)`, expecting incrementing the stub to wake the
watcher. Those were **two different instances**: the stub is created bare via
`new`, while `watch` acquires its own from the registry (verified by probe —
`watched === stub` was `false`, registry size 1). `watch` subscribes to its own
instance's channel, so the stub's `emit` could never reach it.

Confirmed pre-existing rather than a consequence of the Bug 1 fix — it failed
identically with the `[INIT_CONFIG]` registry binding disabled.

Fixed with one line: `registerOverride(CounterCubit, stub)` before the
`watch()` call, so the registry hands `watch` the stub instead of creating its
own. That helper already exists in `@blac/core/testing` for exactly this, so no
new mechanism was needed, and the test now asserts what it always meant to.
Workspace is fully green as a result: **102 files / 1389 tests**, stable over
three consecutive runs.

---

## Verification checklist

- [x] Workspace `vp test run` fully green — 102 files / 1389 tests
- [x] `vp install --frozen-lockfile` passes (lockfile internally consistent)
- [x] `blac-core`: `vp test run` green — 40 files / 690 tests
- [x] `blac-react`: `vp test run` green — 31 files / 192 tests
- [x] `tsc --noEmit` clean in both packages
- [x] `vp lint src` clean in react; core reports one **pre-existing**
      `no-non-null-assertion` warning at `PluginManager.ts:146`
      (`this.plugins.get(plugin.name)!`) — identical on `main`, only the line
      number moved because of my added comment
- [ ] `pnpm api:check` — **not run** (it needs `pnpm build` first, and I do not
      run builds unprompted). **Expect it to fail until the report is
      regenerated.** `StateContainerConfig` is `@public` in
      `packages/blac-core/etc/core.api.md:645` and gained a `registry?` field;
      the extractor config keeps `@internal` members in the report (they appear
      with an `// @internal` marker), so the new field will show as a diff.
      Also note `ae-internal-missing-underscore`: `@internal` names without a
      leading underscore already produce warnings in this report, so `registry?`
      may add one more.
- [ ] Changeset — not added; `StateContainerConfig` gaining an internal field
      plus four behavioural fixes probably wants a patch entry.

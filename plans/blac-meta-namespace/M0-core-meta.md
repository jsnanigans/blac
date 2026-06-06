# M0 — `$blac` meta namespace on `StateContainer` (keystone)

**Wave:** 1 (sequential — nothing else runs until this commits)
**Model:** Opus 4.8
**Effort:** high
**Estimated touch:** 4–6 files

---

## Goal

Add `readonly $blac: BlacMeta<S>` to `StateContainer`, move the identity/lifecycle surface under it, and keep every legacy member as a deprecated delegate so all downstream packages stay green untouched. This is the only task that designs anything — every other task mechanically consumes its output.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions, `BlacMeta` shape (authoritative).
2. `packages/blac-core/src/core/StateContainer.ts` — the whole file.
3. `packages/blac-core/src/core/symbols.ts` — existing `APPLY_DEPS` pattern for `INIT_CONFIG`.
4. `packages/blac-react/src/buildTrackedProxy.ts` — understand WHY `#private` fields and prototype-getter receivers matter (getters are invoked with `thisProxy` as `this`).
5. `packages/blac-core/src/core/StateContainerRegistry.ts` — `initConfig` call site (~line 338); do **not** edit, just understand.
6. `packages/blac-core/src/index.ts` — barrel.
7. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

### 1. `core/meta.ts` (new)

- `BlacMeta<S>` + `BlacHydration<S>` interfaces exactly as in the README.
- `META_BRAND` symbol (module-level, not exported from the package barrel; exported from the module for the clobber check and tests).
- `createMeta(container): BlacMeta<S>` — returns a **frozen** object whose properties are getters/methods closing over the container instance (NOT over `this`-receiver). It reads the container's private `_` fields; since TS privates aren't reachable from another module, either (a) define a module-internal `MetaInternals` interface and cast once (`container as unknown as MetaInternals`), or (b) have `StateContainer` pass a narrow internal accessor object into `createMeta`. Pick whichever reads cleaner — the constraint is: **one cast/bridge, internal to blac-core, zero runtime indirection on hot paths**.
- Brand: `Object.defineProperty(meta, META_BRAND, { value: true, enumerable: false })` before freezing.

### 2. `StateContainer.ts`

- `readonly $blac: BlacMeta<S> = createMeta(this);` — own data property via field initializer. Field-initializer order is safe because `createMeta` only stores the backref; getters read later.
- Internal fields stay `private _x` (TS-private). `name`, `debug`, `instanceId`, `createdAt` convert from public own fields to private fields (`_name`, `_debug`, `_instanceId`, `_createdAt`) that the meta getters and legacy delegates read.
- **Legacy delegates** (all `@deprecated` JSDoc pointing at the `$blac` replacement):
  - `name`, `debug`, `instanceId` — getter **and setter** (the old fields were writable; `[INIT_CONFIG]` used to write them; keep external writes working until M5).
  - `createdAt`, `isDisposed`, `dependencies`, `hydrationStatus`, `hydrationError`, `isHydrated`, `changedWhileHydrating` — getters.
  - `beginHydration`, `applyHydratedState`, `finishHydration`, `failHydration`, `waitForHydration`, `initConfig` — deprecated methods delegating to `$blac.hydration.*` / `[INIT_CONFIG]`.
- **`[INIT_CONFIG]`** — new symbol-keyed method carrying the old `initConfig` body, writing the private fields. Legacy `initConfig(config)` calls `this[INIT_CONFIG](config)`.
- **Deprecation warning helper**: dev-only, fires once per member name per class (`Map<ctor, Set<string>>` module-level), **suppressed when `NODE_ENV === 'test'` or `'production'`**. Wire it into every legacy delegate.
- **Clobber guard**: at the end of `[INIT_CONFIG]`, dev-only: if `!(this.$blac as any)?.[META_BRAND]`, `console.warn` that a subclass field shadowed `$blac` (subclass class fields initialize after `super()` and can overwrite the base's own property).
- Internal `this.name` reads (error messages, debug logs — ~14 sites in this file) switch to `this._name`; internal `this.debug`/`this.instanceId`/`this.isDisposed` reads likewise. **Internal code must never trigger the deprecation warning.**

### 3. `core/symbols.ts`

- Add `export const INIT_CONFIG = Symbol('blac.initConfig');` with an `@internal` doc comment following the `APPLY_DEPS` precedent (registry + testing helpers are the only callers).

### 4. Barrel (`src/index.ts`)

- Export `BlacMeta`, `BlacHydration` types. Export `INIT_CONFIG` alongside `APPLY_DEPS`/`REMOVE_DEPS_OWNER` (`@internal`).

### 5. Tests (`core/__tests__/StateContainer.meta.test.ts`, new)

Cover at minimum:

- `$blac.name/id/debug/createdAt` reflect `[INIT_CONFIG]` values and live updates.
- `$blac.disposed` flips on `dispose()`; `$blac.dependencies` mirrors `depend()` bookkeeping.
- `$blac.hydration` full cycle: `begin → apply → finish`, `fail`, `wait` resolve/reject — parity with the legacy methods (call legacy on one instance, `$blac.hydration` on another, assert identical observable behavior).
- Legacy delegates return identical values to their `$blac` counterparts; legacy setters (`name = 'x'`) update `$blac.name`.
- Meta object is frozen and identity-stable across reads.
- Clobber guard: a subclass with a `$blac = {} as any` class field triggers the dev warning (temporarily set `NODE_ENV` to something non-test inside the test, restore after — or expose the check for direct invocation; your call).
- Proxy safety: simulate `buildTrackedProxy`'s pattern — invoke a legacy prototype getter with a `Proxy(instance, {})` as receiver and assert no throw and correct value (this pins the no-`#private` constraint).

Import test APIs from `'vite-plus/test'` — bare vitest globals fail lint.

---

## Owned files (write set)

```
packages/blac-core/src/core/StateContainer.ts
packages/blac-core/src/core/meta.ts            (new)
packages/blac-core/src/core/symbols.ts
packages/blac-core/src/core/__tests__/StateContainer.meta.test.ts  (new)
packages/blac-core/src/index.ts
packages/blac-core/package.json                (size-limit budget bump ≤ +0.3 kB ONLY if needed, with comment)
```

**Do not touch:** `StateContainerRegistry.ts`, `plugin/**`, `watch/**`, `testing.ts`, any other package, any existing test file. Legacy delegates exist precisely so those keep passing unmodified.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` — clean (or report).
   - Confirm nothing in the repo already defines `$blac`: `rg -l '\$blac' --type ts packages apps` → only this plan dir.
2. **Implement.** Per spec above.
3. **Verify.** From `packages/blac-core/`:
   - `vp run typecheck`
   - `vp run lint`
   - `vp run format:check`
   - `vp run size` (bump budget per rules only if exceeded)
4. **Test.** From `packages/blac-core/`: `vp run test` — the **entire existing core suite must stay green unmodified**, plus the new meta test file.
5. **Commit.** Only owned files, explicit paths:

   ```
   feat(blac-core): add $blac meta namespace on StateContainer
   ```

   Body: note the legacy delegates + deprecation policy + INIT_CONFIG symbol, wrap at 72.

   No `--no-verify`. No co-author.

---

## Acceptance criteria

- [ ] `$blac` own property, frozen, branded, live getters.
- [ ] Every legacy member still works and is `@deprecated`-tagged.
- [ ] `[INIT_CONFIG]` symbol path works; legacy `initConfig` delegates.
- [ ] Zero deprecation warnings emitted from blac-core internal code paths.
- [ ] Existing core test suite green **without edits**; new meta tests green.
- [ ] `vp run size` within (possibly minimally bumped) budget.

---

## Pitfalls

- **No ES `#private` fields, anywhere.** `buildTrackedProxy` invokes prototype getters with a proxy receiver; `#x` access through a proxy throws. This is the architectural constraint that motivated the whole design — add a comment at the top of `meta.ts` so it doesn't get "modernized" later.
- **Field → getter conversion changes `Object.keys(instance)`.** `name`/`debug`/`instanceId`/`createdAt` were enumerable own props; as prototype getters they vanish from `Object.keys`/spread. Check whether any core code or test spreads/serializes instances relying on those keys (rg before assuming). PluginManager extracts fields explicitly, so it's fine — but verify.
- **`initConfig` wrote public fields.** The old body did `this.name = config.name || ...`. The new `[INIT_CONFIG]` must write `_name` etc. directly — if it goes through the legacy setters you'll fire your own deprecation warnings.
- **Warn-once map must key per class, not per instance** — registries create many instances; per-instance would spam.
- **`testing.ts` and the registry still call legacy `initConfig`** — that's expected and correct in M0 (M1/M2d port them). Do not "helpfully" port them; they're outside your write set.
- **Test-env suppression:** vitest sets `NODE_ENV=test`. The deprecation helper must check it, or the 87 legacy test sites will flood output and any `console.warn` spy assertions (emit-rate tests) may break.

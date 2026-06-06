# M3 — Port blac-core + blac-react tests off the legacy surface

**Wave:** 2 (parallel — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** medium
**Estimated touch:** ~14 test files, ~87 sites

---

## Goal

Tests are the largest consumer of the legacy names (~87 sites). Port them to `$blac` / `[INIT_CONFIG]` so M5 can delete the legacy surface with zero test churn. The suites must be green at every point — legacy delegates still exist, so this is a pure rename pass with judgment applied at assertion sites.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions, `BlacMeta` shape, mapping table (in M1's spec — same table applies).
2. `packages/blac-core/src/core/__tests__/StateContainer.meta.test.ts` — M0's new test file: the canonical usage examples. **Do not edit it.**
3. The test files: `rg -ln '\.(name|debug|instanceId|createdAt|isDisposed|hydrationStatus|hydrationError|isHydrated|changedWhileHydrating|beginHydration|applyHydratedState|finishHydration|failHydration|waitForHydration|initConfig)\b' packages/blac-core/src packages/blac-react/src --glob '*.test.*'` — likely: `StateContainer.disposal/hydration*/lifecycle-events/init/registry/subscriptions/equality.test.ts`, `StateContainerRegistry.*.test.ts`, Cubit tests, `testing.args-deps.test.ts`, plus blac-react tests.

---

## Spec

- Apply the standard mapping (see M1) at every **live-instance** site. Sites asserting on DTO shapes (e.g. `InstanceMetadata.instanceId`, plugin event payloads) keep the DTO field names.
- Assertion semantics must be preserved, not just compile:
  - `expect(bloc.isDisposed).toBe(true)` → `expect(bloc.$blac.disposed).toBe(true)`.
  - Tests constructing containers manually and calling `initConfig` → `[INIT_CONFIG]` (import from the barrel or `core/symbols`).
  - Tests that **write** `bloc.name = 'x'` to set up scenarios: legacy setters delegate, but port them to go through `[INIT_CONFIG]` config or `$blac`-era setup so they survive M5.
- Tests asserting deprecation behavior itself do not exist yet — **add one small file** `packages/blac-core/src/__tests__/legacy-deprecation.test.ts` that pins: legacy getters still return correct values, and the warn helper does NOT fire under `NODE_ENV === 'test'`. (M5 will delete this file along with the surface — note that in a comment at the top.)
- Do not refactor test logic, timing, or structure beyond the renames. The DevTools-audit memory applies: some tests await a macrotask for rAF-coalesced events — leave timing alone.

---

## Owned files (write set)

```
packages/blac-core/src/**/*.test.ts          (except core/__tests__/StateContainer.meta.test.ts)
packages/blac-core/src/__tests__/**
packages/blac-core/src/__tests__/legacy-deprecation.test.ts   (new)
packages/blac-react/src/**/*.test.ts*
packages/blac-react/src/__tests__/**
```

**Do not touch:** any non-test source file (M0/M1/M2d own those), M0's meta test, any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` — else **stop**). Write set clean.
2. **Implement.** File-by-file; after each file, run that file's tests (`vp test run <file>` from the package dir) before moving on — don't batch 14 files and debug at the end.
3. **Verify.** From `packages/blac-core/` and `packages/blac-react/`: `vp run typecheck && vp run lint && vp run format:check`.
4. **Test.** Full `vp run test` in both packages — green.
5. **Commit.** Only owned files:

   ```
   test(blac-core): port tests to $blac meta surface
   ```

   Body: note the react tests are included and the deprecation pin file is M5-disposable.

---

## Acceptance criteria

- [ ] `rg -n '\.(instanceId|isDisposed|hydrationStatus|beginHydration|initConfig)\b' packages/blac-core/src packages/blac-react/src --glob '*.test.*'` returns only DTO-field sites and the deprecation pin file.
- [ ] Both suites fully green.
- [ ] No timing/structure changes in any test.

---

## Pitfalls

- **Don't regex-replace blindly.** `name` is the worst offender — `constructor.name`, state fields called `name`, DTO fields, and the legacy member all look identical. Classify by receiver.
- Test imports come from `'vite-plus/test'` — keep it that way in the new file.
- M1/M2d may be editing source files in the same packages concurrently — your write set is tests only; `git add` explicit paths; if a source-file change breaks a test mid-run, re-run after their commit lands rather than editing source.

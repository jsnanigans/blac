# 07 — Tests and tooling

## 1. Failing test

`packages/blac-react/src/__tests__/useBloc.proxy-prop-tracing.test.tsx:176`
writes to
`/private/tmp/claude-502/-Users-brendanmullins-Projects-blac/dc0e3b22-.../scratchpad/timeline.txt`.
The directory belongs to an earlier assistant session and does not exist, so
the test fails with `ENOENT` everywhere. It was committed in `abfe25ca`.

The test also asserts `childPollutesParent === true`, i.e. it pins a known
limitation as expected behaviour. Delete the `writeFileSync`; consider
deleting the test and moving the observation to `react/dependency-tracking.mdx`.

## 2. Suite shape

| Package | Files | Tests | Time                          |
| ------- | ----- | ----- | ----------------------------- |
| core    | 32    | 461   | 16 s (18 s environment setup) |
| react   | 26    | 181   | 11 s                          |

Observations:

- Core tests run under `jsdom` (`vite.config.ts` `environment: 'jsdom'`) but
  nothing in core touches the DOM. Switching to `environment: 'node'` removes
  most of the 18 s environment cost.
- `maxWorkers: 2` / `maxConcurrency: 2` in both configs throttles a suite that
  is CPU-bound on environment setup. Remove or raise once core is on `node`.
- File naming is inconsistent: `core/*.test.ts` next to `core/__tests__/*.test.ts`,
  and `testing.args-deps.test.ts` at the package root. Pick one layout.
- Several core test files are large (`StateContainer.array-tracking.test.ts`
  783 lines, `PluginManager.test.ts` 785) and mostly exercise
  `@dirtytalk/structural` behaviour through `StateContainer`. Those belong in
  the structural package so core tests stay focused on lifecycle.

## 3. Missing coverage

Tests that would have caught the findings in [01](./01-correctness.md):

- `release()` on a dep with a live dependent keeps the instance
  ([01 §2](./01-correctness.md#2-release-disposes-a-dependency-that-a-live-owner-still-uses)).
- Owner disposal releases dependents for **every** key it resolved via
  `.track({ args })` ([01 §3](./01-correctness.md#3-dependent-edges-for-per-call-args-are-never-released)).
- A bloc that emits in `init()` still receives persisted state
  ([01 §1](./01-correctness.md#1-persisted-state-is-discarded-for-blocs-that-seed-state-in-init)).
  This is an integration test between core and `plugin-persist`; a fake
  `PluginContext` is enough.
- A bloc with a `#private` field and a getter renders through `useBloc`
  ([01 §4](./01-correctness.md#4-user-blocs-cannot-use-es-private-fields-or-methods)).
- A render that throws (error boundary) or suspends before commit does not
  leave a zero-ref instance behind ([01 §6](./01-correctness.md#6-instance-creation-and-init-side-effects-run-inside-render)).
- Registry invariants with `fast-check` (a core devDependency that no core test
  file imports): random sequences of
  acquire/release/depend/dispose never leave an entry with
  `refs.size + dependents.size === 0` that is not disposed, and never dispose
  an entry with owners.

## 4. CI gates

`release:check` runs build, verify (publint), test, typecheck. Add:

- `size-limit` for both packages ([03 §1](./03-bundle-and-packaging.md#1-both-packages-exceed-their-size-budgets)).
- `api-extractor` with committed reports.
- `vp lint` is configured with `typeAware: true`; make sure it runs in CI (it
  is in the root `lint` script but not in `release:check`).
- `test:compiler` (React Compiler) is valuable and currently manual; run it in
  CI alongside the default suite.
- `test:memory` / `test:performance` configs exist; if they are not run they
  rot. Either schedule them nightly or delete the configs.

## 5. Config hygiene

- Root `vite.config.ts` lists `./packages/blac-preact/vitest-setup.ts` in
  `setupFiles` and aliases `@blac/preact`; neither exists. Running `vp test`
  from the root with the root config fails.
- `packages/blac-react/vite.config.ts`, `vitest.config.compiler.ts`, and
  `apps/examples/vite.config.ts` alias `@blac/adapter`; it does not exist.
- `packages/blac-react/vite.config.ts` aliases `@dirtytalk/structural` to
  source "so tests see live tracker features"; core does not. Either both
  alias to source or both use the built package, otherwise core and react run
  against different structural code.
- `tsconfig.base.json` sets `useDefineForClassFields: false` and
  `experimentalDecorators: true`. The `blac()` decorator supports the TC39
  signature (`_context?: ClassDecoratorContext`) so `experimentalDecorators`
  can be dropped. `useDefineForClassFields: false` changes field
  initialisation order relative to `super()` and is the reason the `$blac`
  clobber guard exists; consider flipping it to the TS default and asserting
  in a test that `$blac` is defined before `init()` runs.
- `packages/blac-core/tsconfig.json` `include` lists `tests`, which does not
  exist.

## 6. Pending workspace changes

`git status` at review time shows modifications to `.changeset/config.json`,
`.claude/settings.local.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`
(one line removed). These were not reviewed; check they are intentional
before the next commit.

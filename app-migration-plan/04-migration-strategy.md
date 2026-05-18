# 04 — Migration Strategy

Shim-first, per-app rollout. Approved by user.

## Phase 0 — v2 extensions land first (in this repo)

Goal: v2 has the tools needed for a clean shim before we touch user-fe.

| Item | Scope | Status |
|---|---|---|
| **E1** | Lightweight `BlocProvider` that injects `instanceId` via React context; `useBloc` reads context if no `instanceId` is passed. | Approved (reduced from original proposal) |
| **E2** | Registry / `ensure` / `acquire` reads `static keepAlive` on the class, equivalent to `@blac({ keepAlive: true })`. | Approved |
| **E3** | `useBloc(C, { autoInstance: true })` and/or class-level `static isolated` recognition → auto-key per mount via `useId()`. | Approved |
| ~~E4~~ | ~~Constructor-arg / props through `useBloc`.~~ | **Rejected** — see §R3 |
| E5 | (later) v1-mock test adapter — skip for now, plain `vi.spyOn(Blac, 'getBloc')` keeps working through the shim. | Deferred |
| E6 | (later) dual-registry boot warning. | Deferred |
| E7 | (later) ESLint rule banning `Blac.getBloc` inside `StateContainer`. | Deferred to Phase 3 |

Estimated effort: 2–3 days for E1+E2+E3 with tests.

**Exit criteria.** A v2 build with E1/E2/E3 published to the workspace; v2's own test suite passes; new tests for each extension pass.

## Phase 1 — `blac-compat` package + workspace alias swap

Goal: replace the v1 packages in user-fe with a façade backed by v2. **Zero app-code changes** in this phase.

### Step 1.1 — Create `packages/blac-compat` in user-fe-reviews

Exports the v1 names (`Blac`, `Cubit`, `Bloc`, `BlocBase`, `BlocObserver`, `BlocConstructor`, `BlocGeneric`, `BlocState`, `BlocHookDependencyArrayFn`, `BlacEvent`, `InferPropsFromGeneric`, `useBloc`) on top of v2.

Detail and exact contract in `06-compat-shim-design.md`.

### Step 1.2 — Swap workspace dependencies

In `packages/blac-next/package.json` and `packages/blac-react/package.json`, replace `main` and `module` to re-export from `@9amhealth/blac-compat`. Or, simpler, replace the package contents entirely with a re-export.

Actually preferred: keep the names but point them at the new package via `package.json` `main: ./compat-reexport.ts`.

### Step 1.3 — Replace the v0 `blac` dependency

Add a top-level `pnpm.overrides` entry that resolves `blac@^0.4.1` to `@9amhealth/blac-compat`. This way the 71 v0 files keep their import strings but resolve to the shim.

### Step 1.4 — Port `BlocObserver` in `user-app/state.ts`

Single-file. Convert the v0 debug observer into a `BlacPlugin` registered via `getPluginManager()`. The shim handles BlocObserver as a v1 plugin internally anyway, but this one is custom.

### Step 1.5 — Update `vitest-setup.ts`

Call `blacTestSetup()` in `beforeEach`/`afterEach`. Run full test suite. Fix anything that surfaces.

**Exit criteria.**
- `pnpm test` green in user-fe-reviews.
- `pnpm dev` boots both apps. Smoke run: login, key flows in user-app; user search + lab order in pmp.
- No v0/v1 import diff in app code.
- No new TypeScript errors.

**Rollback.** Single revert. Workspace aliases are cheap.

## Phase 2 — Codemod removes v0 imports (per app)

Goal: every `from "blac"` becomes `from "blac-next"`, and the few v0-specific call sites are rewritten.

### PR 2a — codemod tool

A `jscodeshift` or `ts-morph` script at `scripts/migrate-blac-v0.ts`. Rules listed in `07-codemod-rules.md`.

### PR 2b — apply to pmp

7 mixed files + ~30 v0-only files. Manual review of the 3 BlocProvider sites (well, only one is in pmp). Run app smoke tests. Land.

### PR 2c — apply to user-app

17 mixed files + ~40 v0-only files. The big one is `state.ts` and `UserCubit.ts`. Manual review of the 2 user-app BlocProvider sites. Smoke tests. Land.

### Step 2d — drop `blac@^0.4.1`

Remove from both apps' `package.json`. Remove the `pnpm.overrides` entry. `pnpm install`.

**Exit criteria.**
- `grep "from \"blac\"" apps packages --include="*.ts" --include="*.tsx"` returns nothing.
- `pnpm test` green.
- Both apps boot and pass smoke.

**Rollback.** Revert per-app PR. The codemod is mechanical, the rewrites are obvious diffs to review.

## Phase 3 — Modernize hot paths (optional, ongoing)

Goal: replace shim'd patterns with native v2 where it's worth it.

Order:
1. `packages/shared` (smallest, all-v1, clean baseline).
2. `apps/pmp` (less complex than user-app).
3. `apps/user-app`.

Per-cubit-family rewrites:

| Find | Replace | When |
|---|---|---|
| `Blac.getBloc(X)` inside a cubit method | `private getX = this.depend(X);` + `this.getX()` at call site | Cleanest wins |
| `static keepAlive = true` | `@blac({ keepAlive: true })` (decorator) | Cosmetic, drop the static |
| `static isolated = true` | Remove static, callers pass `{ instanceId: useId() }` (or use E3 marker) | Per family |
| `useBloc(C, { id })` | `useBloc(C, { instanceId: id })` | Easy rename |
| `useBloc(C, { dependencySelector })` | Decide: keep auto-track (default), or `{ dependencies }` if explicit array is needed | After audit |
| `useBloc(C, { props })` | Already rewritten in Phase 2 — verify the `initWithProps` pattern is sensible |
| v0 BlocProvider via shim | Native `<BlocProvider>` from v2 (E1) — same JSX | Once E1 is stable |

Land E7 (ESLint rule for `Blac.getBloc` inside cubits) when starting Phase 3 so new code doesn't regress.

**Exit criteria.** No file uses the shim's v1 names except in `packages/shared` if that's deferred. Eventually shared too.

## Phase 4 — Delete the shim

When Phase 3 is "good enough":

1. Delete `packages/blac-compat`.
2. Delete `packages/blac-next` and `packages/blac-react` (or replace contents with empty re-export of `@blac/core` / `@blac/react` to give a long deprecation tail if anyone still imports `blac-next`).
3. All imports point at `@blac/core` and `@blac/react` from the published v2 packages.
4. `pnpm-workspace.yaml` cleanup.

**Exit criteria.** No `blac` / `blac-next` / `@blac/react` workspace packages remain. CI green.

---

## Timeline estimate (rough)

| Phase | Calendar time | Engineer time |
|---|---|---|
| Phase 0 (E1+E2+E3) | 2–3 days | 2–3 days |
| Phase 1 (shim + alias swap) | 3–5 days | 3–4 days |
| Phase 2 (codemod + both apps) | 1 week | 4–5 days |
| Phase 3 (modernization) | over a few sprints | 8–16 days, parallelizable |
| Phase 4 (shim delete) | 1 day | 1 day |

Phases 0–2 are the critical path to "v0 is gone." Phases 3–4 can run in the background.

## Branching & CI

- Each phase on its own branch.
- Phase 2 PRs target a long-running migration branch (`migrate/blac-v2`) merged back to `main` after each app lands. Keeps blast radius small.
- CI: full test suite + a smoke script that boots both apps headless and exercises one critical path each (auth + a state-changing action).

## Rollback strategy

| Phase | Rollback |
|---|---|
| Phase 0 | Re-publish previous v2 build; no consumer impact. |
| Phase 1 | Revert the alias swap PR. Single commit. |
| Phase 2 | Revert per-app PR. Codemod output is mechanical, diff is reviewable. |
| Phase 3 | Per-family, per-commit. |
| Phase 4 | Restore the shim package from git. |

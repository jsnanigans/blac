# Plan: blac changes to support the user-frontend migration

Source: `research/` (dated 2026-10-21). Scope: only work in this repo. Work in `user-frontend` (renaming the vendored `@blac/react`, `patch` deep-merge fixes, `init`/`dispose` renames, codemods, test-setup migration) is out of scope.

## Goal

Close the gaps that block migrating `user-frontend` (`apps/pmp`, `apps/user-app`, `packages/shared`) from the vendored legacy blac to `@blac/core` / `@blac/react`, and remove the repeated boilerplate the research found.

## Current state

Already in this repo:

- Core: `ensure`, `borrow`, `borrowSafe`, `hasInstance`, `getAll`, `forEach`, `clear`, `clearAll`, `watch`, `depend`, `onActivate(signal)`.
- Registry entries store `args` and `argsKey` (`StateContainerRegistry.ts`), which `clearWhere` can match on.
- `packages/blac-core/src/testing.ts`: `blacTestSetup`, `registerOverride`, `overrideEnsure`, `createCubitStub`, `withBlocState`, `withBlocMethod`, `flush`.
- `packages/blac-react/src/testing.tsx`: `renderWithBloc`, `renderWithRegistry`.
- `packages/plugin-persist`: IndexedDB only, async adapter interface.

Missing:

| Item | Package | Replaces in user-frontend |
| --- | --- | --- |
| `clearWhere(predicate)` | core | PMP `BlacEvent` reset bus, user-app `onUserSessionReset` (71 calls), `disposeWorkspaceScopedCubits`, `_id` string matching |
| `watch(..., { signal })` | core | 12 manual `_observer.subscribe` bridges and their leaks |
| `waitForState(bloc, predicate, opts)` | core/testing | `vi.waitFor` polling, `flushPromises` (85 hits) |
| `@blac({ isolated: true })` | core + react | `useId` + `static key` boilerplate on 61 classes |
| `withBlocs(...)` Storybook decorator | react/testing | duplicated `mockBloc` / `withSeededBloc` in both apps |
| `renderWithBlocs` / documented multi-override recipe | react/testing | per-class `mockUseBlocNext` stubs, duplicated `mockBlacReact.ts` |
| Sync web-storage persist adapter | plugin-persist | PMP `persistCubitState` |
| `@blac/async` | new package | load/mutation template (~250 sites), three loading models, mount-effect triggers, manual invalidation, error-reporting plumbing |
| `paginated()` (optional) | `@blac/async` | ~22 near-clone list cubits |

## Decisions

| # | Decision | Outcome |
| --- | --- | --- |
| D1 | `@blac({ isolated: true })` | **Add it.** Update the docs stance with it. |
| D2 | `@blac/async` shape | **Helper `resource(this, ...)`.** The spike must evaluate how it works and how ergonomic it is (call-site noise, typing, test seeding) against the mixin/subclass alternatives before the full build. |
| D3 | `clearWhere` and keepAlive | **Yes, clears keepAlive.** Existing `clear(Class)` / `clearAll()` already dispose keepAlive instances; `clearWhere` matches that. Also provide utilities to clear/reset everything (see Phase 1, item 4). |
| D2a | How `resource(this, ...)` learns about activation | **Public `onActivated(container, cb(signal))`** over an internal `[ON_ACTIVATED]` symbol (same pattern as `[ON_DISPOSE]`). **Done** in core; runs on each activation, and immediately if already active. Field initializers run before `[INIT_CONFIG]`, so args-derived values (tags, keys) in `resource()` must be lazy (`() => ...`). |
| D5 | `invalidate(tag)` on instances that are not active (keepAlive, no owners) | **Mark stale; reload on next activation.** No eager fetch for unused instances. |
| D6 | Toasts and `success: 'Saved'` | **`configureAsync({ onSuccess, onError, retryOn })`**; core stays framework-free and the app wires `message.success`. A per-call `onError` can suppress the global one (e.g. 404 skip). |
| D4 | Persist: second sync adapter interface, or a new plugin class? | **Neither.** The adapter interface now accepts sync or async results; the plugin hydrates synchronously when `get` returns a value. `createWebStoragePersistPlugin` is a factory over it. |

## Phases

### Phase 1: core primitives

1. `clearWhere(predicate)` — **done** (tests: keepAlive, args matching, owned instances; "disposal during iteration" is handled by snapshotting matches before disposing)
   - Add a registry method that iterates entries and disposes matches; export it from `registry/management.ts` and `registry/index.ts`.
   - Predicate receives the instance (with `args`); also covers `clear(Class)` use cases that matched on id prefixes.
   - Tests: keepAlive, instances with active owners, args matching, disposal during iteration.
2. `watch(..., { signal })` — **done**
   - Add `signal?: AbortSignal` to `WatchOptions`; abort calls the returned stop function.
   - Already-aborted signal returns a no-op stop.
   - Tests: abort before and after first callback, combined with `create: false`.
3. `waitForState(bloc, predicate, { timeout })` in `testing.ts` — **done**
   - Check current state first, then resolve on the first matching `stateChanged`; reject on timeout; clean up the subscription either way.
   - Tests: already-true, becomes-true, timeout.
4. Clear/reset utilities (D3) — **done, no new API**: `clearWhere(() => true)` disposes everything (keepAlive included) and keeps registered types; `clearAll()` also forgets types. Per-class resets use `clear(Class)`.
5. Optional: `borrow` accepting `{ key }` so lookups need not repeat the full `Args`. Skip unless a concrete need appears.

### Phase 2: react and testing

- 2a. **done** — `isolated` (D1 = yes): flag stored by the decorator, read by `useBloc`, which folds `useId()` into the instance key. Update the web-docs sections that currently say per-mount instances must be explicit (`core/tracked.md`, `react/dependency-tracking.mdx`, `testing/core.md`, `guide/troubleshooting.md`, `integrations/ssr.md` mention isolated; review each).
- 2b. **done** — `withBlocs([[X, { args, state }], ...])` in `@blac/react/testing`: renders the story in its own `RegistryProvider`.
- 2c. **done** — `renderWithBlocs`, or document `renderWithRegistry` with several `registerOverride` calls. Pick whichever is smaller once 2b exists.
- 2d. **done** — Document a "mock `useBloc`" recipe (override + stub) in `apps/web-docs/src/content/docs/testing/`.

### Phase 3: plugin-persist — **done**

- Add a `localStorage` / `sessionStorage` adapter with synchronous hydration (no flash at boot for `UserCubit`), debounced write, and flush on `pagehide`.
- Resolve D4 first. Tests alongside `IndexedDbPersistPlugin.test.ts`.

### Phase 4: `@blac/async`

**Progress:** D2a, D5 and D6 decided. `onActivated(container, cb(signal))` is implemented and tested in `@blac/core` (not committed yet). Spike not started.

Build order and estimates: scaffold 0.5d; `resource` 1.5d; `mutation` 0.5d; `invalidate(tag)` with the tag index kept per registry (`WeakMap` keyed on the registry, so `RegistryProvider` scopes stay isolated) 1d; `configureAsync` 0.5d; test seams 0.5d; docs and example 1d; `paginated()` 1–1.5d (optional).

Spike also writes `ConsistencyScoreCubit` as an `AsyncCubit` subclass (~30 lines) so D2 is judged on real call sites.

Spike (time-boxed, ~1 day), in parallel with Phase 1:

- Prototype `resource()` and `mutation()` on one cubit in a scratch example under `apps/examples`.
- Verify: `idle | loading | success | error` union stored in state (tracked, seedable), latest-wins with `AbortController`, abort on deactivate, `auto: true` via `onActivate(signal)`.
- Exit criterion: the research's `ConsistencyScoreCubit` sketch compiles and removes the load template and mount effect. Revisit D2 if it does not.

Build (after the spike and D2):

- In-flight dedupe, `reload()`, stale time.
- Tag-based `invalidate(tag)` across blocs.
- `configureAsync({ onError, onSuccess, retryOn })` for error reporting, toasts, breadcrumbs and the token-refresh retry.
- Test seams: seed a resource as `success`/`error`; assert on mutations without mocking the service.
- Optional, last: `paginated()`.
- Uses public `@blac/core` API only.

### Phase 5: wrap-up

- Web-docs page for each new API.
- Per package: `vp check` and `vp test`.
- `api:check` fails on clean main from formatting drift (see memory); verify per symbol.
- Check the diff against this plan for drift before each commit.

## Order

Phase 1 and the Phase 4 spike start together. Phases 2 and 3 can follow in any order after Phase 1. The Phase 4 build waits on the spike, D2 and Phase 1. Phase 5 runs per phase.

## Not proposed

- A general app event bus in core: every current use is a session reset (`clearWhere`) or a token-refresh retry (`@blac/async`).
- Suspense integration: the codebase models loading explicitly.

## Risks

- `clearWhere` on keepAlive instances during active owners: define behaviour for owners that still hold a handle (covered in D3 tests).
- `isolated` reverses a documented stance; docs and examples must change with it.
- `@blac/async` is the largest piece; the spike protects against building the wrong shape.
- Research counts are grep-based estimates; items marked unverified in `research/02-migration-blockers.md` were not re-checked.

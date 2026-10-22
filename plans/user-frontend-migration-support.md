# Plan: blac changes to support the user-frontend migration

Source: `research/` (dated 2026-10-21). Scope: only work in this repo. Work in `user-frontend` (renaming the vendored `@blac/react`, `patch` deep-merge fixes, `init`/`dispose` renames, codemods, test-setup migration) is out of scope.

## Goal

Close the gaps that block migrating `user-frontend` (`apps/pmp`, `apps/user-app`, `packages/shared`) from the vendored legacy blac to `@blac/core` / `@blac/react`, and remove the repeated boilerplate the research found.

## Status

All items are implemented and documented except the optional `paginated()`.

| Item                                                                   | Package        | Replaces in user-frontend                                                                                                       | Code        | Docs (`apps/web-docs/src/content/docs/`)                                        |
| ---------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `clearWhere(predicate)`                                                | core           | PMP `BlacEvent` reset bus, user-app `onUserSessionReset` (71 calls), `disposeWorkspaceScopedCubits`, `_id` string matching      | done        | `core/instance-management.md`                                                   |
| `watch(..., { signal })`                                               | core           | 12 manual `_observer.subscribe` bridges and their leaks                                                                         | done        | `core/watch.md`                                                                 |
| `waitForState(bloc, predicate, opts)`                                  | core/testing   | `vi.waitFor` polling, `flushPromises` (85 hits)                                                                                 | done        | `testing/core.md`                                                               |
| `@blac({ isolated: true })`                                            | core + react   | `useId` + `static key` boilerplate on 61 classes                                                                                | done        | mentioned across `core/`, `react/`, `testing/`, `guide/`, `integrations/ssr.md` |
| `withBlocs(...)` Storybook decorator, `renderWithBlocs`                | react/testing  | duplicated `mockBloc` / `withSeededBloc`, per-class `mockUseBlocNext` stubs, `mockBlacReact.ts`                                 | done        | `testing/react.md`                                                              |
| Sync web-storage persist adapter                                       | plugin-persist | PMP `persistCubitState`                                                                                                         | done        | `plugins/persistence.md`                                                        |
| `onActivated(container, cb(signal))`                                   | core           | (enabler for `@blac/async`, D2a)                                                                                                | done        | `core/cubit.md`                                                                 |
| `$blac.registry`                                                       | core           | (enabler for per-registry invalidation)                                                                                         | done        | `core/cubit.md`                                                                 |
| `@blac/async` (`resource`, `mutation`, `invalidate`, `configureAsync`) | new package    | load/mutation template (~250 sites), three loading models, mount-effect triggers, manual invalidation, error-reporting plumbing | done        | `guide/async-resources.md`, package README, example `14-async-resources`        |
| `paginated()` (optional)                                               | `@blac/async`  | ~22 near-clone list cubits                                                                                                      | not started | -                                                                               |

## Decisions

| #   | Decision                                                                  | Outcome                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `@blac({ isolated: true })`                                               | **Add it.** Update the docs stance with it.                                                                                                                                                                                                                                                                                             |
| D2  | `@blac/async` shape                                                       | **Helper `resource(this, ...)`.** The spike must evaluate how it works and how ergonomic it is (call-site noise, typing, test seeding) against the mixin/subclass alternatives before the full build.                                                                                                                                   |
| D3  | `clearWhere` and keepAlive                                                | **Yes, clears keepAlive.** Existing `clear(Class)` / `clearAll()` already dispose keepAlive instances; `clearWhere` matches that. Also provide utilities to clear/reset everything (see Phase 1, item 4).                                                                                                                               |
| D2a | How `resource(this, ...)` learns about activation                         | **Public `onActivated(container, cb(signal))`** over an internal `[ON_ACTIVATED]` symbol (same pattern as `[ON_DISPOSE]`). **Done** in core; runs on each activation, and immediately if already active. Field initializers run before `[INIT_CONFIG]`, so args-derived values (tags, keys) in `resource()` must be lazy (`() => ...`). |
| D5  | `invalidate(tag)` on instances that are not active (keepAlive, no owners) | **Mark stale; reload on next activation.** No eager fetch for unused instances.                                                                                                                                                                                                                                                         |
| D6  | Toasts and `success: 'Saved'`                                             | **`configureAsync({ onSuccess, onError, retryOn })`**; core stays framework-free and the app wires `message.success`. A per-call `onError` can suppress the global one (e.g. 404 skip).                                                                                                                                                 |
| D4  | Persist: second sync adapter interface, or a new plugin class?            | **Neither.** The adapter interface now accepts sync or async results; the plugin hydrates synchronously when `get` returns a value. `createWebStoragePersistPlugin` is a factory over it.                                                                                                                                               |

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

### Phase 4: `@blac/async` — **done**, except optional `paginated()`

Package: `packages/blac-async` (`resource`, `mutation`, `invalidate`, `configureAsync`, state constructors `idle/loading/success/failure`). 14 package tests plus an example test; `vp check`, `tsc` and `vp run build` clean. Uses public `@blac/core` API only. Commits: `6c5b807d` (`onActivated`), `91c509f1` (spike), `6a3b8ec1` (`$blac.registry`), `352a6768` (package), `42c17d8e` (docs, README, example).

**Built**

- `resource`: status union in a user-declared state slot (tracked, seedable), latest-wins with abort, in-flight dedupe, `reload()`, `staleTime`, `auto` (load on activation), abort on last release, and the slot restored to its last settled state when a load is cut short by deactivation.
- `mutation`: own status slot, `invalidates`, `success` message. Failures land in the slot and the global `onError`; the returned promise resolves to `undefined` instead of throwing.
- `invalidate(tags, registry?)`: tag index kept per registry in a `WeakMap`, so `RegistryProvider` scopes stay isolated. D5: an active or already-loaded resource reloads; any other is marked stale and loads on next activation. Entries are dropped when the instance is disposed.
- `configureAsync({ onError, onSuccess, retryOn })` (D6): a per-call `onError` returning `false` suppresses the global one; `retryOn` retries a failed call once. `resetAsyncConfig()` for tests.
- `resource` and `mutation` callbacks receive the container `args` as their last parameter, so no `this.args!` is needed. Tags are evaluated on activation.
- Core additions: `onActivated` (D2a) and read-only `$blac.registry`.
- Example `14-async-resources` replaces the spike scratch folder; the temporary `fakeFetch` export in `02-async/FeedCubit.ts` was reverted.

**Spike results** (kept as the record behind D2)

- `ConsistencyScoreCubit`: the 25-line load template and the mount effect became a 4-line `resource(this, 'score', fn, { auto: true })` plus a 1-line `mutation`. `FeedCubit` (02-async) dropped from a 59-line class to 27 lines of body.
- Typing: the key is restricted to `AsyncState` slots and `fn` must return the slot's data type; the subclass variant had to re-declare the generics on every method.
- **D2 verdict: keep the helper.** Call-site noise is the same as the subclass (`resource(this, 'x', …)` vs `this.resource('x', …)`); the subclass only adds a base-class constraint and duplicated signatures. `AsyncCubit` is not shipped.

**Open**

- `paginated()` (optional, ~1-1.5d, not started). Do it only when migrating the ~22 list cubits makes the need concrete.
- No `api:check` for `@blac/async`: only `@blac/core` and `@blac/react` have one, and `plugin-persist` has none either.
- The release notes come from `.changeset/blac-async.md`.

### Phase 5: wrap-up — **done** for everything built

- Web-docs coverage per API is in the Status table above.
- Per package: `vp check` and `vp test` ran clean for `blac-core`, `blac-async` and `examples` (the examples app still has `vitest` import errors in `vp check` that predate this work). The docs snippet check (`scripts/check-snippets.mjs`) passes.
- `api:check` fails on clean main from formatting drift (see memory), so `core.api.md` was edited by hand for `onActivated` and `$blac.registry`.

## Order (as executed)

Phase 1, then Phases 2 and 3, the Phase 4 spike, the D2 decision, `onActivated`, the `@blac/async` build, and docs per phase.

## Next steps (proposed, not started)

Proposal pages under `apps/web-docs/src/content/docs/proposals/` (own "Proposals" topic in the docs nav, linked from the Async Resources guide), anonymized, one per area: core (`clear-where`, `watch-signal`, `borrow-key`), react/testing (`isolated-instances`, `testing-helpers`), persistence (`web-storage-persist`), async (`list-query`, `mutation-concurrency`, `retry-failed`), and release/adoption (`release-readiness`, `adoption-pilot`). Built items are labelled adoption previews; the rest await review before any build.

1. Changesets (`proposals/release-readiness`) for core (`clearWhere`, `watch` signal, `waitForState`, `onActivated`), react (`isolated`, `withBlocs`, `renderWithBlocs`) and plugin-persist (web storage). Only `blac-async.md` exists. Bump level (patch vs minor) is open. ~0.5h.
2. Pilot the shipped APIs in `user-frontend` (`proposals/adoption-pilot`). Settles the open questions in the async pages below.
3. `mutation` concurrency: ordered slot plus `exclusive: true` (`proposals/mutation-concurrency`). ~2-3h.
4. `retryFailed(registry?)` and a `retryOn` recipe (`proposals/retry-failed`). ~3h. Open: whether a `401` surfaces as an `ApiError` with a status.
5. `listResource` with `setQuery` (`proposals/list-query`), only if the pilot shows the page-reset logic repeating. ~1d. Replaces the full `paginated()` idea.
6. `api:check` for `@blac/async`, after fixing the formatting drift on `main`. ~2h.

## Not proposed

- A general app event bus in core: every current use is a session reset (`clearWhere`) or a token-refresh retry (`@blac/async`).
- Suspense integration: the codebase models loading explicitly.

## Risks

- `clearWhere` on keepAlive instances during active owners: define behaviour for owners that still hold a handle (covered in D3 tests).
- `isolated` reverses a documented stance; docs and examples must change with it.
- `@blac/async` has not been used against `user-frontend` yet; expect API adjustments (for example `paginated()`, `retryOn` semantics) once the first real migration lands.
- Research counts are grep-based estimates; items marked unverified in `research/02-migration-blockers.md` were not re-checked.

# user-frontend → `@blac/core` / `@blac/react` migration research

Research date: 2026-10-21. Target: `user-frontend` (`apps/pmp`, `apps/user-app`, `packages/shared`), checked out at `~/Projects/user-frontend.git/M/e1` (`ea234818fb`). File paths in these docs are relative to that repo unless they start with `packages/blac-*` or `packages/plugin-*`, which refer to this repo.

The apps run a vendored legacy blac: `packages/blac-next` (core, ~600 lines) and `packages/blac-react` (published under the same name as ours, `@blac/react`; the hook is `useBlocNext`/`useBloc`).

## Documents

| File | Contents |
| --- | --- |
| [01-usage-inventory.md](01-usage-inventory.md) | Scale, legacy API surface, app-side infrastructure built around blac |
| [02-migration-blockers.md](02-migration-blockers.md) | Features without a direct equivalent, and silent semantic breaks |
| [03-boilerplate-and-features.md](03-boilerplate-and-features.md) | Repeated non-business code in the apps and the blac features/plugins that would remove it |
| [04-testing.md](04-testing.md) | How cubits are tested and mocked today, pain points, and proposed testing helpers |

## Summary

- Migration is feasible without heavy refactoring, but a few gaps must be closed first: per-mount (`isolated`) instances, the PMP event bus / session resets, cross-cubit subscriptions with cleanup, and module-level singletons.
- Several changes type-check but change behaviour: `patch` deep-merges (legacy was shallow), `init` and `dispose` names collide with the new lifecycle, notifications are microtask-batched.
- The largest cleanup win is an async helper package (`@blac/async`): the load/mutation template, three competing loading models, mount-effect triggers and manual cache invalidation account for most of the non-business code.
- Getter tracking and `onActivate(signal)` in the new version remove ~100 `dependencySelector` workarounds and most mount `useEffect`s for free.
- Testing pain is mostly registry leakage under `isolate: false` plus module singletons; `blacTestSetup()` fixes it once singletons are gone.

## Proposed changes to this repo

| Change | Package | Removes / enables |
| --- | --- | --- |
| `clearWhere(predicate)` | core | PMP `BlacEvent` reset bus, user-app `onUserSessionReset`, `disposeWorkspaceScopedCubits` |
| `watch(target, cb, { signal })` | core | 12 manual `_observer.subscribe` bridges and their leaks |
| `@blac({ isolated: true })` (per-mount key from `useId`) | react + decorator | `useId` + `static key` boilerplate on 61 classes (reverses the current docs stance, needs a decision) |
| `@blac/async`: `resource()` / `mutation()` | new package | `BaseCubitNext` loading keys, `DataSourceBase`, `LoadingCubit`/`LoadingKey`, ~250 try/catch/finally templates, manual invalidation |
| localStorage/sessionStorage adapter with sync hydration | plugin-persist | PMP `persistCubitState` |
| `waitForState(bloc, predicate)` | core/testing | `vi.waitFor` polling, `flushPromises` |
| Storybook `withBlocs(...)` decorator (registry per story) | react/testing | duplicated `mockBloc` / `withSeededBloc` decorators |

## Suggested order

1. Rename the vendored legacy react package (e.g. `@blac/react-legacy`) so both versions coexist; add the core/react/testing changes above.
2. Migrate leaves: dialog and form cubits (isolated, props → args, `init` renames). Mostly codemod.
3. Build `@blac/async`; spike it on `DataSourceUserDetailsCubit` and one mutation form first to confirm the savings. Then migrate `DataSourceBase` / `BaseCubitNext` (pmp) and `LoadingCubit` (user-app).
4. Migrate the session/singleton layer (`UserCubit`, event bus, module singletons), then switch test setup to `blacTestSetup()`.

## Method

Counts are grep-based over non-test code unless stated, so treat them as estimates. The surveys of infrastructure, boilerplate and testing were done by read-only subagents and spot-checked; findings marked *(unverified)* were reported but not re-checked.

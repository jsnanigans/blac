# Migration blockers and semantic breaks

## Features without a direct equivalent

| Legacy | Usage | New equivalent | Gap and proposed fix |
| --- | --- | --- | --- |
| `static isolated` | 61 classes | `args: { _id: useId() }` + `static key` | Works, but adds boilerplate at every call site. Proposal: `@blac({ isolated: true })` read by `useBloc`, which folds `useId()` into the key. The docs currently reject an `isolated` option, so this needs a decision. |
| `{ id, props }`, constructor props | ~279 `id:`, ~83 `props:`, ~157 `this.props` | `args` + `static key`; zero-arg constructor + `init(args)`; `deps` for live handles | Mechanical. Props become `Args`, the id becomes `static key = (a) => a.userId`. Props that change over time (legacy re-assigned the main instance's props each render, often bridged by an effect, e.g. `EditLabValueDialog.tsx:47-60`) move to `deps`, or become an explicit method call. Callbacks such as `onSuccess` belong in `deps`. 21 isolated classes take constructor args. |
| `BlacEvent` / `_onEvent` | 4 dispatch sites, 10 listener classes (pmp) | None | Its job is session/PHI resets. Proposal: core `clearWhere(predicate)` to dispose instances by args, e.g. `clearWhere((i) => i.args?.userId === id)`; logout becomes `clearAll()`. Also replaces user-app `onUserSessionReset` (71 calls) and `disposeWorkspaceScopedCubits`. Token-refresh retry moves into `@blac/async` (see 03). |
| `_observer.subscribe` across cubits | 12 prod sites | `watch`, `depend().track()`, `onSystemEvent('stateChanged')` | Cleanup is manual and leaks today. Proposal: `watch(X, cb, { signal })`, started from `onActivate(signal)` so teardown is automatic. |
| Module singletons `export const userState = Blac.getBloc(...)` | 41, plus 3 via `new` | `ensure`, `depend` | A captured instance goes stale after `clearAll`, a disposal or a test-registry swap. Replace with `this.depend(X)` inside cubits or `ensure(X)` at call time. |
| `getAllBlocs`, `disposeBloc`, `_id` prefix matching | ~8 prod sites | `getAll`, `forEach`, `clear(Class)` | Covered by `clearWhere`; match on `args.workspaceId` instead of the id string. |
| `findRegisteredBlocInstance` | 1 | `borrowSafe` / `hasInstance` | None. |
| `Blac.getBloc(X, { id })` lookups of instances created with more props | many | `ensure` / `borrow` with `args` | `BorrowTarget` requires the full `Args` type. If `Args` carries config beyond the key, lookups need it too. Small option: let `borrow` accept `{ key }`. |
| `Cubit<null>` / `Cubit<string[]>` | 9 / 1 | State must be an object | Use `{}` state, or turn stateless "service" cubits into plain modules. Wrap the array. |
| `_dispose()` overrides | 25 | `onSystemEvent('dispose')`, `onDeactivate`, `onActivate` signal | Mechanical. |
| `onMount` hook option | 9 | `onMount` | None. |
| `dependencySelector` | 161 | `select(state, bloc)` | No selector uses `oldState`. ~91 `(s) => [s]` and ~10 empty selectors can be deleted (they work around missing getter tracking); the rest rename to `select`. |
| Debug plugin via `Blac.addPlugin` | 1 | `@blac/logging-plugin`, devtools | None. |

## Silent semantic breaks

These compile (or nearly) and then misbehave.

1. **`patch` deep-merges; legacy `patch` was shallow.** Confirmed in `packages/dirtytalk-structural/src/container.ts:498` (`deepMerge` recurses into plain objects).
   - `patch({ draft: {} })` no longer clears `draft` (`apps/pmp/src/ui/components/CreateCareTeamRequestDialog/CareTeamRequestDraftCubit.ts:90`).
   - Replacing a discriminated union via `patch({ suggestionState: { status: "error", ... } })` keeps stale keys from the previous variant (`apps/pmp/src/state/ProgressNoteCubit.ts:210,214`).
   - Keys cannot be removed through `patch`.
   - Grep finds ~13 single-line sites with nested object values; multi-line sites will add to that. Fix: codemod nested-object `patch` calls to `update((s) => ({ ...s, ...partial }))`, or review each.
2. **`init` name collision.** ~23 cubits declare a public `init = async () => ...` field (form "load on mount", e.g. `apps/pmp/src/ui/components/AddVitalSignsDialog/AddVitalSignsDialogBloc.ts:53`, `AddMultipleLabValuesDialogBloc.ts:296`, `WorkspaceUrlSyncCubit.ts:121`). The field shadows the protected `init(args)` lifecycle, so the registry would call it on creation, and the visibility mismatch is a type error. Rename them.
3. **`dispose` name collision.** 4 cubits define a plain `dispose()` (e.g. `apps/pmp/src/ui/components/CommandPalette/CommandPaletteCubit.ts:51`, user-app `ConversationThreadCubit.ts:141`, `ChatComposerCubit.ts:117`). In legacy it was dead code (blac called `_dispose`); in the new version it overrides the real teardown.
4. **Microtask batching.** Subscribers, `stateChanged` handlers and re-renders fire after a microtask; `state` itself is synchronous. Tests asserting on subscribers need `await flush()`.
5. **Shallow-equal `emit` is a no-op.** Default equality is shallow per key; legacy compared by reference only. Emitting a fresh object with the same values no longer notifies.
6. **`args` are fixed per instance.** Unlike legacy props, they are not updated by later renders.
7. **Package name clash.** The vendored legacy react package is also named `@blac/react`. Rename it (e.g. `@blac/react-legacy`) so both can coexist during an incremental migration. Legacy and new cubits can call each other, since both are plain classes.

## Side findings (unverified)

Reported by the boilerplate survey and not re-checked:

- `apps/user-app/src/ui/components/TaskList/TaskListBloc.ts:306-313` registers an observer on the global `TaskManagementBloc` from an isolated cubit's `onMount` and never removes it, so each mount adds a listener.
- `CommandPaletteCubit.dispose()` is never called by blac; `WindowManagerCubit.ts:161-165` documents the same bug fixed earlier.
- `apps/user-app/.../LabStatusOverviewCubit.ts:42` ignores the unregister function returned by `onUserSessionReset`.

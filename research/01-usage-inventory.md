# Usage inventory

## Scale

| Metric | Count |
| --- | --- |
| Files importing blac | ~1,000 (pmp 509, user-app 444, shared 38) |
| Cubit classes | ~290 (pmp ~160, user-app ~116, shared ~12) |
| `extends BaseCubitNext` | 117 (pmp only) |
| `extends DataSourceBase` | 34 (pmp only) |
| `useBlocNext(` / `useBloc(` calls | ~840 |
| `Blac.getBloc` | 588 hits, ~390 in prod (user-app 283, pmp 99, shared 9) |
| `static isolated = true` | 61 |
| `static keepAlive = true` | 69, plus 2 constructor `_keepAlive = true` |
| `useBloc` option `id:` | ~279 |
| `useBloc` option `props:` | ~83; `this.props` reads ~157 |
| `dependencySelector` | 161 |
| `.patch(` / `.emit(` | 806 / 1,080 (incl. tests) |

No other state library is used (no react-query, swr, zustand, mobx, signals). Dexie backs IndexedDB caches. Routing goes through a custom `RouterCubit` (`packages/shared/src/router/RouterCubit.ts`).

## Legacy API surface (`packages/blac-next`, `packages/blac-react`)

- `Blac` is a global singleton registry keyed by `ClassName:id`. `Blac.getBloc(Class, { id, props })` gets or creates.
- `Cubit<S, P>`: `emit` (`Object.is` check), `patch` (**shallow** spread, per-key `Object.is` check). `Bloc` with reducer exists but is unused.
- Statics: `isolated` (one instance per hook), `keepAlive`, `addons` (unused; the `Persist` addon is unused).
- Props: passed to the constructor and assigned to `bloc.props`; the "main" hook instance re-assigns `props` on every render.
- Disposal when hook consumers and observers reach zero; `_dispose()` is the override point.
- `Blac.dispatchEvent(new BlacEvent(...))` calls `_onEvent` on every live bloc.
- `_observer.subscribe({ id, fn, dependencyArray })` is the raw subscription.
- React hook: top-level-only state proxy tracking (getters are **not** tracked), `dependencySelector(newState, oldState)`, `onMount`.
- `BlacPlugin` with lifecycle events.

## App-side infrastructure

### Base classes (pmp only)

- **`BaseCubitNext<T extends BaseState, K>`** — `apps/pmp/src/state/BaseCubitNext.ts:16`. Per-key loading: `startLoading(key)` / `stopLoading(key)` maintain `state.loading{}` and `isLoading`, with a 90 s auto-stop timeout, a `requestError` map (`getRequestError(key)`) and Sentry duration metrics. No fetching or caching. 117 subclasses; `startLoading(` called 258 times. Types live in `apps/pmp/src/state/BaseCubit.ts`.
- **`DataSourceBase<TData, TParams>`** — `apps/pmp/src/state/DataSourceCubit/DataSourceBase.ts:45`, extends `BaseCubitNext`. A per-id keepAlive cache with in-flight dedupe: `getData(params)`, `loadData`, `storeData`, `reloadData`, `resetData`, `setAvailable`/`setUnavailable`. Overrides `_onEvent` to reset on user-context reset and reload after a token refresh if the last request failed. 34 subclasses (`DataSource*Cubit`, typically ~15 lines).
- **`TimelineDataProvider`** — `apps/pmp/src/ui/components/Timeline/providers/TimelineDataProvider.ts:72`. Not a cubit: a strategy class consumed by `TimelineCubit`, with a range cache, keyed request dedupe, a generation counter and a `contentSignature` folded into the cubit id. 9 prod providers.

user-app has no base class; its 116 cubits extend `Cubit` directly.

### Event bus (pmp only)

- Two events in `DataSourceBase.ts:8-9`: `USER_CONTEXT_RESET_EVENT` (optional `{ workspaceId?, userId }`) and `AUTH_TOKEN_REFRESHED_EVENT`.
- Scoping is done by string-matching `_id` against `workspaceId:userId` (`userContextResetApplies`, `DataSourceBase.ts:26`).
- Dispatch sites: `apps/pmp/src/state/UserCubit.ts:207` (token refreshed), `:509` (role switch), `:797` (logout), `apps/pmp/src/pages/UserDetailsPage/UserDetailsPage.tsx:280` (scoped reset, flagged as tech debt in `MemberDetailPane.tsx:27`).
- Listeners: `DataSourceBase` (34 subclasses) plus 9 cubits (`WindowManagerCubit`, `WorkspaceUrlSyncCubit`, `WorkspaceManagerCubit`, `VisitNotesEditorCubit`, `EntityDetailCubit`, `ConversationsCubit`, `ReportBugCubit`, `RecentWorkspacesCubit`, `EncounterFoldersCubit`).
- Purpose: PHI hygiene — wiping keepAlive state on logout, role change or member switch.
- user-app does the same with DOM `CustomEvent`s: `globalEvents.USER_CLEAR` / `USER_CHANGED` (`apps/user-app/src/constants/globalEvents.ts`) and `apps/user-app/src/lib/onUserSessionReset.ts` (71 calls).

### Registry internals used in prod

- `getAllBlocs`: 6 uses (e.g. `ConversationsCubit.ts:554`, `EncounterListCubit.ts:82`, `RequestPushPermissionsCubit.ts:48`).
- `disposeBloc`: 2 uses in `apps/pmp/src/ui/components/Workspace/disposeWorkspaceScopedCubits.ts`, matching the `workspaceId:` id prefix.
- `findRegisteredBlocInstance` (lookup without create): `EncounterDetailCubit.ts:226`.
- `._id` read for event scoping, workspace teardown, `TimelineCubit.ts:877`, `VitalSignsChartCubit.ts:114`. The string format `workspaceId:userId` is built by `workspaceScopedCubitId(...)` (14 files).
- `_dispose()` overridden 25 times.
- `_observer.subscribe` in prod, 12 sites, all cross-cubit reactions:
  - pmp: `UserCubit.ts:145`, `PermissionsCubit.ts:35`, `RecentWorkspacesCubit.ts:116`, `WebSocketAuthController.ts:72`, `WorkspaceObservationController.ts:94`, `WebSocketEncounterUpdateSource.ts:42`, `WorkspaceUrlSyncCubit.ts:151,159`.
  - user-app: `LeapChatRouterCubit.ts:110`, `BriocheDismisserCubit.ts:15`, `mealSavedToast.tsx:36`.
- `Blac.addPlugin`: 1 use, a debug state logger in `apps/user-app/src/state/state.ts:74`.
- `defaultDependencySelector`: 1 use (`SignupCustomBloc.ts:47`).
- Unused: `enableLog`, `externalBlocStore`, `_consumers`, `_isBlacLive`, `Persist`, `Bloc`.

### `getBloc` outside React

- Mostly method-local lookups of singletons (e.g. 20 calls to `TaskManagementBloc` in `OnboardingBloc.ts:77-101`) and fire-and-forget invalidation (`Blac.getBloc(DataSourceUserDetailsCubit, { id: userId }).reloadData(...)`).
- Also in utils/services: `apps/user-app/src/lib/i18next.ts:18`, `api/ApiController.ts:38`, pmp `lib/Dialog.tsx:115`, `lib/acquireEncounterLock.ts:7`, `lib/db/MacroSyncService.ts:52`.
- Heavy fan-out in user-app: `AuthenticationBloc` (18 calls; module-scope `const websocketState = Blac.getBloc(WebSocketBloc)` at `:91`), `InitialLabsBloc` (13), `TaskListBloc` (8).
- Module singletons: 41 `export const x = Blac.getBloc(X)` (user-app 35, pmp 6), e.g. `userState`, `loadingState`, `toast`. Three are created with `new` and bypass the registry (`avatarCubit`, `appointmentProviderCubit`, `appointmentRatingState`); `UserCubit.ts:505-509, 795-797` resets them by hand.

### Wrappers and persistence

- No HOCs or custom `useBloc` wrappers; only id-context hooks (`packages/shared/src/molecule/scheduler/SchedulerInstanceContext.tsx:16`, user-app `QuestionnaireCubitIdProvider.ts`, ~12 `createIdContext` scopes).
- pmp `persistCubitState(this, KEY)` (`apps/pmp/src/lib/persistedCubitState.ts`): wraps `emit` for a debounced (100 ms) localStorage write, flushed on `pagehide` and logout. Used by `UserCubit`, `LocalPreferencesCubit`, `LayoutCubit`, `ReportBugCubit`.
- user-app `StorageBloc` / `StorageController` (plain class; local, session or in-memory storage per user), used directly from several cubits.
- pmp hand-rolled TTL cache `lib/cachedReqeust.ts` (~5 cubits).

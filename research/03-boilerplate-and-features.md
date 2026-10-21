# Boilerplate in the apps, and features that would remove it

## Boilerplate ranked by prevalence × lines

| # | Pattern | Prevalence | Removed by |
| --- | --- | --- | --- |
| 1 | Load/mutation template: start loading → try/catch/finally → `handleApiError` → toast → invalidate | ~250 sites, 12–20 lines each | `@blac/async` |
| 2 | Mount-effect triggers `useEffect(() => void cubit.load(id), [...])` | ~150–230, some with wrong deps | `args` + `onActivate(signal)`, `resource({ auto: true })` |
| 3 | Three loading models: `BaseCubitNext` keys, `loading: boolean` (~41 files, 14 private `startLoading` copies), user-app `LoadingCubit` with a 50-value `LoadingKey` enum (49 `start`, 47 `finish`) | ~140 files | `@blac/async` status union |
| 4 | `dependencySelector` workarounds for untracked getters | 161 (~91 `(s) => [s]`) | New getter tracking (free) |
| 5 | Cross-cubit invalidation `Blac.getBloc(DataSourceX, { id }).reloadData(...)` with hand-built ids | ~59 sites | `invalidate(tag)` |
| 6 | Error reporting: `handleApiError`/`handleReportError`/`reportErrorSentry`, plus a 10-line `activityTracker` breadcrumb block | 879 calls; breadcrumb in 20 files | Global `onError` hook in `@blac/async` |
| 7 | Lifecycle/cleanup: timers, listeners, observers, session reset, `_dispose` vs `dispose` | ~70 hand-wired sites, some leaks | `onActivate(signal)`, `watch({ signal })`, `clearWhere` |
| 8 | Props sync and id scoping: `declare props` + constructor copy + prop→cubit effect, `createIdContext`, `{ id: userId }` | ~60 cubits, 5–10 lines each | `args` / `deps`, `BlocProvider` |

Runners-up: near-clone list cubits with page/search/filter state and antd 1-based → 0-based page conversion (~22, e.g. `SyncConsultationListCubit`, `AsyncConsultationListCubit`, `OrderOnlyConsultationListCubit`); hand-rolled request-id race guards (~8 files: `UserListCubit.ts:360`, `AddMedicationCubit.ts:63`, `MealInsightBloc.ts:80`, `TimelineCubit`).

### Representative excerpts

Load template (`apps/pmp/src/state/ConsistencyScoreCubit/ConsistencyScoreCubit.ts:43-66`, ~25 of 30 lines are plumbing):

```ts
this.startLoading("fetchConsistencyScore");
try {
  const { data } = await Svc.getConsistencyScoreForUser(userId);
  this.patch({ data: this.parse(data) });
} catch (error) {
  if (error instanceof ApiError) { if (error.status !== 404) handleApiError(error); }
  else handleApiError(error);
} finally {
  this.stopLoading("fetchConsistencyScore");
}
```

Mount trigger (`apps/pmp/src/ui/components/ConsistencyScoreTile/ConsistencyScoreTile.tsx:122-128`):

```tsx
const [{ data, isLoading }, { fetchConsistencyScore }] = useBlocNext(ConsistencyScoreCubit);
useEffect(() => { void fetchConsistencyScore(userId); }, [userId, fetchConsistencyScore]);
```

Mutation template (`apps/pmp/src/ui/components/EditProgramForm/EditProgramFormCubit.ts:~23-42`; 122 cubit files call `message.success/error`):

```ts
this.startLoading("updateProgram");
try {
  await Svc.updateEnrolledPrograms(userId, { ... });
  Blac.getBloc(DataSourceUserDetailsCubit, { id: userId }).reloadData({ userId });
  message.success("Program updated successfully");
  onSuccess?.();
} catch (e) {
  handleApiError(e, "Failed to update program");
} finally {
  this.stopLoading("updateProgram");
}
```

### Other observations

- Forms: Zod in 142 files, `useAutoFormControls` in 141 components (`packages/shared/src/atom/autoform/AutoFormBloc.ts`). The cubit around a form repeats `static isolated`, a `formReady`/`initialFormValues`/`setFormReady` triple (17 files), an `init()` called from a mount effect, and the mutation template.
- Debounce lives mostly in components (`lodash.debounce` in `useMemo` + `.cancel()` in an effect, e.g. `MedicationSearchField.tsx:100-106`).
- Timers: `setInterval` in 6 cubits, `setTimeout` in 37, `addEventListener` in 28. Ref-counted start/stop exists twice in different shapes (`EncounterFoldersCubit.ts:176-195`, `ServerEventLabResultListenerCubit.ts:18-41`) — both are what `onActivate`/`onDeactivate` provide.
- Analytics: `activityTracker.track*` 194 calls, mostly in cubits.
- No loading/error/data union exists; user-app also uses class-per-status states (e.g. `ShipmentAddressCubit.ts:28-55`).

## Free wins from the new version

- **Getter tracking.** Getters read from the `bloc` proxy are tracked, so the ~91 `(s) => [s]` selectors, ~10 empty selectors and the "add a selector or the UI goes stale" comments go away (e.g. `DataStatus.tsx:~103`, `Avatar.tsx:~125`).
- **`onActivate(signal)` / `onDeactivate`.** With keyed `args`, a cubit loads itself on first owner and aborts on last release, removing most mount effects and the dedupe needed when two components mount the same keyed cubit.
- **`depend()`.** Declared cross-cubit dependencies replace method-local `Blac.getBloc` lookups and module singletons, and are overridable in tests.
- **`BlocProvider`.** Supplies `args` to a subtree; replaces the `createIdContext` scopes.

## Proposed features

### 1. `@blac/async` (new package, public core API only)

The biggest win. Sketch:

```ts
class ConsistencyScoreCubit extends Cubit<State, { userId: string }> {
  score = this.resource('score', (signal) => Svc.get(this.args.userId, { signal }), {
    auto: true,
    tags: ['user', this.args.userId],
  });

  save = this.mutation('save', (input: Input) => Svc.update(input), {
    invalidates: (input) => ['user', input.userId],
    success: 'Saved',
  });
}
```

Provides:

- An `idle | loading | success | error` union stored in a state slot, so it is tracked and seedable in tests.
- Latest-wins plus `AbortController` per call; abort on deactivate.
- In-flight dedupe; `reload()`; optional stale-time.
- `auto: true` loads on `onActivate`, replacing mount effects.
- Tag-based `invalidate(tag)` across blocs, replacing manual `getBloc(...).reloadData` calls.
- Global hooks (`configureAsync({ onError, onSuccess, retryOn })`) for `handleApiError`, Sentry, breadcrumbs, toasts and the token-refresh retry currently done via `AUTH_TOKEN_REFRESHED_EVENT`.

Replaces: `BaseCubitNext` loading keys, `DataSourceBase` (its 34 subclasses become keyed keepAlive cubits with one resource each), `LoadingCubit`/`LoadingKey`, `cachedReqeust.ts`, request-id guards.

Whether it is a mixin, a helper taking the cubit (`resource(this, ...)`) or a `Cubit` subclass is open. Spike on `DataSourceUserDetailsCubit` and one mutation form first to confirm the savings.

### 2. Core: `clearWhere(predicate)`

Dispose every instance matching a predicate (including keepAlive). Replaces the PMP event bus, `onUserSessionReset`, `disposeWorkspaceScopedCubits` and the `_id` string matching. Logout is `clearAll()`.

### 3. Core: `watch(target, cb, { signal })`

Tear the watch down when the signal aborts. Combined with `onActivate(signal)` it covers the 12 `_observer.subscribe` bridges without manual cleanup.

### 4. React: `@blac({ isolated: true })`

`useBloc` folds a `useId()` into the instance key for classes with this flag. Saves `_id` args and `static key` on 61 classes. Needs a decision, since the docs currently say per-mount instances should be explicit.

### 5. plugin-persist: localStorage/sessionStorage adapter with sync hydration

The plugin is IndexedDB-only. pmp's `persistCubitState` (including `UserCubit` at boot) needs synchronous hydration to avoid a flash, plus a debounced write and a flush on `pagehide`.

### 6. Optional: list/pagination helper

A small `paginated()` helper in `@blac/async` (page, total, search, filters, latest-wins load) would collapse the ~22 near-clone list cubits. Lower priority than 1–5.

### Not proposed

- A general app event bus in core: every current use is a session reset (covered by `clearWhere`) or a token-refresh retry (covered by `@blac/async`).
- Suspense integration: the codebase models loading explicitly and does not need it.

# Testing and mocking

Test files: pmp 492, user-app 224, shared 45 (shared barely touches blocs). Stories: 83 in apps and shared, plus 135 in the deprecated `wcl`.

## Current setup

- All workspaces inherit `sharedTest` from `packages/vite-config/index.mjs`: happy-dom, `globals: true`, **`isolate: false`** (line 15), threads pool, network blocker. Most pain below follows from `isolate: false` plus a global singleton registry.
- `apps/pmp/src/setupTests.ts`: ~25 central `vi.mock`s (including `@blac/react`), `beforeEach` with `vi.restoreAllMocks()`, ~17 `resetMockX()` calls, `resetSessionCubits()` and `resetDataSourceCubits()`.
- `apps/user-app/config/setupTests.tsx`: `beforeEach` runs `userState.emit({})`, ~12 resets, `apiMiddleware.clearAll()`, `StorageController.clear()`, and spies on real singletons (`Blac.getBloc(WebSocketBloc).connectAndAuthenticate`, `userState.loadAppAccess`, `loadDeferredUserData`, `loadUserInfo`).
- `Blac.getInstance().resetInstance()` is called per file (33 pmp, 3 user-app, 3 shared), plus in `apps/pmp/integration-tests/setup.ts`.
- Hand-written registry repair:
  - `apps/pmp/src/lib/tests/resetSessionCubits.ts` resets `userState`, `PermissionsCubit`, `FeatureFlagsCubit` and re-registers module singletons with `registerBlocInstance`.
  - `apps/pmp/src/lib/tests/resetDataSourceCubits.ts` walks `Blac.instance.blocInstanceMap` and calls `resetData()` on every `DataSourceBase`.
  - `apps/user-app/src/lib/tests/authBlocInstance.ts` pokes `blocInstanceMap` directly.
- `mockBlacReact.ts` is duplicated in `apps/pmp/src/lib/tests/` and `apps/user-app/src/lib/tests/`: `mockUseBlocNext = vi.fn(actualUseBlocNext)` with a reset.
- `packages/test-utils` has no bloc-specific helpers.

## Techniques

| Technique | pmp (files/hits) | user-app | shared |
| --- | --- | --- | --- |
| `new XCubit(...)` directly | 89/256 | 80/726 | 3/25 |
| `.emit(` / `.patch(` to seed or drive | 72/223 | 34/185 | 2/28 |
| `Blac.getBloc` in tests | 42/129 | 40/80 | 0 |
| `vi.spyOn(<cubit instance>, "method")` | 29/155 | 40/204 | 1/6 |
| Direct `x.state = ...` / `x.state.y = ...` | 8/34 | 10/131 | 0 |
| `vi.spyOn(obj, "state", "get")` | 0 | 4/5 | 0 |
| `vi.spyOn(Blac, "getBloc" \| "getAllBlocs")` | 11/12 | 6/9 | 0 |
| `mockUseBlocNext.mockReturnValue/Implementation` | 9/23 | 4/23 | 0 |

- `vi.spyOn(userState, ...)`: 111 hits across apps.
- API clients are mocked at the openapi layer (`mockOpenApi`, endpoints default to rejecting with `TEST IMPLEMENTATION: name`), ~323 hits. This is fine and stays.
- Component tests mostly seed the real registry (`userState.emit(...)`, `Blac.getBloc(X).patch(...)`) and render with the real hook; some stub the hook per class and fall through to the real one:

```ts
// apps/pmp/src/ui/components/PatientAskMeAnything/AskMeAnythingButton.test.tsx:20
mockUseBlocNext.mockImplementation(((Cubit) => {
  if (Cubit.name === "PermissionsCubit") return [{}, { hasCapability: () => true }];
  return actualUseBlocNext(Cubit);
}) as typeof actualUseBlocNext);
```

```ts
// apps/user-app/src/ui/components/GlobalOverlays/Overlays/RequestPushPermissionsCubit.test.ts:91-99
vi.spyOn(Blac, "getBloc").mockImplementation((BlocClass: any) => {
  if (BlocClass === PushNotificationsBloc) return mockPushBloc;
  if (BlocClass === AppViewCubit) return mockAppView;
  return {} as any;
});
```

- Async: `waitFor` ~400 hits, `vi.waitFor(() => expect(cubit.state.x))` for cubits, user-app `flushPromises` (`setTimeout`-based, 85 hits), fake timers in ~53 files.
- Storybook: duplicated decorators in `apps/user-app/.storybook/decorators.tsx:48` and `apps/pmp/.storybook/decorators.tsx:66`. `mockBloc(Class, partialState, id?)` patches the global singleton once (63 uses in 20 stories); `withSeededBloc(Class, ctorProps, id?)` relies on "first props wins" (3 uses). No per-story reset.

## Pain points

- Registry leakage under `isolate: false`: a setup-file comment records 110 failures across 22 files in one run. Causes include leftover `userState` ids, keepAlive `DataSourceBase` serving stale data, `FeatureFlagsCubit` keepAlive, unremoved window listeners, and `resetInstance()` detaching module singletons.
- Tests touch internals: `_observer` (3 pmp files, e.g. `WorkspaceUrlSyncCubit.test.ts:98-112`, `FloatingButtons.test.tsx:70`), `_id` (5 pmp files, e.g. `VitalSignsChartCubit.test.ts:46`), `blocInstanceMap`, `state` assignment.
- Heavy casting to build fakes: `as never` / `as any` / `as unknown as` several hundred hits.
- Hidden side effects of global singletons (`userState`, `WebSocketBloc`) force global spies in user-app setup.

## What the new version already covers

| Today | New |
| --- | --- |
| `resetInstance()` per file, `resetSessionCubits`, `resetDataSourceCubits`, `authBlocInstance` | `blacTestSetup()` once in the global setup file (fresh registry per test) |
| `new XCubit(props)` + `emit`/`patch`/`state =` | `createCubitStub(X, { args, state, methods, deps })`, `withBlocState(X, state, args)` |
| `vi.spyOn(Blac, "getBloc")` returning fakes | `registerOverride(X, createCubitStub(X, ...))`; `depend()` resolves the override |
| `vi.spyOn(cubit, "method")` on singletons | `withBlocMethod(X, "method", impl)` |
| `mockUseBlocNext` per-class stubs | `renderWithBloc` / `renderWithRegistry` + `registerOverride` |
| Microtask timing | `flush()` |

Prerequisite: module singletons (`export const userState = ...`) must be replaced by `ensure`/`depend`, otherwise they pin instances from the wrong registry.

## Proposed additions

1. **`waitForState(bloc, predicate, { timeout })`** in `@blac/core/testing`, resolving on the first matching `stateChanged`. Replaces `vi.waitFor(() => expect(cubit.state...))` and `flushPromises` polling.
2. **Storybook decorator** in `@blac/react/testing`, e.g. `withBlocs([[UserCubit, { state }], [X, { args, state }]])`, rendering the story in its own `RegistryProvider`. Replaces both apps' `mockBloc` / `withSeededBloc` and fixes cross-story leakage.
3. **`renderWithBlocs`** (plural) or document `renderWithRegistry` with several `registerOverride` calls; most component tests need more than one bloc.
4. **Documented "mock useBloc" recipe** (override + stub), so the duplicated `mockBlacReact.ts` files can be deleted.
5. **`@blac/async` test seams**: seed a resource as `success`/`error`, and assert on mutations without mocking the service.

## Migration of tests

- ~1,250 `new XCubit(props)` hits → `createCubitStub(X, { args })`. Codemod-able once constructors are zero-arg.
- `state =` assignments and `spyOn(…, "state", "get")` → `createCubitStub({ state })` / `withBlocState`.
- `_observer` / `_id` access → `watch`, `args`.

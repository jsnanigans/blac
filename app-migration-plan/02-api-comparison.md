# 02 — API Comparison: v0 vs v1 vs v2

This is the side-by-side reference. The intent is to make every shim and codemod rule auditable against this table.

## 1. Base class

| | v0 (`blac@^0.4.1`) | v1 (`blac-next`) | v2 (`@blac/core`) |
|---|---|---|---|
| Abstract base | `BlocBase<T>` | `BlocBase<S, P=null>` | `StateContainer<S>` (no P) |
| Mutable container | `Cubit<T>` | `Cubit<S, P=null>` | `Cubit<S>` |
| Event-driven container | `Bloc<E, T>` | `Bloc<S, A, P>` | — (removed) |
| Update API | `emit(state)` | `emit(state)`, `patch(partial)` | `emit(state)`, `patch(partial)`, `[EMIT]` symbol |
| State getter | `bloc.state` (T) | `bloc.state` (S) | `bloc.state` (`Readonly<S>`) |
| Unique id | `bloc.id` | `bloc._id` | `bloc.instanceId` (scoped string) |
| Subscribe | `bloc.subscribe(observer)` | `bloc._observer.subscribe(...)` (internal) | `bloc.subscribe(state => …)` (public) |
| Dispose | `complete()` | `_dispose()` | `dispose()` |
| Cross-bloc dep | manual `Blac.getBloc` | manual `Blac.getBloc` | `this.depend(Other)` returns a thunk |
| Lifecycle events | observer callbacks | observer callbacks | `onSystemEvent('stateChanged'\|'dispose'\|'hydrationChanged', cb)` |
| Disposal semantics | manual | manual | ref-counted auto-dispose |

## 2. Per-class configuration

| | v0 | v1 | v2 |
|---|---|---|---|
| Keep alive across mounts | (n/a) | `static keepAlive = true` | `@blac({ keepAlive: true })` |
| Per-mount isolation | `<BlocProvider>` | `static isolated = true` | `useBloc(C, { instanceId })` |
| Exclude from devtools | — | — | `@blac({ excludeFromDevTools: true })` |
| Persistence | `persistKey` ctor opt | `static addons = [Persist({...})]` | plugin (e.g. `@blac/plugin-persist`) |
| Marker | `static isBlacClass` | `static isBlacClass` | not needed |

## 3. Registry / lookup

| | v0 | v1 | v2 |
|---|---|---|---|
| Singleton | `BlacReact` (per-app) | `Blac` (per-process) | `globalRegistry` (per-process) + swappable |
| Imperative get | `react.useBloc(C)` only | `Blac.getBloc(C, { id, props, instanceRef })` | `acquire(C, key?, refId?)` / `ensure` / `borrow` / `borrowSafe` |
| Get-all | — | `Blac.getAllBlocs(C, { searchIsolated })` | `getAll(C)` / `forEach(C, cb)` |
| Release | (n/a) | (n/a) | `release(C, key?, force?, refId?)` |
| Clear all | (n/a) | (n/a) | `clear(C)` / `clearAll()` |
| Test swap | (n/a) | (n/a) | `getRegistry()` / `setRegistry()` |

## 4. React hook

### v0 — `BlacReact#useBloc`

```ts
useBloc<T>(blocClass: BlocClass<T>, options?: {
  subscribe?: boolean;         // default true
  shouldUpdate?: (evt) => boolean;
  create?: () => T;            // local instance only
}): [state, instance]
```

### v1 — `@blac/react#useBloc`

```ts
useBloc<B>(blocClass: BlocConstructor<B>, options?: {
  id?: string;
  dependencySelector?: (state, oldState?) => unknown[];
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
}): [state, bloc]
```

### v2 — `@blac/react#useBloc`

```ts
useBloc<T>(BlocClass: T, options?: {
  instanceId?: string | number;
  dependencies?: (state, bloc) => unknown[];
  autoTrack?: boolean;           // default: configureBlacReact() value
  onMount?: (bloc) => void;
  onUnmount?: (bloc) => void;
}): [state, bloc, ref]            // 3-tuple
```

### Key semantic differences

- v2 **drops the `props` slot**. By design (per user). Pattern is `useEffect(() => bloc.initWithProps(p), [])`.
- v2 returns a **3-tuple** with a `ref`. The shim can ignore index 2.
- v2's `dependencies` option **disables auto-tracking**, unlike v1 where `dependencySelector` was an optimization hint with proxy still active. See R8 in `03-risks-and-edge-cases.md`.
- v2 hook **acquires on mount, releases on unmount** (ref-counted). v1 never released; instances leaked.

## 5. Observation / plugins

| | v0 `BlocObserver` | v1 `BlacPlugin` | v2 `BlacPlugin` |
|---|---|---|---|
| Install | constructor opt to `BlacReact` | `Blac.addPlugin(p)` | `getPluginManager().install(p)` |
| State change | `onChange(bloc, evt)` | `onEvent(STATE_CHANGED, bloc, params)` | `onStateChanged(instance, prev, curr, ctx)` |
| Created/disposed | `onBlocAdded/Removed` | `BLOC_CREATED/DISPOSED` | `onInstanceCreated/Disposed(inst, ctx)` |
| Ref tracking | — | — | `onRefAcquired/Released(inst, refId, ctx)` |
| Context | — | — | rich `PluginContext` (state, hydration, queries, stats) |
| Transitions | `onTransition` | — | use `onStateChanged` |

## 6. External observation (outside React)

| | v0 | v1 | v2 |
|---|---|---|---|
| Public API | `bloc.subscribe(observer)` | none (private `_observer`) | `watch(C, cb)` / `watch([C1,C2], cb)` / `watch.STOP` |
| Auto-tracking | no | no | yes (proxy on getters/state) |
| Named instance | not supported | not supported | `watch(instance(C, 'id'), cb)` |

## 7. Components

| Component | v0 | v1 | v2 |
|---|---|---|---|
| `BlocProvider` | render-prop scoping | — | — (to be added: see E1) |
| `BlocBuilder` | render-prop | — | — |
| `BlocConsumer` | render-prop | — | — |
| `withBlocProvider` | HOC | — | — |

The only render-prop component used in user-fe is `BlocProvider` (3 sites). v0 `BlocBuilder` etc. are not used anywhere.

## 8. Hydration / SSR

| | v0 | v1 | v2 |
|---|---|---|---|
| Hydration lifecycle | — | — | `beginHydration / applyHydratedState / finishHydration / failHydration` + `waitForHydration` |
| Status query | — | — | `hydrationStatus / isHydrated / changedWhileHydrating` |

Not currently used in user-fe but available when needed.

## 9. Testing utilities

| | v0 | v1 | v2 |
|---|---|---|---|
| Per-test cleanup | manual `complete()` | manual | `blacTestSetup()` |
| Isolated registry | (n/a) | `Blac.getInstance().resetInstance()` | `withTestRegistry(fn)` |
| Mock instance | (n/a) | `vi.spyOn(Blac, 'getBloc')` (common pattern in user-fe) | `registerOverride(C, mock, key)` / `overrideEnsure(C, mock, fn)` |
| Quick stub | (n/a) | (n/a) | `createCubitStub(C, { state, methods })` |
| Mutate state | direct | direct | `withBlocState(C, state, key?)` |
| Mock method | jest.fn assign | jest.fn assign | `withBlocMethod(C, name, impl, key?)` |
| Async fence | (manual) | (manual) | `await flushBlocUpdates()` |

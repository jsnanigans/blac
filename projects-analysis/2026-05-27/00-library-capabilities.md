# BlaC v2 — Complete Public API & Capability Surface

Reference for `@blac/core` and `@blac/react` (plus the `@blac/adapter` building blocks that
`@blac/react` is built on). Goal: an exhaustive, precise catalog of what the libraries offer so we
can later judge what consumer apps are missing or working around.

Citations use `file:line`. Package roots:
- `@blac/core` → `packages/blac-core/src/`
- `@blac/react` → `packages/blac-react/src/`
- `@blac/adapter` → `packages/blac-adapter/src/` (re-exported tracking/subscription engine)

---

## 1. State Containers

### 1.1 `StateContainer<S extends object = any>` (abstract)
`packages/blac-core/src/core/StateContainer.ts:38`

The base class. State emission is **protected**, so external callers cannot mutate state directly —
you expose intent-named methods (`login()`, `logout()`) that call `this.emit(...)` internally.

**Constructor:** `constructor(initialState: S)` — `StateContainer.ts:84`. Initial state is supplied by
your subclass's constructor calling `super({...})`. **The registry instantiates blocs with `new Type()`
and zero arguments** (`StateContainerRegistry.ts:191`), so in practice **every bloc must have a
zero-arg constructor**. There is no first-class mechanism to pass props/args to the constructor (see Gaps).

**Public surface:**
- `state: Readonly<S>` — getter, `StateContainer.ts:103`
- `isDisposed: boolean` — `:107`
- `subscribe(listener: (state: S) => void): () => void` — returns unsubscribe; throws if disposed — `:127`
- `dispose(): void` — idempotent; emits `dispose` system event, clears listeners, notifies registry — `:135`
- `name: string` (defaults to class name), `instanceId: string`, `createdAt: number`, `debug: boolean` — `:61-64`
- `dependencies: ReadonlyMap<StateContainerConstructor, string>` — declared cross-bloc deps — `:66`
- `initConfig(config: StateContainerConfig): void` — called by registry on creation; sets name/debug/instanceId,
  resolves per-class equality fn, emits `created` — `:88`
- Hydration API (see §6): `hydrationStatus`, `hydrationError`, `isHydrated`, `changedWhileHydrating`,
  `beginHydration()`, `applyHydratedState()`, `finishHydration()`, `failHydration()`, `waitForHydration()` — `:111-241`

**Protected surface (for subclasses):**
- `emit(newState: S): void` — `:166` (delegates to `this[EMIT]`)
- `[EMIT](newState: S): void` — `:162` — the canonical internal emit symbol (`symbols.ts:1`)
- `depend(Type, instanceKey?): () => InstanceType<T>` — cross-bloc dependency (see §4) — `:70`
- `onSystemEvent(event, handler): () => void` — lifecycle hooks (see §6) — `:342`

**Gotcha:** README (`blac-core/README.md:59,61`) documents `update(fn)` and `lastUpdateTimestamp` on the
public/protected API. **Neither exists in the implementation** — confirmed absent from `StateContainer.ts`
and `Cubit.ts`. This is a documentation/implementation mismatch (see Gaps §13).

### 1.2 `Cubit<S extends object = any>` (abstract)
`packages/blac-core/src/core/Cubit.ts:4`

Extends `StateContainer` and **promotes `emit` to public** so call sites / actions can emit directly.
This is "the primary building block" per the README.

- `emit(newState: S): void` — public — `Cubit.ts:9`
- `patch(partial: Partial<S>): void` — shallow-merge for object state — `Cubit.ts:13`
  - Throws if state is not an object (`Cubit.ts:15`).
  - **Short-circuits if every key in `partial` is `Object.is`-equal to current** (no emit) — `Cubit.ts:18-22`.
  - Note: it emits a full `{ ...state, ...partial }` on the *first* differing key.

**Cubit vs StateContainer:** use `Cubit` when actions/components may emit directly; use `StateContainer`
when you want emit to stay protected and force an intent-method API. The README's `update(fn)` for Cubit
does not exist (see Gaps).

### 1.3 `EMIT` symbol
`packages/blac-core/src/core/symbols.ts:1` — `Symbol('blac.emit')`. Exported (`index.ts:20`). The protected
emit entrypoint; rarely needed by app code directly but exported so advanced subclasses / adapters can call it.

### 1.4 State emission / equality semantics
`StateContainer.applyState` — `StateContainer.ts:243`:
- No-op if `prev === next` (reference) **or** `equalityFn(prev, next)` returns `true` (`:248-249`).
- Equality fn is per-instance, resolved at `initConfig`: per-class (`@blac({equality})`) → global default
  `shallowEqualState` (`:96-99`, `config.ts:22`).
- When no listeners / handlers and not hydrating, it still updates `_state` and notifies the registry's
  `stateChanged` listeners (devtools) but skips the local listener loop — fast path (`:254-263`).
- Listener errors are caught and `console.error`-logged, not thrown (`:288`).

---

## 2. Registry (instance lifecycle & ref counting)

Two layers: the `StateContainerRegistry` class (full API) and standalone function wrappers (the ergonomic
public API). The active registry is a module-level singleton swappable via `setRegistry` (`registry/config.ts`).

### 2.1 Standalone functions (`@blac/core` top-level)
All in `packages/blac-core/src/registry/`, re-exported via `registry/index.ts` and `index.ts:23-40`.

| Fn | Signature | Semantics | File |
|---|---|---|---|
| `acquire` | `(Bloc, instanceKey?, refId?) => Instance` | **Ownership**: create-or-reuse + add a ref. Must be paired with `release`. | `acquire.ts:4` |
| `borrow` | `(Bloc, instanceKey?) => Instance` | Get existing **without** a ref. **Throws** if missing. | `borrow.ts:4` |
| `borrowSafe` | `(Bloc, instanceKey?) => {error,instance}` discriminated union | Like `borrow` but returns `{error:Error,instance:null}` or `{error:null,instance}` instead of throwing. | `borrow.ts:11` |
| `ensure` | `(Bloc, instanceKey?) => Instance` | Get-or-create **without** a ref. For bloc-to-bloc. | `ensure.ts:4` |
| `release` | `(Bloc, instanceKey?, forceDispose=false, refId?) => void` | Decrement ref; auto-dispose at 0 unless `keepAlive`. | `release.ts:4` |
| `clear` | `(Bloc) => void` | Dispose & remove all instances of a class. | `management.ts:4` |
| `clearAll` | `() => void` | Dispose everything; resets type tracking (mostly testing). | `management.ts:8` |
| `register` | `(Bloc) => void` | Register a type for lifecycle tracking; **throws on duplicate class name**. | `management.ts:12` |
| `hasInstance` | `(Bloc, instanceKey?) => boolean` | Existence check. | `queries.ts:7` |
| `getRefCount` | `(Bloc, instanceKey?) => number` | Number of active distinct refs. | `queries.ts:14` |
| `getRefIds` | `(Bloc, instanceKey?) => string[]` | The ref-id strings currently held. | `queries.ts:21` |
| `getAll` | `(Bloc) => Instance[]` | All instances of a class. | `queries.ts:28` |
| `forEach` | `(Bloc, cb) => void` | Iterate non-disposed instances; catches callback errors. | `queries.ts:34` |
| `getRegistry` / `setRegistry` | — | Get/swap the active registry singleton. | `config.ts:8,12` |
| `getStats` | `() => {registeredTypes,totalInstances,typeBreakdown}` | Debug stats. | `config.ts:16` |

### 2.2 Refcounting & disposal model
`StateContainerRegistry.ts`:
- An `InstanceEntry` holds `{ instance, refs: Map<refId, count> }` (`:17-22`). Refs are **named** and
  counted — the same `refId` can be acquired multiple times (`acquire` increments, `release` decrements).
- `acquire` auto-generates a `refId` (`_auto_N`) when omitted (`:175,196`). `useBloc` passes a stable
  per-consumer refId `useBloc@<ComponentName>-<id>` (`useBloc.ts:160`).
- **Auto-dispose**: when an entry's `refs.size === 0` and the class is not `keepAlive`, the instance is
  disposed and removed (`:331`). **Orphan cleanup**: after disposing, any `ensure`-created dependency that
  now has zero refs (and isn't keepAlive) is also disposed (`:341-353`).
- **Stale-entry detection**: if a found entry's instance is already disposed (disposed directly, not via
  release), the registry drops it and creates fresh (`:169-172`).
- `release(..., forceDispose=true)` disposes immediately regardless of refs (`:292`). Releasing an
  unknown/absent refId is a **no-op** (idempotent) (`:289`).
- `borrow`/`ensure` add **no** ref — they are for transient access and bloc-to-bloc. Keeping a bloc alive
  is the acquirer's responsibility (see the cross-bloc test that `acquire`s ExtBlocB to keep it alive,
  `useBloc.cross-bloc-react.test.tsx:67`).

### 2.3 `StateContainerRegistry` class & `globalRegistry`
`index.ts:42-50`. Full method set mirrors the functions above plus:
- `on(event, listener) => unsubscribe` — subscribe to lifecycle events — `:519`
- `emit(event, ...)` (overloaded) — internal lifecycle emit — `:554`
- `notifyStateChanged(...)` — **microtask-batched** stateChanged dispatch, skipped entirely when no
  listeners (zero overhead) — `:593`
- `getInstancesMap`, `getTypes`, `registerType` — introspection.
- Lifecycle events: `'created' | 'stateChanged' | 'disposed' | 'refAcquired' | 'refReleased'` —
  `LifecycleEvent` (`:27`), typed listeners `LifecycleListener<E>` (`:38`).

`globalRegistry` is the default singleton (`:621`).

---

## 3. Per-consumer proxy auto-tracking (the re-render engine)

This is the headline feature consumers most often don't fully understand. There are **two independent
tracking systems** combined per `useBloc` consumer.

### 3.1 State-property tracking (Proxy over `state`)
`packages/blac-core/src/tracking/tracking-proxy.ts`:
- `createDependencyProxy` wraps `bloc.state` in a recursive `Proxy`. Every property read during render
  records a **string path** (e.g. `"user.name"`, `"items[3].done"`) into `trackedPaths`
  (`createInternal` `:353`, `createArrayProxy` `:160`).
- After render, `capturePaths` snapshots the value at each tracked path (`:557`). On the next state
  change, `hasDependencyChanges` re-reads those paths and re-renders only if any changed via `Object.is`
  (`:612`).
- **Path optimization**: parent paths whose children are also tracked are pruned (`optimizeTrackedPaths`
  `:488`) to minimize comparisons.
- **Depth limit**: nested proxying stops at depth 10 (`MAX_GETTER_DEPTH`/`maxDepth`); deeper accesses are
  not tracked and emit a `console.warn` (`:363-369`, `constants.ts:19`).
- **Underscore/`$$` keys are not tracked** — props starting with `_` or `$$` are skipped (`:399`). So
  private-ish state fields won't drive re-renders.
- Only **plain objects and arrays** are proxied (`isProxyable` checks prototype is `Object`/`Array`)
  (`:23`). Class instances, Maps, Sets, Dates inside state are returned raw and **not deep-tracked**.

**Array method tracking** (`createArrayProxy`):
- Iterating methods `forEach,map,filter,find,findIndex,findLast,findLastIndex,some,every,flatMap` are
  wrapped so each visited item is proxied at its per-index path and the index is tracked (`ITERATING_METHODS`
  `:136`, wrapper `:170`).
- Reducers `reduce,reduceRight` wrapped — items proxied, accumulator passed raw (`REDUCING_METHODS` `:154`,
  `:230`).
- Iterator methods `values()`, `entries()` and `Symbol.iterator` (for-of / spread) yield proxied items and
  track `.length` + per-index paths (`:202-275`). `keys()` yields raw indices (primitives, no proxy needed).
- `.length` access is tracked (`:312`).
- Method identity is stable across renders via a bound-function cache so callbacks don't break memoization
  (`getOrCacheBound` `:90`, `getBoundFunction` `:120`).

### 3.2 Getter / computed-property tracking
`tracking-proxy.ts` GETTER TRACKER section (`:647+`):
- `createBlocProxy(bloc, getterState)` wraps the **bloc instance** so that reading a getter (a property
  with a `get` descriptor) during render executes it under tracking and records the returned value
  (`:818`, `executeTrackedGetter` `:760`).
- `hasGetterChanges` re-invokes tracked getters on change and compares results with `Object.is` (`:836`).
- **Circular/depth guards**: getters that recurse beyond depth 10 or revisit the same bloc throw a
  descriptive error (`:773-784`). A getter that throws during change-detection is dropped from tracking
  and forces a re-render (`:864-873`).
- Descriptor lookups are cached per constructor (`descriptorCache` `:665`).
- StrictMode-safe commit: `commitTrackedGetters` preserves the previous commit's tracked set when no
  accesses were recorded (double-invocation), so subscriptions stay stable (`:750`, docstring `:734-749`).

### 3.3 How `useBloc` wires it together
`packages/blac-react/src/useBloc.ts` + `packages/blac-adapter/src/index.ts`:
- Three modes chosen per call (`determineTrackingMode` `useBloc.ts:55`):
  1. **auto-track** (default): `autoTrackInit/Subscribe/Snapshot` — proxied bloc + proxied state via
     `useSyncExternalStore`. Re-render only when a tracked path or getter changes (`adapter index.ts:176,295,376`).
  2. **manual deps**: when `options.dependencies` is set — `manualDeps*`. Re-render only when the returned
     dependency array changes (shallow compare, `shallowEqual`) (`adapter:253,343,399`).
  3. **no-track**: when `autoTrack:false` — re-render on every state change (`noTrack*` `adapter:279,364,417`).
- `disableGetterTracking` runs in a no-dep `useEffect` after each commit to flip tracking off and commit
  the render's getter accesses (`useBloc.ts:222`, `adapter:435`).
- `ExternalDepsManager` (`adapter:102`) subscribes to **transitively-resolved cross-bloc dependencies**
  (via `depend()`) so that a getter reading another bloc's state re-renders when that other bloc changes,
  and re-syncs subscriptions every commit so dynamically added/removed deps work (`useBloc.ts:225`,
  cross-bloc test confirms dynamic add/remove `useBloc.cross-bloc-react.test.tsx:102,128`).
- **SSR**: in a non-window/document environment, auto-track silently falls back to no-track (`adapter:165,180`).

### 3.4 Per-consumer isolation (architectural invariant)
Each `useBloc` call creates its **own** proxy + getter tracker in a `useMemo` (`useBloc.ts:142`). Two
components using the same shared bloc instance get **independent** trackers, so a state change re-renders
only the components that actually read the changed slice. The raw shared instance is identical across
consumers (verified by tests comparing `.state` identity), but the proxies differ — do **not** assume
`result.current[1]` is reference-equal across consumers (`instance-isolation.test.tsx:67`, `BlocProvider.test.tsx:57`).

---

## 4. Cross-bloc dependencies — `this.depend(OtherBloc)`
`StateContainer.ts:70`

```ts
class ExtBlocA extends Cubit<{ multiplier: number }> {
  private bGetter = this.depend(ExtBlocB);          // declare dependency
  get result() { return this.state.multiplier * this.bGetter().state.x; }
}
```
- `depend(Type, instanceKey?)` records the dependency in `this._dependencies` and **returns a getter
  function** that lazily `ensure`s the other instance (`:81`). You call the returned function (`bGetter()`)
  to read the dependency — it's not the instance directly.
- `dependencies` (the read-only map) is consumed by `resolveDependencies` (BFS, transitive, cycle-safe —
  `resolve-dependencies.ts:12`) and by orphan-cleanup on release.
- In React, getters that read a dependency re-render the consumer when the dependency changes, via
  `ExternalDepsManager` (§3.3). Idiomatic pattern fully exercised in `useBloc.cross-bloc-react.test.tsx`.
- **Gotcha**: `ensure` adds no ref, so a `depend`ed bloc with no other owner is auto-disposed when its
  only dependent is released — tests deliberately `acquire` the dependency to keep it alive
  (`cross-bloc-react.test.tsx:67`).

---

## 5. Observing outside React

### 5.1 `watch(BlocClass | BlocRef | array, callback) => unwatch`
`packages/blac-core/src/watch/watch.ts:160`, exported `index.ts:74`.
- Runs `callback` immediately and re-runs on any tracked change. The callback receives proxied bloc
  instance(s); **state and getter accesses are auto-tracked** exactly like `useBloc` (`:179-181`).
- Accepts a single class, a `BlocRef` (specific instance), or a `readonly` array of either (typed tuple
  inference via `ExtractInstances`) (`:89-106`).
- **Stop from inside**: `return watch.STOP` to unsubscribe (`:233`, README example).
- Tracks transitive external deps and re-subscribes on each run (`DependencyManager.sync` `:229`).
- Re-entrancy guarded: a change during a run sets `pendingRerun` and re-runs after (`:201,238`).
- `BlocRef` type + `WatchFn` type exported (`index.ts:74`).

### 5.2 `instance(BlocClass, instanceId): BlocRef`
`watch.ts:40`. Creates a reference to a **named** instance for `watch`:
```ts
watch(instance(UserBloc, 'user-123'), (u) => console.log(u.state.name));
```

### 5.3 `tracked(callback, options?) => { result, dependencies }`
`packages/blac-core/src/tracking/tracked.ts:40`, exported `index.ts:77`.
- Runs a callback and returns its result plus the `Set` of bloc instances it accessed. Used to discover
  dependencies of an arbitrary computation (`options.exclude` removes one). README example §"Tracked".

### 5.4 `tracked` low-level: `createTrackedContext()` / `TrackedContext`
`tracked.ts:67,153`, exported `index.ts:77-83`. A reusable, manual tracking context (proxy / start / stop /
changed / reset) for framework adapters or advanced manual-tracking scenarios. `TrackedResult<T>` and
`TrackedOptions` types exported.

---

## 6. Lifecycle & hydration

### 6.1 `onSystemEvent(event, handler) => unsubscribe` (protected)
`StateContainer.ts:342`. Events:
- `'stateChanged'` → `{ state, previousState }` — fires on each accepted emit (`:269-279`).
- `'dispose'` → `void` — fires once on dispose (`:150`).
- `'hydrationChanged'` → `{ status, previousStatus, error?, changedWhileHydrating }` (`:304`).

`SystemEvent` / `SystemEventPayloads` types exported (`index.ts:13-18`). Registering a `stateChanged`
handler flips an internal fast-path flag (`_hasStateChangeHandlers`). Idiomatic use: a bloc reacting to
its own changes / cleanup. Handler errors are caught & logged (`:275`).

> Note: `onMount`/`onUnmount` are **`useBloc` options** (React), not StateContainer methods. See §8.

### 6.2 Hydration API (public on StateContainer)
`StateContainer.ts:111-241`:
- `hydrationStatus: 'idle' | 'hydrating' | 'hydrated' | 'error'` (`HydrationStatus` type, `index.ts:14`).
- `beginHydration()`, `applyHydratedState(state) => boolean`, `finishHydration()`, `failHydration(error)`,
  `waitForHydration(): Promise<void>`.
- `isHydrated`, `hydrationError`, `changedWhileHydrating` getters.
- Designed to be driven by a persistence plugin (the `PluginContext` exposes exactly these — see §9).
- **Gotcha**: if user state changes during `hydrating` from a non-hydration source, `changedWhileHydrating`
  is set and subsequent `applyHydratedState` is **rejected** (stale hydration discarded) (`:192,265`).
- Disposing while hydrating fails the hydration promise (`:144`).

---

## 7. Configuration & feature flags

### 7.1 `@blac(options)` decorator / `blac(options)(class)` function
`packages/blac-core/src/decorators/blac.ts:38`, exported `index.ts:53`. `BlacOptions` is a **union — one
option at a time**:
- `{ keepAlive: true }` — never auto-dispose at refcount 0 → sets static `keepAlive`.
- `{ excludeFromDevTools: true }` — sets static `__excludeFromDevTools`.
- `{ equality: EqualityFn }` — per-class equality to short-circuit emits → sets static `__equality`.

Works as a TS decorator or as a plain HOF wrapper (no decorator support needed) — `blac.ts:31-36`.
**`isolated` is NOT a `@blac` option** — it's a plain `static isolated = true` on the class (see §8.2).

### 7.2 Static feature-flag readers (for adapters)
`packages/blac-core/src/utils/static-props.ts`, exported `index.ts:56`:
- `isKeepAliveClass(Type)` — reads `static keepAlive` — `:31`
- `isExcludedFromDevTools(Type)` — reads `static __excludeFromDevTools` — `:43`
- `isIsolatedClass(Type)` — reads `static isolated` — `:60`
- (internal) `getClassEquality(Type)` — reads `static __equality`.

### 7.3 Global config — core
`packages/blac-core/src/config.ts`, exported `index.ts:2`:
- `configureBlac({ equality })`, `getBlacConfig()`, `resetBlacConfig()`.
- `shallowEqualState: EqualityFn` — default equality, per-key `Object.is`, falls through to `false` for
  primitives (`:22`). `EqualityFn = <S>(prev, next) => boolean`; return `true` to skip emit.

### 7.4 Global config — React
`packages/blac-react/src/config.ts`, exported `react/index.ts:10`:
- `configureBlacReact({ autoTrack })` — toggle auto-tracking globally (default `true`). `BlacReactConfig` type.

---

## 8. `useBloc` (React) — full options
`packages/blac-react/src/useBloc.ts:102`. Returns `[state, bloc, ref]` (`UseBlocReturn`, `types.ts:39`).

`UseBlocOptions<TBloc>` (`packages/blac-react/src/types.ts:9`):

| Option | Type | Behavior |
|---|---|---|
| `instanceId` | `string \| number` | Named instance; coerced to string. Overrides `BlocProvider` context. `types.ts:11` |
| `autoInstance` | `boolean` | Per-mount instance auto-keyed via `useId()`. Equivalent to `static isolated`. Ignored if `instanceId` given. `types.ts:17`, `useBloc.ts:135-137` |
| `dependencies` | `(state, bloc) => unknown[]` | Manual dep selector (useEffect-style). **Disables auto-track.** `bloc` arg lets you depend on getters. `types.ts:19`, test `dependencies.test.tsx:214` |
| `autoTrack` | `boolean` | Enable proxy auto-tracking (default from global config, normally `true`). `types.ts:23` |
| `onMount` | `(bloc) => void` | Called in mount `useEffect`; receives the proxied bloc. `types.ts:26`, `useBloc.ts:251` |
| `onUnmount` | `(bloc) => void` | Called on unmount cleanup, before the ref is released. `types.ts:28`, `useBloc.ts:263` |

**Props/args passing:** there is **no** option to pass constructor args/props — the third tuple element
`ref` is just an internal `Record<string, never>` placeholder (`types.ts:48`), not a prop channel.

**Instance-key resolution order** (`useBloc.ts:153-158`): explicit `instanceId` → `autoInstance`/`isolated`
(`useId()` key) → `BlocProvider` context id → `'default'`.

**Notable behaviors:**
- Re-render is driven by `useSyncExternalStore` (concurrent-safe) (`useBloc.ts:207`).
- `onMount`/`onUnmount`/`dependencies` are stored in refs and read live, so changing them between renders
  doesn't re-acquire the bloc (`useBloc.ts:122-127`).
- Devtools consumer registration via `window.__BLAC_DEVTOOLS__` (`useBloc.ts:239`).
- Unmount releases the ref with the same stable `refId`, triggering auto-dispose when last consumer leaves
  (`useBloc.ts:265`).

### 8.1 `BlocProvider` + `useInstanceIdFromContext`
`packages/blac-react/src/BlocProvider.tsx`, exported `react/index.ts:13`.
- `<BlocProvider instanceId={string|number}>` supplies a default instance id to all descendant
  `useBloc(C)` calls lacking an explicit `instanceId` (`:37`). Numeric ids coerced to string.
- `useInstanceIdFromContext(): string | undefined` reads the nearest provider id (`:52`).
- **Precedence** (tested in `BlocProvider.test.tsx`): explicit `instanceId` > `autoInstance`/`isolated` >
  provider context > `'default'`. Unmounting a provider subtree drops the ref (auto-dispose).

### 8.2 Per-instance blocs (the `isolated` replacement)
`isolated` as a removed feature is replaced by **two** equivalent mechanisms:
- `static isolated = true` on the class → every `useBloc(C)` mount gets its own `useId()`-keyed instance
  (`isIsolatedClass` + `useBloc.ts:137`; tests `autoInstance.test.tsx`, `BlocProvider.test.tsx:17`).
- `useBloc(C, { autoInstance: true })` → same, opt-in per call site.
- Plus `instanceId` for explicitly-keyed shared instances.

`instanceId(id: string): InstanceId` (`types/branded.ts:27`, exported `index.ts:99`) is a **branded-type
helper** for type-safe id strings (the `Brand`/`BrandedId`/`InstanceId` nominal types, `branded.ts:9-20`).
It is *not* the same as the `useBloc` `instanceId` option — it's a typing utility.

---

## 9. Plugin system
`packages/blac-core/src/plugin/`, exported `index.ts:62-71` (and `@blac/core/plugins`).

- `getPluginManager(): PluginManager` — lazy global singleton bound to `globalRegistry`
  (`StateContainerRegistry.ts:631`).
- `manager.install(plugin, config?)`, `uninstall(name)`, `getPlugin`, `getAllPlugins`, `hasPlugin`,
  `clear`, `destroy` (`PluginManager.ts:50-159`).
- `PluginConfig`: `{ enabled?, environment?: 'development'|'production'|'test'|'all' }`. Environment gating
  via `process.env.NODE_ENV` (`PluginManager.ts:95-99,297`).
- `BlacPlugin` hooks (`BlacPlugin.ts:53`): `onInstall(ctx)`, `onUninstall()`, `onInstanceCreated`,
  `onStateChanged(inst, prev, next, ctx)`, `onInstanceDisposed`, `onRefAcquired`, `onRefReleased`. All
  optional except via `BlacPluginWithInit`.
- `PluginContext` (`BlacPlugin.ts:18`) gives plugins safe access to: `getInstanceMetadata`, `getState`,
  hydration controls (`startHydration`, `applyHydratedState`, `finishHydration`, `failHydration`,
  `waitForHydration`), `queryInstances`, `getAllTypes`, `getStats`, `getRefIds`. This is the API a
  persistence plugin uses to drive hydration (§6.2).
- `InstanceMetadata` type exported (`index.ts:70`). Hooks are wired through the registry's lifecycle events
  (`PluginManager.ts:164-190`); plugin errors are caught & logged.

Existing first-party plugins live in `packages/plugin-persist`, `packages/logging-plugin` (not analyzed
here; their presence confirms persistence/logging are out-of-core concerns).

---

## 10. Types & utilities (`@blac/core` + `@blac/core/types`)
`packages/blac-core/src/types/utilities.ts`, exported `index.ts:86`:
- `StateContainerConstructor<S>` — `new (...args:any[]) => StateContainer<S>` (`:17`).
- `ExtractState<T>` / `ExtractStateMutable<T>` — readonly / mutable state extraction (`:7,10`).
- `ExtractConstructorArgs<T>`, `BlocInstanceType<T>` (`:38,46`).
- `InstanceReadonlyState<T>` / `InstanceState<T>` / `StateContainerInstance<S>` — instance-with-typed-state
  helpers (`:21-32`).
- `BlocConstructor<S,T>` — a constructor type that *also* declares static `acquire/borrow/borrowSafe/
  ensure/release/keepAlive` (`:54`). **Note:** these static methods are typed but the actual base classes
  do **not** implement static registry methods — the standalone functions are the real API (potential
  type-vs-runtime mismatch; see Gaps).
- Branded: `Brand`, `BrandedId`, `InstanceId`, `instanceId()` (`types/branded.ts`).

---

## 11. Testing utilities
- `@blac/core/testing` (`packages/blac-core/src/testing.ts`): `createTestRegistry`, `withTestRegistry(fn)`,
  `blacTestSetup()` (per-test fresh registry via before/afterEach), `registerOverride`, `overrideEnsure`,
  `createCubitStub(Bloc, {state, methods})`, `withBlocState`, `withBlocMethod`, `flushBlocUpdates()`.
- `@blac/react/testing` (`packages/blac-react/src/testing.ts`): `renderWithBloc(ui, {bloc, state, methods,
  instanceKey})` (renders with a stubbed/overridden bloc, auto-restores registry on unmount),
  `renderWithRegistry(ui, setup)`.

---

## 12. Subpath exports (`@blac/core`)
Per README + source: `@blac/core` (everything), `@blac/core/watch` (`watch`,`instance`,`tracked`),
`@blac/core/tracking` (tracking internals for adapters — `tracking.ts`), `@blac/core/plugins`
(`plugins.ts`), `@blac/core/debug` (`debug.ts` — registry introspection), `@blac/core/testing`,
`@blac/core/types` (`types.ts` — branded types).

---

## 13. Notable gaps / half-baked / missing in the library itself

1. **No first-class constructor-args / props passing.** The registry instantiates every bloc via
   `new Type()` with zero args (`StateContainerRegistry.ts:191`). Initial state must be hardcoded in the
   subclass constructor. There is no `useBloc(C, { args })` or `acquire(C, key, ...args)` runtime path,
   even though `BlocConstructor` *types* `acquire(instanceKey?, ...args)` (`utilities.ts:60`). Consumers
   who need per-instance initial data must work around it (emit/patch after mount, or encode data in the
   `instanceId` and re-derive). This is the single biggest ergonomic gap.

2. **README documents `update(fn)` and `lastUpdateTimestamp` that don't exist.** `blac-core/README.md:28,59,61`
   reference `update`/`lastUpdateTimestamp`; neither is implemented on `Cubit` or `StateContainer`. Apps
   following the README will hit runtime/type errors.

3. **Static registry methods are typed but not implemented.** `BlocConstructor` declares
   `Bloc.acquire/borrow/ensure/release/...` as static (`utilities.ts:54-71`), but the base classes don't
   define them. The real API is the standalone functions. The OO-style `MyBloc.acquire()` will not work at
   runtime despite type hints.

4. **No built-in derived/computed-state or selector primitive.** Computed values are done via plain class
   getters (tracked by the proxy), which works but: getters re-execute on every change-check, there's no
   memoization across blocs, and there's no `select(bloc, fn)` selector helper. `dependencies` is the only
   explicit selector and it disables auto-track.

5. **No async-state / loading-status helper.** There's hydration status (`idle/hydrating/hydrated/error`)
   but it's aimed at persistence plugins, not general async data fetching. Consumers must hand-roll
   `{loading, error, data}` shapes in state.

6. **Deep/non-plain state is not tracked.** Maps, Sets, Dates, class instances inside state are returned
   raw (`isProxyable` only allows plain Object/Array, `tracking-proxy.ts:23`). Mutations inside them won't
   drive auto-track re-renders; and proxying stops at depth 10.

7. **Underscore/`$$`-prefixed state keys are silently untracked** (`tracking-proxy.ts:399`). Easy to trip
   over if a consumer names a meaningful state field `_foo`.

8. **`borrow` throws, `ensure`/`acquire` create** — the three "get an instance" functions have subtly
   different semantics (ref vs no-ref, create vs not, throw vs not) and no single obvious default. The
   refcount/orphan-cleanup interactions (a `depend`ed bloc disposed out from under you) are a known sharp
   edge that the tests work around by manually `acquire`-ing.

9. **`@blac` options are mutually exclusive** (`BlacOptions` union) — you cannot, e.g., set both
   `keepAlive` and a custom `equality` via the decorator in one call (`decorators/blac.ts:8-17`). You'd
   have to apply the decorator twice or set static props manually.

10. **`watch` resolves only the `default` instance for a bare class** (`watch.ts:112`) — to watch a named
    instance you must wrap it in `instance(C, id)`. Not obvious from the bare-class signature.
</content>
</invoke>

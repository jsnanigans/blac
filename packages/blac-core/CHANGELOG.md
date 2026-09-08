# @blac/core

## 2.0.22

### Patch Changes

- 1b450b5: Bind containers to the registry that created them, so a scoped registry is
  actually isolated.

  `StateContainer` captured the module-global registry in a field initialiser, so
  every instance routed its lifecycle through that registry no matter which one
  owned it. `RegistryProvider` — documented for test isolation, SSR isolation and
  micro-frontends — placed instances in the scoped registry but sent all their
  events to the global one. Consequences, each confirmed by test:
  - `created` / `disposed` / `stateChanged` / `depsChanged` / `hydrationChanged`
    fired on the global registry, so listeners on the scoped registry saw nothing.
  - Plugins never worked on a scoped registry: `PluginManager` subscribes via
    `registry.on('created')`, so it received no events and never attached a state
    bridge.
  - The registry's own `disposed` handler never ran, so an instance disposed
    directly was never pruned and its `depend()` dependent edges were never
    swept — leaking the whole dependency subtree.
  - `depend()` resolved deps through the global registry, so a scoped bloc's
    dependencies escaped the sandbox entirely.

  The owning registry is now passed through `StateContainerConfig` and bound in
  `[INIT_CONFIG]` before `init()` runs, since `init()` may call `depend()` or
  emit. A bare `new`'d container still falls back to the global registry.

  Also fixed:
  - `hasStateChangedListeners` could stick `true` forever. It tracked a counter
    incremented on every `on('stateChanged')`, but the listener collection is a
    `Set` — registering the same function twice incremented twice and added once,
    so the count never returned to zero. Every subsequent `emit`/`patch` then
    paid for a notification pass and a microtask flush that reached no listener.
    The getter is now derived from the `Set`, removing the drift entirely.
  - `PluginManager.destroy()` leaked one `ALL_PATHS` channel subscription per
    container. Bridges were only detached on a container's disposal, so after
    `destroy()` every live container kept a subscriber — and the
    single-consumer-skip penalty that comes with it — for the rest of the
    process. `destroy()` now detaches them all.

- Updated dependencies
  - @dirtytalk/structural@0.1.2

## 2.0.21

### Patch Changes

- 80fea0d: Trim the published surface: one barrel per package, minus the dead and
  duplicated entries.

  **Breaking, shipped as a patch deliberately.** The project is pre-1.0 in
  practice and has no known external consumers, so these land on the `2.0.x`
  line rather than waiting for a `3.0`.

  `@blac/core`:
  - `getPluginManager` and `PluginManager` are no longer exported from the
    barrel. Import them from `@blac/core/plugins` instead. This is what makes the
    plugin system tree-shakeable — it cuts **1.10 kB brotli (9.47 → 8.37 kB,
    11.5%)** from every app that never installs a plugin.
  - The `./debug`, `./watch` and `./types` subpath exports are removed. Every
    symbol they exposed was already exported from the barrel, so they were pure
    duplicates; import from `@blac/core` instead. `./plugins` and `./testing`
    remain — they exist to keep the plugin manager and the test harness out of
    the production entry point.
  - `register()` now guards on constructor identity rather than on the resolved
    bloc name, so two distinct classes that share a `blacName` can both be
    registered. Registering the same class twice still throws.

  `@blac/react`:
  - `configureBlacReact` and `BlacReactConfig` are removed. The config object was
    inert: nothing ever read it, so setting it had no effect. Tree-scoped
    configuration is `RegistryProvider`; per-bloc configuration is the `@blac()`
    decorator.

- dc4e95a: Preserve the class type in `InstanceReadonlyState` / `InstanceState` /
  `StateContainerInstance`, and drop `DepsTarget`.

  The three aliases built their narrowed `state` with `Omit<InstanceType<T>,
'state'> & { state: ... }`. `Omit` maps the class into a plain object type,
  which discards `private` members, so the result was no longer assignable to
  `StateContainer`. That is what forced `@blac/react` to introduce the
  structural `DepsTarget` interface for `useBlocDeps`.

  They now use a plain intersection, `InstanceType<T> & { state: ... }`, which
  keeps the nominal class intact. `state` is getter-only on `StateContainer`,
  so assignment through the narrowed type is already a compile error and no
  `readonly` modifier is needed.

  BREAKING (`@blac/react`): `DepsTarget` is removed from the public surface and
  `useBlocDeps` now takes `StateContainer<any, any, D>`. Callers passing a real
  bloc — including the value `useBloc` returns — are unaffected; only code that
  named `DepsTarget` explicitly, or passed a hand-rolled structural object, must
  change.

  A `WithState<I, S>` helper is exported alongside them; it is the shared
  implementation of the three aliases.

  `LifecycleListener`'s `stateChanged` payloads are typed
  `Readonly<Record<string, unknown>>` instead of `any`, matching the
  `depsChanged` branch.

- 7fdcfb1: Make state mutation protected; `Cubit` is the public-mutation variant.

  `emit`, `patch` and `update` are now `protected` on `StructuralContainer` and
  `StateContainer`, and public on `Cubit`. Previously both classes exposed all
  three publicly, so `Cubit` was an empty subclass that made no difference and
  the choice between the two meant nothing — while the docs described the
  encapsulation the code did not enforce.

  `Cubit` is unchanged for callers: it re-declares the three as public, so every
  bloc that extends `Cubit` and every external `bloc.emit(...)` keeps working.

  **Migration.** A class that extends `StateContainer` (or `StructuralContainer`)
  _and_ is mutated from outside must either extend `Cubit` instead, or expose its
  own method that calls the protected mutator internally — the latter is the
  pattern the docs already recommend:

  ```ts
  class Counter extends StateContainer<{ n: number }> {
    increment() {
      this.patch({ n: this.state.n + 1 }); // internal calls are unaffected
    }
  }
  ```

  Mutating a bloc from inside its own methods is unaffected, whichever base
  class it uses.

- Updated dependencies [6c8f484]
- Updated dependencies [7fdcfb1]
  - @dirtytalk/structural@0.1.1

## 2.0.20

### Patch Changes

- 14702ce: Fix `PluginManager.install()` to backfill existing instances. Installing a
  plugin after instances of a registered type already exist now attaches the
  state-change bridge to those instances and fires the plugin's `onCreated`
  hook for each of them, instead of silently missing everything created before
  install. Also removes the unused, unexported `generateId`/`globalCounters`/
  `createIdGenerator`/`__resetIdCounters` dead code from `utils/idGenerator.ts`
  (internal only, no public API change).
- 2059ba9: Fix two registry lifecycle leaks. Disposing an instance directly (bypassing
  `release()`) now self-prunes it from the registry's instance map and from
  `getAll()`, instead of leaving a stale entry behind. `depend()`-resolved
  dependencies are now tracked as dependent edges on the owner and released
  when the owner is disposed (direct `dispose()`, `release(..., { forceDispose:
true })`, or `clear()`), so a non-keepAlive dependency created via `depend()`
  no longer leaks after every owner referencing it has gone away; keepAlive
  dependencies are unaffected and diamond-shared dependencies are only disposed
  once their last owner is gone.
- 9012194: `watch()` now subscribes to each watched instance's own dispose hook (new
  `@internal` `ON_DISPOSE` symbol delegating to the existing per-instance
  `onSystemEvent('dispose')` channel) instead of filtering the registry's
  global `disposed` broadcast. Behavior is identical — the handler fires
  only for that exact instance's disposal — but unrelated container
  disposals no longer cost a check per active watcher.
- Sync
- Updated dependencies
- Updated dependencies [d4cf1fa]
- Updated dependencies [9012194]
- Updated dependencies [0f40f5a]
  - @dirtytalk/structural@0.0.8

## 2.0.19

### Patch Changes

- Fix `onHydrationChange` plugin hook dispatch and make `watch()` forward args, hold a ref, and resubscribe on dispose. Raise default instance/ref/emit ceilings, and build the plugin context once per dispatch instead of per hook call for lower overhead.
- Updated dependencies
  - @dirtytalk/structural@0.0.7

## 2.0.18

### Patch Changes

- 9c473ec: **BREAKING:** Remove the remaining legacy/back-compat surfaces.
  - `StateContainer.subscribe(listener)` (listener-style override) is gone.
    `instance.subscribe` now resolves to the inherited path-scoped
    `StructuralContainer.subscribe(interest, cb)` (a pass-through to
    `instance.channel.subscribe`). For coarse state observation use
    `watch(Bloc, cb)` or `onSystemEvent('stateChanged', cb)`.
  - The internal `EMIT` symbol export is removed — use the public `emit()`.
  - `flushBlocUpdates()` (deprecated alias in `@blac/core/testing`) is removed —
    use `flush()`.

- a98329a: **BREAKING:** Remove legacy identity/lifecycle/hydration surface from `StateContainer`.

  The deprecated delegates introduced in M0 are now gone. `$blac` is the sole
  reserved meta namespace; all identity, lifecycle, and hydration state is
  accessed through it.

  ## Migration table

  | Removed member                      | Replacement                                      |
  | ----------------------------------- | ------------------------------------------------ |
  | `instance.name`                     | `instance.$blac.name`                            |
  | `instance.debug`                    | `instance.$blac.debug`                           |
  | `instance.instanceId`               | `instance.$blac.id`                              |
  | `instance.createdAt`                | `instance.$blac.createdAt`                       |
  | `instance.isDisposed`               | `instance.$blac.disposed`                        |
  | `instance.dependencies`             | `instance.$blac.dependencies`                    |
  | `instance.hydrationStatus`          | `instance.$blac.hydration.status`                |
  | `instance.hydrationError`           | `instance.$blac.hydration.error`                 |
  | `instance.isHydrated`               | `instance.$blac.hydration.isHydrated`            |
  | `instance.changedWhileHydrating`    | `instance.$blac.hydration.changedWhileHydrating` |
  | `instance.beginHydration()`         | `instance.$blac.hydration.begin()`               |
  | `instance.applyHydratedState(next)` | `instance.$blac.hydration.apply(next)`           |
  | `instance.finishHydration()`        | `instance.$blac.hydration.finish()`              |
  | `instance.failHydration(err)`       | `instance.$blac.hydration.fail(err)`             |
  | `instance.waitForHydration()`       | `instance.$blac.hydration.wait()`                |
  | `instance.initConfig(cfg)`          | `instance[INIT_CONFIG](cfg)` (framework-only)    |

  Subclasses may now freely declare `name`, `debug`, `instanceId`, etc. as their
  own members without colliding with the reserved surface. The only reserved
  instance name is `$blac`; a dev-only warning fires if a subclass shadows it.

  Size: 7.57 kB (was 8 kB budget; budget lowered to 7.8 kB).

- Updated dependencies
  - @dirtytalk/structural@0.0.6

## 2.0.17

### Patch Changes

- Fix per-index array tracking and out-of-render getter reads. Bloc getters are
  proxied so state reads during render subscribe correctly, array iteration tracks
  per-index access (pinning the array path), and array identity-search no longer
  over-tracks. Resolves stale-closure antipatterns in cross-bloc reads.
- de8c31d: `depend()` now returns a `DepHandle` object with `.track()` / `.untracked()` accessors instead of a callable getter, and resolves dependency `args` at call time.

  **Breaking changes**
  - `this.depend(Type)` no longer returns a callable. Replace `handle()` with `handle.untracked()` for plain (non-reactive) reads and method calls:

    ```ts
    // before
    private getAuth = this.depend(AuthCubit);
    this.getAuth().state.user;
    this.getAuth().login();

    // after
    private auth = this.depend(AuthCubit);
    this.auth.untracked().state.user;
    this.auth.untracked().login();
    ```

  - Reactive cross-bloc reads use `handle.track()`, which returns `[state, depProxy]` and subscribes the reading React consumer (no second `useBloc` needed):

    ```ts
    get summary() {
      const [authState] = this.auth.track();
      return authState.user?.name ?? 'Guest';
    }
    ```

  - Dependency `args` resolve at call time. `depend(Type, defaultArgs?)` keeps `defaultArgs` as the fallback; pass `{ args }` to `.track({ args })` / `.untracked({ args })` to resolve a specific keyed instance per call (the args can derive from current state).

  - The `DEP_BRAND` payload changed from `{ Type, key, args }` to `{ Type, defaultArgs }` (internal; only relevant to framework adapters).

- Updated dependencies
  - @dirtytalk/structural@0.0.5

## 2.0.16

### Patch Changes

- 0a3fa8c: Remove the `instanceId` option and all explicit string-key arguments from the public API. Instance identity is now derived entirely from `args` — via a class's `static key(args)`, the structural hash of `args`, or the `'default'` sentinel.

  **Breaking changes**
  - `useBloc` / `BlocProvider`: the `instanceId` prop/option is removed. Key instances with `args` and a `static key`; for a private per-mount instance, pass a synthetic value such as `args: { _id: useId() }`.
  - Registry functions take an options object instead of positional string keys:
    - `acquire(Bloc, { args?, refId? })`
    - `release(Bloc, { args?, refId?, forceDispose? })`
    - `ensure(Bloc, { args? })`
    - `borrow` / `borrowSafe` / `hasInstance` / `getRefCount` / `getRefIds(Bloc, { args? })`
  - `depend(Type, args?)` and `instance(Bloc, args?)` take `args` instead of a string key.
  - Testing helpers (`withBlocState`, `withBlocMethod`, `registerOverride`, `overrideEnsure`) take a trailing `args?` instead of an `instanceKey?`.

  The `instanceId` instance property, the `instanceId()` branded-type helper, and the internal resolved-key tier (`getRegistry()`) are unchanged. The `@9amhealth/blac-compat` v1 surface is unaffected — it maps `id` to the internal key tier.

- Updated dependencies
  - @dirtytalk/structural@0.0.4

## 2.0.15

### Patch Changes

- Add dts
- Updated dependencies
  - @dirtytalk/structural@0.0.3

## 2.0.14

### Patch Changes

- replace core
- Updated dependencies
  - @dirtytalk/structural@0.0.2

## 2.0.13

### Patch Changes

- prepare compat support for v0 and v1

## 2.0.12

### Patch Changes

- Maintainance

## 2.0.11

### Patch Changes

- Update devtools UI and start consumer registeration

## 2.0.10

### Patch Changes

- fix types for testing helpers

## 2.0.9

### Patch Changes

- vite-plus

## 2.0.8

### Patch Changes

- update devtools

## 2.0.7

### Patch Changes

- Use private and symbols for internals

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility

## 2.0.5

### Patch Changes

- Fix build output

## 2.0.4

### Patch Changes

- add depend system

## 2.0.3

### Patch Changes

- streamline api

## 2.0.1

### Patch Changes

- 2.0.0 release

## 2.0.0

BlaC v2 - a complete rewrite with improved architecture and TypeScript support.

### Highlights

- **StateContainer**: New abstract base class for all state containers with lifecycle management and ref counting
- **Cubit**: Simple state container with direct state emission via `emit()`, `update()`, and `patch()` methods
- **Vertex**: Event-driven state container following the BLoC pattern with `on()` and `add()` methods
- **Plugin System**: Extensible plugin architecture with lifecycle hooks
- **Improved TypeScript**: Full type safety throughout the library

## 2.0.0-rc.17

Initial release candidate for BlaC v2 - a complete rewrite with improved architecture and TypeScript support.

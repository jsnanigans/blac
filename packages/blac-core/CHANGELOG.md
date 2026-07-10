# @blac/core

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

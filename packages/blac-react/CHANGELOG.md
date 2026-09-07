# @blac/react

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

- Updated dependencies [80fea0d]
- Updated dependencies [6c8f484]
- Updated dependencies [dc4e95a]
- Updated dependencies [7fdcfb1]
  - @blac/core@2.0.21
  - @dirtytalk/structural@0.1.1

## 2.0.20

### Patch Changes

- Sync
- Updated dependencies [14702ce]
- Updated dependencies [2059ba9]
- Updated dependencies [9012194]
- Updated dependencies
- Updated dependencies [d4cf1fa]
- Updated dependencies [9012194]
- Updated dependencies [0f40f5a]
  - @blac/core@2.0.20
  - @dirtytalk/structural@0.0.8

## 2.0.19

### Patch Changes

- Fix bloc ownership pairing in effects to close a mount-gap where an owned instance could be released before a re-render reacquired it. Skip unchanged dependency reconciliation and cache the args key to reduce per-render work.
- Updated dependencies
- Updated dependencies
  - @blac/core@2.0.19
  - @dirtytalk/structural@0.0.7

## 2.0.18

### Patch Changes

- Read bloc identity, lifecycle, and hydration state through the `$blac` meta
  namespace and drop references to the removed legacy `StateContainer` members.
  Internal adaptation to the `@blac/core` changes; no public API changes in these
  packages.
- Fix `useBloc` unmount cleanup to depend on the consumer id so the registry ref
  is always released for the correct consumer, preventing a leaked ref that could
  keep a bloc alive past unmount.
- Updated dependencies [9c473ec]
- Updated dependencies [a98329a]
- Updated dependencies
  - @blac/core@2.0.18
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
- Updated dependencies [de8c31d]
- Updated dependencies
  - @blac/core@2.0.17
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

- Updated dependencies [0a3fa8c]
- Updated dependencies
  - @blac/core@2.0.16
  - @dirtytalk/structural@0.0.4

## 2.0.15

### Patch Changes

- Add dts
- Updated dependencies
  - @blac/core@2.0.15
  - @dirtytalk/structural@0.0.3

## 2.0.14

### Patch Changes

- replace core
- Updated dependencies
  - @blac/core@2.0.14
  - @dirtytalk/structural@0.0.2

## 2.0.13

### Patch Changes

- prepare compat support for v0 and v1
- Updated dependencies
  - @blac/adapter@2.0.14
  - @blac/core@2.0.13

## 2.0.12

### Patch Changes

- Maintainance
- Updated dependencies
  - @blac/adapter@2.0.13
  - @blac/core@2.0.12

## 2.0.11

### Patch Changes

- Update devtools UI and start consumer registeration
- Updated dependencies
  - @blac/adapter@2.0.12
  - @blac/core@2.0.11

## 2.0.10

### Patch Changes

- fix types for testing helpers
- Updated dependencies
  - @blac/adapter@2.0.11
  - @blac/core@2.0.10

## 2.0.9

### Patch Changes

- vite-plus
- Updated dependencies
  - @blac/adapter@2.0.9
  - @blac/core@2.0.9

## 2.0.8

### Patch Changes

- update devtools
- Updated dependencies
  - @blac/adapter@2.0.8
  - @blac/core@2.0.8

## 2.0.7

### Patch Changes

- Use private and symbols for internals
- Updated dependencies
  - @blac/adapter@2.0.7
  - @blac/core@2.0.7

## 2.0.6

### Patch Changes

- Reconfigure release for compatibility
- Updated dependencies
  - @blac/adapter@2.0.6
  - @blac/core@2.0.6

## 2.0.5

### Patch Changes

- Fix build output
- Updated dependencies
  - @blac/adapter@2.0.5

## 2.0.4

### Patch Changes

- add depend system
- Updated dependencies
  - @blac/adapter@2.0.4

## 2.0.3

### Patch Changes

- streamline api
- Updated dependencies
  - @blac/adapter@2.0.3

## 2.0.1

### Patch Changes

- 2.0.0 release
- Updated dependencies
  - @blac/core@2.0.1

## 2.0.0

BlaC React bindings v2 - complete rewrite with improved hooks and performance.

> **Correction (added later):** the `useSyncExternalStore` claim below was not
> accurate for this release — `useBloc` actually used (and, as of this
> correction, still uses) a `useReducer`-driven update path. A future release
> that rewrites `useBloc` on `useSyncExternalStore` will have its own entry
> here; until then this claim does not hold.

### Highlights

- **useBloc hook**: Integrates state containers with React using `useSyncExternalStore` for concurrent mode compatibility
- **Auto-tracking**: Automatic dependency detection via Proxy - only re-renders when accessed properties change
- **Manual dependencies**: Explicit dependency array support like useEffect
- **Isolated & Shared instances**: Per-component or singleton instances with ref counting
- **React 18 & 19 support**: Full compatibility with React 18 and 19

## 2.0.0-rc.17

Initial release candidate for BlaC React bindings v2 - complete rewrite with improved hooks and performance.

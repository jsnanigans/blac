# @blac/react

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

### Highlights

- **useBloc hook**: Integrates state containers with React using `useSyncExternalStore` for concurrent mode compatibility
- **Auto-tracking**: Automatic dependency detection via Proxy - only re-renders when accessed properties change
- **Manual dependencies**: Explicit dependency array support like useEffect
- **Isolated & Shared instances**: Per-component or singleton instances with ref counting
- **React 18 & 19 support**: Full compatibility with React 18 and 19

## 2.0.0-rc.17

Initial release candidate for BlaC React bindings v2 - complete rewrite with improved hooks and performance.

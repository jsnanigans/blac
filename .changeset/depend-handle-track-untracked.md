---
"@blac/core": patch
"@blac/react": patch
---

`depend()` now returns a `DepHandle` object with `.track()` / `.untracked()` accessors instead of a callable getter, and resolves dependency `args` at call time.

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

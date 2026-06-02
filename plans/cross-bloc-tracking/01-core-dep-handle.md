# Task 01 — Core: branded `DepHandle` with `.track()`

- **Package**: `@blac/core` (`packages/blac-core`)
- **Model**: Sonnet 4.6 — **thinking effort: high** (TS generics on a callable+method type are the only tricky bit; escalate to Opus 4.8 only if the typing fights back)
- **Depends on**: nothing
- **Parallel-safe with**: Task 02 (disjoint package)
- **Read first**: `plans/cross-bloc-tracking/README.md`

## Goal

Change `StateContainer.depend()` to return a **branded callable handle** that is
backward compatible (`handle()` still resolves the live instance) and adds a
base `handle.track()` returning live `[state, instance]` when no React tracking
session is active. The React layer (Task 03) overrides `.track()` per consumer;
core only provides the type + the safe live fallback.

## Files

- `packages/blac-core/src/core/StateContainer.ts` (modify `depend`, add type + brand)
- `packages/blac-core/src/index.ts` (export `DepHandle` type + `DEP_BRAND` symbol — mark `@internal` where appropriate)
- New test: `packages/blac-core/src/core/StateContainer.dep-handle.test.ts`

## Context

Current (`StateContainer.ts` ~267-277):

```ts
protected depend<T extends StateContainerConstructor>(
  Type: T,
  args?: ExtractArgs<T>,
): () => InstanceType<T> {
  if (!this._dependencies) this._dependencies = new Map();
  const key = this._registry.resolveKey(Type, undefined, args);
  this._dependencies.set(Type, key);
  return () => this._registry.ensure(Type, key, args);
}
```

`ensure(Type, key, args)` = `acquire(..., {canCreate:true, countRef:false})`
(`StateContainerRegistry.ts` ~415). It does NOT refcount — that's fine for the
core fallback; refcounting tracked deps is Task 03's job in React.

## Implementation

1. Define and export a brand symbol (module-level, e.g. `export const DEP_BRAND = Symbol('blac.depHandle')`) and a `DepHandle<T>` type:
   ```ts
   export interface DepHandle<T extends StateContainerConstructor> {
     (): InstanceType<T>;
     track(): [ExtractState<T>, InstanceType<T>];
     readonly [DEP_BRAND]: { Type: T; key: string; args?: ExtractArgs<T> };
   }
   ```
   (`ExtractState`/`ExtractArgs` already exist in core types — reuse them.)
2. Build the handle inside `depend()`:
   - Start from the resolver function `() => this._registry.ensure(Type, key, args)`.
   - Attach `.track()` whose **base** behavior resolves the instance and returns
     `[instance.state, instance]` (live, no subscription). Task 03 will replace
     the handle the consumer sees with a session-bound wrapper; this base path
     is what runs when `.track()` is called outside a React render (e.g. from a
     bloc method) — it must be safe and side-effect-free beyond `ensure`.
   - Define the `[DEP_BRAND]` property (non-enumerable) carrying `{ Type, key, args }`
     so React's `thisProxy` can detect the handle and re-resolve lazily.
   - Cast to `DepHandle<T>` and return.
3. Keep the `_dependencies.set(Type, key)` bookkeeping unchanged.
4. Export `DepHandle` (public) and `DEP_BRAND` (`@internal`) from `index.ts`.
   Keep `depend`'s declared return type assignable to the old `() => InstanceType<T>`
   so existing `this.x()` call sites still typecheck.

## Tests (write in the new file)

Cover the **core** contract only (no React):

- `handle()` returns the same instance as `borrow(Dep)` / `ensure(Dep)`.
- `handle.track()` (no session) returns `[dep.state, depInstance]` with the live
  state object and the live instance (`===` checks).
- `handle[DEP_BRAND]` carries the resolved `Type` and `key`.
- Existing depend behavior intact: `bloc.dependencies` still records the dep.
- A getter using `this.x().state.y` still reads live values when called directly
  on a borrowed bloc (no React) — i.e. no behavior regression.

Use `blacTestSetup()` and `vite-plus/test` imports. Mirror style of
`packages/blac-core/src/core/StateContainer.depend-edge-cases.test.ts`.

## Verify

```fish
cd packages/blac-core
pnpm typecheck
pnpm exec vp lint src
pnpm exec vp fmt "." --check
pnpm exec vp test run src/core/StateContainer.dep-handle.test.ts
# guard against regressions in existing depend tests:
pnpm exec vp test run src/core/StateContainer.depend-edge-cases.test.ts
```

## Commit

```
feat(blac-core): return branded DepHandle with track() from depend
```

## Done when

- All four verify steps pass and the new + existing depend tests are green.
- `depend()`'s return type is back-compat (no changes needed in callers).

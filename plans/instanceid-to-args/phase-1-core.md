# Phase 1 — blac-core API (serial · BLOCKS ALL)

## Task 1.1 — Args-only core API + internal key tier + dead-code removal
**Model: Opus · Effort: high** — foundational, type-heavy, every other phase imports this.
**Depends on:** Phase 0. **Blocks:** Phases 2, 3, 4, 5.

### Goal
Make the **public functional API** of `@blac/core` derive instance identity purely from
`args`. Keep the registry's **internal** string-key tier (`@internal`) so `useBloc`, `compat`,
`watch`, and `depend` can still resolve+address an instance by its computed key. Remove the
dead `isolated` concept.

### Files in scope (blac-core only)
- `src/registry/acquire.ts`, `borrow.ts`, `ensure.ts`, `release.ts`, `queries.ts`, `index.ts`
- `src/registry/config.ts` (only if needed for internal exports)
- `src/core/StateContainerRegistry.ts` (resolveKey + method params; keep internal string tier)
- `src/core/StateContainer.ts` (`depend(Type, args?)`; KEEP `instanceId` property + `StateContainerConfig`)
- `src/watch/watch.ts` (`instance(Bloc, args?)`, `BlocRef`, `watch(...)`)
- `src/constants.ts` (remove `ISOLATED`), `src/utils/static-props.ts` (remove `isIsolatedClass`)
- `src/index.ts` (exports), `src/testing.ts` (test-utils key params → args)
- Co-located core tests (`*.test.ts`) listed below.

### Check (read first)
- `README.md` "Target API" section in this plan dir.
- `resolveKey` (StateContainerRegistry.ts ~191) and how `acquire` (~265) calls it.
- `useBloc.ts` is **not** edited here, but read it to confirm the internal tier it will need:
  it currently does `resolveInstanceKey(Bloc, key, args)` then `acquire(Bloc, resolvedKey, refId, args)`
  and `release(Bloc, instanceKey, …)`. After this task it must be able to do the same via
  `@internal` registry access.

### Implement
1. **`resolveInstanceKey`** → `(BlocClass, args?) => string`. Drop the explicit-key param.
   Internally call `getRegistry().resolveKey(BlocClass, undefined, args)`. Keep it **public**
   (canonical key computation).
2. **`StateContainerRegistry.resolveKey`** — keep signature `(Type, instanceKey, args)` and the
   leading explicit-key branch (now reached only by internal callers). No behavior change.
3. **Public functional API → args-options objects** (these are the user-facing wrappers):
   - `acquire(Bloc, opts?: { args?; refId? })`
   - `borrow(Bloc, opts?: { args? })` and `borrowSafe(Bloc, opts?: { args? })` —
     set `BorrowTarget = { args?: ExtractArgs<T> }` (drop the `string` and `instanceId` branches
     added earlier this session).
   - `ensure(Bloc, opts?: { args? })`
   - `release(Bloc, opts?: { args?; refId?; forceDispose? })`
   - `hasInstance/getRefCount/getRefIds(Bloc, opts?: { args? })`
   Each resolves the key via `getRegistry().resolveKey(Bloc, undefined, opts?.args)` then delegates
   to the **registry class method** (which keeps the `string` key param).
4. **Internal tier** — the `StateContainerRegistry` **methods** (`acquire/borrow/borrowSafe/ensure/
   release/hasInstance/getRefCount/getRefIds`) keep their `instanceKey: string` parameters. Mark
   them `@internal` in JSDoc. They are how `useBloc`/`compat`/`watch` address a pre-resolved key.
   - Confirm `getRegistry()` (exported) gives access to these — `useBloc`/`compat`/`watch` call
     `getRegistry().acquire(Bloc, resolvedKey, { refId, args })` etc. If a cleaner seam is wanted,
     export thin `@internal` helpers (e.g. `__acquireByKey`) — but reusing the registry instance
     methods is acceptable and lower-churn. Pick one and be consistent.
5. **`depend`** (protected on StateContainer): `depend<T>(Type, args?: ExtractArgs<T>)`. Resolve
   key from args (`resolveKey(Type, undefined, args)`); default sentinel when no args. Update the
   internal `ensure` call and the recorded dep key.
6. **`watch`**: `instance(Bloc, args?)` returns a `BlocRef` whose key is `resolveInstanceKey(Bloc, args)`.
   `watch(BlocOrRef, cb)` unchanged in spirit. `BlocRef.instanceId` (the resolved key string) stays
   as an internal field. `resolveBloc` uses the internal tier (`getRegistry().ensure(Bloc, key)`).
7. **Dead code**: delete `BLAC_STATIC_PROPS.ISOLATED`, `isIsolatedClass()` (+ its export in
   `index.ts`), and any `isolated`/`autoInstance` JSDoc remnants in core.
8. **KEEP**: `StateContainer.instanceId` property, `StateContainerConfig.instanceId` field, the
   `instanceId()` branded-type helper in `types/branded.ts` (unrelated nominal util — leave).
9. **Exports** (`src/index.ts`): keep `resolveInstanceKey`; keep `BorrowTarget` (now args-only);
   remove `isIsolatedClass`. Ensure no public symbol exposes a `string` key param.
10. **`testing.ts`**: `withBlocState/withBlocMethod/registerOverride`'s `instanceKey?` → `args?`
    (resolve internally). Keep `insertInstance(key)` internal/by-key (test seam).

### Update core tests (same task — leave green)
- `StateContainerRegistry.keying.test.ts` — rewrite `"explicit instanceKey always overrides…"`
  to assert args-derivation (the explicit-key path is now internal-only; test via `getRegistry()` if needed).
- `StateContainerRegistry.args-release.test.ts` — `resolveInstanceKey` now `(Bloc, args)`.
- `StateContainer.test.ts` — `"custom instance keys"` / `"custom instanceId"` tests → args-based;
  KEEP the tests asserting the `container.instanceId` **property** (just adapt how the key is set).
- `StateContainer.registry.test.ts`, `StateContainerRegistry.lifecycle.test.ts`,
  `.events.test.ts`, `.refcount.test.ts`, `StateContainer.deps.test.ts`, `testing.args-deps.test.ts` —
  swap explicit string keys for `{ args }` (give the test fixtures a `static key` where they relied
  on a bare string identity, or use the `@internal` registry method directly when the test is
  specifically about the key tier).

### Verify (scoped to blac-core)
```
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core lint
pnpm --filter @blac/core test
pnpm --filter @blac/core format:check
```
All green. Confirm `dist` builds: `pnpm --filter @blac/core build`.

### Commit
`refactor(core): derive instance identity from args; drop public string key`
(body: list removed public string-key params + `isolated` dead-code removal; note internal tier kept).

### Done when
- No public `@blac/core` export accepts an `instanceId`/explicit `string` key.
- `resolveInstanceKey(Bloc, args)` + the `@internal` registry tier are the only key paths.
- blac-core typecheck/lint/test/format all green; `dist` builds.

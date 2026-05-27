---
task: 01-core-generics
phase: 1
parallel_safe: false
serial_group: core
model: opus
effort: high
depends_on: []
files:
  - packages/blac-core/src/core/StateContainer.ts
  - packages/blac-core/src/core/Cubit.ts
  - packages/blac-core/src/types/utilities.ts
  - packages/blac-core/src/core/StateContainer.args-types.test.ts  # (new) type-level tests
---

# 01 — `<S, Args, Deps>` generics + utility types

## Goal

Add two new type parameters to the bloc base classes so the rest of the feature is type-safe:

- `StateContainer<S, Args = void, Deps = {}>`
- `Cubit<S, Args = void, Deps = {}>`

`Args` = serializable construction/identity data (consumed by `init`, keys identity). `Deps` = non-serializable injected handles (refs/callbacks), read via `this.deps`. Defaults (`void` / `{}`) keep existing zero-config blocs valid.

This task is **types only** — no runtime behavior. It lays the foundation; tasks 02 (`init(args)`), 03 (keying), 04 (`deps`) supply the runtime.

## Approach

1. **`StateContainer.ts`** (`abstract class StateContainer<S extends object = any>` at line ~38; constructor `constructor(initialState: S)` at ~84):
   - `abstract class StateContainer<S extends object = any, Args = void, Deps extends object = {}>`.
   - Constructor stays `constructor(initialState: S)` — **do not** add args (the zero-arg-construction + `init` decision; task 02). Args/Deps are surfaced as type-only members for now:
     ```ts
     /** @internal phantom — the args type this bloc is constructed with (see init()) */
     declare readonly __args: Args;
     /** @internal phantom — the injected deps type */
     declare readonly __deps: Deps;
     ```
   - Add a typed lazy getter stub for deps (real impl in task 04, but declare the type now so 02/03 compile):
     ```ts
     get deps(): Readonly<Deps> { return (this._deps ?? {}) as Readonly<Deps>; }
     ```
     with a `protected _deps: Partial<Deps> | null = null;` field. (Task 04 replaces the body with the merge-aware version; declaring it here keeps the type stable.)

2. **`Cubit.ts`** (`class Cubit<S extends object = any>` at line ~4): mirror — `class Cubit<S extends object = any, Args = void, Deps extends object = {}> extends StateContainer<S, Args, Deps>`.

3. **`types/utilities.ts`**:
   - `StateContainerConstructor<S extends object = any>` (line ~17) stays structurally `new (...args: any[]) => StateContainer<S, any, any>` (construction is still zero-arg; the registry calls `new Type()`). Widen the `StateContainer<S>` reference to `StateContainer<S, any, any>` so subclasses with Args/Deps remain assignable.
   - Add extraction helpers next to `ExtractState` / `ExtractConstructorArgs` (lines ~7, ~38):
     ```ts
     export type ExtractArgs<T> =
       T extends new () => StateContainer<any, infer A, any> ? A : void;
     export type ExtractDeps<T> =
       T extends new () => StateContainer<any, any, infer D> ? D : {};
     ```
   - Verify `ExtractState`, `InstanceState`, `InstanceReadonlyState`, `BlocInstanceType`, `BlocConstructor` still infer correctly against the widened base (adjust the `infer` patterns to `StateContainer<infer S, any, any>` where they currently match `StateContainer<infer S>`).

### Subtleties
- Use `Args = void` (not `undefined`) so "no args" reads cleanly and lets task 06 make the `args` option *forbidden* when `Args extends void`.
- `Deps extends object = {}` so `this.deps` is always an object; consumers spread/destructure safely.
- Don't break `EqualityFn<S>`, hydration types, or the plugin types that reference `StateContainer<S>` — widen their references to `<S, any, any>` as needed.

## Check (before editing)
```fish
grep -n "class StateContainer" packages/blac-core/src/core/StateContainer.ts
grep -n "class Cubit" packages/blac-core/src/core/Cubit.ts
grep -n "StateContainerConstructor\|ExtractConstructorArgs\|ExtractState" packages/blac-core/src/types/utilities.ts
```
Confirm `StateContainer<S extends object = any>` and `Cubit<S extends object = any>` have a SINGLE type param today and there is no `Args`/`Deps`/`ExtractArgs`/`ExtractDeps` yet. If they already have extra params, STOP and report.

## Implement
1. Add `Args`/`Deps` params + phantom members + `_deps` field + `deps` getter stub to `StateContainer`.
2. Mirror on `Cubit`.
3. Widen `StateContainerConstructor` and the `infer` patterns in `utilities.ts`; add `ExtractArgs`/`ExtractDeps`. Export the new types from the package index (`src/index.ts` types block) alongside `ExtractConstructorArgs`.
4. Make the whole package typecheck.

## Test
Add `packages/blac-core/src/core/StateContainer.args-types.test.ts` — type-level assertions (vitest `expectTypeOf` or `// @ts-expect-error`):
```ts
import { expectTypeOf } from 'vitest';
import { Cubit } from './Cubit';
import type { ExtractArgs, ExtractDeps, ExtractState } from '../types/utilities';

class NoArgs extends Cubit<{ n: number }> { state = { n: 0 }; }
class WithArgs extends Cubit<{ n: number }, { userId: string }, { ref: { current: unknown } }> {
  state = { n: 0 };
}

it('extracts args/deps/state', () => {
  expectTypeOf<ExtractArgs<typeof NoArgs>>().toEqualTypeOf<void>();
  expectTypeOf<ExtractArgs<typeof WithArgs>>().toEqualTypeOf<{ userId: string }>();
  expectTypeOf<ExtractDeps<typeof WithArgs>>().toEqualTypeOf<{ ref: { current: unknown } }>();
  expectTypeOf<ExtractState<typeof WithArgs>>().toEqualTypeOf<{ n: number }>();
});
```

## Verify
```fish
pnpm --filter @blac/core typecheck
pnpm --filter @blac/core test -- StateContainer.args-types
pnpm --filter @blac/core lint
```

## Commit
```
feat(core): add Args/Deps generics to StateContainer and Cubit
```
Body: New `<S, Args, Deps>` type params (defaults `void`/`{}`) + `ExtractArgs`/`ExtractDeps`. Type foundation for the input-pattern feature; no runtime change.

## Checklist
- [ ] `StateContainer<S, Args, Deps>` + phantom members + `_deps`/`deps` stub
- [ ] `Cubit<S, Args, Deps>`
- [ ] `ExtractArgs`/`ExtractDeps` added + exported; existing utility types still infer
- [ ] type test passes; package typechecks & lints
- [ ] committed with Completion filled

## Completion
**Commit SHA:** 4662df77 (HEAD of this task; a commit cannot embed its own final hash, so this names the commit prior to the doc-only SHA stamp — `git log` shows the live HEAD)
**Files touched:** 8
- `packages/blac-core/src/core/StateContainer.ts` — `<S, Args, Deps>` params, `__args`/`__deps` phantoms, `_deps` field, `deps` getter stub.
- `packages/blac-core/src/core/Cubit.ts` — mirrored `<S, Args, Deps>` params, extends `StateContainer<S, Args, Deps>`.
- `packages/blac-core/src/types/utilities.ts` — widened `StateContainerConstructor`/`StateContainerInstance`/`BlocConstructor` to `<S, any, any>`; added `ExtractArgs`/`ExtractDeps`.
- `packages/blac-core/src/index.ts` — exported `ExtractArgs`/`ExtractDeps`.
- `packages/blac-core/src/core/StateContainerRegistry.ts` — widened `StateContainer<any>` refs to `<any, any, any>`.
- `packages/blac-core/src/plugin/BlacPlugin.ts` — same widening.
- `packages/blac-core/src/plugin/PluginManager.ts` — same widening.
- `packages/blac-core/src/core/StateContainer.args-types.test.ts` — (new) type-level tests.

**Typecheck result:** `pnpm --filter @blac/core typecheck` — pass (no errors).
**Test result:** `pnpm --filter @blac/core test` — 569 tests pass, incl. new `extracts args/deps/state` (StateContainer.args-types.test.ts). Lint: no new findings (3 pre-existing in tracking-proxy.ts / StateContainer.ts unrelated to this task).

Notes: `Deps` default is `Record<string, never>` (not literal `{}`) to satisfy the `no-empty-object-type` lint rule while keeping the "empty object" semantics. `ExtractState` assertion expects `Readonly<{ n: number }>` since `ExtractState` wraps state in `Readonly<>`.

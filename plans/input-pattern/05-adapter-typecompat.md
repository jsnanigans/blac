---
task: 05-adapter-typecompat
phase: 2
parallel_safe: false
serial_group: adapter
model: sonnet
effort: low
depends_on:
  - 04-core-deps-ondepschanged
files:
  - packages/blac-adapter/src/index.ts
  - packages/blac-adapter/src/__tests__/adapter.types.test.ts  # (new, if useful)
---

# 05 — Adapter type passthrough for new generics

## Goal

`@blac/adapter` re-exports core types (`StateContainerConstructor`, `InstanceState`, `ExtractState`, …) and owns `AdapterState` + the tracking triads. After core gained `<S, Args, Deps>`, make the adapter compile cleanly and re-export the new symbols/types the React layer needs.

This is **glue only** — no new behavior. `deps` are NOT tracked state, so the tracking triads (`autoTrack*`/`manualDeps*`/`noTrack*`) do not change semantically; they only need to still typecheck against the widened base types.

## Approach
1. Run the adapter typecheck first to see what broke from task 01's widening.
2. Update any `StateContainer<infer S>` / `StateContainerConstructor<S>` references in `src/index.ts` to the widened forms (`StateContainer<S, any, any>`) so `AdapterState<TBloc>` and the triads infer correctly.
3. Re-export the new core types/symbols the React package will import:
   - types: `ExtractArgs`, `ExtractDeps` (from core).
   - symbols: `APPLY_DEPS`, `REMOVE_DEPS_OWNER` (from core) — so `@blac/react` can import them via the adapter, consistent with how `acquire`/`release` are already re-exported from core through the adapter (`blac-adapter/src/index.ts:45`).
   - the `args`-aware `acquire` signature already lives in core; just confirm the re-export still type-checks with the new optional `args` param.

### Subtleties
- Do NOT reimplement merge logic here — it lives in core (task 04). The adapter just passes the symbols through.
- Keep the adapter framework-agnostic; no React imports.

## Check (before editing)
```fish
grep -n "export\|StateContainerConstructor\|AdapterState\|acquire\|release" packages/blac-adapter/src/index.ts | head -40
pnpm --filter @blac/adapter typecheck
```
Note which errors (if any) come from the core generics widening. If the adapter already compiles and re-exports `ExtractArgs`/`APPLY_DEPS`, STOP and report (maybe a prior task already covered it).

## Implement
1. Fix type references broken by the widened base.
2. Re-export `ExtractArgs`, `ExtractDeps`, `APPLY_DEPS`, `REMOVE_DEPS_OWNER` from core.
3. Confirm `acquire`/`release` re-exports still typecheck with the new `args` param.

## Test
If a meaningful behavioral test isn't applicable, a small `adapter.types.test.ts` asserting the re-exports exist and infer is enough:
```ts
import { ExtractArgs, APPLY_DEPS } from '@blac/adapter';
it('re-exports new core symbols/types', () => { expect(typeof APPLY_DEPS).toBe('symbol'); });
```
Otherwise rely on `typecheck` + an existing adapter test still passing.

## Verify
```fish
pnpm --filter @blac/adapter typecheck
pnpm --filter @blac/adapter test -- adapter
pnpm --filter @blac/adapter lint
```

## Commit
```
chore(adapter): pass through Args/Deps generics and deps symbols
```
Body: Type-compat with core's new `<S, Args, Deps>`; re-export `ExtractArgs`/`ExtractDeps` and the deps merge symbols for the React layer.

## Checklist
- [x] adapter typechecks against widened core base
- [x] re-exports `ExtractArgs`/`ExtractDeps`/`APPLY_DEPS`/`REMOVE_DEPS_OWNER`
- [x] existing adapter tests still pass
- [x] committed with Completion filled

## Completion
**Commit SHA:** 2fdba2c5
**Files touched:** 3 — `packages/blac-adapter/src/index.ts`, `packages/blac-adapter/src/__tests__/adapter.types.test.ts`, `plans/input-pattern/05-adapter-typecompat.md`
**Typecheck result:** pass (0 errors)
**Test result:** 3 files, 36 tests passed (includes 2 new symbol re-export assertions)

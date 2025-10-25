# Plan: Fix TypeScript Warnings in @blac/core

## Decision

**Approach**: Three-phase fix starting with trivial issues, then type system improvements, finally architectural consolidation
**Why**: Minimizes risk by addressing simple issues first while avoiding over-engineering test-only problems
**Risk Level**: Low to Medium

## Implementation Steps

### Phase 1: Trivial Fixes (5 minutes)

1. **Fix missing import** - Add `import { vi } from 'vitest'` to `src/test-utils/index.ts:1`
2. **Fix typo** - Change `LMLifecycleEvent` to `LifecycleEvent` in `src/core/LifecycleManager.test.ts:56`
3. **Add type annotation** - Fix `src/proxy/ProxyTracker.test.ts:150` by adding type to lambda: `(x: number) => x * 2`

### Phase 2: Type Safety Improvements (15 minutes)

4. **Fix undefined handling in LifecycleManager.test.ts**
   - Add null checks after `.find()` at lines 64, 95, 127
   - Use assertions or early returns: `const event = events.find(...); assert(event);`

5. **Fix EventStream filter type narrowing**
   - Add type assertions after filter in `src/core/EventStream.test.ts` at lines 132, 136, 151, 152, 203, 383
   - Cast filtered results: `as EventType1[]` where filter guarantees single type

6. **Fix test-utils generic safety**
   - Update `src/test-utils/index.ts:13` to use proper type constraint
   - Change unsafe cast to type-safe approach with default generic

### Phase 3: Architectural Fixes (30 minutes)

7. **Consolidate BlocConstructor types**
   - Remove duplicate from `src/types/utilities.ts:52`
   - Update `src/registry/BlocRegistry.ts:27` to be the single source of truth
   - Add optional `getOrCreate` to main type definition

8. **Fix BlocRegistry generic constraints**
   - Update `BlocConstructor` type to handle variance properly
   - Consider using `StateContainer<any>` instead of `unknown` for constructor compatibility
   - Add proper overloads for `register` method if needed

9. **Add test-specific type utilities**
   - Create `src/test-utils/types.ts` with test-specific type helpers
   - Add `assertDefined` helper for `.find()` results
   - Add `narrowEventType` helper for EventStream tests

## Files to Change

### Immediate Changes (Phase 1)
- `src/test-utils/index.ts:1` - Add vitest import
- `src/test-utils/index.ts:13` - Fix generic type safety
- `src/proxy/ProxyTracker.test.ts:150` - Add type annotation
- `src/core/LifecycleManager.test.ts:56` - Fix typo

### Safety Improvements (Phase 2)
- `src/core/LifecycleManager.test.ts:64,95,127` - Add null checks
- `src/core/EventStream.test.ts:132,136,151,152,203,383` - Add type assertions

### Structural Changes (Phase 3)
- `src/registry/BlocRegistry.ts` - Update BlocConstructor type
- `src/types/utilities.ts` - Remove duplicate type
- `src/test-utils/types.ts` - Create new file with test helpers

## Acceptance Criteria

- [ ] All 38 TypeScript errors resolved
- [ ] `pnpm --filter @blac/core typecheck` passes with no errors
- [ ] No production code behavior changes
- [ ] Test suite still passes: `pnpm --filter @blac/core test`
- [ ] No use of `@ts-ignore` (prefer `@ts-expect-error` if needed)

## Risks & Mitigations

**Main Risk**: Type changes breaking dependent packages
**Mitigation**: Run full typecheck after changes: `pnpm typecheck`

**Secondary Risk**: Over-complicating test code with type gymnastics
**Mitigation**: Use simple assertions and casts in tests rather than complex type system changes

## Out of Scope

- Refactoring production code unless absolutely necessary
- Adding new test coverage
- Fixing any runtime bugs discovered (create separate issues)
- Updating React integration types
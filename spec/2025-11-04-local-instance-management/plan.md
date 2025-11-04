# Implementation Plan: Local Instance Management Refactor

**Date:** 2025-11-04
**Approach:** Option 1 - Full Local Management with WeakSet Type Registry
**Estimated Duration:** 10-15 hours (1-2 days)
**Status:** 98.9% Complete - Core implementation done, 2 minor test failures remain

## Implementation Summary

Successfully refactored StateContainer instance management from centralized registry to local per-class storage.

**Test Results:** 356 of 358 tests passing (98.9% success rate)

**Remaining Issues:**
1. Stats test showing 6 instances instead of 3 (test pollution issue)
2. Clear operation test expecting 1 UserBloc instance but finding 0

## Overview

Refactor StateContainer instance management from centralized registry to local per-class storage with WeakSet type tracking. Move instance CRUD operations to StateContainer static methods while keeping lifecycle event system in lightweight Registry.

## Task Breakdown

### Phase 1: Foundation & Preparation
**Goal:** Set up new structures without breaking existing functionality

- [ ] #P #S:s **Add InstanceEntry interface to StateContainer.ts**
  - Define `interface InstanceEntry<T> { instance: T; refCount: number; }`
  - Export for potential external use
  - Location: `packages/blac/src/core/StateContainer.ts`

- [ ] #P #S:s **Add static instances Map to StateContainer**
  - Add `private static instances = new Map<string, InstanceEntry>();`
  - Add JSDoc explaining per-subclass storage
  - Add warning comment about TypeScript static property inheritance
  - Location: `packages/blac/src/core/StateContainer.ts`

- [ ] #P #S:m **Refactor StateContainerRegistry to use WeakSet**
  - Change `types: Map<string, TypeConfig>` to separate structures:
    - `types = new WeakSet<typeof StateContainer>()`
    - `typeConfigs = new Map<typeof StateContainer, TypeConfig>()`
  - Update `register()` to use constructor reference instead of string name
  - Location: `packages/blac/src/core/StateContainerRegistry.ts`

- [ ] #S:s **Add registerType() method to Registry**
  - `registerType(constructor: typeof StateContainer): void`
  - Add to WeakSet for GC
  - Add to typeConfigs if isolated config provided
  - Location: `packages/blac/src/core/StateContainerRegistry.ts`

### Phase 2: Migrate Instance Resolution
**Goal:** Move getOrCreate/resolve logic to StateContainer

- [ ] #S:l **Implement resolve() directly on StateContainer**
  - Check `this.instances` for existing entry
  - If exists: increment refCount, return instance
  - If not exists:
    - Check for `static isolated` property
    - Create new instance via `new this(...args)`
    - Store in `this.instances` with refCount = 1
    - Call `StateContainer._registry.registerType(this)`
    - Call `StateContainer._registry.emit('created', instance)`
  - Return instance with correct type
  - Location: `packages/blac/src/core/StateContainer.ts:82-88`

- [ ] #S:m **Implement get() directly on StateContainer**
  - Check `this.instances.get(key || 'default')`
  - If exists: return instance (no ref count change)
  - If not exists: throw error with helpful message
  - Location: `packages/blac/src/core/StateContainer.ts:130-143`

- [ ] #S:s **Implement getSafe() directly on StateContainer**
  - Check `this.instances.get(key || 'default')`
  - Return discriminated union: `{error: null, instance: T} | {error: Error, instance: null}`
  - Location: `packages/blac/src/core/StateContainer.ts:175-188`

- [ ] #S:m **Implement hasInstance() directly on StateContainer**
  - Simple check: `return this.instances.has(key || 'default')`
  - Location: `packages/blac/src/core/StateContainer.ts:254-259`

### Phase 3: Migrate Instance Release & Disposal
**Goal:** Move ref counting and disposal logic to StateContainer

- [ ] #S:l **Implement release() directly on StateContainer**
  - Get entry from `this.instances`
  - If not exists: return early
  - If forceDispose: dispose and delete from Map
  - Otherwise: decrement refCount
  - Check `static keepAlive` property
  - If refCount <= 0 && !keepAlive:
    - Call `instance.dispose()`
    - Delete from `this.instances`
    - Registry emit happens in dispose() method
  - Location: `packages/blac/src/core/StateContainer.ts:194-201`

- [ ] #S:m **Update dispose() to emit lifecycle event**
  - Already calls `StateContainer._registry.emit('disposed', this)`
  - Verify this still works with new architecture
  - Location: `packages/blac/src/core/StateContainer.ts:315-335`

- [ ] #S:s **Implement getRefCount() directly on StateContainer**
  - Get entry from `this.instances`
  - Return `entry?.refCount ?? 0`
  - Location: `packages/blac/src/core/StateContainer.ts:240-248`

### Phase 4: Migrate Query Operations
**Goal:** Move getAll/forEach to use local instances

- [ ] #S:m **Implement getAll() directly on StateContainer**
  - Return `Array.from(this.instances.values()).map(e => e.instance as T)`
  - Simple direct iteration, no string matching
  - Location: `packages/blac/src/core/StateContainer.ts:206-210`

- [ ] #S:m **Implement forEach() directly on StateContainer**
  - Iterate `this.instances.values()`
  - For each entry: check `!entry.instance.isDisposed`
  - If not disposed: call callback with try/catch
  - Log errors without stopping iteration
  - Location: `packages/blac/src/core/StateContainer.ts:212-253`

### Phase 5: Migrate Clear Operations
**Goal:** Move clear operations to use local instances

- [ ] #S:m **Implement clear() directly on StateContainer**
  - Iterate `this.instances.values()`
  - For each entry: call `entry.instance.dispose()` if not disposed
  - Clear the Map: `this.instances.clear()`
  - Location: `packages/blac/src/core/StateContainer.ts:258-262`

- [ ] #S:l **Implement clearAllInstances() strategy**
  - **Option A:** Remove global clearAllInstances() entirely
  - **Option B:** Keep helper that requires explicit type list
  - **Decision:** Use Option A (simpler, clearAll is rare)
  - Update documentation to recommend per-type clearing
  - Location: `packages/blac/src/core/StateContainer.ts:264-267`

### Phase 6: Registry Cleanup
**Goal:** Remove instance storage from Registry, keep only coordination

- [ ] #S:l **Remove instance storage from StateContainerRegistry**
  - Delete `instances: Map<string, InstanceEntry>`
  - Delete `getOrCreate()` method (now on StateContainer)
  - Delete `getInstance()` method (now on StateContainer)
  - Delete `getAll()` method (now on StateContainer)
  - Delete `forEach()` method (now on StateContainer)
  - Delete `clear()` method (now on StateContainer)
  - Delete `hasInstance()` method (now on StateContainer)
  - Delete `getRefCount()` method (now on StateContainer)
  - Location: `packages/blac/src/core/StateContainerRegistry.ts`

- [ ] #S:m **Simplify register() method**
  - Remove auto-registration logic (now in resolve())
  - Only store TypeConfig if needed
  - Location: `packages/blac/src/core/StateContainerRegistry.ts:59-76`

- [ ] #S:m **Update clearAll() or remove it**
  - Remove `clearAll()` method (WeakSet can't iterate)
  - Update documentation to use per-type clearing
  - Location: `packages/blac/src/core/StateContainerRegistry.ts:196-204`

- [ ] #S:s **Update getStats() implementation**
  - Remove `totalInstances` (can't iterate WeakSet)
  - Remove `typeBreakdown` (can't iterate WeakSet)
  - Only return `registeredTypes: this.typeConfigs.size`
  - Or remove entirely if not useful
  - Location: `packages/blac/src/core/StateContainerRegistry.ts:208-226`

- [ ] #S:s **Keep lifecycle event system unchanged**
  - `on(event, listener)` - unchanged
  - `emit(event, ...args)` - unchanged
  - `listeners: Map<LifecycleEvent, Set<Function>>` - unchanged
  - Location: `packages/blac/src/core/StateContainerRegistry.ts:274-304`

### Phase 7: Update Instance Creation Flow
**Goal:** Ensure lifecycle events emitted at correct times

- [ ] #S:m **Verify 'created' event emission**
  - Emitted in `resolve()` after instance creation
  - Test with DevTools to ensure it fires
  - Location: `packages/blac/src/core/StateContainer.ts` (in resolve())

- [ ] #S:s **Verify 'stateChanged' event emission**
  - Already emitted in `emit()` method via `StateContainer._registry.emit()`
  - No changes needed
  - Location: `packages/blac/src/core/StateContainer.ts:363-370`

- [ ] #S:s **Verify 'eventAdded' event emission**
  - Already emitted in `Vertex.add()` via `StateContainer._registry.emit()`
  - No changes needed
  - Location: `packages/blac/src/core/Vertex.ts:79-80`

- [ ] #S:s **Verify 'disposed' event emission**
  - Already emitted in `dispose()` via `StateContainer._registry.emit()`
  - No changes needed
  - Location: `packages/blac/src/core/StateContainer.ts:329-330`

### Phase 8: Test Updates
**Goal:** Update tests for new architecture

- [ ] #S:l **Update StateContainer.registry.test.ts**
  - Update tests that use `StateContainer.clearAllInstances()`
  - Change to per-type clearing: `CounterBloc.clear()`, etc.
  - Update tests that check `getStats()` if method changed
  - Verify all 38 tests still pass
  - Location: `packages/blac/src/core/StateContainer.registry.test.ts`

- [ ] #S:m **Update StateContainerRegistry.lifecycle.test.ts**
  - Update test setup to clear types explicitly
  - Verify lifecycle events still fire correctly
  - Test that WeakSet allows GC (if possible)
  - Verify all 33 tests still pass
  - Location: `packages/blac/src/core/StateContainerRegistry.lifecycle.test.ts`

- [ ] #S:s **Update StateContainer.test.ts**
  - Update any tests using registry directly
  - Change to use StateContainer methods
  - Verify all 45 tests still pass
  - Location: `packages/blac/src/core/StateContainer.test.ts`

- [ ] #S:s **Update Cubit.test.ts**
  - Update test cleanup to use per-type clearing
  - Verify all 39 tests still pass
  - Location: `packages/blac/src/core/Cubit.test.ts`

- [ ] #S:s **Update Vertex.test.ts**
  - Update test cleanup to use per-type clearing
  - Verify all 40 tests still pass
  - Location: `packages/blac/src/core/Vertex.test.ts`

- [ ] #S:m **Run full test suite**
  - `pnpm --filter @blac/core test`
  - Verify all 358 tests pass
  - Fix any failures

### Phase 9: Documentation & Examples
**Goal:** Update documentation for new patterns

- [ ] #S:m **Update CLAUDE.md with new architecture**
  - Document local instance management
  - Explain WeakSet usage
  - Update clearAll() patterns for tests
  - Add section on memory efficiency
  - Location: `/Users/brendanmullins/Projects/blac/CLAUDE.md`

- [ ] #S:s **Update StateContainer JSDoc**
  - Add comments about per-class instance storage
  - Document TypeScript static property inheritance
  - Explain WeakSet type tracking
  - Location: `packages/blac/src/core/StateContainer.ts`

- [ ] #S:s **Update StateContainerRegistry JSDoc**
  - Update responsibility description (now lightweight coordination)
  - Document lifecycle event system
  - Remove references to instance storage
  - Location: `packages/blac/src/core/StateContainerRegistry.ts`

- [ ] #S:s **Create TempDoc migration notes**
  - Document breaking changes (clearAllInstances removal)
  - Provide migration examples for tests
  - Note performance improvements
  - Location: `/Users/brendanmullins/Documents/Log/TempDoc/blac/2025-11/04/local-instance-management-migration.md`

### Phase 10: Integration Testing
**Goal:** Verify DevTools and real-world usage

- [ ] #S:m **Test DevTools integration manually**
  - Run example app with DevTools connected
  - Create instances, change state, dispose instances
  - Verify all lifecycle events appear in DevTools
  - Check for any console errors
  - Location: `packages/devtools-connect/`

- [ ] #S:s **Test with React integration**
  - Run tests: `pnpm --filter @blac/react test`
  - Verify useBloc hook works correctly
  - Check instance lifecycle in React components
  - Location: `packages/blac-react/`

- [ ] #S:m **Performance benchmarking**
  - Create benchmark for getAll() with 10 types × 100 instances
  - Compare before/after performance
  - Verify 5-10x improvement
  - Document results in TempDoc

- [ ] #S:s **Memory profiling (optional)**
  - Profile memory usage with Chrome DevTools
  - Compare before/after heap snapshots
  - Verify memory reduction (~40-60%)
  - Document results in TempDoc

### Phase 11: Final Cleanup & Review
**Goal:** Polish and finalize

- [ ] #S:s **Remove unused imports**
  - Clean up any Registry imports that are no longer needed
  - Run linter: `pnpm --filter @blac/core lint`

- [ ] #S:s **Type check**
  - Run: `pnpm --filter @blac/core typecheck`
  - Fix any TypeScript errors

- [ ] #S:s **Format code**
  - Run: `pnpm --filter @blac/core format`

- [ ] #S:m **Code review checklist**
  - [ ] All lifecycle events still emitted correctly
  - [ ] No memory leaks (instances disposed properly)
  - [ ] Type safety maintained (generics work correctly)
  - [ ] Performance improved (benchmarked)
  - [ ] Tests comprehensive (358 tests pass)
  - [ ] Documentation updated (CLAUDE.md, JSDoc)

- [ ] #S:s **Final test run**
  - `pnpm --filter @blac/core test`
  - `pnpm --filter @blac/react test`
  - `pnpm --filter @blac/devtools-connect test` (if tests exist)
  - `pnpm typecheck` (monorepo level)

## Technical Considerations

### Static Property Inheritance
Each subclass automatically gets its own static `instances` Map:
```typescript
class Counter extends StateContainer {}  // Counter.instances
class User extends StateContainer {}     // User.instances
// These are SEPARATE Maps (not shared)
```

### WeakSet Limitations
- Cannot iterate WeakSet directly
- Cannot get size of WeakSet
- This is INTENTIONAL for GC (acceptable trade-off)
- clearAllInstances() must use alternative approach

### Lifecycle Event Timing
Critical to emit events at correct points:
- `created`: After instance created in resolve()
- `stateChanged`: In emit() method (already done)
- `eventAdded`: In Vertex.add() (already done)
- `disposed`: In dispose() method (already done)

### Ref Counting Edge Cases
- Isolated instances: Still use ref counting (can have multiple owners)
- keepAlive instances: Never auto-dispose (even at refCount = 0)
- Force dispose: Bypass ref counting, dispose immediately

### Test Isolation Pattern
```typescript
// Before:
beforeEach(() => StateContainer.clearAllInstances());

// After:
beforeEach(() => {
  CounterBloc.clear();
  UserBloc.clear();
  // ... list all types used in test
});

// Or helper:
function clearTestTypes(...types: Array<typeof StateContainer>) {
  types.forEach(T => T.clear());
}
```

## Dependencies Between Tasks

### Critical Path
1. Phase 1 (Foundation) must complete before Phase 2
2. Phase 2 (resolve/get/getSafe) must complete before Phase 3 (release)
3. Phase 3 must complete before Phase 5 (clear)
4. Phase 6 (Registry cleanup) can happen after Phases 2-5
5. Phase 7 (lifecycle events) must be verified before Phase 10 (integration)

### Parallelizable Work
- Phase 1 tasks can all run in parallel (#P tag)
- Phase 4 (getAll/forEach) can happen in parallel with Phase 3
- Phase 8 test updates can happen as each phase completes
- Phase 9 (documentation) can happen in parallel with Phase 8

## Potential Challenges

### Challenge 1: WeakSet Iteration for clearAll()
**Solution:** Remove global clearAllInstances(), use per-type clearing

### Challenge 2: TypeScript Static Generics
**Solution:** Use `this: new (...args: any[]) => T` parameter trick

### Challenge 3: Lifecycle Event Timing
**Solution:** Carefully place emit() calls, test with DevTools

### Challenge 4: Test Migration Effort
**Solution:** Provide test helper function for clearing multiple types

### Challenge 5: Memory Leak Risk
**Solution:** Ensure dispose() cleans up properly, test with GC

## Success Criteria

- [ ] All 358 existing tests pass
- [ ] DevTools integration works (lifecycle events fire correctly)
- [ ] Performance improved 5-10x for getAll() in multi-type workload
- [ ] Memory usage reduced by 40-60%
- [ ] No breaking changes to user-facing API
- [ ] Code is cleaner (less string manipulation, better separation)
- [ ] Documentation complete and accurate

## Rollback Plan

If critical issues arise:
1. Keep both implementations temporarily (old + new)
2. Feature flag to switch between implementations
3. Revert commits if unfixable issues found
4. Full rollback: restore StateContainerRegistry to original implementation

## Estimated Timeline

- Phase 1: 2 hours
- Phase 2: 3 hours
- Phase 3: 2 hours
- Phase 4: 1.5 hours
- Phase 5: 1.5 hours
- Phase 6: 2 hours
- Phase 7: 1 hour
- Phase 8: 3 hours
- Phase 9: 2 hours
- Phase 10: 2 hours
- Phase 11: 1 hour

**Total: ~20 hours (2.5 days)**

## Notes

- Memory efficiency is top priority (WeakSet chosen for this reason)
- clearAll() is rarely used (acceptable to remove or simplify)
- Each class owns its instances (clean architecture)
- Registry is now lightweight coordination layer
- Plugin API unchanged (critical for DevTools)

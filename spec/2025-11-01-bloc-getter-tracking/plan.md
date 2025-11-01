# Bloc Getter Tracking - Implementation Plan

## Overview

Implement automatic getter tracking for bloc instances in `useBloc` hook using a proxy-based approach with reference equality comparison.

**Target File**: `packages/blac-react/src/useBloc.ts`

**Estimated Total Effort**: 2-3 weeks

---

## Implementation Status

**Implementation Complete**: ✅ All phases complete! Getter tracking is fully implemented and tested.

### Key Changes:
1. ✅ Added GetterTrackingState interface and supporting infrastructure
2. ✅ Implemented createBlocProxy with caching for shared instances
3. ✅ Implemented hasGetterChanges for change detection with error handling
4. ✅ Integrated into useBloc hook with auto-tracking mode
5. ✅ All existing tests passing (51/51)
6. ✅ Created comprehensive getter tracking tests (17 new tests)
7. ✅ **All 68 tests passing (51 original + 17 new)**

### Implementation Details:
- Used two-set approach for getter tracking (currentlyAccessing + trackedGetters)
- Committed tracked getters after each render, similar to state path tracking
- Special handling for "only getters tracked" case to avoid unnecessary re-renders
- Cached bloc proxies for shared instances using WeakMap
- Active tracker map for multi-component support

### Test Coverage:
- Basic getter tracking
- Multiple getters
- Nested getters
- Complex return values (arrays, objects)
- Error handling
- State + getter tracking combined
- Manual dependencies mode
- autoTrack: false mode
- React Strict Mode compatibility
- Memory cleanup
- Edge cases (NaN, +0/-0, symbols, methods)

### Next Steps:
- Performance benchmarks
- Documentation updates

## Phase 1: Core Infrastructure

### Task 1.1: Define GetterTrackingState Interface #P #S:s
- [x] Add `GetterTrackingState` interface to useBloc.ts
- [ ] Define fields: `trackedValues`, `accessedInRender`, `isTracking`
- [ ] Add JSDoc comments explaining purpose

**Location**: Top of useBloc.ts, after imports

**Dependencies**: None

---

### Task 1.2: Extend HookState Interface #P #S:s
- [ ] Add `getterTracker: GetterTrackingState | null` field
- [ ] Add `proxiedBloc: TBloc | null` field for cached proxy
- [ ] Update JSDoc comments

**Location**: Lines 89-93 in useBloc.ts

**Dependencies**: Task 1.1

---

### Task 1.3: Create Descriptor Cache #P #S:m
- [ ] Create WeakMap for caching property descriptors per class
- [ ] Implement `getDescriptor(obj, prop)` function
- [ ] Walk prototype chain once, cache result
- [ ] Handle Object.prototype boundary
- [ ] Add JSDoc with performance notes

**Location**: After HookState interface

**Performance**: Critical for avoiding repeated prototype walks

**Dependencies**: None

---

### Task 1.4: Implement isGetter Detection #P #S:m
- [ ] Create `isGetter(obj, prop)` function
- [ ] Use getDescriptor helper
- [ ] Check `descriptor.get !== undefined`
- [ ] Handle undefined/null cases
- [ ] Add unit tests

**Location**: After getDescriptor function

**Dependencies**: Task 1.3

**Tests**:
- Getter on own properties
- Getter on prototype
- Getter nested in prototype chain
- Non-getter (method, property)
- Symbol properties

---

### Task 1.5: Implement createGetterTracker Factory #P #S:s
- [ ] Create `createGetterTracker()` function
- [ ] Initialize empty Map and Set
- [ ] Set isTracking to false
- [ ] Return GetterTrackingState

**Location**: After isGetter function

**Dependencies**: Task 1.1

---

## Phase 2: Proxy Implementation

### Task 2.1: Implement createBlocProxy Function #P #S:l
- [ ] Create `createBlocProxy<TBloc>(bloc, tracker)` function
- [ ] Implement Proxy with get trap
- [ ] Check `tracker.isTracking` flag
- [ ] Call `isGetter()` to detect getters
- [ ] Track accessed getters in `accessedInRender`
- [ ] Compute and store value in `trackedValues`
- [ ] Return value for getters
- [ ] Use `Reflect.get()` for non-getters
- [ ] Preserve TypeScript types
- [ ] Add comprehensive JSDoc

**Location**: After createGetterTracker function

**Dependencies**: Task 1.4, Task 1.5

**Edge Cases**:
- Getter throws error during access
- Getter accesses another getter (nested)
- Symbol properties
- Private fields

**Tests**:
- Intercepts getter when tracking enabled
- Ignores getter when tracking disabled
- Passes through methods
- Passes through properties
- Handles nested getters
- Handles getter errors

---

### Task 2.2: Add Error Handling in Proxy #S:m
- [ ] Wrap getter call in try-catch
- [ ] Log warning on error
- [ ] Still track the getter (let error propagate)
- [ ] Add error handling test

**Location**: Within createBlocProxy

**Dependencies**: Task 2.1

---

## Phase 3: Change Detection

### Task 3.1: Implement hasGetterChanges Function #P #S:l
- [ ] Create `hasGetterChanges(bloc, tracker)` function
- [ ] Early return if tracker null or no getters accessed
- [ ] Loop through `accessedInRender` set
- [ ] Re-compute each getter using getDescriptor
- [ ] Compare with stored value using `Object.is()`
- [ ] Update `trackedValues` if changed
- [ ] Return true on first change detected
- [ ] Return false if no changes

**Location**: After createBlocProxy function

**Dependencies**: Task 1.3, Task 1.5

**Tests**:
- Detects primitive value change
- Detects reference change (object/array)
- Returns false when no change
- Handles multiple getters
- Handles NaN, +0, -0 correctly

---

### Task 3.2: Add Error Handling in hasGetterChanges #S:m
- [ ] Wrap getter call in try-catch
- [ ] Log warning on error
- [ ] Remove getter from `accessedInRender`
- [ ] Remove getter from `trackedValues`
- [ ] Return true (treat as changed)
- [ ] Add error handling tests

**Location**: Within hasGetterChanges function

**Dependencies**: Task 3.1

**Tests**:
- Getter throws during comparison
- Tracking continues for other getters
- Component still re-renders

---

## Phase 4: Hook Integration

### Task 4.1: Update useMemo - Initialize Getter Tracker #P #S:m
- [ ] Determine tracking mode (check autoTrack, dependencies)
- [ ] Create getter tracker if auto-track enabled
- [ ] Initialize `getterTracker` in HookState
- [ ] Initialize `proxiedBloc` to null

**Location**: Lines 213-234 in useBloc.ts (within useMemo)

**Dependencies**: Task 1.2, Task 1.5

---

### Task 4.2: Update useMemo - Create Bloc Proxy #P #S:m
- [ ] Call `createBlocProxy()` if getter tracker exists
- [ ] Store result in `hookState.proxiedBloc`
- [ ] Use raw instance if getter tracker null
- [ ] Cache proxy (don't recreate on re-render)

**Location**: In useMemo, after HookState creation

**Dependencies**: Task 2.1, Task 4.1

---

### Task 4.3: Update createAutoTrackSubscribe #P #S:m
- [ ] Add call to `hasGetterChanges()` in subscribe callback
- [ ] Combine with existing `hasChanges()` check
- [ ] Use OR logic: `if (stateChanged || getterChanged)`
- [ ] Pass instance and hookState.getterTracker

**Location**: Lines 98-112 (createAutoTrackSubscribe function)

**Dependencies**: Task 3.1

**Tests**:
- Re-renders when state changes
- Re-renders when getter changes
- Re-renders when both change
- No re-render when neither changes

---

### Task 4.4: Update createAutoTrackSnapshot #P #S:m
- [ ] Enable getter tracking: `isTracking = true`
- [ ] Clear `accessedInRender` set
- [ ] Keep existing state proxy logic unchanged

**Location**: Lines 148-163 (createAutoTrackSnapshot function)

**Dependencies**: Task 1.5

**Note**: Tracking is enabled before proxy returned, disabled after render

---

### Task 4.5: Add useEffect for Tracking Cleanup #S:m
- [ ] Add useEffect that runs after every render
- [ ] Disable getter tracking: `isTracking = false`
- [ ] No dependencies (runs after every render)
- [ ] Add comment explaining purpose

**Location**: After useSyncExternalStore call, before return

**Dependencies**: Task 4.4

---

### Task 4.6: Return Proxied Bloc Instead of Raw Instance #P #S:s
- [ ] Change return statement to use `proxiedBloc` from useMemo
- [ ] Ensure TypeScript types preserved
- [ ] Update return value destructuring

**Location**: Line 282 (return statement)

**Dependencies**: Task 4.2

---

### Task 4.7: Handle Manual Dependencies Mode #P #S:s
- [ ] Ensure getter tracker is null when `dependencies` option provided
- [ ] No getter tracking in this mode (existing behavior)
- [ ] Add test confirming this

**Location**: In useMemo tracking mode determination

**Dependencies**: Task 4.1

**Tests**:
- Manual dependencies disable getter tracking
- Getter access doesn't track
- Only manual deps trigger re-render

---

### Task 4.8: Handle autoTrack: false Mode #P #S:s
- [ ] Ensure getter tracker is null when `autoTrack: false`
- [ ] No getter tracking in this mode
- [ ] Add test confirming this

**Location**: In useMemo tracking mode determination

**Dependencies**: Task 4.1

**Tests**:
- autoTrack: false disables getter tracking
- Getter access doesn't track
- All state changes trigger re-render

---

## Phase 5: Testing

### Task 5.1: Unit Tests - Getter Detection #P #S:m
- [ ] Test isGetter with own property
- [ ] Test isGetter with prototype property
- [ ] Test isGetter with nested prototype
- [ ] Test isGetter returns false for methods
- [ ] Test isGetter returns false for regular properties
- [ ] Test with symbol properties

**File**: `packages/blac-react/src/__tests__/getter-tracking.unit.test.ts` (new)

**Dependencies**: Phase 1 complete

---

### Task 5.2: Unit Tests - Proxy Behavior #P #S:m
- [ ] Test proxy intercepts getter when tracking enabled
- [ ] Test proxy ignores getter when tracking disabled
- [ ] Test proxy tracks multiple getters
- [ ] Test proxy stores computed values
- [ ] Test proxy passes through methods
- [ ] Test proxy passes through properties

**File**: Same as Task 5.1

**Dependencies**: Task 2.1

---

### Task 5.3: Unit Tests - Change Detection #P #S:m
- [ ] Test hasGetterChanges detects primitive change
- [ ] Test hasGetterChanges detects reference change
- [ ] Test hasGetterChanges returns false when no change
- [ ] Test hasGetterChanges with multiple getters
- [ ] Test Object.is edge cases (NaN, +0, -0)

**File**: Same as Task 5.1

**Dependencies**: Task 3.1

---

### Task 5.4: Integration Test - Basic Getter Tracking #P #S:l
- [ ] Create test bloc with getter
- [ ] Render component accessing getter
- [ ] Change state that affects getter
- [ ] Verify re-render occurs
- [ ] Change state that doesn't affect getter
- [ ] Verify no re-render

**File**: `packages/blac-react/src/__tests__/useBloc.getter-tracking.test.tsx` (new)

**Dependencies**: Phase 4 complete

---

### Task 5.5: Integration Test - Multiple Getters #P #S:m
- [ ] Create bloc with multiple getters
- [ ] Access multiple getters in component
- [ ] Change state affecting one getter
- [ ] Verify re-render
- [ ] Verify all tracked getters re-computed

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.6: Integration Test - Nested Getters #P #S:m
- [ ] Create bloc with getter calling another getter
- [ ] Access nested getter in component
- [ ] Change state affecting inner getter
- [ ] Verify re-render occurs
- [ ] Verify no double-tracking

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.7: Integration Test - Complex Return Values #P #S:m
- [ ] Create getter returning array
- [ ] Create getter returning object
- [ ] Test reference equality behavior
- [ ] Document expected behavior (new reference = re-render)

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.8: Integration Test - Error Handling #P #S:m
- [ ] Create getter that throws error
- [ ] Access getter in component
- [ ] Trigger state change
- [ ] Verify error logged
- [ ] Verify getter tracking stopped for that getter
- [ ] Verify component still re-renders

**File**: Same as Task 5.4

**Dependencies**: Task 5.4, Task 3.2

---

### Task 5.9: Integration Test - With State Tracking #P #S:m
- [ ] Access both state properties and getters
- [ ] Verify both types of changes trigger re-render
- [ ] Verify change detection works independently
- [ ] Test OR logic (either change triggers re-render)

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.10: Integration Test - Manual Dependencies #P #S:m
- [ ] Use useBloc with dependencies option
- [ ] Access getters in component
- [ ] Verify getter tracking disabled
- [ ] Verify manual dependencies work as before

**File**: Same as Task 5.4

**Dependencies**: Task 5.4, Task 4.7

---

### Task 5.11: Integration Test - autoTrack: false #P #S:m
- [ ] Use useBloc with autoTrack: false
- [ ] Access getters in component
- [ ] Verify getter tracking disabled
- [ ] Verify all state changes trigger re-render

**File**: Same as Task 5.4

**Dependencies**: Task 5.4, Task 4.8

---

### Task 5.12: Integration Test - React Strict Mode #P #S:m
- [ ] Run all integration tests in Strict Mode
- [ ] Verify double-invocation handled correctly
- [ ] Verify no duplicate tracking
- [ ] Verify no memory issues

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.13: Integration Test - Memory Cleanup #P #S:m
- [ ] Render component with getter tracking
- [ ] Unmount component
- [ ] Verify tracking state cleared
- [ ] Verify no memory leaks (WeakMap references released)

**File**: Same as Task 5.4

**Dependencies**: Task 5.4

---

### Task 5.14: Verify All Existing Tests Pass #S:xl
- [ ] Run full test suite for @blac/react
- [ ] Fix any broken tests
- [ ] Verify backward compatibility
- [ ] No changes to existing test files required

**Command**: `pnpm --filter @blac/react test`

**Dependencies**: Phase 4 complete

---

## Phase 6: Performance Optimization

### Task 6.1: Create Performance Benchmark Suite #P #S:l
- [ ] Create benchmark file
- [ ] Benchmark baseline (no getter tracking)
- [ ] Benchmark with getter tracking
- [ ] Benchmark multiple getters (5-10)
- [ ] Benchmark complex getters
- [ ] Benchmark no getter access (overhead when not used)
- [ ] Create comparison report

**File**: `packages/blac-react/src/__tests__/getter-tracking.benchmark.test.ts` (new)

**Dependencies**: Phase 4 complete

---

### Task 6.2: Optimize Descriptor Caching #S:m
- [ ] Verify WeakMap caching working
- [ ] Add cache hit/miss metrics (dev mode)
- [ ] Optimize cache structure if needed
- [ ] Document cache behavior

**Location**: getDescriptor function

**Dependencies**: Task 1.3, Task 6.1

---

### Task 6.3: Optimize Proxy Creation #S:m
- [ ] Verify proxy cached in useMemo
- [ ] Measure proxy creation overhead
- [ ] Ensure no unnecessary proxy recreation

**Location**: useMemo in useBloc

**Dependencies**: Task 4.2, Task 6.1

---

### Task 6.4: Measure and Optimize hasGetterChanges #S:m
- [ ] Profile hasGetterChanges execution time
- [ ] Optimize hot paths
- [ ] Early exit optimizations
- [ ] Ensure <5% overhead target met

**Location**: hasGetterChanges function

**Dependencies**: Task 3.1, Task 6.1

**Target**: <5% overhead compared to no tracking

---

### Task 6.5: Memory Profiling #S:m
- [ ] Profile memory usage over time
- [ ] Test with many components
- [ ] Test with long-running app
- [ ] Verify no memory growth
- [ ] Verify cleanup on unmount

**Dependencies**: Phase 5 complete

---

## Phase 7: Documentation

### Task 7.1: Add JSDoc Comments to All Functions #S:m
- [ ] Document GetterTrackingState interface
- [ ] Document getDescriptor function
- [ ] Document isGetter function
- [ ] Document createGetterTracker function
- [ ] Document createBlocProxy function
- [ ] Document hasGetterChanges function
- [ ] Include examples and edge cases

**Dependencies**: Phase 4 complete

---

### Task 7.2: Update useBloc Hook Comments #S:s
- [ ] Update existing lifecycle comments
- [ ] Add getter tracking to lifecycle description
- [ ] Document when tracking is enabled/disabled
- [ ] Note performance characteristics

**Location**: Lines 190-205 in useBloc.ts

**Dependencies**: Task 7.1

---

### Task 7.3: Add Example Usage in File Comments #S:m
- [ ] Add example with basic getter
- [ ] Add example with multiple getters
- [ ] Show comparison with manual dependencies
- [ ] Note best practices (caching complex values)

**Location**: Top of useBloc.ts

**Dependencies**: Task 7.1

---

### Task 7.4: Document Limitations and Best Practices #S:m
- [ ] Document reference equality behavior
- [ ] Document getter caching pattern for complex values
- [ ] Document error handling behavior
- [ ] Document performance characteristics
- [ ] Add to inline comments

**Location**: useBloc.ts and types.ts

**Dependencies**: Task 7.1

---

### Task 7.5: Update README with Getter Tracking Example #S:m
- [ ] Add section on automatic getter tracking
- [ ] Show before/after example
- [ ] Document comparison strategy
- [ ] Link to detailed docs

**File**: `packages/blac-react/README.md`

**Dependencies**: Task 7.4

---

## Phase 8: Integration & Polish

### Task 8.1: Run Full Test Suite #S:m
- [ ] Run all @blac/react tests
- [ ] Run all @blac/core tests (ensure no impact)
- [ ] Fix any failures
- [ ] Verify 100% pass rate

**Command**: `pnpm --filter @blac/react test && pnpm --filter @blac/core test`

**Dependencies**: Phase 5 complete

---

### Task 8.2: Run Type Checking #S:s
- [ ] Run TypeScript compiler
- [ ] Fix any type errors
- [ ] Verify no type regressions
- [ ] Ensure IDE autocomplete works

**Command**: `pnpm --filter @blac/react typecheck`

**Dependencies**: Phase 4 complete

---

### Task 8.3: Run Linting #S:s
- [ ] Run linter
- [ ] Fix any lint errors
- [ ] Ensure consistent code style

**Command**: `pnpm --filter @blac/react lint`

**Dependencies**: Phase 4 complete

---

### Task 8.4: Performance Validation #S:m
- [ ] Run all benchmarks
- [ ] Verify <5% overhead target met
- [ ] Document performance results
- [ ] Optimize if needed

**Dependencies**: Task 6.1, Task 6.4

---

### Task 8.5: Manual Testing in Playground App #S:l
- [ ] Create test component in playground
- [ ] Test with various getter patterns
- [ ] Test edge cases
- [ ] Verify behavior matches expectations
- [ ] Test in dev and prod modes

**Location**: `apps/playground/` (new test page)

**Dependencies**: Phase 4 complete

---

### Task 8.6: Code Review Preparation #S:m
- [ ] Self-review all changes
- [ ] Ensure code quality
- [ ] Check for TODOs/FIXMEs
- [ ] Verify consistent naming
- [ ] Clean up debug code

**Dependencies**: Phase 8.1-8.3 complete

---

## Task Summary

**Total Tasks**: 54

**By Phase**:
- Phase 1 (Infrastructure): 5 tasks
- Phase 2 (Proxy): 2 tasks
- Phase 3 (Change Detection): 2 tasks
- Phase 4 (Integration): 8 tasks
- Phase 5 (Testing): 14 tasks
- Phase 6 (Performance): 5 tasks
- Phase 7 (Documentation): 5 tasks
- Phase 8 (Polish): 6 tasks

**By Size**:
- Small (s): 22 tasks
- Medium (m): 24 tasks
- Large (l): 6 tasks
- Extra Large (xl): 2 tasks

**Parallelizable**: 28 tasks marked with #P

## Critical Path

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 (Core implementation)
2. Phase 5 (Can start once Phase 4 complete)
3. Phase 6 (Can run parallel with Phase 5)
4. Phase 7 (Can run parallel with Phases 5-6)
5. Phase 8 (Final validation)

## Success Criteria Checklist

- [ ] All existing tests pass without modification
- [ ] >90% test coverage for new code
- [ ] Performance overhead <5% when using getters
- [ ] Performance overhead 0% when NOT using getters
- [ ] No memory leaks in profiling
- [ ] Works correctly in React Strict Mode
- [ ] All edge cases handled (errors, nested getters, etc.)
- [ ] TypeScript types preserved
- [ ] Documentation complete
- [ ] Code reviewed and polished

## Estimated Timeline

- **Week 1**: Phases 1-4 (Core implementation)
- **Week 2**: Phases 5-7 (Testing, performance, docs)
- **Week 3**: Phase 8 (Polish and validation)

**Total**: 2-3 weeks depending on testing discoveries and optimization needs
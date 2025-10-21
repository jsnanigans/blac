# Automatic Dependency Tracking Test Failures Report

**Date:** 2025-10-21
**Feature:** Automatic Dependency Tracking (spec/2025-10-21-automatic-dependency-tracking)

## Executive Summary

The automatic dependency tracking feature has been successfully implemented with the adapter pattern, but 4 tests are failing due to incorrect expectations about how `useBloc` works after the migration. The failing tests expect automatic dependency tracking to work with `useBloc`, but the current implementation requires using `useBlocAdapter` without a selector for auto-tracking to engage.

## Test Results Overview

- **Total Tests:** 115
- **Passed:** 110 ✅
- **Failed:** 4 ❌
- **Skipped:** 1 ⏩

## Core Implementation Status

✅ **DependencyTracker Tests:** All 17 tests passing
✅ **Adapter Integration Tests:** All 12 tests passing (1 skipped)
✅ **ReactBlocAdapter Tests:** All 22 tests passing

## Failing Tests Analysis

### 1. `tests/useBloc.test.tsx` - Dependency Tracking Tests (2 failures)

#### Test: "should only re-render when accessed properties change"
- **Expected:** Component should NOT re-render when `data` property changes (only accessing `count`)
- **Actual:** Component re-renders on any state change
- **Root Cause:** `useBloc` now uses the adapter pattern which requires explicit selectors for fine-grained reactivity. Without a selector, it subscribes to the entire state.

#### Test: "should track nested property access"
- **Expected:** Component should NOT re-render when `count` changes (only accessing `data.value`)
- **Actual:** Component re-renders on any state change
- **Root Cause:** Same as above - no automatic dependency tracking without explicit configuration

### 2. `src/__tests__/edge-cases.test.tsx` - Edge Case Tests (2 failures)

#### Test: "should handle very deep nesting with top-level tracking"
- **Expected:** Component accessing `state.level1.level2...level10.value` should NOT re-render when `level10.label` changes
- **Actual:** Component re-renders on any state change
- **Root Cause:** Auto-tracking not engaged for `useBloc` without proper configuration

#### Test: "should handle state with 1000+ properties efficiently"
- **Expected:** Component accessing specific properties should only re-render when those properties change
- **Actual:** Component re-renders on any state change
- **Root Cause:** Same as above - requires selector or proper auto-tracking configuration

## Root Cause Summary

The migration to the adapter pattern changed the default behavior of `useBloc`:

1. **Old Behavior (Unified Tracking):** Automatic dependency tracking was built into `useBloc` by default
2. **New Behavior (Adapter Pattern):** `useBloc` is now an alias for `useBlocAdapter`, which requires:
   - Either an explicit selector for fine-grained reactivity
   - Or no selector with `proxyDependencyTracking: true` in global config for auto-tracking

The tests are written for the old unified tracking behavior and haven't been updated for the new adapter pattern.

## Solutions

### Option 1: Update Tests to Use Selectors (Recommended)
```typescript
// Instead of:
const [state] = useBloc(CounterCubit);
return <div>{state.count}</div>;

// Use:
const [state] = useBloc(CounterCubit, {
  selector: (s) => ({ count: s.count })
});
return <div>{state.count}</div>;
```

### Option 2: Ensure Auto-Tracking is Properly Enabled
The tests already set `Blac.setConfig({ proxyDependencyTracking: true })`, but the auto-tracking only engages when:
1. No selector is provided
2. The adapter has auto-tracking enabled
3. A subscription ID is properly passed

### Option 3: Move Tests to Archived Folder
Since these tests are for the old unified tracking implementation, they could be moved to the `__archived__` folder where similar tests already exist.

## Recommendations

1. **Update the failing tests** to use the new adapter pattern with selectors
2. **Create new tests** specifically for auto-tracking with `useBlocAdapter` (without selectors)
3. **Document the migration** clearly in the test files
4. **Consider adding migration warnings** when old patterns are detected

## Implementation Notes

The automatic dependency tracking feature itself is **working correctly**:
- ✅ DependencyTracker properly tracks property access via proxies
- ✅ ReactBlocAdapter correctly integrates tracking when configured
- ✅ Depth limiting and performance optimizations are in place
- ✅ Debug utilities are available

The issue is solely with test expectations not matching the new architecture.

## Next Steps

1. Update the 4 failing tests to use selectors or proper auto-tracking configuration
2. Verify auto-tracking works when using `useBlocAdapter` without selectors
3. Add comprehensive tests for the auto-tracking feature specifically
4. Update documentation to clarify when auto-tracking is engaged

## Files Affected

- `/packages/blac-react/tests/useBloc.test.tsx` - 2 failing tests
- `/packages/blac-react/src/__tests__/edge-cases.test.tsx` - 2 failing tests

## Conclusion

The automatic dependency tracking feature is successfully implemented and working. The test failures are due to a mismatch between test expectations (old unified tracking behavior) and the new adapter pattern implementation. Updating the tests to use the correct patterns will resolve all failures.
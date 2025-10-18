# Test Failures Analysis - Deep State Tracking Issue

**Date**: 2025-10-18
**Affected Package**: `@blac/react`
**Root Cause**: Deep state tracking implementation causing dependency tracking mismatch

## Executive Summary

The recent "deep state tracking" feature (commit 362bbae) introduced 7 test failures in the React package. All failures are related to components not receiving state change notifications, preventing re-renders. The core package tests all pass.

## Test Failures

### 1. State Update Failures (4 failures in `useBloc.events.test.tsx`)
- **Test**: "should batch state updates within single action"
  - **Expected**: Component shows "1,2,3" after three sequential `addValue` calls
  - **Actual**: Component shows empty string (no re-render occurred)

- **Test**: "should reflect state updates in correct order"
  - **Expected**: State snapshots show progression from [] to [1,2,3]
  - **Actual**: Final snapshot is still [] (no updates tracked)

- **Test**: "should handle interleaved updates from multiple components"
  - **Expected**: Both components show "1" after first update
  - **Actual**: Components show empty string (no re-render)

- **Test**: "should notify all subscribed components of state changes"
  - **Expected**: Effects run showing state changes
  - **Actual**: Effects don't run with updated state

### 2. Deep Nesting Failure (`edge-cases.test.tsx`)
- **Test**: "should handle very deep nesting with top-level tracking"
  - **Expected**: Spy called 1 time when deep property changes
  - **Actual**: Spy called 0 times (no notification sent)

### 3. Transition Failures (`useBloc.useTransition.test.tsx`)
- **Test**: "should maintain reactivity during transitions"
  - **Expected**: Render count of 2
  - **Actual**: Render count of 1 (state update not triggering re-render)

- **Test**: "should handle transition interruption"
  - **Expected**: Specific transition behavior
  - **Actual**: Component not rendering at all

## Root Cause Analysis

### The Mismatch Problem

The deep state tracking feature introduced three interconnected changes:

#### 1. **ProxyFactory**: Creates nested proxies tracking full paths
```typescript
// V3: Tracks "values.0", "values.1", "values.2" for array elements
const fullPath = path ? `${path}.${String(prop)}` : String(prop);
consumerTracker.trackAccess(consumerRef, 'state', fullPath, undefined);
```

#### 2. **SubscriptionManager.getChangedPaths**: Reports deep change paths
```typescript
// V3: Recursively compares and returns "profile.address.city" style paths
// For arrays: returns "values.0", "values.1", "values.2" for individual elements
private getChangedPaths(oldState, newState, path = ''): Set<string>
```

#### 3. **SubscriptionManager.shouldNotifyForPaths**: Uses exact string matching
```typescript
// Comment says "V2: Direct top-level property matching only"
// But code still does exact matching: changedPaths.has(trackedPath)
if (changedPaths.has(trackedPath)) return true;
```

### The Critical Issue

**Array method access creates a mismatch:**

When a component does `state.values.join(',')`:
1. Proxy intercepts `state.values` → tracks `"values"`
2. Returns nested proxy for the array
3. Component calls `.join(',')` on the array
4. Array methods don't proxy individual element access - just return the result

When state updates from `{values: []}` to `{values: [1,2,3]}`:
1. `getChangedPaths` recursively compares arrays
2. Finds changes at `"values.0"`, `"values.1"`, `"values.2"` (individual elements)
3. Does NOT report `"values"` as changed (because it checks element-by-element)
4. `shouldNotifyForPaths` looks for `"values"` in changed paths
5. Doesn't find it → returns false → **no notification sent**

## Additional Evidence

### Comment Discrepancy
In `SubscriptionManager.shouldNotifyForPaths:440-441`:
```typescript
// V2: Direct top-level property matching only
// No nested path matching since we only track top-level properties
```

This comment is **outdated**. The code now does deep tracking, but the matching logic wasn't fully updated to handle the array/parent-child path relationship.

### Metadata Logic Issue
The code introduced `hasRendered` metadata to handle first-render cases:
```typescript
const neverRendered = !subscription.metadata?.hasRendered;
shouldNotify = neverRendered || !Blac.config.proxyDependencyTracking;
```

However, this only helps when there are **no tracked dependencies**. Once a component has tracked `"values"`, it goes through the `shouldNotifyForPaths` check instead, which fails due to the mismatch.

## Impact Assessment

### Severity: **HIGH**
- Components fail to re-render on state changes
- Basic functionality is broken for array-based state
- Tests demonstrate the issue clearly

### Scope
- **Affected**: React components using arrays in state with proxy tracking enabled
- **Not Affected**:
  - Core package (all tests pass)
  - Components with proxy tracking disabled
  - Components accessing primitive state properties
  - Observer subscriptions (direct `.subscribe()` calls)

## Proposed Solutions

### Option 1: Fix Path Matching Logic (Recommended)
Update `shouldNotifyForPaths` to handle parent-child path relationships:

```typescript
shouldNotifyForPaths(subscriptionId, changedPaths, bloc?): boolean {
  // ... existing code ...

  for (const trackedPath of subscription.dependencies) {
    // Exact match
    if (changedPaths.has(trackedPath)) return true;

    // Check if any changed path is a child of this tracked path
    // e.g., trackedPath="values" should match "values.0", "values.1"
    for (const changedPath of changedPaths) {
      if (changedPath.startsWith(trackedPath + '.')) {
        return true;
      }
    }

    // Check if tracked path is a child of any changed path
    // e.g., trackedPath="values.0" should match "values"
    for (const changedPath of changedPaths) {
      if (trackedPath.startsWith(changedPath + '.')) {
        return true;
      }
    }
  }

  return false;
}
```

### Option 2: Track Parent When Accessing Arrays
Modify `ProxyFactory` to always track the parent array when array methods are called:

```typescript
// When returning an array from proxy, also track just the array itself
if (Array.isArray(value)) {
  consumerTracker.trackAccess(consumerRef, 'state', fullPath, undefined);
  return createStateProxy(value, consumerRef, consumerTracker, fullPath);
}
```

### Option 3: Change getChangedPaths for Arrays
Make `getChangedPaths` report the parent path when array contents change:

```typescript
if (Array.isArray(oldValue) && Array.isArray(newValue)) {
  // Report the array path itself, not individual elements
  if (!arraysEqual(oldValue, newValue)) {
    changedPaths.add(fullPath);
  }
  continue; // Don't recurse into array elements
}
```

## Recommended Action Plan

1. **Immediate**: Implement Option 1 (path matching logic fix) as it's the most comprehensive
2. **Testing**: Re-run failing tests to verify fix
3. **Review**: Check if this breaks any existing deep tracking behavior
4. **Documentation**: Update the outdated "V2" comments to "V3"
5. **Consider**: Hybrid approach combining Options 1 and 3 for optimal performance

## Files to Modify

- `packages/blac/src/subscription/SubscriptionManager.ts:418-446` - Update `shouldNotifyForPaths`
- `packages/blac/src/subscription/SubscriptionManager.ts:271-313` - Review `getChangedPaths` array handling
- Update outdated comments referencing "V2" to "V3"

## Testing Strategy

After implementing fix:
```bash
pnpm --filter @blac/react test useBloc.events
pnpm --filter @blac/react test edge-cases
pnpm --filter @blac/react test useBloc.useTransition
pnpm --filter @blac/react test  # Run all tests to check for regressions
```

## Conclusion

The deep state tracking feature is architecturally sound but has an implementation gap in the path matching logic. The fix is straightforward and localized to the `shouldNotifyForPaths` function. This is a **must-fix** issue as it breaks core reactivity functionality.

# Investigation: Getter Dependency Tracking Test Failures

## Bottom Line

**Root Cause**: Cache update restricted to leaf paths - getter may be filtered out incorrectly
**Fix Location**: `packages/blac/src/adapter/BlacAdapter.ts:488-496`
**Confidence**: High

## What's Happening

Components using getter-based dependency tracking re-render unnecessarily when unrelated state properties change. After `firstName` updates and `fullName` getter changes from "John Doe" to "Jane Doe", the cache isn't reliably updated, causing the next state change (age) to trigger a false positive.

## Why It Happens

**Primary Cause**: Conditional cache update only for getters in filtered leaf paths
**Trigger**: `BlacAdapter.ts:489` - `if (leafPaths.has(getterPath))` condition
**Decision Point**: `BlacAdapter.ts:492-495` - Cache update skipped if condition fails

### The Critical Code Path

```typescript
// BlacAdapter.ts:485-496
for (const [getterName, value] of this.pendingGetterValues) {
  const getterPath = `_class.${getterName}`;
  
  // Optimization: Only cache if this getter is actually tracked
  if (leafPaths.has(getterPath)) {  // <-- PROBLEM: May exclude valid getters
    subscription.getterCache.set(getterPath, {
      value: value,
      error: undefined,
    });
  }
}
```

### Execution Sequence

1. **Initial Render**: 
   - `fullName` returns "John Doe" → cached

2. **FirstName Change**:
   - State notification triggers `checkGetterChanged()`
   - Executes getter → "Jane Doe" vs cached "John Doe" → re-render
   - During re-render: captures "Jane Doe" in `pendingGetterValues`
   - `commitTracking()`: Should update cache but may skip due to line 489

3. **Age Change**:
   - `checkGetterChanged()` compares "Jane Doe" (current) to stale cache
   - If cache wasn't updated, returns true → unnecessary re-render

## Evidence

- **Key File**: `BlacAdapter.ts:488-496` - Conditional cache update
- **Filter Logic**: `BlacAdapter.ts:554-594` - `filterLeafPaths` may exclude getters
- **Test Pattern**: 5 tests fail with same pattern - unrelated state changes trigger re-renders

The `filterLeafPaths` method is designed to remove intermediate paths, but `_class.fullName` should always be a leaf since it has no children. The condition at line 489 suggests the filtered set might not contain the getter path.

## Next Steps

1. Remove condition at line 489 - always update cache for captured getter values
2. Or verify `filterLeafPaths` preserves all `_class.*` paths
3. Add debug logging to confirm cache state after each render

## Risks

- All getter-based dependency tracking is broken
- Significant performance impact from unnecessary re-renders
- Feature unusable in production without this fix

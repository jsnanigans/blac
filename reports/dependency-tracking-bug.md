# Dependency Tracking Bug Report

**Date:** 2025-10-10
**Status:** Identified
**Severity:** High - Causes unnecessary rerenders, defeating the purpose of proxy-based optimization

---

## Summary

The proxy-based dependency tracking system has a critical flaw where class getters cause rerenders on **ANY** state change, not just changes to the properties the getter actually depends on.

Additionally, there may be issues with nested property tracking being too broad.

---

## Reproduction

### Test Results

Created comprehensive test suite in:
- `packages/blac-react/src/__tests__/dependency-tracking.test.tsx`

**Results:**
- ✅ Test 1: Basic property tracking works correctly
- ❌ Test 2: Nested property tracking fails (unnecessary rerender)
- ❌ Test 3: Getter tracking fails (unnecessary rerender)
- ✅ Test 5: Conditional access works correctly

---

## Root Cause Analysis

### Bug #1: Overly Conservative Getter Tracking

**File:** `packages/blac/src/subscription/SubscriptionManager.ts:288-295`

```typescript
if (trackedPath.startsWith('_class.')) {
  // For class getters, we need to notify on any state change
  // since we can't determine which state properties the getter depends on
  // This is conservative but ensures correctness
  if (changedPaths.size > 0) {
    return true; // ⚠️ PROBLEM: Returns true for ANY change!
  }
  continue;
}
```

**Why This is Wrong:**

When a component accesses a getter like `cubit.doubleCount`:
1. ProxyFactory tracks it as `_class.doubleCount`
2. On state change, `SubscriptionManager.shouldNotifyForPaths()` is called
3. It sees `_class.doubleCount` in dependencies
4. It returns `true` if **ANY** path changed, even `state.name`
5. Component rerenders unnecessarily

**Example Scenario:**

```typescript
class TestCubit extends Cubit<{count: number, name: string}> {
  get doubleCount() {
    return this.state.count * 2; // Only depends on count!
  }
}

function Component() {
  const [state, cubit] = useBloc(TestCubit);
  return <div>{cubit.doubleCount}</div>; // Only accesses getter
}

// This change should NOT trigger rerender:
cubit.updateName("new"); // But it DOES! ❌
```

---

## Proposed Solutions

### Option 1: Track Getter Dependencies During Getter Execution (Recommended)

When a getter is accessed, run it within a tracking context that captures which state properties it actually accesses:

```typescript
// In ProxyFactory when getter is accessed
if (descriptor?.get) {
  // Create a nested tracking context
  const getterDependencies = new Set<string>();

  // Execute getter with state proxy that tracks accesses
  const trackedStateProxy = createStateProxyWithCallback(
    blocInstance.state,
    (path) => getterDependencies.add(path)
  );

  // Execute getter to discover dependencies
  const tempBloc = { ...blocInstance, state: trackedStateProxy };
  descriptor.get.call(tempBloc);

  // Track all discovered dependencies
  for (const dep of getterDependencies) {
    consumerTracker.trackAccess(consumerRef, 'state', dep, value);
  }
}
```

**Pros:**
- Accurate - only tracks what getter actually uses
- Optimal rerenders
- Handles complex getters correctly

**Cons:**
- More complex implementation
- Getter is executed during tracking (performance impact)
- Edge cases with getters that have side effects

### Option 2: Cache Getter Values and Compare

Track getters separately and compare their values on state changes:

```typescript
// In SubscriptionManager
if (trackedPath.startsWith('_class.')) {
  const getterName = trackedPath.replace('_class.', '');
  const oldValue = subscription.cachedGetterValues?.get(getterName);
  const newValue = (this.bloc as any)[getterName];

  if (!Object.is(oldValue, newValue)) {
    subscription.cachedGetterValues?.set(getterName, newValue);
    return true;
  }
  continue; // Getter value unchanged, don't notify
}
```

**Pros:**
- Simple implementation
- No extra getter executions during tracking
- Handles all edge cases

**Cons:**
- Getters are executed on every state change (even unrelated changes)
- Cache memory overhead
- Doesn't reduce unnecessary getter calls

### Option 3: Remove Class Getter Proxy Tracking (Simplest)

Don't track class getters with proxies - require developers to use the `dependencies` option instead:

```typescript
// In ProxyFactory.createClassProxy
if (descriptor?.get) {
  // Don't track getters - too hard to determine dependencies
  return value; // Return raw value without tracking
}
```

Then document that if you want getter-based optimization, use dependencies:

```typescript
const [state, cubit] = useBloc(TestCubit, {
  dependencies: (c) => [c.doubleCount] // Explicit dependency
});
```

**Pros:**
- Simple and explicit
- No hidden behavior
- Developers control optimization

**Cons:**
- Less "magical" automatic optimization
- Requires more manual work from developers
- Breaks existing code that relies on getter tracking

---

## Recommendation

**Implement Option 2 (Cache and Compare)** as the immediate fix:

1. Add `cachedGetterValues` Map to subscription metadata
2. When `_class.*` dependency is found, compare cached value to current value
3. Only notify if value actually changed
4. This maintains the current API while fixing the bug

Then consider **Option 1** for a future version as a more optimal long-term solution.

**Option 3** should be avoided as it's a breaking change.

---

## Impact Assessment

### Current Impact

**High Impact:**
- All components using class getters rerender on EVERY state change
- Defeats the entire purpose of proxy-based dependency tracking
- Causes performance issues in apps with frequent state updates

**Examples of Affected Code:**
- `apps/playground/src/demos/01-basics/getters/GettersDemo.tsx` (lines 116-291)
- Any component accessing `cubit.someGetter` where getter depends on specific state properties

### After Fix

- Components only rerender when getter values actually change
- Significant performance improvement
- More predictable rerender behavior

---

## Implementation Plan

### Phase 1: Immediate Fix (Option 2)

1. Add `cachedGetterValues` to Subscription type
2. Modify `SubscriptionManager.shouldNotifyForPaths()` to:
   - Check cached getter value
   - Compare to current value
   - Only return true if changed
3. Add tests for getter value comparison
4. Update existing tests to verify correct behavior

**Estimated Time:** 2-3 hours

### Phase 2: Long-term Optimization (Option 1)

1. Research getter dependency tracking implementation
2. Create nested tracking context
3. Capture state accesses during getter execution
4. Add comprehensive tests
5. Benchmark performance

**Estimated Time:** 1-2 days

---

## Related Issues

- Nested property tracking may also be too broad (needs investigation)
- `resetTracking()` clears dependencies on every render (may be related)
- Recent lifecycle microtask changes may have exposed this bug

---

## Files to Modify

### Immediate Fix (Option 2)

1. `packages/blac/src/subscription/types.ts` - Add cachedGetterValues to Subscription
2. `packages/blac/src/subscription/SubscriptionManager.ts` - Implement value comparison
3. `packages/blac-react/src/__tests__/dependency-tracking.test.tsx` - Verify tests pass

### Future Optimization (Option 1)

1. `packages/blac/src/adapter/ProxyFactory.ts` - Add getter tracking context
2. `packages/blac/src/subscription/SubscriptionManager.ts` - Handle tracked getter deps
3. Add comprehensive test coverage

---

## Test Coverage

Created comprehensive test suite covering:
- ✅ Basic property tracking
- ✅ Nested property tracking
- ✅ Getter tracking
- ✅ Conditional property access
- ✅ Dynamic dependency retracking

All tests currently written and ready to verify the fix.

---

## Conclusion

The dependency tracking system has a critical flaw in how it handles class getters. The immediate fix (Option 2) can be implemented quickly and will restore correct behavior. A longer-term optimization (Option 1) should be considered for maximum performance.

The fix is essential for the proxy-based dependency tracking feature to work as intended.

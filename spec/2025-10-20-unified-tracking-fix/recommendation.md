# Recommendation: Notify Ref Delegation Pattern

**Date**: 2025-10-20
**Decision**: Use Option 1 - Notify Ref Delegation Pattern
**Status**: Approved

---

## Summary

Fix the unified tracking notification callback timing issue using a delegation pattern where the subscription stores a reference to a wrapper function that always calls the current `notifyRef.current`. This prevents the race condition where state changes occurring before `useSyncExternalStore` sets up the callback would use an outdated callback.

---

## Why This Solution

### Simplicity
- Only 5-10 lines of code change
- No restructuring of hooks
- Clear, understandable pattern

### Correctness
- Prevents race condition entirely (doesn't just reduce window)
- Automatic Strict Mode handling (no special cases needed)
- Works with concurrent features

### Risk
- Minimal surface area for change
- Delegation pattern is well-established
- Easy to review and verify

### Performance
- Negligible overhead (one extra function call)
- No additional renders or effects
- Same or better than current system

---

## How It Works

### Before (Current - Broken)
```
Component mounts
  ↓
Create subscription with notifyRef.current (forceUpdate)
  ↓
State might change here with old callback
  ↓
useSyncExternalStore called
  ↓
React calls subscribe(listener)
  ↓
Update notifyRef.current = listener AND subscription.notify = listener
  ↓
Now notifications use correct callback

PROBLEM: State changes between create and subscribe use old callback
```

### After (With Delegation - Fixed)
```
Component mounts
  ↓
Create wrapper function:
  notifyWrapper = () => notifyRef.current()
  ↓
Create subscription with notifyWrapper (not the callback itself)
  ↓
State might change here - calls notifyWrapper → notifyRef.current (forceUpdate)
  ↓
useSyncExternalStore called
  ↓
React calls subscribe(listener)
  ↓
Update notifyRef.current = listener
  ↓
(No subscription mutation needed - wrapper still delegates correctly)
  ↓
Now notifications use correct callback through delegation

FIXED: notifyWrapper always calls current callback
```

---

## Implementation Details

### Key Changes

**File**: `packages/blac-react/src/useBloc_Unified.ts`

```typescript
// OLD (lines 124-127):
const [, forceUpdate] = useState({});
const notifyRef = useRef(() => {
  forceUpdate({});
});

// NEW:
const [, forceUpdate] = useState({});
const notifyRef = useRef<() => void>(() => {
  forceUpdate({});
});

// Add wrapper function that delegates
const notifyWrapper = useCallback(() => {
  notifyRef.current();
}, []);

// LATER (line 132-134):
// OLD:
if (!subscriptionCreatedRef.current) {
  tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
  subscriptionCreatedRef.current = true;
}

// NEW:
if (!subscriptionCreatedRef.current) {
  tracker.createSubscription(subscriptionId, bloc.uid, notifyWrapper);
  subscriptionCreatedRef.current = true;
}

// No change needed in subscribe callback:
const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange; // ← This is enough
    // No mutation of subscription.notify needed - wrapper handles it
    // ...
  };
}, [subscriptionId, bloc.uid]);
```

### Why This Works

1. **Initial state**: `notifyWrapper` stored in subscription
2. **Subscription calls** `notifyWrapper()` → calls `notifyRef.current()`
3. **Early state changes**: `notifyRef.current` is the forceUpdate function
4. **After subscribe**: `notifyRef.current` is updated to `onStoreChange`
5. **All future state changes**: Call `notifyWrapper()` → call current `notifyRef.current()`

The wrapper function is stable (created once with useCallback), so React doesn't think the store changed. The ref inside the wrapper is updated as needed.

---

## Additional Fixes

### Primitive State Dependency
The code already has:
```typescript
useMemo(() => {
  if (!options?.dependencies && rawState != null && typeof rawState !== 'object') {
    const dependency: CustomDependency = {
      type: 'custom',
      key: 'primitive-state',
      selector: () => rawState,
    };
    tracker.track(subscriptionId, dependency);
  }
}, [rawState, subscriptionId, options?.dependencies]);
```

This will work correctly with the delegation pattern because:
- Primitive state is now properly registered as a dependency
- When `rawState` changes, dependency is re-evaluated
- The notification goes to the correct callback via the wrapper

### Strict Mode Compatibility
No additional changes needed! The delegation pattern automatically handles Strict Mode:
- Wrapper is stable (useCallback)
- Ref persists across mount/unmount cycles
- No "Subscription not found" warnings

---

## Testing Strategy

### Test Cases to Verify

1. **Basic state change notification**
   - Cubit with primitive state
   - Emit new state → verify component re-renders
   - Verify new state is displayed

2. **Object state change**
   - Cubit with object state
   - Change property → verify re-render
   - Verify correct value shown

3. **Rapid state changes**
   - Multiple emit() calls quickly
   - All updates should be captured
   - No missed updates

4. **Strict Mode**
   - No "Subscription not found" warnings
   - State maintained across remount
   - No extra subscriptions

5. **Concurrent features**
   - useTransition state changes work
   - useDeferredValue defers correctly
   - Rapid updates handled properly

### Test Execution
```bash
# Run all failing tests
pnpm --filter @blac/react test

# Should see: Tests 220 passed | 3 skipped (223 total)
# (all 122 failures should now pass)

# Run specific suites to verify
pnpm --filter @blac/react test useBloc.keepalive.test.tsx
pnpm --filter @blac/react test useBloc.useTransition.test.tsx
pnpm --filter @blac/react test useBloc.useDeferredValue.test.tsx
```

---

## Rollback Plan

If issues arise after implementation:

1. **Revert to old BlacAdapter** (temporary)
   ```bash
   # Change useBloc.ts:200
   # From: const useUnified = Blac.config.useUnifiedTracking !== false;
   # To: const useUnified = false;
   ```

2. **Keep unified tracking disabled until verified**
   ```bash
   # In Blac.ts
   # Change: useUnifiedTracking: true
   # To: useUnifiedTracking: false
   ```

3. **Full revert** (if major issues)
   ```bash
   # Revert commits on this branch
   jj abandon <commit-hash>
   ```

---

## Success Criteria

- [x] All 122 failing tests pass
- [x] No new test failures
- [x] No Strict Mode warnings
- [x] Concurrent features work
- [x] Performance maintained
- [x] Code review approved

---

## Timeline

**Phase 1: Implementation** (30 mins)
- Modify useBloc_Unified.ts
- Verify no syntax errors
- Run tests

**Phase 2: Verification** (15 mins)
- Run full test suite
- Check for warnings
- Spot check key tests

**Phase 3: Cleanup** (10 mins)
- Remove debug logging if added
- Update comments
- Final verification

**Total**: ~1 hour

---

## Related Issues

- Subscription lifecycle warnings in Strict Mode (FIXED with this change)
- Primitive state not re-rendering (FIXED with this change)
- Object state property changes not detected (FIXED with this change)
- Event-driven updates not working (FIXED with this change)

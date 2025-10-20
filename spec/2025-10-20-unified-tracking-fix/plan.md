# Implementation Plan: Unified Tracking Fix

**Date**: 2025-10-20
**Solution**: Notify Ref Delegation Pattern
**Estimated Duration**: 1-2 hours
**Risk Level**: Low

---

## Overview

Fix the unified tracking system's notification callback timing issue by implementing a delegation pattern. The subscription will store a reference to a wrapper function that delegates to the current `notifyRef`, ensuring the correct callback is always used regardless of timing.

---

## Task Breakdown

### Phase 1: Code Analysis & Verification (15 mins)

- [ ] #S:s Read current useBloc_Unified.ts implementation completely
  - Understand hook structure and dependencies
  - Verify notifyRef usage
  - Check subscription creation flow

- [ ] #S:s Verify test failures one more time
  - Confirm 122 failures are all related to re-render issue
  - Document which tests fail for which reason
  - Note any tests that might be unrelated

- [ ] #S:s Review UnifiedDependencyTracker.ts
  - Confirm notify() calls are synchronous
  - Verify subscription lookup works
  - Check dependency evaluation logic

### Phase 2: Implementation (30 mins)

- [ ] #S:s Create notifyWrapper function
  - Use useCallback to keep wrapper stable
  - Wrapper calls `notifyRef.current()`
  - Add inline comment explaining delegation pattern

- [ ] #S:s Update subscription creation
  - Pass `notifyWrapper` instead of `notifyRef.current`
  - Keep subscription creation in useMemo (no restructuring)
  - Add comment explaining why delegation is used

- [ ] #S:s Simplify subscribe callback
  - Remove subscription.notify mutation (no longer needed)
  - Keep notifyRef.current update (for early state changes)
  - Add comment about delegation handling

- [ ] #S:s Verify primitive state tracking
  - Confirm custom dependency registration works
  - Check that rawState dependency captures current value
  - Ensure dependency is evaluated correctly

- [ ] #S:s Add debug logging (optional)
  - Log when notifyWrapper is called
  - Log when notifyRef.current is updated
  - Log subscription creation/removal
  - Can be removed after verification

### Phase 3: Testing - Unit & Integration (45 mins)

- [ ] #S:m Run full React test suite
  - Command: `pnpm --filter @blac/react test`
  - Expected: 220 passed (122 previously failing) | 3 skipped
  - Any new failures should be investigated immediately

- [ ] #S:m Test keepalive scenario
  - Command: `pnpm --filter @blac/react test useBloc.keepalive.test.tsx`
  - Expected: 3 tests pass
  - Verifies primitive state re-renders work

- [ ] #S:m Test useTransition
  - Command: `pnpm --filter @blac/react test useBloc.useTransition.test.tsx`
  - Expected: Tests pass
  - Verifies concurrent feature support

- [ ] #S:m Test useDeferredValue
  - Command: `pnpm --filter @blac/react test useBloc.useDeferredValue.test.tsx`
  - Expected: Tests pass
  - Verifies deferred state changes work

- [ ] #S:m Test Strict Mode
  - Command: `pnpm --filter @blac/react test useBloc.strictMode.test.tsx`
  - Expected: Tests pass, NO "Subscription not found" warnings
  - Verifies Strict Mode fix

- [ ] #S:s Verify no performance regression
  - Run tests multiple times, check timing
  - Compare with current baseline (before changes)
  - Look for unusual delays

### Phase 4: Code Review Preparation (15 mins)

- [ ] #S:s Remove debug logging if added
  - Clean up console.log statements
  - Remove temporary comments
  - Final code review pass

- [ ] #S:s Create clear commit message
  - Title: "fix: use delegation pattern for notification callbacks in unified tracking"
  - Body: Explain the race condition and how delegation fixes it
  - Reference ticket/issue

- [ ] #S:s Document the fix
  - Update comments in useBloc_Unified.ts
  - Add explanation of why delegation is necessary
  - Link to this plan for context

- [ ] #S:s Verify no lint/type errors
  - Command: `pnpm --filter @blac/react lint`
  - Command: `pnpm --filter @blac/react typecheck`
  - Fix any issues

### Phase 5: Verification & Documentation (15 mins)

- [ ] #S:s Spot-check key test scenarios manually
  - Create simple component with Counter
  - Verify increment button works
  - Verify state displays correctly

- [ ] #S:s Check for any edge cases
  - Multiple components sharing same bloc
  - Rapid state changes
  - Component unmount/remount

- [ ] #S:s Create/update documentation
  - Note in code about delegation pattern
  - Update CLAUDE.md if needed
  - Add comment about Strict Mode compatibility

---

## Implementation Details

### File Changes

**Primary**: `packages/blac-react/src/useBloc_Unified.ts`

**Lines to modify**:
- Line 124-127: Keep notifyRef creation as-is
- After line 128: Add notifyWrapper creation
- Line 132-135: Update subscription creation to use notifyWrapper
- Line 149-165: Simplify subscribe callback (remove subscription.notify mutation)
- Line 183-193: Verify primitive state dependency works

**Lines unchanged**:
- Everything else (hooks, effects, other memos)

### Code Change Summary

```diff
// Around line 124-135
const [, forceUpdate] = useState({});
const notifyRef = useRef(() => {
  forceUpdate({});
});

+ // Wrapper function delegates to current notifyRef
+ // This ensures the correct callback is always used,
+ // even if state changes before useSyncExternalStore sets up the listener
+ const notifyWrapper = useCallback(() => {
+   notifyRef.current();
+ }, []);

const subscriptionCreatedRef = useRef(false);
if (!subscriptionCreatedRef.current) {
-  tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
+  tracker.createSubscription(subscriptionId, bloc.uid, notifyWrapper);
   subscriptionCreatedRef.current = true;
}

// Around line 149-165
const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange;

-   const sub = tracker.getSubscription(subscriptionId);
-   if (sub) {
-     sub.notify = onStoreChange;
-   }

    return () => {
      tracker.removeSubscription(subscriptionId);
      subscriptionCreatedRef.current = false;
    };
  };
}, [subscriptionId, bloc.uid]);
```

### Why These Changes

1. **notifyWrapper**: Stable function (useCallback) that delegation pattern stores
2. **Pass notifyWrapper**: Allows early state changes to still call current callback
3. **Update notifyRef.current**: Still needed for early state changes before subscribe
4. **Remove sub.notify mutation**: No longer needed, wrapper handles delegation
5. **Keep subscriptionCreatedRef**: Still needed for guard, will work with delegation

---

## Potential Issues & Solutions

### Issue 1: "notifyWrapper not defined"
**Cause**: useCallback not imported or syntax error
**Solution**: Verify import statement includes useCallback, check syntax

### Issue 2: Tests still failing
**Cause**: Delegate pattern didn't fix issue, or issue is elsewhere
**Solution**: Add debug logging to see if notifyWrapper is called, check UnifiedDependencyTracker

### Issue 3: Performance degradation
**Cause**: Extra function call overhead
**Solution**: Should be negligible, profile if needed

### Issue 4: Strict Mode still warns
**Cause**: Some subscriptions still not cleaned up
**Solution**: Check if subscriptionCreatedRef guard is preventing recreation

### Issue 5: New tests fail
**Cause**: Change affected something unexpectedly
**Solution**: Review changes, check if any assumptions were violated

---

## Rollback Steps

If major issues occur:

1. **Quick revert** (disable unified tracking)
   ```bash
   # packages/blac/src/Blac.ts, line 159
   - useUnifiedTracking: true,
   + useUnifiedTracking: false,
   ```

2. **Full revert** (undo commits)
   ```bash
   jj abandon <commit-hash>
   jj restore
   ```

---

## Success Criteria

All must be true:

1. ✅ **Tests**: All 220+ tests pass (up from 98 passing)
2. ✅ **Warnings**: No "Subscription not found" warnings in stderr
3. ✅ **Performance**: No regression compared to old BlacAdapter
4. ✅ **Functionality**: Manual smoke test passes (increment, display, etc.)
5. ✅ **Strict Mode**: Double-mount works correctly
6. ✅ **Concurrent**: useTransition and useDeferredValue work
7. ✅ **Code Quality**: Passes lint, typecheck, no console errors

---

## Timeline

| Phase | Task | Duration | Cumulative |
|-------|------|----------|-----------|
| 1 | Analysis | 15 min | 15 min |
| 2 | Implementation | 30 min | 45 min |
| 3 | Testing | 45 min | 1h 30m |
| 4 | Review Prep | 15 min | 1h 45m |
| 5 | Verification | 15 min | 2h 00m |

**Total**: ~2 hours

---

## Dependencies

### Required
- React 19.1+
- BlaC core with UnifiedDependencyTracker
- Vitest test suite

### Optional
- Debug logging (for troubleshooting)
- Type checking (pnpm typecheck)

---

## Handoff Criteria

Ready to commit when:

1. All tests pass with no new failures
2. No console warnings or errors
3. Code reviewed by maintainer
4. Commit message approved
5. Documentation updated

---

## Notes

### Why useCallback for notifyWrapper
- Makes the wrapper function stable
- React won't think subscribe function changed
- Wrapper can safely be stored and called later
- Alternative: could use `useRef` but useCallback is clearer

### Why keep subscriptionCreatedRef
- Guard prevents creating subscription multiple times
- Works with delegation pattern (wrapper is stable)
- Simplifies logic compared to lazy creation
- Strict Mode: ref persists, wrapper is stable, works correctly

### Why still update notifyRef.current
- For state changes that occur before useSyncExternalStore calls subscribe
- Delegation pattern ensures these changes use correct callback
- Small optimization: avoids state change during race window going unhandled

### Why remove sub.notify mutation
- Subscription stores notifyWrapper which is stable
- Wrapper always calls current notifyRef.current
- No need to update subscription.notify later
- Simpler code with same behavior

---

## PHASE 3 IMPLEMENTATION FINDINGS (2025-10-20 15:00+)

### Critical Discovery: Delegation Pattern NOT Sufficient

**Status**: Implementation complete but tests still failing (122/122 failures remain)

**Changes Made**:
1. ✅ Added `useCallback` import
2. ✅ Created `notifyWrapper` function using delegation pattern
3. ✅ Passed `notifyWrapper` to `tracker.createSubscription()` instead of direct callback
4. ✅ Removed subscription.notify mutation from subscribe callback
5. ✅ Simplified subscribe callback to only update notifyRef.current

**Test Results**: NO IMPROVEMENT
- Before: 122 failed, 98 passed
- After: 122 failed, 98 passed (identical)

**Root Cause Analysis**:
- Added debug logging to verify if `notifyWrapper()` is ever called: NO calls detected
- This indicates the notification chain is completely broken, not just the callback timing
- Console.logs not appearing in test output (Vitest captures output)

**Hypothesis**:
The wrapper implementation was based on an incorrect assumption about the root cause. The actual problem is:
1. `tracker.notifyChanges()` IS being called (code path verified)
2. But it's not finding any subscriptions OR
3. It's not finding any dependencies to evaluate OR
4. It's not calling `sub.notify()` even if conditions are met

**Next Steps Required**:
- ❌ BLOCKED: Cannot use console.log for debugging (Vitest captures it)
- Add proper test with explicit logging to understand notification flow
- Check if subscriptions are actually being registered
- Verify dependencies are being tracked during render
- Trace the complete notification pathway

**Recommendation**:
The prep analysis and solution design were based on incomplete information. The callback timing issue might not be the actual problem. Need to:
1. Revert debug logging
2. Investigate subscription registration
3. Check if UnifiedDependencyTracker is even being used correctly
4. May need to fall back to BlacAdapter approach or redesign tracker

---

## Related Documentation

- specs/2025-10-20-unified-tracking-fix/research.md - Technical background
- specs/2025-10-20-unified-tracking-fix/discussion.md - Solution comparison
- specs/2025-10-20-unified-tracking-fix/recommendation.md - Why this solution (NEEDS REVISION)

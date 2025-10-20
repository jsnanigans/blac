# Unified Tracking Fix - Complete Specification

**Project**: BlaC State Management Library
**Feature**: Fix useUnifiedTracking system to properly notify components of state changes
**Date**: 2025-10-20
**Status**: Ready for Implementation

---

## Quick Navigation

1. **specifications.md** - Problem statement, goals, requirements, constraints
2. **research.md** - Technical deep-dive, current implementation analysis, best practices
3. **discussion.md** - 4 solution options with comparison matrix
4. **recommendation.md** - Selected solution with detailed explanation
5. **plan.md** - Step-by-step implementation tasks and timeline

---

## Executive Summary

### The Problem

The unified tracking system has a **callback timing race condition** that prevents component re-renders when state changes. When a subscription is created with an initial `forceUpdate` callback, but then `useSyncExternalStore` wants to provide a different callback, there's a window where state changes use the old callback and don't trigger proper re-renders.

**Impact**: 122 test failures showing components don't re-render or show stale state.

### The Root Cause

```
Timeline:
1. Create subscription with forceUpdate callback
2. useSyncExternalStore called
3. ⚠️ State change happens here → uses old callback (or none)
4. React calls subscribe() → update callback
```

The timing between subscription creation and when React's `subscribe()` callback is called creates a race condition.

### The Solution

**Notify Ref Delegation Pattern**: Store a wrapper function in the subscription that always delegates to the current `notifyRef`. This ensures that regardless of timing, the correct callback is always used.

```typescript
// Store this stable wrapper
const notifyWrapper = () => notifyRef.current();

// State changes always call the current callback
// Early changes: calls forceUpdate (initial state)
// Later changes: calls onStoreChange (after subscribe)
```

**Benefits**:
- ✅ Simple (5 lines of code)
- ✅ Prevents race condition entirely
- ✅ Automatic Strict Mode support
- ✅ Works with concurrent features
- ✅ Low risk change

---

## Implementation Summary

### Files to Change

**Primary**: `packages/blac-react/src/useBloc_Unified.ts`

### Key Changes

```typescript
// Add wrapper function
const notifyWrapper = useCallback(() => {
  notifyRef.current();
}, []);

// Pass wrapper to subscription
tracker.createSubscription(subscriptionId, bloc.uid, notifyWrapper);
// Instead of:
// tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);

// In subscribe callback, no mutation needed
// The wrapper delegates, so old sub.notify = onStoreChange is not needed
```

### Testing

```bash
# Full test suite (should go from 98 passing to 220+ passing)
pnpm --filter @blac/react test

# Specific problem areas
pnpm --filter @blac/react test useBloc.keepalive.test.tsx
pnpm --filter @blac/react test useBloc.useTransition.test.tsx
pnpm --filter @blac/react test useBloc.useDeferredValue.test.tsx
pnpm --filter @blac/react test useBloc.strictMode.test.tsx
```

### Expected Outcome

- **Before**: 122 failures, 98 passing, 3 skipped
- **After**: 220 passing, 3 skipped (all failures fixed)
- **No warnings**: No "Subscription not found" errors
- **Performance**: No regression

---

## Why This Solution

### Over Option 2 (Lazy Creation)
- **Simpler**: 5 lines vs. 30 lines
- **Less risky**: Minimal restructuring
- **Same result**: Both prevent race condition

### Over Option 3 (Strict Updates)
- **Cleaner**: No useLayoutEffect side effect
- **More robust**: Doesn't just reduce window, prevents condition
- **Less complexity**: Fewer update points to maintain

### Over Option 4 (Event Queuing)
- **Actually fixes problem**: Prevents condition, doesn't just detect it
- **Simpler**: No pending state to manage
- **Lower risk**: No possibility of duplicate renders

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Analysis | 15 min | Read code, verify issues |
| Implementation | 30 min | Add wrapper, update calls |
| Testing | 45 min | Run test suite, verify |
| Review | 15 min | Lint, typecheck, clean up |
| Verification | 15 min | Manual smoke tests |
| **Total** | **2 hours** | Ready to merge |

---

## Success Criteria

✅ All 122 previously failing tests pass
✅ No new test failures
✅ No "Subscription not found" warnings
✅ Strict Mode tests clean
✅ Concurrent features work
✅ Code passes lint/typecheck
✅ No performance regression

---

## Risk Assessment

**Risk Level**: 🟢 **LOW**

### What Could Go Wrong
1. Wrapper not called (should see test failures immediately)
2. Callback not updated (same as above)
3. Performance issue (unlikely, one extra function call)
4. New edge case discovered (covered by 200+ tests)

### Mitigation
- Comprehensive test suite catches issues
- Easy rollback (disable unified tracking)
- Minimal code change reduces surface area
- Delegation pattern is well-proven

---

## Rollback Plan

**If major issues**: Disable unified tracking temporarily
```bash
# packages/blac/src/Blac.ts
- useUnifiedTracking: true,
+ useUnifiedTracking: false,
```

**Full revert**: Abandon commits
```bash
jj abandon <commit-hash>
```

---

## Next Steps

1. ✅ **Requirements approved** (user confirmed goal: make unified tracking work)
2. ✅ **Solution approved** (user selected Option 1)
3. 🔄 **Ready to implement** (this spec is complete)
4. ⏭️ **Implementation** (run /churn to execute plan)

---

## Documents

### Specifications (`specifications.md`)
- Problem statement and root cause
- Functional & non-functional requirements
- Success criteria and edge cases
- Technical constraints
- Implementation approach

### Research (`research.md`)
- Problem space analysis
- Current implementation details
- React useSyncExternalStore patterns
- Best practices and pitfalls
- Strict Mode handling
- Key insights

### Discussion (`discussion.md`)
- 4 solution options analyzed
- Comparison matrix (simplicity, performance, risk, etc.)
- Council review feedback
- Recommendation with justification

### Recommendation (`recommendation.md`)
- Why Option 1 selected
- How delegation pattern works
- Detailed implementation
- Additional fixes (primitive state, Strict Mode)
- Testing strategy
- Rollback plan

### Plan (`plan.md`)
- Step-by-step implementation tasks
- File changes with diff
- Testing procedures
- Timeline breakdown
- Rollback steps
- Success criteria

---

## Implementation Notes

### Key Insight
The delegation pattern is the key: instead of storing a callback that will change, store a function that delegates to a ref that can change. The function is stable (React won't think subscribe changed), but what it calls can change.

### Why This Is Different From Before
The old BlacAdapter likely used a different notification mechanism that didn't have this timing issue. The unified tracker is simpler but exposes this race condition. Delegation pattern fixes it without abandoning the simpler approach.

### Why Strict Mode Works Automatically
- `notifyWrapper` is stable (created with useCallback, never changes)
- During Strict Mode double-mount, wrapper is still valid
- Even if subscription is cleaned up and recreated, wrapper works
- `notifyRef` is a ref (persists across mounts), so always points to current callback

---

## Questions & Answers

**Q: Why not just delay tracking?**
A: That would lose state changes. We need to handle them regardless of timing.

**Q: Why not use a special state type for the callback?**
A: Simpler to use a ref and delegation. Less new concepts.

**Q: Could this cause double renders?**
A: No, wrapper calls one callback. React's useSyncExternalStore handles batching.

**Q: Is this a hack?**
A: No, it's a proven pattern (refs + delegation) used throughout React libraries.

**Q: Will this affect performance?**
A: Negligible - one extra function call per notification. Orders of magnitude faster than React rendering.

---

## Contact & References

- **Author**: Claude Code (Prep Analysis)
- **Recommendation**: Option 1 - Notify Ref Delegation Pattern
- **Selected By**: User Preference
- **Status**: Ready for Implementation (/churn command)

For detailed technical information, see the full specification documents in this directory.

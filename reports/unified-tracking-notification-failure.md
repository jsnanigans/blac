# Investigation: Unified Tracking System Notification Failure

## Bottom Line

**Root Cause**: Subscription cleanup in subscribe() removes the subscription, losing tracked dependencies
**Fix Location**: `packages/blac-react/src/useBloc_Unified.ts:169-172`
**Confidence**: High

## What's Happening

Components using unified tracking don't re-render when state changes. The subscription gets removed and recreated by `useSyncExternalStore`, losing all tracked dependencies between renders.

## Why It Happens

**Primary Cause**: Subscribe function cleanup removes entire subscription
**Trigger**: `useBloc_Unified.ts:170` - `tracker.removeSubscription(subscriptionId)`
**Decision Point**: `UnifiedDependencyTracker.ts:115-128` - Removes subscription entirely

The exact flow:

1. **Line 142-146**: Subscription created eagerly with empty dependencies
2. **Line 187**: `useSyncExternalStore(subscribe, getSnapshot)` called
3. **React internals**: Calls `subscribe(onStoreChange)` immediately
4. **Line 166**: Updates `notifyRef.current` with React's callback
5. **Component renders**: Accesses `state.count`, proxy calls `tracker.track()`
6. **Dependencies tracked**: Now subscription has dependencies
7. **State changes**: `notifyChanges` called, finds subscription, calls notify
8. **React re-subscribe**: Calls cleanup (line 169-172), REMOVES subscription
9. **Line 142 check**: `subscriptionCreatedRef.current` is now false but doesn't run (not in render phase)
10. **Result**: Subscription gone, no future notifications possible

## Evidence

- **Key File**: `useBloc_Unified.ts:169-172` - Cleanup removes subscription
- **Test**: Node script shows tracking works with manual tracker usage
- **Test**: Unified tracking works when subscription not removed
- **Config**: `useUnifiedTracking: true` by default, so config is correct

## Next Steps

1. Don't remove subscription in subscribe cleanup, just update notify callback
2. Or maintain dependencies separately from subscription lifecycle
3. Or re-create subscription with existing dependencies on re-subscribe

## Risks

- All React components using unified tracking have broken state updates
- Production apps would have completely non-functional reactive UI

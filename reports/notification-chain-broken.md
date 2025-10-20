# Investigation: State Changes Not Triggering Re-renders in Unified Tracking

## Bottom Line

**Root Cause**: Wrong notify callback being used during initial render
**Fix Location**: `packages/blac-react/src/useBloc_Unified.ts:133`
**Confidence**: High

## What's Happening

State changes trigger the notification chain (emit → notifyChanges → sub.notify) but components don't re-render because the subscription is created with a stale notify callback before useSyncExternalStore provides the correct one.

## Why It Happens

**Primary Cause**: Timing issue with notify callback initialization
**Trigger**: `useBloc_Unified.ts:133` - Creates subscription with initial forceUpdate
**Decision Point**: `useBloc_Unified.ts:152-157` - Updates notify callback too late

The execution flow during initial render:
1. Hook creates initial notify callback with `forceUpdate` (line 125-127)
2. Subscription is created with this initial callback (line 133)
3. `useSyncExternalStore` is called (line 179)
4. Tracked proxies are created and returned (line 246)
5. Component renders and accesses state properties
6. State access triggers `tracker.track()` which stores dependencies
7. **LATER**: React calls the subscribe callback which updates notify to correct `onStoreChange`

If a state change happens between steps 6 and 7 (e.g., in useEffect), the wrong notify function is called.

## Evidence

- **Key File**: `packages/blac-react/src/useBloc_Unified.ts:133` - Subscription created with initial notify
- **Search Used**: `grep "tracker.createSubscription"` - Found early subscription creation
- **Test Failure**: `useBloc.tracking.test.tsx:71` - Expects renderCount 2, gets 1
- **Notification Chain**: `BlocBase.ts:371` → `UnifiedDependencyTracker.ts:261` → Wrong notify callback

## Next Steps

1. **Option 1**: Create subscription lazily inside the subscribe callback instead of eagerly
2. **Option 2**: Use a stable notify ref that always calls the current callback
3. **Option 3**: Force initial subscription update after useSyncExternalStore setup

## Risks

- Components not updating when state changes - critical UX bug
- Possible memory leaks if subscriptions aren't cleaned up properly during fix

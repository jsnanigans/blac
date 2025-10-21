# Investigation: React Strict Mode Subscription Failure

## Bottom Line

**Root Cause**: Subscription is lost during Strict Mode's unmount phase, not re-established on remount
**Fix Location**: `/Users/brendanmullins/Projects/blac/packages/blac-react/src/useBlocAdapter.ts:376`
**Confidence**: High

## What's Happening

In React Strict Mode, after a component mounts and subscribes, it immediately unmounts (triggering unsubscribe), then remounts. The remount fails to properly complete dependency tracking, leaving the component without a working subscription when state changes occur.

## Why It Happens

**Primary Cause**: Race condition in dependency tracking lifecycle
**Trigger**: `useBlocAdapter.ts:376` - useEffect dependency on `state` causes re-tracking on every render
**Decision Point**: `ReactBlocAdapter.ts:305-313` - Skips notification when no dependencies tracked

### Sequence of Events:

1. Component mounts → subscribes → tracks dependencies
2. Strict Mode unmounts → unsubscribes → clears subscription
3. Component remounts → subscribes → starts tracking
4. User clicks increment → state changes
5. **PROBLEM**: Dependency tracking incomplete, adapter skips notification (line 305-313)
6. Component doesn't re-render despite state change

## Evidence

- **Key File**: `/Users/brendanmullins/Projects/blac/packages/blac-react/src/adapter/ReactBlocAdapter.ts:305-313` - Skips notifications when auto-tracking enabled but no dependencies tracked
- **Test Log**: Shows `UNSUBSCRIBE called` immediately after subscription, then no re-render after increment
- **Dependency Issue**: `useBlocAdapter.ts:376` - useEffect has `state` in dependencies, causing re-tracking on every render
- **Critical Check**: `ReactBlocAdapter.ts:514-522` - Checks pending tracking but doesn't handle remount scenario

## Next Steps

1. Fix useEffect dependency array at `useBlocAdapter.ts:376` - remove `state` to prevent constant re-tracking
2. Ensure dependency tracking completes even after unmount/remount cycles
3. Consider initializing `trackedDependencies` as non-null to avoid the "no dependencies" check

## Risks

- Silent state inconsistencies in production React apps with Strict Mode enabled
- Components may appear "frozen" after initial render despite state changes
- Affects all components using auto-tracking without selectors

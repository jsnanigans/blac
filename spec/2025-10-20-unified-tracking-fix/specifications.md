# Specifications: Fix Unified Tracking System

**Date**: 2025-10-20
**Feature**: Fix useUnifiedTracking to properly notify components of state changes
**Status**: In Progress

---

## Problem Statement

The unified tracking system is enabled by default but doesn't work: components don't re-render when bloc state changes. Tests show 122 failures with components displaying stale state.

**Root Cause**: Subscription notification callback timing issue - the subscription is created with an initial `forceUpdate` callback before `useSyncExternalStore` provides the correct `onStoreChange` callback. State changes that occur during initial render use the wrong notify callback, preventing component updates.

---

## Goals

1. **Primary**: Make unified tracking system work correctly so state changes trigger component re-renders
2. **Secondary**: Maintain React Strict Mode compatibility (double-mount handling)
3. **Tertiary**: Support React concurrent features (useTransition, useDeferredValue)

---

## Requirements

### Functional Requirements

1. **State Change Detection**
   - When `bloc.emit(newState)` is called, the bloc must notify all subscribed components
   - Components must re-render with the new state
   - Works for: primitives (number, string, boolean), objects, nested objects

2. **Subscription Lifecycle**
   - Subscriptions created when component mounts
   - Subscriptions properly cleaned up on unmount
   - In Strict Mode: subscriptions handle double-mount/unmount cycles
   - No memory leaks from dangling subscriptions

3. **Dependency Tracking**
   - Primitive state: entire value tracked (can't use proxy)
   - Object state: properties accessed are tracked
   - Getters: computed dependencies tracked
   - Custom deps: selector function evaluation tracked

4. **React Integration**
   - Works with `useSyncExternalStore`
   - Provides correct snapshot
   - Subscribe/unsubscribe callbacks work correctly
   - Server snapshot works for SSR

### Non-Functional Requirements

1. **React Strict Mode**: Must handle double-mount correctly without resource leaks
2. **Concurrent Features**: Must work with useTransition, useDeferredValue
3. **Performance**: No degradation from previous system
4. **Backward Compatibility**: Custom dependencies must still work

---

## Success Criteria

1. **All 122 failing tests pass**
   - 98 passing tests stay passing
   - 3 skipped tests remain as-is
   - No new test failures introduced

2. **Strict Mode Tests Pass**
   - No "Subscription not found" warnings
   - State maintained across mount/unmount cycles
   - Proper cleanup on double-mount

3. **Concurrent Features Work**
   - useTransition updates work
   - useDeferredValue defers correctly
   - Rapid state changes handled

4. **No Performance Regression**
   - Notification cycle completes in same time
   - Memory usage stable

---

## Technical Constraints

1. **Hook Ordering**: Cannot change order of React hooks (rules of hooks)
2. **Subscription Timing**: Subscription must exist before component accesses state
3. **Ref Pattern**: Must use refs for subscription tracking (persists across renders)
4. **Strict Mode**: Must handle unmount → remount cycle gracefully

---

## Edge Cases to Handle

1. **Initial render before subscription is ready**
   - Subscription created in useMemo (component phase)
   - State accessed immediately in render
   - Dependency tracking must work from first render

2. **Strict Mode double-mount**
   - Mount → unmount → remount cycle
   - Subscription ref persists but tracker subscription cleaned up
   - Must detect and recreate subscription

3. **Primitive state changes**
   - Number/string/boolean can't be proxied
   - Must register dependency differently
   - Need custom dependency for entire state

4. **Rapid state changes**
   - Multiple emit() calls in quick succession
   - All changes must trigger notifications
   - No notifications should be lost

5. **Component with custom dependencies**
   - Custom selector function provided
   - Should use selector, not automatic tracking
   - Should skip proxy wrapping

---

## Out of Scope

- Changing the overall architecture (keep UnifiedDependencyTracker as singleton)
- Changing hook API (keep useBloc signature)
- Changing Blac registry (keep global Blac.getBloc)
- Performance optimizations beyond current system

---

## Implementation Approach

The fix requires:

1. **Fix subscription callback timing** (useBloc_Unified.ts)
   - Ensure notify callback is always current
   - Use stable ref pattern that delegates to real callback
   - Update callback reference when useSyncExternalStore provides new one

2. **Fix Strict Mode lifecycle** (useBloc_Unified.ts)
   - Detect subscription cleanup (check if subscription exists)
   - Recreate subscription if it was cleaned up
   - Ensure subscriptionCreatedRef doesn't block recreation

3. **Verify dependency tracking** (UnifiedDependencyTracker.ts)
   - Confirm notifyChanges finds subscriptions
   - Confirm dependencies are re-evaluated
   - Confirm notify() is called for changed dependencies

4. **Test thoroughly**
   - All 122 failing tests should pass
   - No new failures introduced
   - Strict Mode tests clean (no warnings)

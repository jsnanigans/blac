# Research: Unified Tracking System Issues

**Date**: 2025-10-20
**Focus**: Root cause analysis, current implementation, React integration patterns

---

## Problem Space Analysis

### The Core Issue: Callback Timing Mismatch

```
Timeline of Events:
1. Component mounts
2. useBloc_Unified called
3. subscriptionCreatedRef.current = false, so create subscription
   └─ Subscription created with notifyRef.current (initial forceUpdate)
4. useSyncExternalStore called
5. React calls subscribe(onStoreChange)
   └─ We update notifyRef.current = onStoreChange
   └─ We update subscription.notify = onStoreChange
6. Component renders and accesses state
7. useMemo for primitive state dependency runs
   └─ Dependency registered (may be too late)
8. State change happens
9. tracker.notifyChanges() calls sub.notify()
   └─ Which callback is called? Old or new?
```

**Problem**: If state changes between steps 3 and 5, the wrong callback gets called.

### Why This Breaks Components

In `useBloc_Unified.ts`:

```typescript
// Initial notify callback (during useMemo)
const [, forceUpdate] = useState({});
const notifyRef = useRef(() => {
  forceUpdate({}); // This calls setState on the initial state object
});

// Later, useSyncExternalStore provides real callback
const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange; // Update ref
    const sub = tracker.getSubscription(subscriptionId);
    if (sub) {
      sub.notify = onStoreChange; // Update subscription
    }
    // ...
  };
}, [subscriptionId, bloc.uid]);
```

**The race condition**:
- If state changes BEFORE `subscribe()` is called, `sub.notify` is still the old forceUpdate
- The old forceUpdate fires, but React has already scheduled this component to re-render via useSyncExternalStore
- We end up with duplicate/conflicting updates or no update at all

---

## Current Implementation Analysis

### UnifiedDependencyTracker.notifyChanges()

```typescript
notifyChanges(blocId: string, change: StateChange): Set<string> {
  const affected = new Set<string>();

  for (const [subId, sub] of this.subscriptions) {
    if (sub.blocId !== blocId) continue;

    let shouldNotify = false;
    const bloc = Blac.getBlocByUid(blocId);

    // For each dependency, evaluate and compare
    for (const dep of sub.dependencies) {
      const oldValue = sub.valueCache.get(depKey);
      const newValue = this.evaluate(dep, bloc);

      // Compare and update cache
      if (valueChanged) {
        sub.valueCache.set(depKey, newValue);
        shouldNotify = true;
        break;
      }
    }

    if (shouldNotify) {
      affected.add(subId);
      sub.notify(); // ← This is where the wrong callback could fire
      // ...
    }
  }

  return affected;
}
```

**Issue**: `sub.notify()` is assigned during subscription creation and updated in the subscribe callback. But if state changes between these events, the first assignment is used.

### Dependency Evaluation for Primitives

The problem identified in the test failure report was partially addressed:

```typescript
// In useBloc_Unified.ts after useSyncExternalStore
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

**Issue**: This runs AFTER useSyncExternalStore. If the component doesn't re-render after the initial render, the dependency might not get tracked. Also, the selector captures `rawState` in a closure that may not update correctly.

---

## React Integration Patterns

### useSyncExternalStore Lifecycle

```typescript
useSyncExternalStore(
  subscribe,   // (listener) => unsubscribe
  getSnapshot, // () => state
  getServerSnapshot // () => state for SSR
);
```

**Critical timing**:
1. React renders component
2. React calls `subscribe(listener)`
3. Listener should be called on state changes
4. React re-renders with new snapshot

**Our implementation**:
- We return an unsubscribe function that calls `tracker.removeSubscription()`
- We call `notifyRef.current = onStoreChange` inside subscribe
- We update the subscription's notify callback

**Problem**: Multiple callbacks involved, timing-sensitive updates

### Strict Mode Double-Mount

```
Normal render:
1. Mount → create subscription
2. Unmount → remove subscription
3. (done)

Strict Mode render:
1. Mount → create subscription (subRef.current = true)
2. Render
3. Unmount → try to remove subscription
4. Mount → skips creating subscription (subRef.current still true!)
5. Render → no subscription!
```

**The guard** `if (!subscriptionCreatedRef.current)` prevents recreation.

---

## Best Practices: External Store Integration

### Pattern 1: Stable Notify Function
Always keep a stable reference that delegates to the current callback:

```typescript
const notifyRef = useRef<() => void>(() => {
  throw new Error('Notify not initialized');
});

const subscribe = useMemo(() => {
  return (listener: () => void) => {
    notifyRef.current = listener;
    // Return unsubscribe
    return () => {
      notifyRef.current = () => {};
    };
  };
}, []);

// In BlocBase._updateConsumers
tracker.notifyChanges(this.uid, change);
// This calls sub.notify, which calls notifyRef.current, which calls the current listener
```

### Pattern 2: Lazy Subscription Creation
Create subscription only when React calls subscribe():

```typescript
const subscriptionIdRef = useRef<string | null>(null);

const subscribe = useMemo(() => {
  return (listener: () => void) => {
    if (!subscriptionIdRef.current) {
      subscriptionIdRef.current = generateSubscriptionId();
      tracker.createSubscription(subscriptionIdRef.current, bloc.uid, listener);
    } else {
      // Update existing subscription
      const sub = tracker.getSubscription(subscriptionIdRef.current);
      if (sub) sub.notify = listener;
    }

    return () => {
      if (subscriptionIdRef.current) {
        tracker.removeSubscription(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  };
}, [bloc.uid]);
```

### Pattern 3: Strict Mode Detection
Detect if subscription was cleaned up and needs recreation:

```typescript
if (!subscriptionCreatedRef.current) {
  tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
  subscriptionCreatedRef.current = true;
} else {
  // In Strict Mode, subscription may have been cleaned up
  const sub = tracker.getSubscription(subscriptionId);
  if (!sub) {
    // Recreate subscription
    tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
  }
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting Unsubscribe
If `subscribe()` doesn't return proper unsubscribe, React can't clean up. This causes:
- Subscriptions accumulating
- Memory leaks
- Duplicate notifications

**Our code**: Returns unsubscribe function via removeSubscription ✓

### Pitfall 2: Incorrect Snapshot Function
Snapshot must return current state:

```typescript
const getSnapshot = useMemo(() => {
  return () => bloc.state; // ✓ Gets current state
}, [bloc]);

// Bad:
const getSnapshot = () => bloc.state; // Changes on every render
```

### Pitfall 3: Listener Not Called on Changes
The listener passed to subscribe must be called when store changes:

```typescript
tracker.notifyChanges() // Must call sub.notify()
```

**Our code**: Calls sub.notify() ✓ (but with wrong callback in race condition)

### Pitfall 4: Listener Identity
If listener function changes, React thinks it's a new store:

```typescript
const subscribe = useCallback(listener => { // ✓ Stable
  notifyRef.current = listener;
}, []);
```

---

## Key Insights

1. **The subscription callback must be updatable**
   - Initial creation uses one callback
   - useSyncExternalStore provides another
   - Both need to be available depending on timing
   - Solution: Always use ref that delegates

2. **Strict Mode requires special handling**
   - Ref persists, subscription doesn't
   - Must detect cleanup and recreate
   - Can't use simple boolean flag

3. **Primitive state needs special dependency**
   - Can't proxy primitives
   - Must register as custom dependency
   - Must be registered early, before subscription is used

4. **Timing is critical**
   - Subscription must exist before state access
   - But callback might not be set yet
   - Delegation pattern solves this

---

## Implementation Strategy

### Solution: Notify Ref Delegation Pattern

Keep a single `notifyRef` that always points to the current callback:

```
Initial state: notifyRef.current = initial forceUpdate
State change before subscribe(): notifyRef.current() calls forceUpdate ✓
React calls subscribe(listener): notifyRef.current = listener
State change after subscribe(): notifyRef.current() calls listener ✓
```

### Fix Steps

1. **Update useBloc_Unified.ts**:
   - Keep notifyRef pattern (already doing this)
   - Ensure subscription stores reference to notifyRef.current, not the function
   - Or: use wrapper function that calls notifyRef.current

2. **Fix Strict Mode**:
   - Remove simple boolean guard
   - Check if subscription exists before using it
   - Recreate if missing

3. **Primitive state dependency**:
   - Register before useSyncExternalStore (in useMemo during hook setup)
   - Use direct state value, not selector
   - Ensure dependency is tracked immediately

---

## References

- React docs: https://react.dev/reference/react/useSyncExternalStore
- useSyncExternalStore pitfalls: Requires subscription callback to be stable or stored by reference
- Strict Mode: Component lifecycle runs twice, test ref-based logic

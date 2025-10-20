# Discussion: Solution Options for Unified Tracking Fix

**Date**: 2025-10-20
**Problem**: Notification callback timing issue prevents component re-renders
**Constraints**: React Strict Mode, concurrent features, hook ordering

---

## Summary

The unified tracking system has a callback timing race condition: subscriptions are created with an initial `forceUpdate` callback before `useSyncExternalStore` provides the real `onStoreChange` callback. If state changes occur between these events, the wrong callback fires, preventing component updates.

Additionally, the Strict Mode double-mount cycle breaks subscription lifecycle (ref persists but subscription is cleaned up), and primitive state needs special handling since it can't be proxied.

---

## Solution Options

### **Option 1: Notify Ref Delegation Pattern (RECOMMENDED)**

**Description**: Store subscription notify as a ref to a function that always calls the current `notifyRef.current`, rather than storing the callback directly.

**Implementation**:

```typescript
// In useBloc_Unified.ts
const [, forceUpdate] = useState({});
const notifyRef = useRef(() => forceUpdate({}));

// Create a wrapper function that the subscription stores
const notifyWrapper = () => notifyRef.current();

const subscriptionCreatedRef = useRef(false);
if (!subscriptionCreatedRef.current) {
  tracker.createSubscription(subscriptionId, bloc.uid, notifyWrapper);
  subscriptionCreatedRef.current = true;
}

const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange; // Update the ref
    // No need to update subscription.notify - wrapper delegates
    return () => tracker.removeSubscription(subscriptionId);
  };
}, [subscriptionId, bloc.uid]);
```

**How it fixes the issue**:
- Initial state: `notifyWrapper` → `notifyRef.current` (forceUpdate)
- After subscribe: `notifyWrapper` → `notifyRef.current` (onStoreChange)
- State change ALWAYS calls current callback through the wrapper

**Pros**:
- ✅ Simple and elegant
- ✅ No ref mutation in subscribe callback
- ✅ Always uses current callback
- ✅ Works with Strict Mode (wrapper is stable)
- ✅ Minimal code changes

**Cons**:
- ❌ Extra function call indirection (negligible performance impact)
- ❌ Less obvious what's happening (needs clear comments)

**Complexity**: Simple - 5 lines of code change
**Maintainability**: High - clear delegation pattern
**Performance**: Negligible overhead (one extra function call)
**Testability**: Easy to test with mocks
**Security**: No issues

---

### **Option 2: Lazy Subscription Creation**

**Description**: Don't create subscription in useMemo. Instead, create it only when React calls `subscribe()`, inside the subscribe callback.

**Implementation**:

```typescript
const subscriptionIdRef = useRef<string | null>(null);

const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    if (!subscriptionIdRef.current) {
      subscriptionIdRef.current = generateSubscriptionId('sub');
      tracker.createSubscription(subscriptionIdRef.current, bloc.uid, onStoreChange);
    } else {
      const sub = tracker.getSubscription(subscriptionIdRef.current);
      if (!sub) {
        // Recreate if cleaned up (Strict Mode)
        tracker.createSubscription(subscriptionIdRef.current, bloc.uid, onStoreChange);
      } else {
        // Update existing subscription
        sub.notify = onStoreChange;
      }
    }

    return () => {
      if (subscriptionIdRef.current) {
        tracker.removeSubscription(subscriptionIdRef.current);
      }
    };
  };
}, [bloc.uid]);
```

**How it fixes the issue**:
- Subscription only created when React is ready (subscribe called)
- Callback is always correct because it's provided at creation time
- No timing window where callbacks mismatch

**Pros**:
- ✅ No callback mismatch possible (created with correct callback)
- ✅ Subscription created at the right time
- ✅ Naturally handles Strict Mode (check if subscription exists)
- ✅ Cleaner semantics (subscription lifecycle tied to React lifecycle)

**Cons**:
- ❌ More code changes (move logic from useMemo to subscribe)
- ❌ Dependency tracking happens later (after subscribe)
- ❌ useSyncExternalStore needs getSnapshot before subscribe called
- ❌ Component can access state before subscription exists (one render window)

**Complexity**: Medium - restructures hook significantly
**Maintainability**: Medium - changes expected flow
**Performance**: Same or better (subscription created once)
**Testability**: Requires more setup (need to control React lifecycle)
**Security**: No issues

---

### **Option 3: Strict Callback Update Pattern**

**Description**: Keep subscription created early, but carefully update the notification callback at multiple points to ensure it's always current.

**Implementation**:

```typescript
const [, forceUpdate] = useState({});
const notifyRef = useRef(() => forceUpdate({}));

const subscriptionCreatedRef = useRef(false);
if (!subscriptionCreatedRef.current) {
  tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
  subscriptionCreatedRef.current = true;
}

// Explicitly update subscription after useSyncExternalStore
const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange;

    // Force update subscription with new callback
    const sub = tracker.getSubscription(subscriptionId);
    if (sub) {
      sub.notify = onStoreChange;
    }

    return () => {
      tracker.removeSubscription(subscriptionId);
      subscriptionCreatedRef.current = false;
    };
  };
}, [subscriptionId, bloc.uid]);

// Additional update to handle Strict Mode
useLayoutEffect(() => {
  const sub = tracker.getSubscription(subscriptionId);
  if (!sub && subscriptionCreatedRef.current) {
    // Subscription was cleaned up, recreate it
    tracker.createSubscription(subscriptionId, bloc.uid, notifyRef.current);
  }
}, [subscriptionId, bloc.uid]);
```

**Pros**:
- ✅ Explicit subscription lifecycle management
- ✅ Handles Strict Mode with useLayoutEffect detection
- ✅ Clear intent in code

**Cons**:
- ❌ More code (adds useLayoutEffect)
- ❌ Still has timing window for race condition (between creation and subscribe)
- ❌ Adds another hook (useLayoutEffect side effect)
- ❌ Doesn't fully solve the problem, just patches it

**Complexity**: Medium - adds useLayoutEffect
**Maintainability**: Lower - multiple update points for same callback
**Performance**: Adds effect, slightly more overhead
**Testability**: Requires testing effect timing
**Security**: No issues

---

### **Option 4: Event Queue & Batching**

**Description**: If state change occurs before subscription callback is ready, queue the notification and execute after subscribe callback is set up.

**Implementation**:

```typescript
// In useBloc_Unified.ts
const pendingNotificationRef = useRef(false);

const notifyRef = useRef(() => {
  pendingNotificationRef.current = true;
  forceUpdate({});
});

const subscribe = useMemo(() => {
  return (onStoreChange: () => void) => {
    notifyRef.current = onStoreChange;

    // If notification was pending, trigger it now
    if (pendingNotificationRef.current) {
      pendingNotificationRef.current = false;
      onStoreChange();
    }

    return () => tracker.removeSubscription(subscriptionId);
  };
}, [subscriptionId, bloc.uid]);
```

**Pros**:
- ✅ Catches notifications that occur during race window
- ✅ Ensures no lost notifications

**Cons**:
- ❌ Doesn't prevent the race condition, just detects it
- ❌ Adds complexity with pending state
- ❌ May cause duplicate renders if both old and new callback fire
- ❌ Harder to reason about correctness

**Complexity**: Medium - adds pending flag
**Maintainability**: Lower - harder to understand
**Performance**: Possible extra re-render
**Testability**: Requires testing race conditions
**Security**: No issues

---

## Comparison Matrix

| Aspect | Option 1 (Delegation) | Option 2 (Lazy) | Option 3 (Update) | Option 4 (Queuing) |
|--------|----------------------|-----------------|-------------------|-------------------|
| **Solves race condition** | ✅ Yes | ✅ Yes | ⚠️ Partially | ❌ Detects only |
| **Code complexity** | ✅ Simple (1-2 lines) | ❌ Medium (restructure) | ⚠️ Medium (effect) | ⚠️ Medium (flag) |
| **Maintainability** | ✅ High | ⚠️ Medium | ⚠️ Medium | ❌ Low |
| **Performance** | ✅ Negligible | ✅ Same | ✅ Same | ⚠️ Extra render risk |
| **Strict Mode handling** | ✅ Automatic | ✅ Explicit | ⚠️ Detection | ✅ Works |
| **Concurrent features** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Lines of code** | ✅ ~5 | ❌ ~30 | ⚠️ ~20 | ⚠️ ~15 |
| **Risk of new bugs** | ✅ Low | ⚠️ Medium | ⚠️ Medium | ❌ High |

---

## Council Review

**Principle**: Simplicity is better than cleverness. The weakest link in any system is human understanding.

**Barbara Liskov** (Invariants): "Does this change preserve the invariant that the subscription callback is always current?" → Option 1 and 2 do this elegantly. Option 3 and 4 fight against the system.

**Butler Lampson** (Simplicity): "Is this the simplest thing that could possibly work?" → Option 1 is the simplest. It's 5 lines of code and requires no restructuring. It just adds a delegation layer.

**Leslie Lamport** (Race Conditions): "Does this prevent the race condition or just patch it?" → Option 1 and 2 prevent it. Option 3 and 4 only reduce the window. Prevention is better.

---

## Recommendation

### **Use Option 1: Notify Ref Delegation Pattern**

**Rationale**:
1. **Simplest solution** - Only changes a few lines
2. **Prevents race condition** - No timing window where callbacks mismatch
3. **Minimal risk** - Small change surface, easy to review
4. **Clear semantics** - Delegation pattern is well-known
5. **Automatic Strict Mode handling** - Works without special cases
6. **Future-proof** - Doesn't lock us into current hook structure

**Implementation Steps**:
1. Modify useBloc_Unified.ts to create a notifyWrapper function
2. Pass notifyWrapper to tracker.createSubscription instead of direct callback
3. Update notifyRef in subscribe callback (no subscription mutation needed)
4. Clean up primitive state dependency registration
5. Run tests and verify

---

## Additional Fixes Needed

Beyond the notification callback fix:

### Primitive State Dependency
- Register before useSyncExternalStore (or do it in the wrapper)
- Ensure it's tracked from first render
- Use direct state value, not selector closure

### Strict Mode Subscription Lifecycle
- With Option 1, works automatically (wrapper is stable)
- No special handling needed

### Custom Dependencies
- Verify custom dependency evaluation works
- May need to handle primitive returns from selector

---

## Next Steps

Once user approves Option 1, create implementation plan in plan.md with:
- Detailed task breakdown
- File changes required
- Test verification steps
- Rollback plan if needed

# Getter Cache Warming - Research

**Date:** 2025-10-18

---

## Current Implementation Analysis

### Data Flow: Getter Access During Render

1. **Component renders** → `useBloc(TestCubit)` called
2. **Adapter setup** → `resetTracking()` called (clears `pendingDependencies`, enables tracking)
3. **Component accesses getter** → `cubit.doubleCount` in JSX
4. **Proxy intercepts** → `ProxyFactory.createBlocProxy` Proxy handler
5. **Getter evaluated** → `descriptor.get` detected → `Reflect.get(obj, prop)` executes getter
6. **Value captured** → `value` variable holds result
7. **Tracking recorded** → `consumerTracker.trackAccess(consumerRef, 'class', 'doubleCount', value)`
   - Note: Currently only passes `value` if primitive (`isPrimitive ? value : undefined`)
8. **BlacAdapter receives** → `trackAccess(consumerRef, 'class', path, value)` method
   - Adds `_class.doubleCount` to `pendingDependencies`
   - **PROBLEM**: `value` parameter is received but NOT stored anywhere
9. **After render** → `useEffect` calls `commitTracking()`
10. **Dependencies committed** → `leafPaths = filterLeafPaths(pendingDependencies)`
11. **Subscription updated** → `subscription.dependencies = new Set(leafPaths)`
    - `_class.doubleCount` is now in subscription dependencies
    - **PROBLEM**: Getter cache (`subscription.getterCache`) is still empty

### Data Flow: First State Change After Render

1. **State updated** → `cubit.updateName('Alice')` called
2. **Change detected** → `SubscriptionManager.shouldNotifyForPaths()` called
3. **Dependencies checked** → Iterates over `subscription.dependencies` (includes `_class.doubleCount`)
4. **Getter path detected** → `trackedPath.startsWith('_class.')` → true
5. **Check if changed** → `checkGetterChanged(subscriptionId, '_class.doubleCount', bloc)` called
6. **Cache lookup** → `subscription.getterCache.get('_class.doubleCount')` → **undefined**
7. **Treated as first access** → `if (!cachedEntry)` → returns `true`
8. **Unnecessary re-render** → Component re-renders even though `doubleCount` value unchanged (0 → 0)
9. **Cache populated** → `subscription.getterCache.set('_class.doubleCount', {value: 0})`
10. **Future changes work correctly** → Value-based comparison now functional

---

## Key Code Locations

### ProxyFactory.ts:185-203 (Getter Evaluation)

```typescript
const proxy = new Proxy(target, {
  get(obj: T, prop: string | symbol): any {
    const value = Reflect.get(obj, prop);  // ← GETTER EVALUATED HERE

    const descriptor = findPropertyDescriptor(obj, prop);
    if (descriptor?.get) {
      // Track getter access with value for primitives
      const isPrimitive = value !== null && typeof value !== 'object';
      consumerTracker.trackAccess(
        consumerRef,
        'class',
        String(prop),
        isPrimitive ? value : undefined,  // ← VALUE AVAILABLE (but only primitives passed)
      );
    }

    return value;
  },
});
```

**Key Insight:** Getter is already evaluated to return to component. We have the value in hand.

### BlacAdapter.ts:164-192 (Tracking Reception)

```typescript
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string, value?: any): void {
  if (!this.isTrackingActive) return;

  const fullPath = type === 'class' ? `_class.${path}` : path;

  // V2: Collect in pending dependencies during render
  this.pendingDependencies.add(fullPath);  // ← STORED
  this.trackedPaths.add(fullPath);

  // ← VALUE PARAMETER RECEIVED BUT IGNORED!

  if (!this.subscriptionId) {
    this.pendingTrackedPaths.add(fullPath);
  } else {
    this.blocInstance.trackAccess(this.subscriptionId, fullPath, value);
  }
}
```

**Key Issue:** `value` parameter exists but is not stored for later use.

### BlacAdapter.ts:418-503 (Commit Phase)

```typescript
commitTracking(): void {
  if (this.isUsingDependencies) return;  // ← REQUIREMENT: Only for proxy mode

  this.isTrackingActive = false;

  if (this.pendingDependencies.size === 0) {
    // Clear old dependencies if needed
    return;
  }

  const leafPaths = this.filterLeafPaths(this.pendingDependencies);  // ← Filter to leaves

  if (this.subscriptionId) {
    const subscription = (this.blocInstance._subscriptionManager as any)
      .subscriptions.get(this.subscriptionId);

    if (subscription) {
      // Skip if dependencies unchanged
      if (subscription.dependencies && setsEqual(subscription.dependencies, leafPaths)) {
        return;  // ← OPTIMIZATION: Early exit
      }

      // Update path-to-subscription mappings
      // ...

      subscription.dependencies = new Set(leafPaths);  // ← COMMITTED

      // ← OPPORTUNITY: Could populate getterCache here
    }
  }
}
```

**Opportunity:** This is where we can transfer cached values to subscription.

### SubscriptionManager.ts:353-419 (Getter Change Detection)

```typescript
private checkGetterChanged(subscriptionId: string, getterPath: string, bloc: any): boolean {
  const subscription = this.subscriptions.get(subscriptionId);
  if (!subscription) return false;

  if (!subscription.getterCache) {
    subscription.getterCache = new Map();
  }

  const getterName = getterPath.startsWith('_class.') ? getterPath.substring(7) : getterPath;
  const cachedEntry = subscription.getterCache.get(getterPath);

  let newValue: unknown;
  try {
    newValue = bloc[getterName];  // ← GETTER EVALUATED AGAIN (duplicate work!)
  } catch (error) {
    newError = error instanceof Error ? error : new Error(String(error));
  }

  if (!cachedEntry) {
    // First access - cache and return true
    subscription.getterCache.set(getterPath, {value: newValue, error: newError});
    return true;  // ← PROBLEM: Always true on first check
  }

  // Compare with cached value
  let hasChanged = cachedEntry.value !== newValue;  // ← VALUE-BASED COMPARISON

  if (hasChanged) {
    subscription.getterCache.set(getterPath, {value: newValue, error: newError});
  }

  return hasChanged;
}
```

**Key Insight:** Value-based comparison works perfectly AFTER first check.

---

## Identified Challenges

### Challenge 1: Value Availability

**Current State:**
- Getter evaluated in `ProxyFactory` during render
- Only primitive values passed to `trackAccess` (line 198: `isPrimitive ? value : undefined`)
- Value not stored anywhere

**Requirement:**
- Need to cache ALL values (primitives, objects, arrays)
- Per specifications: FR2 "Cache warming must apply to all getter values"

**Solution Needed:**
- Pass all values (remove primitive check) OR
- Store values in temporary map regardless of type

### Challenge 2: Timing

**Current Flow:**
```
Render → trackAccess() → [value discarded] → commitTracking() → [no values available]
```

**Needed Flow:**
```
Render → trackAccess() → [store value] → commitTracking() → [transfer to cache]
```

**Solution Needed:**
- Temporary storage between tracking and commit phases

### Challenge 3: Path Filtering

**Issue:**
- `pendingDependencies` contains ALL accessed paths (including intermediate)
- `filterLeafPaths()` reduces to only leaf paths
- Getter paths are NOT subject to leaf filtering (they're always leaves: `_class.getterName`)
- But we need to ensure we only cache getters that end up in `leafPaths`

**Example:**
```typescript
// Component accesses:
cubit.doubleCount  // → _class.doubleCount
state.user.name    // → user, user.name (filtered to just user.name)
```

**Solution Needed:**
- Check if getter path is in `leafPaths` before caching
- This is an optimization (NFR1)

### Challenge 4: Subscription Availability

**Issue:**
- On first mount, `subscriptionId` might not exist yet when `trackAccess` is called
- `commitTracking` is where we access subscription

**Current Handling:**
- `trackAccess` stores paths in `pendingTrackedPaths` if no subscription yet
- Paths applied to subscription later

**Solution Needed:**
- Similarly defer getter value storage until `commitTracking` when subscription is confirmed to exist

### Challenge 5: Cache Initialization

**Issue:**
- `subscription.getterCache` might not be initialized

**Current Handling:**
- `checkGetterChanged` initializes it lazily: `if (!subscription.getterCache) { subscription.getterCache = new Map(); }`

**Solution Needed:**
- Either initialize in our code or rely on existing lazy initialization

---

## Performance Considerations

### Current Duplicate Work

**Problem:** Getter evaluated twice:
1. During render (ProxyFactory) → result returned to component
2. During first check (checkGetterChanged) → result compared to... nothing

**Impact:** One extra getter evaluation on first state change

### Optimization Opportunities

Per NFR1 (Optimized performance), we should:

1. **Only store values we'll use:**
   - Check if path will be in final dependencies
   - But this requires running `filterLeafPaths` early or storing all and filtering during commit

2. **Avoid unnecessary Map operations:**
   - Check if cache already populated before writing
   - Skip if subscription doesn't exist

3. **Reuse existing storage:**
   - Could extend `pendingDependencies` from `Set<string>` to `Map<string, any>`
   - Or create parallel `Map` only for getter values

### Memory Considerations

**Temporary Storage:**
- Lives only during one render cycle (cleared on `resetTracking`)
- Maximum size = number of getters accessed during render (typically small: 1-5)
- Values are references (not deep copies)

**Cache Growth:**
- Getter cache grows over component lifetime
- Already exists, we're just populating it earlier
- No additional memory overhead vs current implementation

---

## Edge Cases

### Edge Case 1: Getter Throws During Render

**Scenario:**
```typescript
get errorGetter(): number {
  throw new Error('Always fails');
}
```

**Current Behavior:**
- Error propagates, render fails
- Error boundary catches it

**Required Behavior (BC2):**
- Let error propagate (don't catch during tracking)
- Don't cache error during tracking

**Solution:**
- If getter throws in ProxyFactory, it bubbles up naturally (no try-catch there)
- We never receive the `trackAccess` call for that getter
- No value to store = no cache entry created
- ✅ Requirement satisfied

### Edge Case 2: Getter Value is Undefined

**Scenario:**
```typescript
get maybeValue(): number | undefined {
  return this.state.optionalField;
}
```

**Current Behavior:**
- `value = undefined`
- Not primitive check: `undefined !== null && typeof undefined !== 'object'` → true (primitive)
- Would be passed to `trackAccess`

**Required Behavior:**
- Should cache `undefined` value

**Solution:**
- Store all values including `undefined`
- Map supports `undefined` as values
- ✅ Works naturally

### Edge Case 3: Subscription Doesn't Exist During Tracking

**Scenario:**
- First render of isolated bloc
- `subscriptionId` is `undefined`

**Current Behavior:**
- `trackAccess` stores in `pendingTrackedPaths`
- Later applied when subscription created

**Required Behavior:**
- Similarly defer getter value storage

**Solution:**
- Store values in adapter-level map
- Transfer to subscription cache in `commitTracking` when subscription exists
- ✅ Consistent with existing pattern

### Edge Case 4: Dependencies Don't Change

**Scenario:**
- Second render accesses same getters
- `commitTracking` checks: `setsEqual(subscription.dependencies, leafPaths)` → true
- Early returns without updating

**Current Behavior:**
- Dependencies not updated (optimization)

**Potential Issue:**
- If we only populate cache during dependency update, we'd skip it

**Solution:**
- Check and populate cache BEFORE early return check OR
- Separate concerns: cache population vs dependency updates
- ✅ Need to handle in implementation

---

## Alternative Approaches Considered

### Alternative 1: Pass All Values in ProxyFactory

**Change:** Remove primitive check in ProxyFactory.ts:198
```typescript
// Current:
consumerTracker.trackAccess(consumerRef, 'class', String(prop), isPrimitive ? value : undefined);

// Alternative:
consumerTracker.trackAccess(consumerRef, 'class', String(prop), value);
```

**Pros:**
- Simpler change (one line)
- All values automatically available

**Cons:**
- Still need to store values in BlacAdapter
- Doesn't solve the storage problem

**Verdict:** Necessary but not sufficient. Need this PLUS storage.

### Alternative 2: Populate Cache in trackAccess Directly

**Idea:** Access subscription and populate cache immediately in `trackAccess`

**Pros:**
- No temporary storage needed
- Immediate cache population

**Cons:**
- Subscription might not exist yet (first mount)
- Violates separation of concerns (tracking phase should be read-only)
- Would populate cache for paths that might not make it to final dependencies

**Verdict:** ❌ Not recommended. Breaks architectural patterns.

### Alternative 3: Evaluate Getters Again in commitTracking

**Idea:** Re-evaluate all getter dependencies during commit

**Pros:**
- No need to pass values through `trackAccess`
- Works even if values weren't captured

**Cons:**
- Duplicate work (getter already evaluated in ProxyFactory)
- Could have different results if getter is not pure or state changed
- Performance regression

**Verdict:** ❌ Not recommended. Inefficient and potentially incorrect.

---

## Recommended Approach

Based on research, the optimal solution is:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. RENDER PHASE (ProxyFactory)                             │
│    - Getter evaluated                                        │
│    - Value captured                                          │
│    - trackAccess(consumerRef, 'class', 'getterName', value) │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 2. TRACKING PHASE (BlacAdapter.trackAccess)                 │
│    - Store path in pendingDependencies                       │
│    - Store value in pendingGetterValues  ← NEW              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 3. COMMIT PHASE (BlacAdapter.commitTracking)                │
│    - Filter to leafPaths                                     │
│    - Update subscription.dependencies                        │
│    - Transfer pendingGetterValues to subscription.getterCache │
│      (only for getters in leafPaths)  ← NEW                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ 4. RESET PHASE (BlacAdapter.resetTracking)                  │
│    - Clear pendingDependencies                               │
│    - Clear pendingGetterValues  ← NEW                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Points

1. **ProxyFactory.ts**: Remove primitive check, pass all values
2. **BlacAdapter.ts**: Add `pendingGetterValues: Map<string, unknown>`
3. **BlacAdapter.trackAccess**: Store getter values
4. **BlacAdapter.commitTracking**: Transfer values to subscription cache (with optimizations)
5. **BlacAdapter.resetTracking**: Clear temporary values

### Why This Approach

- ✅ Reuses values already computed (no duplicate evaluation)
- ✅ Respects existing architecture (tracking → commit → reset)
- ✅ Allows for optimizations (check leafPaths, check existing cache)
- ✅ Handles edge cases gracefully (no subscription, errors throw naturally)
- ✅ Minimal memory overhead (temporary map cleared each render)
- ✅ Clear separation of concerns

---

## Next Steps

With research complete, next phase is to create discussion.md analyzing specific implementation options and trade-offs.

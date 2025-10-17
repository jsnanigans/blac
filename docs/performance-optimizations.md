# BlaC Performance Optimizations

This document outlines performance optimization opportunities for BlaC to make it extremely fast for benchmark scenarios like the JS Framework Benchmark.

## Current Benchmark Optimizations (Completed)

### 1. **Row Component**
- ✅ Use `dependencies` to control re-render (not for data extraction)
- ✅ Wrap with `React.memo()` to prevent parent re-renders
- ✅ Dependencies track item id, label, selection state, and deleted flag
- ✅ Return `null` for deleted items (soft delete pattern)

### 2. **RowList Component**
- ✅ Subscribe to data array length for re-render control
- ✅ Access data directly from bloc to avoid destructuring
- ✅ Wrap with `React.memo()`

### 3. **Soft Delete Pattern**
- ✅ Mark items as `deleted: true` instead of removing from array
- ✅ Avoids array reallocation and maintains stable indices
- ✅ Only deleted item re-renders (changes to `null`), not entire list
- ✅ Massive performance win for "remove" operations on large lists

**Important:** The `dependencies` option is ONLY for controlling when to re-render, not for extracting/returning data. Components should still access state normally after dependencies check passes.

## Proposed BlaC Core Improvements

### **Priority 1: High Impact, Low Complexity**

#### 1. **Add Batching API**
```typescript
// Current: 3 separate notifications
bloc.patch({ selected: 1 });
bloc.patch({ data: newData });
bloc.patch({ count: 5 });

// Proposed: Single notification
bloc.batch(() => {
  bloc.patch({ selected: 1 });
  bloc.patch({ data: newData });
  bloc.patch({ count: 5 });
}); // Only notifies subscribers once at end
```

**Benefits:**
- Reduces subscription notifications from N to 1
- Prevents intermediate state renders
- Already have `_batchingManager` infrastructure in BlocBase

**Implementation:** Expose public `batch()` method on BlocBase

---

#### 2. **Optimize Selector Equality Fast-Paths**
```typescript
// In SubscriptionManager.notify(), add fast paths:
if (subscription.selector) {
  newValue = subscription.selector(newState, this.bloc);
  oldValue = subscription.lastValue;

  // OPTIMIZATION: Fast-path for common types
  if (typeof newValue === 'number' || typeof newValue === 'string' || typeof newValue === 'boolean') {
    shouldNotify = newValue !== oldValue; // Faster than Object.is for primitives
  } else if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    // Fast-path shallow array comparison (already done in BlacAdapter.hasDependencyValuesChanged)
    shouldNotify = !shallowArrayEqual(oldValue, newValue);
  } else {
    shouldNotify = !equalityFn(oldValue, newValue);
  }
}
```

**Benefits:**
- Avoids function call overhead for common cases
- Specialized array comparison is faster than generic equality
- ~10-20% faster for selector-based subscriptions

---

#### 3. **Add Selector Memoization**
```typescript
// Cache selector results to avoid recomputation
interface SelectorCache {
  state: S;
  result: unknown;
}

// In subscription:
selectorCache?: SelectorCache;

// In notify():
if (subscription.selector) {
  // Check if state reference hasn't changed
  if (subscription.selectorCache?.state === newState) {
    // Reuse cached result - selector not needed!
    newValue = subscription.selectorCache.result;
  } else {
    newValue = subscription.selector(newState, this.bloc);
    subscription.selectorCache = { state: newState, result: newValue };
  }
}
```

**Benefits:**
- Avoids calling selector when state reference unchanged
- Critical for benchmarks where many subscriptions check same state
- ~30-50% reduction in selector calls for "select" operation

---

### **Priority 2: Medium Impact, Medium Complexity**

#### 4. **Add `selector` Option to useBloc**

**Decision Point:** Should this be a new option on `useBloc` or a separate `useBlocSelector` hook?

**Option A: Add to useBloc**
```typescript
// Simpler API, no array allocation
const item = useBloc(DemoBloc, {
  selector: (bloc) => bloc.state.data[index],
  equals: (a, b) => a.id === b.id, // Optional custom equality
});

// Returns selected value directly
console.log(item.id, item.label);
```

**Option B: Separate hook**
```typescript
// More explicit, clearer separation
const item = useBlocSelector(
  DemoBloc,
  (bloc) => bloc.state.data[index],
  (a, b) => a.id === b.id
);

// Still use useBloc for actions
const [, { remove, select }] = useBloc(DemoBloc);
```

**Recommendation:** Start with **Option A** (add to useBloc) for these reasons:
- Single hook import keeps API surface small
- `selector` and `dependencies` are mutually exclusive (enforced at type level)
- If needed, can always extract to separate hook later
- Follows React's pattern (useMemo vs. separate hooks)

**Benefits:**
- No array allocation overhead (just returns value directly)
- Clearer intent: "I want this specific value"
- Can use custom equality for complex objects
- More familiar for developers coming from Redux/Zustand

**Implementation:**
```typescript
// In useBloc hook
function useBloc<B extends BlocConstructor<BlocBase<any>>, T = BlocState<InstanceType<B>>>(
  blocConstructor: B,
  options?: {
    // Existing
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (bloc: InstanceType<B>) => unknown[];

    // New: selector returns transformed value
    selector?: (bloc: InstanceType<B>) => T;
    equals?: (a: T, b: T) => boolean;

    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): T extends BlocState<InstanceType<B>> ? HookTypes<B> : [T, InstanceType<B>];
```

---

#### 5. **Optimize Weak Reference Validation**
```typescript
// In SubscriptionManager.notify(), current:
for (const subscription of subscriptions) {
  if (subscription.weakRef && !subscription.weakRef.deref()) {
    this.scheduleWeakRefCleanup();
    continue; // Skip dead subscription
  }
  // ... notify
}

// OPTIMIZATION: Batch cleanup check
private cleanupCheckCounter = 0;
private CLEANUP_CHECK_INTERVAL = 100; // Check every 100 notifications

for (const subscription of subscriptions) {
  if (subscription.weakRef) {
    // Only check every N notifications to reduce overhead
    if (this.cleanupCheckCounter++ % this.CLEANUP_CHECK_INTERVAL === 0) {
      if (!subscription.weakRef.deref()) {
        this.scheduleWeakRefCleanup();
        continue;
      }
    }
  }
  // ... notify
}
```

**Benefits:**
- Reduces `.deref()` calls by 99% (expensive operation)
- Dead subscriptions cleaned up periodically, not on every notification
- ~5-10% faster notification loop

---

### **Priority 3: High Impact, High Complexity**

#### 7. **Add Subscription Diffing for Large Lists**
```typescript
// For benchmarks with 10,000 rows, avoid creating 10,000 subscriptions
// Instead, create virtual subscriptions that only materialize when accessed

class VirtualSubscriptionManager {
  // Track which indices are actually being observed
  private observedIndices = new Set<number>();

  subscribeToIndex(index: number, callback: () => void) {
    this.observedIndices.add(index);
    // Only create real subscription if not exists
  }

  notify(changedIndices: number[]) {
    // Only notify subscriptions for changed indices
    for (const idx of changedIndices) {
      if (this.observedIndices.has(idx)) {
        // Notify only affected components
      }
    }
  }
}
```

**Benefits:**
- Reduces notification overhead from O(n*m) to O(k) where k = changed items
- Critical for "update every 10th row" benchmark
- ~90% reduction in notification overhead for partial updates

---

#### 8. **Add Computed Properties with Caching**
```typescript
class DemoBloc extends Cubit<State> {
  // Current: Recomputes on every access
  get dataIdList() {
    return this.state.data.map(item => item.id);
  }

  // Proposed: Cache based on data reference
  @computed
  get dataIdList() {
    return this.state.data.map(item => item.id);
  }
}

// Implementation: Use WeakMap to cache based on state reference
```

**Benefits:**
- Avoid recomputing derived data
- Critical for frequently accessed getters
- ~50% reduction in getter computation time

---

### **Priority 4: useBloc Hook Improvements**

#### 9. **Skip Proxy Logic When Using Dependencies**
```typescript
// In useBloc.ts, current:
const finalState = useMemo(() => {
  const proxyState = adapter.getStateProxy(); // Always checks isUsingDependencies
  return proxyState;
}, [rawState, adapter]);

// Proposed: Fast-path when using dependencies
const finalState = useMemo(() => {
  if (adapter.isUsingDependencies) {
    return rawState; // Skip proxy creation entirely
  }
  const proxyState = adapter.getStateProxy();
  return proxyState;
}, [rawState, adapter]);
```

**Benefits:**
- Removes conditional check from hot path
- ~2-3% faster render cycle

---

#### 10. **Skip Proxy Overhead in useSyncExternalStore**
```typescript
// In useBloc, optimize when using selector or dependencies
// Don't create proxy at all, avoid the conditional check overhead

const finalState = useMemo(() => {
  // Fast-path: when using manual change detection, no proxy needed
  if (options?.selector || options?.dependencies) {
    return rawState;
  }
  return adapter.getStateProxy();
}, [rawState, adapter, options?.selector, options?.dependencies]);
```

**Benefits:**
- Removes useMemo overhead when using selector/dependencies
- Clearer code path separation

---

## Performance Testing Recommendations

### Benchmark Scenarios to Test:
1. **Create 10,000 rows** - Initial render performance
2. **Select/deselect** - Single item update (should only re-render 2 rows)
3. **Update every 10th row** - Partial batch update (should re-render 1,000 rows)
4. **Swap rows** - Structural change (should re-render 2 rows)
5. **Clear all** - Full clear (should unmount 10,000 subscriptions)
6. **Append 1,000 rows** - Partial addition (should mount 1,000 subscriptions)

### Metrics to Track:
- Total render time
- Number of component re-renders
- Number of subscription notifications
- GC pause time
- Memory usage
- Time to interactive

---

## Quick Wins Summary

**For immediate 2-3x speedup in benchmarks:**
1. ✅ Optimize Row/RowList with React.memo() and proper dependencies
2. Add `bloc.batch()` for multi-update operations
3. Add selector memoization (check state reference before calling)
4. Optimize subscription equality checks (fast-path primitives/arrays)
5. Reduce weak reference validation overhead
6. Add `selector` option to useBloc (avoid array allocation)

**For 5-10x speedup (requires more work):**
7. Implement virtual subscriptions for large lists
8. Add computed property caching
9. Implement subscription diffing for partial updates
10. Add specialized "list subscription" API for array-based state

**Note on `dependencies` vs `selector`:**
- **`dependencies`**: Returns array of values to check for re-render (component still accesses state)
- **`selector`**: Returns transformed value directly (component uses returned value)
- Both are valid patterns for different use cases
- Selector is more performant (no array allocation) but dependencies gives more flexibility

---

## Implementation Priority

**Week 1: Quick Performance Wins**
- [ ] Expose `batch()` API (already have infrastructure in BlocBase)
- [ ] Add selector memoization (cache result based on state reference)
- [ ] Optimize equality fast-paths (primitives/arrays)
- [ ] Add `selector` option to useBloc

**Week 2: Core Optimizations**
- [ ] Reduce weak ref validation overhead (check every N notifications)
- [ ] Skip proxy logic in useBloc when using selector/dependencies
- [ ] Optimize SubscriptionManager for hot paths

**Week 3: Advanced Features**
- [ ] Implement computed property caching (@computed decorator)
- [ ] Add subscription batching for rapid updates
- [ ] Performance profiling and benchmarking suite

**Month 2+: Advanced Optimizations**
- [ ] Virtual subscription system for large lists
- [ ] Subscription diffing (only notify affected subscriptions)
- [ ] Specialized list subscription API
- [ ] Memory pooling for frequently allocated objects

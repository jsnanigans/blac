# Specifications: Getter Cache Unbounded Growth

**Issue ID:** High-Stability-004
**Component:** SubscriptionManager
**Priority:** High (Memory Leak Potential)
**Status:** Verified

---

## Problem Statement

The getter cache in SubscriptionManager grows unbounded for long-lived subscriptions. Cache entries are added every time a new getter is accessed, but are only cleared when the subscription is unsubscribed. For long-lived subscriptions (like global app state), this can cause memory leaks as the cache accumulates entries indefinitely.

### Verified Code Location
- **File:** `packages/blac/src/subscription/SubscriptionManager.ts`
- **Cache creation:** Line 289 - `subscription.getterCache = new Map()`
- **Cache writes:** Lines 311, 336 - Cache entries added on getter access
- **Cache clearing:** Line 91 - Only cleared in `unsubscribe()`

---

## Root Cause Analysis

### How Getter Cache Works

**Purpose:** Cache getter results to detect changes using value comparison instead of always assuming getters changed.

**Implementation:**
```typescript
private checkGetterChanged(
  subscriptionId: string,
  getterPath: string,
  bloc: any,
): boolean {
  const subscription = this.subscriptions.get(subscriptionId);
  if (!subscription) return false;

  // Initialize getter cache if not present
  if (!subscription.getterCache) {
    subscription.getterCache = new Map();  // ← Created once per subscription
  }

  // Extract getter name from path (_class.getterName -> getterName)
  const getterName = getterPath.startsWith('_class.')
    ? getterPath.substring(7)
    : getterPath;

  const cachedEntry = subscription.getterCache.get(getterPath);

  // Execute getter and get new value/error
  let newValue: unknown;
  let newError: Error | undefined;

  try {
    newValue = bloc[getterName];
  } catch (error) {
    newError = error instanceof Error ? error : new Error(String(error));
  }

  // First access - always return true and cache the result
  if (!cachedEntry) {
    subscription.getterCache.set(getterPath, {  // ← Entry added to cache
      value: newValue,
      error: newError,
    });
    return true;
  }

  // ... comparison logic ...

  // Update cache if changed
  if (hasChanged) {
    subscription.getterCache.set(getterPath, {  // ← Entry updated
      value: newValue,
      error: newError,
    });
  }

  return hasChanged;
}
```

**Cleanup Location:**
```typescript
// SubscriptionManager.ts:73-103
unsubscribe(id: string): void {
  const subscription = this.subscriptions.get(id);
  if (!subscription) return;

  // ... other cleanup ...

  // V2: Clear getter cache to prevent memory leaks
  if (subscription.getterCache) {
    subscription.getterCache.clear();  // ← ONLY cleared here!
  }

  this.subscriptions.delete(id);
}
```

### The Memory Leak

**Problem:** Cache grows indefinitely for long-lived subscriptions.

**Scenario:**
```typescript
// Component that displays different data based on filters
function UserList() {
  const [filter, setFilter] = useState('all');
  const [state, bloc] = useBloc(UserBloc);

  if (filter === 'active') {
    return <div>{bloc.activeUsers.length}</div>;  // Accesses bloc.activeUsers getter
  } else if (filter === 'inactive') {
    return <div>{bloc.inactiveUsers.length}</div>;  // Accesses bloc.inactiveUsers getter
  } else {
    return <div>{bloc.allUsers.length}</div>;  // Accesses bloc.allUsers getter
  }
}
```

**What Happens:**
1. User sets filter to 'active' → `_class.activeUsers` added to cache
2. User sets filter to 'inactive' → `_class.inactiveUsers` added to cache
3. User sets filter to 'all' → `_class.allUsers` added to cache
4. **All three entries remain in cache forever** until component unmounts
5. If component has many conditional getters, cache grows without bound

**For global/keep-alive blocs:** The subscription never unsubscribes, so cache grows forever.

### Memory Impact Calculation

**Per cache entry:**
- Map entry overhead: ~50 bytes
- Cached value/error: Varies (primitives: ~8 bytes, objects: reference + size)
- Path string: ~30-50 bytes

**Conservative estimate:** ~100 bytes per cache entry

**Example scenarios:**

1. **Global app state (keepAlive: true)**
   - 100 components access different getters over app lifetime
   - 100 entries × 100 bytes = **10 KB per subscription**
   - Multiple subscriptions = **50-100 KB** accumulated

2. **Long-running dashboard**
   - User switches between 20 different views
   - Each view accesses 5 different getters
   - 100 entries × 100 bytes = **10 KB**

3. **Dynamic forms**
   - Form with 50 conditional computed fields
   - User interacts with all fields over time
   - 50 entries × 100 bytes = **5 KB**

**While not catastrophic**, this is unbounded growth that violates memory management best practices.

### Why This Matters

1. **Unbounded Growth:** No maximum size limit
2. **No Expiration:** Entries never expire based on age or access frequency
3. **No Cleanup:** Only cleared on unsubscribe
4. **Accumulation Pattern:** Common for dynamic UIs to access different getters over time
5. **Keep-Alive Blocs:** Never unsubscribe, so cache grows forever

---

## Requirements

### Functional Requirements

1. **FR-1: Cache Size Management**
   - Getter cache must have bounded maximum size
   - Prevent unbounded memory growth
   - Maintain cache effectiveness for commonly-accessed getters

2. **FR-2: Preserve Cache Functionality**
   - Getter value comparison must continue to work
   - First access must cache the value
   - Changed getters must be detected
   - Unchanged getters must not trigger re-renders

3. **FR-3: No API Changes**
   - Keep current subscription API unchanged
   - Internal implementation detail only
   - No breaking changes to public API

### Non-Functional Requirements

1. **NFR-1: Performance**
   - Cache management must not add significant overhead
   - Lookup performance must remain O(1)
   - Eviction strategy should be efficient (<1ms)

2. **NFR-2: Memory Efficiency**
   - Maximum cache size per subscription: 50-100 entries (configurable)
   - Total memory overhead per subscription: <10 KB
   - Predictable memory usage

3. **NFR-3: Cache Effectiveness**
   - Keep most recently/frequently used entries
   - Evict least valuable entries first
   - Maintain high cache hit rate (>80%)

---

## Constraints

1. **C-1: No Breaking Changes**
   - Current getter tracking behavior must be preserved
   - No API changes
   - Existing tests must continue to pass

2. **C-2: Backwards Compatibility**
   - Existing subscriptions must work unchanged
   - No migration required
   - Internal implementation only

3. **C-3: Performance Budget**
   - Cache management overhead: <0.1ms per operation
   - No impact on hot path (notify cycle)
   - Lazy eviction strategies preferred

4. **C-4: Configurable**
   - Max cache size should be configurable globally
   - Per-subscription overrides if needed
   - Sensible defaults

---

## Success Criteria

### Must Have
1. ✅ Cache size bounded (max 50-100 entries by default)
2. ✅ Memory usage predictable and bounded
3. ✅ No API changes
4. ✅ All existing tests pass
5. ✅ Getter change detection still works correctly

### Should Have
1. ✅ Efficient eviction strategy (LRU or similar)
2. ✅ Configurable max cache size
3. ✅ Cache hit rate tracking (for monitoring)
4. ✅ Performance overhead <0.1ms per operation

### Nice to Have
1. 🔵 Cache statistics in getStats()
2. 🔵 Per-subscription cache size override
3. 🔵 Automatic cache clearing on large state changes

---

## Proposed Solution Approaches

### Option A: LRU Cache (Least Recently Used)
Replace Map with LRU cache that evicts least recently accessed entries.

**Advantages:**
- Proven algorithm
- Maintains hot entries
- Predictable behavior

**Disadvantages:**
- Additional bookkeeping overhead
- More complex implementation

### Option B: FIFO Cache (First In, First Out)
Replace Map with fixed-size cache that evicts oldest entries.

**Advantages:**
- Simplest implementation
- Low overhead
- Predictable memory usage

**Disadvantages:**
- May evict frequently-used entries
- Less optimal than LRU

### Option C: Periodic Cache Clear
Clear entire cache periodically (e.g., every 1000 state changes).

**Advantages:**
- Simplest implementation
- Zero ongoing overhead

**Disadvantages:**
- Clears hot entries too
- Less predictable
- May cause performance spikes

### Option D: Max Size with LRU Eviction
Maintain current Map, add size check and evict LRU when full.

**Advantages:**
- Minimal changes to existing code
- Good balance of simplicity and effectiveness

**Disadvantages:**
- Tracking access order adds overhead

---

## Test Requirements

### Unit Tests Required

1. **Test: Cache Size Limit**
   ```typescript
   it('should limit getter cache to max size', () => {
     const manager = new SubscriptionManager(bloc);
     const subId = manager.subscribe({
       type: 'consumer',
       notify: () => {},
     });

     // Access 200 different getters
     for (let i = 0; i < 200; i++) {
       manager.trackAccess(subId, `_class.getter${i}`, null);
       manager['checkGetterChanged'](subId, `_class.getter${i}`, bloc);
     }

     const subscription = manager.getSubscription(subId);
     const cacheSize = subscription.getterCache?.size || 0;

     expect(cacheSize).toBeLessThanOrEqual(100); // Max size
   });
   ```

2. **Test: Cache Eviction**
   ```typescript
   it('should evict least recently used entries', () => {
     const manager = new SubscriptionManager(bloc);
     const subId = manager.subscribe({
       type: 'consumer',
       notify: () => {},
     });

     // Fill cache to limit
     for (let i = 0; i < 100; i++) {
       manager['checkGetterChanged'](subId, `_class.getter${i}`, bloc);
     }

     // Access first getter to make it "recently used"
     manager['checkGetterChanged'](subId, '_class.getter0', bloc);

     // Add one more getter to trigger eviction
     manager['checkGetterChanged'](subId, '_class.getter100', bloc);

     const subscription = manager.getSubscription(subId);

     // getter0 should still be cached (recently used)
     expect(subscription.getterCache?.has('_class.getter0')).toBe(true);

     // getter1 should be evicted (least recently used)
     expect(subscription.getterCache?.has('_class.getter1')).toBe(false);
   });
   ```

3. **Test: Cache Functionality Preserved**
   ```typescript
   it('should detect getter changes correctly with cache limit', () => {
     const bloc = new TestBloc();
     const manager = new SubscriptionManager(bloc);
     let notifyCount = 0;

     const subId = manager.subscribe({
       type: 'consumer',
       notify: () => notifyCount++,
     });

     // Trigger getter tracking
     bloc.state; // Access state through proxy

     // Fill cache beyond limit
     for (let i = 0; i < 150; i++) {
       manager['checkGetterChanged'](subId, `_class.computed${i}`, bloc);
     }

     // Emit state change
     bloc.emit(newState);

     // Should still notify correctly
     expect(notifyCount).toBeGreaterThan(0);
   });
   ```

4. **Test: Memory Bounded**
   ```typescript
   it('should maintain bounded memory usage', () => {
     const manager = new SubscriptionManager(bloc);
     const subId = manager.subscribe({
       type: 'consumer',
       notify: () => {},
     });

     // Access many getters over time
     for (let i = 0; i < 1000; i++) {
       manager['checkGetterChanged'](subId, `_class.getter${i}`, bloc);

       // Check cache size remains bounded
       const subscription = manager.getSubscription(subId);
       const cacheSize = subscription.getterCache?.size || 0;
       expect(cacheSize).toBeLessThanOrEqual(100);
     }
   });
   ```

### Integration Tests Required

1. **Test: Long-Lived Subscription**
   ```typescript
   it('should handle long-lived subscriptions without memory leak', () => {
     const bloc = Blac.instance.getBloc(GlobalBloc, {
       keepAlive: true
     });

     // Simulate 1000 state changes with different getter accesses
     for (let i = 0; i < 1000; i++) {
       // Access different getter each time
       const _ = bloc[`computed${i % 50}`];
       bloc.emit(newState);
     }

     const stats = bloc._subscriptionManager.getStats();
     // Cache should be bounded even after 1000 changes
     // (Can't directly check cache size, but monitor memory if possible)
   });
   ```

2. **Test: Dynamic UI Pattern**
   ```typescript
   it('should handle dynamic UI with conditional getters', () => {
     function TestComponent() {
       const [filter, setFilter] = useState(0);
       const [state, bloc] = useBloc(UserBloc);

       // Access different getter based on filter
       const data = bloc[`filteredData${filter}`];
       return <div>{data.length}</div>;
     }

     const { rerender } = render(<TestComponent />);

     // Change filter 100 times to access 100 different getters
     for (let i = 0; i < 100; i++) {
       act(() => {
         setFilter(i);
       });
       rerender(<TestComponent />);
     }

     // Should not leak memory (cache bounded)
   });
   ```

---

## Out of Scope

1. ❌ Changes to dependency tracking algorithm
2. ❌ Changes to getter execution
3. ❌ Changes to subscription API
4. ❌ Performance optimizations beyond cache management
5. ❌ Changes to proxy creation

---

## Dependencies

### Code Dependencies
- SubscriptionManager class
- Subscription type definition
- getterCache Map property

### Configuration
- Need global config for max cache size:
  ```typescript
  export interface BlacConfig {
    // ... existing config ...
    maxGetterCacheSize?: number; // Default: 100
  }
  ```

---

## Acceptance Checklist

- [ ] Issue verified and documented
- [ ] Solution designed with clear cache eviction strategy
- [ ] Implementation completed
- [ ] Cache size bounded to configured maximum
- [ ] All getter change detection still works correctly
- [ ] No API changes
- [ ] All existing tests pass
- [ ] New tests demonstrate bounded cache
- [ ] Performance overhead <0.1ms per operation
- [ ] Code review completed
- [ ] No memory regression

---

## Notes

### Current Cache Behavior

**Cache creation:**
```typescript
if (!subscription.getterCache) {
  subscription.getterCache = new Map();  // Unbounded Map
}
```

**Cache access pattern:**
1. `checkGetterChanged()` called during dependency tracking
2. If getter path not in cache, execute getter and cache result
3. If getter path in cache, compare with cached value
4. Update cache if value changed
5. **Cache never cleaned up except on unsubscribe**

### Real-World Impact

**Low for typical usage:**
- Most subscriptions are short-lived (component lifetime)
- Most components access consistent set of getters
- Cache cleared on unmount

**High for specific patterns:**
- Global state with keep-alive
- Long-running dashboards
- Dynamic forms with many conditional computed properties
- Mobile apps with long sessions

### Why This Wasn't Noticed

1. **Recent change:** V2 introduced getter cache for better change detection
2. **Gradual accumulation:** Memory grows slowly over time
3. **Small per-entry size:** 100 bytes per entry is small
4. **Limited getter usage:** Most apps don't access 100+ different getters

---

**Ready for solution research and analysis.**

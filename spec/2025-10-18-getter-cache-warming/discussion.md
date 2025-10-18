# Getter Cache Warming - Discussion

**Date:** 2025-10-18

---

## Requirements Summary

**Goal:** Eliminate unnecessary re-render that occurs when class getters are first checked after initial component render.

**Key Requirements:**
- Cache all getter values (primitives, objects, arrays) during initial tracking
- Only apply to proxy-based dependency tracking (not manual dependencies)
- Errors during render should propagate naturally (no error caching during tracking)
- Optimize to avoid unnecessary work (check leafPaths, existing cache)
- Maintain backward compatibility and graceful degradation

**Success Criteria:**
- All 7 failing tests pass
- Zero extra re-renders when unrelated state changes
- No performance regression

---

## Important Considerations

### Architectural Patterns in BlaC

1. **Two-phase tracking:** Tracking phase (collect dependencies) → Commit phase (atomically apply)
2. **Separation of concerns:** Adapter manages tracking, SubscriptionManager manages cache
3. **Lazy initialization:** Caches initialized on-demand (e.g., `getterCache` created in `checkGetterChanged`)
4. **Performance first:** Early returns, skip unnecessary work (e.g., `setsEqual` check before dependency update)
5. **Graceful degradation:** Missing cache = treated as first access (safe fallback)

### Common Approaches for Caching Computed Values

1. **Eager caching:** Populate cache immediately when value is computed
   - Pro: Simpler, no state to manage
   - Con: May cache values never used, harder to coordinate with lifecycle

2. **Deferred caching:** Store values temporarily, transfer during commit
   - Pro: Can optimize (filter, dedupe), respects lifecycle phases
   - Con: Requires temporary storage, more complex

3. **Lazy caching:** Cache on first check/access
   - Pro: Only cache what's needed
   - Con: First check returns "changed" (current behavior we're fixing)

### Common Mistakes

1. **Caching before filtering:** Caching all tracked paths before `filterLeafPaths` removes intermediate paths
2. **Ignoring subscription lifecycle:** Trying to access subscription before it exists
3. **Mixing concerns:** Having tracking phase modify subscriptions directly
4. **Missing cleanup:** Not clearing temporary storage between renders
5. **Over-optimization:** Adding complexity for negligible performance gains

---

## Implementation Options

### Option A: Temporary Map with Filtered Transfer (Recommended)

**Description:** Store all getter values in temporary map during tracking, transfer only filtered paths during commit.

**Implementation:**
```typescript
// BlacAdapter.ts - Add field
private pendingGetterValues = new Map<string, unknown>();

// ProxyFactory.ts:198 - Pass all values
consumerTracker.trackAccess(consumerRef, 'class', String(prop), value);

// BlacAdapter.trackAccess - Store values
if (type === 'class') {
  this.pendingGetterValues.set(path, value); // Store with short path ('getterName')
}

// BlacAdapter.commitTracking - Transfer to cache
if (this.pendingGetterValues.size > 0 && subscription) {
  if (!subscription.getterCache) {
    subscription.getterCache = new Map();
  }
  for (const [getterName, value] of this.pendingGetterValues) {
    const getterPath = `_class.${getterName}`;
    if (leafPaths.has(getterPath) && !subscription.getterCache.has(getterPath)) {
      subscription.getterCache.set(getterPath, { value, error: undefined });
    }
  }
}

// BlacAdapter.resetTracking - Clear temp storage
this.pendingGetterValues.clear();
```

**Pros:**
- Clean separation: tracking collects, commit applies
- Optimized: only caches filtered paths
- Safe: checks if cache entry already exists
- Memory efficient: temporary map cleared each render
- Handles edge cases: no subscription = no transfer (safe)

**Cons:**
- Additional Map storage (though cleared quickly)
- Multiple iterations: store → filter → transfer
- Slightly more complex than eager approach

---

### Option B: Immediate Cache Population

**Description:** Populate getter cache immediately in `trackAccess` when subscription exists.

**Implementation:**
```typescript
// BlacAdapter.trackAccess
if (type === 'class' && this.subscriptionId) {
  const subscription = this.blocInstance._subscriptionManager.subscriptions.get(this.subscriptionId);
  if (subscription) {
    if (!subscription.getterCache) {
      subscription.getterCache = new Map();
    }
    if (!subscription.getterCache.has(fullPath)) {
      subscription.getterCache.set(fullPath, { value, error: undefined });
    }
  }
}
```

**Pros:**
- Simpler: no temporary storage needed
- Immediate: cache populated as soon as value available
- Less code: no transfer logic needed

**Cons:**
- Violates separation of concerns (tracking modifies subscription directly)
- May cache paths that get filtered out by `filterLeafPaths`
- Doesn't work for first mount (no subscription yet)
- Hard to optimize (check leafPaths not available in tracking phase)
- Breaks architectural pattern of atomic commit

---

### Option C: Lazy Initialization in checkGetterChanged

**Description:** Keep current lazy caching but initialize with "null" sentinel on first render.

**Implementation:**
```typescript
// BlacAdapter.commitTracking
for (const path of leafPaths) {
  if (path.startsWith('_class.')) {
    if (!subscription.getterCache.has(path)) {
      subscription.getterCache.set(path, { value: Symbol('UNINITIALIZED'), error: undefined });
    }
  }
}

// SubscriptionManager.checkGetterChanged
if (cachedEntry.value === Symbol('UNINITIALIZED')) {
  // First real check - update cache but don't treat as changed
  subscription.getterCache.set(getterPath, { value: newValue, error: newError });
  return false; // Not changed, just initializing
}
```

**Pros:**
- Minimal changes to tracking phase
- No additional storage structures
- Still uses lazy evaluation

**Cons:**
- Sentinel value approach is hacky
- Getter evaluated twice (once in render, once in first check)
- Doesn't reuse value already computed
- Type safety issues with sentinel value

---

### Option D: Extended PendingDependencies

**Description:** Change `pendingDependencies` from `Set<string>` to `Map<string, {value?: unknown}>`.

**Implementation:**
```typescript
// BlacAdapter.ts - Change field type
private pendingDependencies = new Map<string, {value?: unknown}>();

// trackAccess - Store with value
if (type === 'class') {
  this.pendingDependencies.set(fullPath, {value});
} else {
  this.pendingDependencies.set(fullPath, {});
}

// commitTracking - Extract and filter
const pathsToFilter = new Set(this.pendingDependencies.keys());
const leafPaths = this.filterLeafPaths(pathsToFilter);

// Transfer getter values
for (const leafPath of leafPaths) {
  if (leafPath.startsWith('_class.')) {
    const entry = this.pendingDependencies.get(leafPath);
    if (entry?.value !== undefined && subscription) {
      // populate cache
    }
  }
}
```

**Pros:**
- Single data structure (no parallel map)
- Values naturally associated with paths

**Cons:**
- Changes fundamental data structure used throughout adapter
- `filterLeafPaths` expects `Set<string>`, requires modification
- More invasive change
- State paths also in map but don't need value field (wasted memory)

---

## Options Comparison Matrix

| Criteria | Weight | Option A (Temp Map) | Option B (Immediate) | Option C (Lazy + Sentinel) | Option D (Extended Map) |
|----------|--------|---------------------|----------------------|----------------------------|-------------------------|
| **Simplicity** | 3 | 8/10 | 9/10 | 6/10 | 5/10 |
| **Performance** | 2 | 9/10 | 7/10 | 5/10 | 8/10 |
| **Correctness** | 3 | 10/10 | 6/10 | 7/10 | 9/10 |
| **Maintainability** | 2 | 9/10 | 6/10 | 4/10 | 6/10 |
| **Architectural Fit** | 3 | 10/10 | 4/10 | 7/10 | 7/10 |
| **Edge Case Handling** | 2 | 10/10 | 5/10 | 8/10 | 9/10 |
| **Memory Efficiency** | 1 | 9/10 | 9/10 | 10/10 | 7/10 |
| **TOTAL** | - | **148/160** | **102/160** | **100/160** | **115/160** |

### Scoring Explanation

**Option A (Temporary Map):**
- Simplicity: 8/10 - Straightforward approach with clear phases
- Performance: 9/10 - Reuses computed values, only caches filtered paths
- Correctness: 10/10 - Handles all edge cases, proper filtering
- Maintainability: 9/10 - Clear separation of concerns, easy to understand
- Architectural Fit: 10/10 - Perfect match for two-phase pattern
- Edge Cases: 10/10 - Graceful handling of missing subscription, errors
- Memory: 9/10 - Temporary map cleared each render, minimal overhead

**Option B (Immediate):**
- Simplicity: 9/10 - Fewer lines of code
- Performance: 7/10 - May cache unnecessary paths, no filtering
- Correctness: 6/10 - Doesn't work on first mount, caches unfiltered paths
- Maintainability: 6/10 - Mixes tracking and modification concerns
- Architectural Fit: 4/10 - Violates separation of concerns
- Edge Cases: 5/10 - Fails when subscription doesn't exist
- Memory: 9/10 - No extra structures

**Option C (Lazy + Sentinel):**
- Simplicity: 6/10 - Sentinel value pattern is non-obvious
- Performance: 5/10 - Duplicate getter evaluation
- Correctness: 7/10 - Works but doesn't reuse computed values
- Maintainability: 4/10 - Hacky sentinel approach
- Architectural Fit: 7/10 - Minimal changes to existing flow
- Edge Cases: 8/10 - Handles most cases
- Memory: 10/10 - No additional structures

**Option D (Extended Map):**
- Simplicity: 5/10 - Complex type changes throughout
- Performance: 8/10 - Single data structure, efficient lookups
- Correctness: 9/10 - Accurate tracking with values
- Maintainability: 6/10 - Invasive changes to core data structure
- Architectural Fit: 7/10 - Changes fundamental adapter pattern
- Edge Cases: 9/10 - Handles most cases well
- Memory: 7/10 - Every path has value field (even state paths that don't need it)

---

## Expert Council Discussion

### Butler Lampson (Simplicity)
*"Is this the simplest thing that could possibly work?"*

**On Option A:** "Temporary storage with commit-time transfer is simple and obvious. When someone reads the code, they'll immediately understand: collect values during tracking, apply them during commit. This matches how React hooks work (render phase vs commit phase)."

**On Option B:** "Seems simpler at first glance, but creates subtle complexity: Why are we modifying subscriptions during tracking? What if subscription doesn't exist? The simplicity is illusory."

**Verdict:** Option A is genuinely simpler because it's obvious and predictable.

---

### Barbara Liskov (Invariants & Correctness)
*"Does this violate any implicit assumptions of the system?"*

**On Option A:** "Maintains the invariant that tracking phase is read-only (observation) and commit phase is write-only (mutation). The temporary map is part of the adapter's local state, not the subscription state. Clean boundary."

**On Option B:** "Violates the phase separation invariant. Tracking phase now has side effects on subscription state. What if we need to rollback? What if filtering removes a path after we cached it? Invariant broken."

**On architectural fit:** "Option A preserves the existing contract between Adapter and SubscriptionManager. The adapter collects information, then tells the subscription manager what to update. Option B creates coupling."

**Verdict:** Option A respects system invariants. Others create subtle violations.

---

### Nancy Leveson (Safety & Failure)
*"What is the worst thing that could happen if this fails?"*

**On Option A failure modes:**
- Temporary map not cleared → Memory leak, but only one render worth of data
- Transfer fails → Falls back to existing behavior (cache miss on first check)
- Subscription doesn't exist → Safe no-op, transfer skipped
- Getter throws → Caught naturally in ProxyFactory, no cache entry created

**On Option B failure modes:**
- Subscription doesn't exist → Null pointer, cache not populated
- Path gets filtered out → Wasted cache entry (incorrect optimization)
- Multiple renders between commits → Inconsistent state

**Verdict:** Option A degrades gracefully. Option B has more failure modes.

---

### Leslie Lamport (Concurrency)
*"What race conditions or ordering issues have I missed?"*

**Analysis:** All operations are synchronous within React render cycle:
1. Render → trackAccess → store in map
2. useEffect → commitTracking → transfer to cache
3. State change → checkGetterChanged → read from cache

No async gaps. The only concern is ordering within the commit:

**Option A ordering:**
```
1. Filter dependencies
2. Update subscription.dependencies
3. Transfer getter cache ← Safe: dependencies already updated
```

**Option B ordering:**
```
1. trackAccess called during render
2. Subscription modified immediately ← Problem: dependencies not yet updated
3. Later: dependencies updated ← Cache and dependencies out of sync
```

**Verdict:** Option A has correct ordering. Option B creates window where cache and dependencies disagree.

---

### Martin Kleppmann (Consistency)
*"How will the system behave under partial failure or data inconsistency?"*

**Scenario:** What if `filterLeafPaths` filters out a getter path?

**Example:**
```typescript
// Component accesses:
cubit.value      // → _class.value (stored in temp map)
state.data.item  // → data, data.item (filterLeafPaths → data.item only)

// Later, hypothetically if filterLeafPaths somehow removed _class.value:
// Option A: Checks leafPaths, doesn't transfer → Cache not populated → First check returns true
// Option B: Already cached → Cache has stale entry for path not in dependencies
```

In practice, `_class.*` paths are always leaf paths (no nesting), so this won't happen. But Option A is defensive.

**Verdict:** Option A is more robust to unexpected filtering behavior.

---

### Council Recommendation

**Unanimous recommendation: Option A (Temporary Map with Filtered Transfer)**

**Key reasons:**
1. **Lampson:** Truly simple - matches existing phase-based pattern
2. **Liskov:** Preserves invariants and architectural boundaries
3. **Leveson:** Safest failure modes, graceful degradation
4. **Lamport:** Correct ordering, no race conditions
5. **Kleppmann:** Most consistent under edge cases

**The council notes:** While Option B appears simpler on the surface, it creates subtle coupling and violates architectural patterns that make the codebase maintainable. Option A adds a small amount of obvious complexity (temporary map) in exchange for correctness, safety, and maintainability.

---

## Trade-offs Analysis

### Development Time vs Long-term Maintainability

- **Option A:** Slightly more code now (5-10 lines), but future developers will understand it immediately
- **Option B:** Less code now, but creates technical debt (mixed concerns, edge case bugs)

**Recommendation:** Invest in Option A for long-term maintainability.

### Memory vs Performance

- **Option A:** Uses temporary Map (cleared each render), reuses computed values
- **Option C:** No extra memory, but evaluates getters twice

**Recommendation:** Temporary memory (< 1KB per render) is worth avoiding duplicate computation.

### Flexibility vs Simplicity

- **Option A:** More flexible (can add optimizations, checks, logging in commit phase)
- **Option B:** Less flexible (immediate population, hard to add checks)

**Recommendation:** Flexibility enables future optimizations without refactoring.

---

## Conclusion

**Option A (Temporary Map with Filtered Transfer)** is the clear winner based on:

1. **Correctness:** Handles all edge cases properly
2. **Architecture:** Fits perfectly with existing two-phase pattern
3. **Safety:** Graceful degradation if anything fails
4. **Performance:** Reuses computed values, optimizes via filtering
5. **Maintainability:** Clear code that future developers will understand
6. **Council consensus:** Unanimous expert recommendation

The additional complexity of a temporary map is minimal and justified by the benefits in correctness, maintainability, and architectural consistency.

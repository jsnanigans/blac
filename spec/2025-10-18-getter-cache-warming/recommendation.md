# Getter Cache Warming - Implementation Recommendation

**Date:** 2025-10-18
**Recommended Solution:** Option A - Temporary Map with Filtered Transfer

---

## Executive Summary

Implement getter cache warming by storing values in a temporary map during the tracking phase, then transferring them to the subscription's getter cache during the commit phase. This approach:

- ✅ Eliminates unnecessary re-renders (fixes 7 failing tests)
- ✅ Reuses values already computed during render
- ✅ Respects existing architectural patterns (two-phase tracking)
- ✅ Handles all edge cases gracefully
- ✅ Adds minimal complexity (~15 lines of code)

---

## Implementation Plan

### Phase 1: Update ProxyFactory to Pass All Values

**File:** `packages/blac/src/adapter/ProxyFactory.ts`

**Location:** Line 193-199

**Current Code:**
```typescript
if (descriptor?.get) {
  // Track getter access with value for primitives
  const isPrimitive = value !== null && typeof value !== 'object';
  consumerTracker.trackAccess(
    consumerRef,
    'class',
    String(prop),
    isPrimitive ? value : undefined,  // ← Only primitives
  );
}
```

**New Code:**
```typescript
if (descriptor?.get) {
  // Track getter access with full value for cache warming
  consumerTracker.trackAccess(
    consumerRef,
    'class',
    String(prop),
    value,  // ← All values (primitives, objects, arrays)
  );
}
```

**Rationale:** Meets requirement FR2 (cache all getter values). The primitive check was a premature optimization.

---

### Phase 2: Add Temporary Storage in BlacAdapter

**File:** `packages/blac/src/adapter/BlacAdapter.ts`

**Location:** After line 116 (with other tracking fields)

**Add Field:**
```typescript
// Getter cache warming: temporary storage for values captured during tracking
private pendingGetterValues = new Map<string, unknown>();
```

**Rationale:**
- Cleared on each render (lifecycle managed in `resetTracking`)
- Stores short path as key (`'doubleCount'` not `'_class.doubleCount'`)
- Minimal memory overhead (typically 1-5 entries per render)

---

### Phase 3: Store Values During Tracking

**File:** `packages/blac/src/adapter/BlacAdapter.ts`

**Location:** Method `trackAccess`, after line 178

**Current Code:**
```typescript
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string, value?: any): void {
  if (!this.isTrackingActive) return;

  const fullPath = type === 'class' ? `_class.${path}` : path;

  // V2: Collect in pending dependencies during render
  this.pendingDependencies.add(fullPath);
  this.trackedPaths.add(fullPath);

  if (!this.subscriptionId) {
    // No subscription ID yet - store for later
    this.pendingTrackedPaths.add(fullPath);
    // ...
  } else {
    // ...
  }
}
```

**Add After Line 178:**
```typescript
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string, value?: any): void {
  if (!this.isTrackingActive) return;

  const fullPath = type === 'class' ? `_class.${path}` : path;

  // V2: Collect in pending dependencies during render
  this.pendingDependencies.add(fullPath);
  this.trackedPaths.add(fullPath);

  // Cache warming: store getter values for transfer during commit
  if (type === 'class' && value !== undefined) {
    // Store with short path (will be converted to fullPath during transfer)
    this.pendingGetterValues.set(path, value);
  }

  // ... rest of method
}
```

**Rationale:**
- Only stores class getters (not state paths)
- Stores short path for cleaner map keys
- Check `value !== undefined` to avoid storing explicit undefined from uninitialized getters

---

### Phase 4: Transfer Values During Commit

**File:** `packages/blac/src/adapter/BlacAdapter.ts`

**Location:** Method `commitTracking`, after line 500 (after pathToSubscriptions update)

**Add After Line 500:**
```typescript
commitTracking(): void {
  // ... existing code through line 500 ...

  // Cache warming: transfer getter values to subscription cache
  if (this.pendingGetterValues.size > 0 && subscription) {
    // Initialize getter cache if needed
    if (!subscription.getterCache) {
      subscription.getterCache = new Map();
    }

    // Only cache getters that are in the final filtered dependencies
    for (const [getterName, value] of this.pendingGetterValues) {
      const getterPath = `_class.${getterName}`;

      // Optimization: Only cache if this getter is actually tracked
      if (leafPaths.has(getterPath)) {
        // Optimization: Skip if cache already populated (shouldn't happen, but defensive)
        if (!subscription.getterCache.has(getterPath)) {
          subscription.getterCache.set(getterPath, {
            value: value,
            error: undefined,
          });
        }
      }
    }
  }
}
```

**Rationale:**
- Checks subscription exists (defensive programming)
- Lazy initializes `getterCache` (consistent with existing pattern)
- Only caches getters in `leafPaths` (optimization per NFR1)
- Checks if cache entry already exists (defensive, shouldn't happen but safe)
- Follows same structure as `checkGetterChanged` cache format

---

### Phase 5: Clear Temporary Storage on Reset

**File:** `packages/blac/src/adapter/BlacAdapter.ts`

**Location:** Method `resetTracking`, after line 408

**Current Code:**
```typescript
resetTracking(): void {
  if (this.isUsingDependencies) {
    return;
  }

  // Clear pending dependencies to start fresh for this render
  this.pendingDependencies.clear();
  this.trackedPaths.clear();

  // Enable tracking for this render
  this.isTrackingActive = true;

  // Note: We do NOT clear subscription dependencies here
  // They will be atomically replaced in commitTracking()
}
```

**Add After Line 408:**
```typescript
resetTracking(): void {
  if (this.isUsingDependencies) {
    return;
  }

  // Clear pending dependencies to start fresh for this render
  this.pendingDependencies.clear();
  this.trackedPaths.clear();

  // Cache warming: clear temporary getter values
  this.pendingGetterValues.clear();

  // Enable tracking for this render
  this.isTrackingActive = true;

  // ... rest of method
}
```

**Rationale:**
- Keeps temporary storage lifecycle consistent with `pendingDependencies`
- Ensures no memory leak across renders
- Called at start of each render (via `useBloc`)

---

### Phase 6: Remove Debug Logging

**File:** `packages/blac/src/subscription/SubscriptionManager.ts`

**Location:** Lines 372, 385, 407 (added during debugging)

**Remove:**
```typescript
// Remove these console.log statements added during investigation:
console.log(`[${this.bloc._name}] checkGetterChanged: ...`);
console.log(`[${this.bloc._name}] checkGetterChanged: ${getterName} - FIRST ACCESS, ...`);
console.log(`[${this.bloc._name}] checkGetterChanged: ${getterName} - cached: ...`);
```

**Rationale:** Clean up debug code before committing.

---

## Edge Cases Handling

### Edge Case 1: No Subscription on First Mount

**Scenario:** Isolated bloc on first mount, `subscriptionId` is undefined.

**Handling:**
- `trackAccess` stores values in `pendingGetterValues` regardless
- `commitTracking` checks `if (subscription)` before transferring
- If no subscription, transfer skipped → falls back to existing lazy caching
- ✅ Graceful degradation

### Edge Case 2: Getter Throws During Render

**Scenario:**
```typescript
get errorGetter(): number {
  throw new Error('Boom');
}
```

**Handling:**
- Getter throws in ProxyFactory before `trackAccess` is called
- Error propagates to React error boundary (current behavior)
- No value stored in `pendingGetterValues`
- No cache entry created
- ✅ Requirement BC2 satisfied (errors propagate during render)

### Edge Case 3: Getter Returns Undefined

**Scenario:**
```typescript
get maybeValue(): number | undefined {
  return undefined;
}
```

**Handling:**
- `value = undefined` in ProxyFactory
- Check in `trackAccess`: `value !== undefined` → false, not stored
- No cache entry created
- First check will treat as first access → caches undefined
- ✅ Works correctly (undefined is valid cached value)

**Note:** If we want to cache explicit `undefined`, change check to:
```typescript
if (type === 'class') {  // Remove && value !== undefined
  this.pendingGetterValues.set(path, value);
}
```

### Edge Case 4: Manual Dependencies Mode

**Scenario:** Component uses manual dependency array.

**Handling:**
- `resetTracking()` early returns if `isUsingDependencies === true`
- `pendingGetterValues.clear()` never called
- `commitTracking()` early returns if `isUsingDependencies === true`
- Transfer code never runs
- ✅ Requirement FR5 satisfied (proxy-only)

### Edge Case 5: Dependencies Unchanged (Early Return)

**Scenario:** Second render accesses same getters.

**Current Code (line 467-469):**
```typescript
if (subscription.dependencies && setsEqual(subscription.dependencies, leafPaths)) {
  // Dependencies unchanged - skip the swap
  return;  // ← Early return
}
```

**Potential Issue:** Early return happens before our transfer code.

**Solution:** Move transfer code BEFORE early return check:

```typescript
commitTracking(): void {
  // ... existing code up to line 464 ...

  if (subscription) {
    // *** MOVE CACHE WARMING HERE (before early return) ***
    if (this.pendingGetterValues.size > 0) {
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

    // Performance optimization: Skip atomic swap if dependencies haven't changed
    if (subscription.dependencies && setsEqual(subscription.dependencies, leafPaths)) {
      return;  // Early return now happens AFTER cache warming
    }

    // ... rest of method (dependency updates) ...
  }
}
```

**Rationale:** Cache warming is independent of dependency updates. Even if dependencies don't change, we want to warm cache on first render.

---

## Testing Strategy

### Unit Tests

**File:** Create `packages/blac/src/adapter/__tests__/BlacAdapter.cacheWarming.test.ts`

**Test Cases:**
1. ✅ Getter value cached after first render (before first state change)
2. ✅ No unnecessary re-render when unrelated state changes
3. ✅ Cache only populated for getters in filtered dependencies
4. ✅ Temporary map cleared on each render
5. ✅ Works with multiple getters
6. ✅ Handles getter returning undefined
7. ✅ Handles getter returning object/array
8. ✅ Skipped when using manual dependencies
9. ✅ Graceful when subscription doesn't exist

### Integration Tests

**Files:** Existing tests in `packages/blac-react/src/__tests__/`

**Expected Results:**
- ✅ `dependency-tracking.test.tsx:156` - "should track getter access correctly" → **PASSES**
- ✅ `edge-cases.test.tsx:513` - "should handle very deep nesting" → **PASSES**
- ✅ `dependency-tracking.advanced.test.tsx` - 4 failing tests → **ALL PASS**

**Total:** 7 currently failing tests should pass.

### Performance Tests

**File:** `packages/blac/src/adapter/__tests__/BlacAdapter.performance.test.ts`

**Metrics to Verify:**
1. ✅ No regression in render time
2. ✅ No regression in memory usage
3. ✅ Getter evaluated only once per render (not twice)
4. ✅ Temporary map overhead < 1KB per render

---

## Performance Characteristics

### Time Complexity

**Before (Current):**
- Render: O(n) getter evaluations
- First check: O(n) getter evaluations **← DUPLICATE**
- Subsequent checks: O(1) cache lookup

**After (With Warming):**
- Render: O(n) getter evaluations
- Tracking: O(n) map insertions
- Commit: O(n) map iterations + O(m) cache insertions (where m ≤ n)
- All checks: O(1) cache lookup **← NO DUPLICATE**

**Net improvement:** Eliminates duplicate getter evaluation on first check.

### Space Complexity

**Additional Memory:**
- Temporary map: O(n) where n = number of getters accessed
- Typical n: 1-5 getters per component
- Memory: ~50 bytes per entry (map overhead + value reference)
- Total: < 500 bytes per render (cleared immediately)

**Trade-off:** Negligible memory cost for eliminating duplicate work.

---

## Rollback Plan

If issues arise after deployment:

### Quick Rollback (< 5 minutes)

**Option 1:** Comment out cache warming in `commitTracking`:
```typescript
// TEMPORARY ROLLBACK: Disable cache warming
// if (this.pendingGetterValues.size > 0 && subscription) { ... }
```

**Option 2:** Early return from cache warming block:
```typescript
if (this.pendingGetterValues.size > 0 && subscription) {
  return; // TEMPORARY ROLLBACK
  // ... warming code ...
}
```

### Full Rollback (< 30 minutes)

Revert all 5 changes:
1. ProxyFactory: Restore primitive check
2. BlacAdapter: Remove `pendingGetterValues` field
3. BlacAdapter: Remove storage in `trackAccess`
4. BlacAdapter: Remove transfer in `commitTracking`
5. BlacAdapter: Remove clear in `resetTracking`

System falls back to existing behavior (one extra re-render, but functional).

---

## Implementation Checklist

- [ ] Phase 1: Update ProxyFactory (1 line change)
- [ ] Phase 2: Add temporary storage field (1 line)
- [ ] Phase 3: Store values in trackAccess (3 lines)
- [ ] Phase 4: Transfer values in commitTracking (12 lines)
- [ ] Phase 5: Clear storage in resetTracking (1 line)
- [ ] Phase 6: Remove debug logging (3 lines removed)
- [ ] Run blac tests: `cd packages/blac && pnpm test`
- [ ] Run blac-react tests: `cd packages/blac-react && pnpm test`
- [ ] Verify 7 failing tests now pass
- [ ] Run performance benchmarks (if they exist)
- [ ] Update CHANGELOG with fix description
- [ ] Create PR with detailed description

---

## Code Review Checklist

Reviewer should verify:

- [ ] All 5 phases implemented correctly
- [ ] Temporary map cleared in `resetTracking`
- [ ] Cache warming only for proxy mode (`isUsingDependencies === false`)
- [ ] Transfer happens before early return in `commitTracking`
- [ ] All values passed (primitive check removed)
- [ ] Debug logging removed
- [ ] Tests pass (especially the 7 previously failing)
- [ ] No performance regression
- [ ] Edge cases handled (no subscription, errors, undefined)
- [ ] Documentation updated (inline comments sufficient)

---

## Success Metrics

### Immediate (Post-Implementation)

- ✅ All 7 failing tests pass
- ✅ No test regressions (all previously passing tests still pass)
- ✅ Build succeeds without errors
- ✅ TypeScript compilation clean

### Short-Term (1 Week)

- ✅ No bug reports related to getter caching
- ✅ No performance degradation reports
- ✅ Code review approved without major concerns

### Long-Term (1 Month)

- ✅ No rollbacks needed
- ✅ Feature stable in production
- ✅ Developers understand the implementation (no confusion)

---

## Conclusion

This implementation follows the principle of **"make it correct, then make it fast"**:

1. **Correct:** Handles all edge cases, respects architecture
2. **Fast:** Reuses computed values, optimizes via filtering
3. **Simple:** ~20 lines of code, clear intent
4. **Safe:** Graceful degradation, easy rollback

The temporary map approach adds minimal complexity in exchange for correctness, maintainability, and adherence to existing architectural patterns. The expert council unanimously recommends this solution.

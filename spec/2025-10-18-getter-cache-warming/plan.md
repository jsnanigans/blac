# Getter Cache Warming - Implementation Plan

**Date:** 2025-10-18
**Feature:** Eliminate unnecessary re-renders by warming getter cache during initial tracking
**Based on:** Option A - Temporary Map with Filtered Transfer

---

## Overview

This plan implements getter cache warming to eliminate one unnecessary re-render that currently occurs when class getters are first checked after initial component render. The implementation adds approximately 20 lines of code across 3 files using a temporary map that stores getter values during tracking and transfers them to the subscription cache during commit.

**Expected Outcome:** Fix 7 failing tests in blac-react with zero performance regression.

---

## Phase 1: Preparation & Setup

**Goal:** Verify environment, run baseline tests, prepare for implementation

### Tasks

- [ ] #S:s Verify all specification documents are present and reviewed
  - Check specifications.md, research.md, discussion.md, recommendation.md exist
  - Review recommended solution (Option A)

- [ ] #S:m Run baseline tests to confirm current failure state
  - Run `cd packages/blac && pnpm test` → should pass (503 tests)
  - Run `cd packages/blac-react && pnpm test` → should have 7 failures
  - Document exact failure count and test names

- [ ] #S:s Create feature branch
  - Branch name: `feat/getter-cache-warming`
  - Base: current branch or `main`

- [ ] #S:s Backup files to be modified
  - `packages/blac/src/adapter/ProxyFactory.ts`
  - `packages/blac/src/adapter/BlacAdapter.ts`
  - `packages/blac/src/subscription/SubscriptionManager.ts`

**Success Criteria:** Environment ready, baseline documented, branch created

---

## Phase 2: Core Implementation

**Goal:** Implement the 5 code changes specified in recommendation.md

### Task 2.1: Update ProxyFactory to Pass All Values

- [ ] #S:s Modify ProxyFactory.ts line 193-199
  - File: `packages/blac/src/adapter/ProxyFactory.ts`
  - Location: Line 193-199 (inside `createBlocProxy` getter handler)
  - Change: Remove primitive check, pass all getter values
  - Before: `isPrimitive ? value : undefined`
  - After: `value`
  - Rationale: Requirement FR2 - cache all getter values (not just primitives)

**Code Change:**
```typescript
// File: packages/blac/src/adapter/ProxyFactory.ts:193-199
if (descriptor?.get) {
  // Track getter access with full value for cache warming
  consumerTracker.trackAccess(
    consumerRef,
    'class',
    String(prop),
    value,  // ← Changed from: isPrimitive ? value : undefined
  );
}
```

### Task 2.2: Add Temporary Storage Field

- [ ] #S:s Add pendingGetterValues field to BlacAdapter
  - File: `packages/blac/src/adapter/BlacAdapter.ts`
  - Location: After line 116 (with other tracking fields)
  - Add: `private pendingGetterValues = new Map<string, unknown>();`
  - Rationale: Temporary storage for getter values captured during tracking

**Code Change:**
```typescript
// File: packages/blac/src/adapter/BlacAdapter.ts:~117
// V2: Two-phase tracking for atomic dependency updates
private pendingDependencies = new Set<string>(); // Collected during render
private isTrackingActive = false; // Controls when tracking is enabled

// Getter cache warming: temporary storage for values captured during tracking
private pendingGetterValues = new Map<string, unknown>();  // ← ADD THIS LINE
```

### Task 2.3: Store Values During Tracking

- [ ] #S:m Update trackAccess method to store getter values
  - File: `packages/blac/src/adapter/BlacAdapter.ts`
  - Location: Method `trackAccess`, after line 178
  - Add: Store getter values in temporary map
  - Rationale: Capture values as they're accessed during render

**Code Change:**
```typescript
// File: packages/blac/src/adapter/BlacAdapter.ts:164-192
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string, value?: any): void {
  if (!this.isTrackingActive) return;

  const fullPath = type === 'class' ? `_class.${path}` : path;

  // V2: Collect in pending dependencies during render
  this.pendingDependencies.add(fullPath);
  this.trackedPaths.add(fullPath);

  // ← ADD THESE LINES (after line 178)
  // Cache warming: store getter values for transfer during commit
  if (type === 'class' && value !== undefined) {
    // Store with short path (will be converted to fullPath during transfer)
    this.pendingGetterValues.set(path, value);
  }

  // ... rest of method unchanged
}
```

### Task 2.4: Transfer Values During Commit

- [ ] #S:l Implement cache warming in commitTracking method
  - File: `packages/blac/src/adapter/BlacAdapter.ts`
  - Location: Method `commitTracking`, BEFORE early return check (line 467)
  - Add: Transfer getter values from temporary map to subscription cache
  - Rationale: Populate cache after dependencies filtered, before early return

**Important:** Place BEFORE the `setsEqual` early return check to ensure cache warming happens even when dependencies don't change.

**Code Change:**
```typescript
// File: packages/blac/src/adapter/BlacAdapter.ts:~464-500
if (subscription) {
  // *** ADD THIS BLOCK BEFORE THE setsEqual CHECK ***
  // Cache warming: transfer getter values to subscription cache
  if (this.pendingGetterValues.size > 0) {
    // Initialize getter cache if needed (consistent with lazy init pattern)
    if (!subscription.getterCache) {
      subscription.getterCache = new Map();
    }

    // Only cache getters that are in the final filtered dependencies
    for (const [getterName, value] of this.pendingGetterValues) {
      const getterPath = `_class.${getterName}`;

      // Optimization: Only cache if this getter is actually tracked
      if (leafPaths.has(getterPath)) {
        // Optimization: Skip if cache already populated (defensive programming)
        if (!subscription.getterCache.has(getterPath)) {
          subscription.getterCache.set(getterPath, {
            value: value,
            error: undefined,
          });
        }
      }
    }
  }

  // Performance optimization: Skip atomic swap if dependencies haven't changed
  if (subscription.dependencies && setsEqual(subscription.dependencies, leafPaths)) {
    return;  // ← Early return now happens AFTER cache warming
  }

  // ... rest of method (dependency updates) unchanged
}
```

### Task 2.5: Clear Temporary Storage on Reset

- [ ] #S:s Add cleanup to resetTracking method
  - File: `packages/blac/src/adapter/BlacAdapter.ts`
  - Location: Method `resetTracking`, after line 408
  - Add: Clear pendingGetterValues
  - Rationale: Prevent memory leaks, ensure fresh state for each render

**Code Change:**
```typescript
// File: packages/blac/src/adapter/BlacAdapter.ts:400-415
resetTracking(): void {
  if (this.isUsingDependencies) {
    return;
  }

  // Clear pending dependencies to start fresh for this render
  this.pendingDependencies.clear();
  this.trackedPaths.clear();

  // ← ADD THIS LINE (after line 408)
  // Cache warming: clear temporary getter values
  this.pendingGetterValues.clear();

  // Enable tracking for this render
  this.isTrackingActive = true;

  // ... rest unchanged
}
```

**Success Criteria:** All 5 code changes implemented, compiles without errors

---

## Phase 3: Cleanup & Testing

**Goal:** Remove debug code, run tests, verify fix

### Task 3.1: Remove Debug Logging

- [ ] #S:s Remove console.log statements added during investigation
  - File: `packages/blac/src/subscription/SubscriptionManager.ts`
  - Locations: Lines 372, 385, 407 (approximate, may vary)
  - Remove: All `console.log` statements added for debugging
  - Keep: Method logic unchanged

**Lines to Remove:**
```typescript
// Remove these debug lines:
console.log(`[${this.bloc._name}] checkGetterChanged: ${getterName} - cache lookup...`);
console.log(`[${this.bloc._name}] checkGetterChanged: ${getterName} - FIRST ACCESS...`);
console.log(`[${this.bloc._name}] checkGetterChanged: ${getterName} - cached:...`);
```

### Task 3.2: Run Unit Tests

- [ ] #S:m Run @blac/core tests
  - Command: `cd packages/blac && pnpm test`
  - Expected: All 503 tests pass (no regressions)
  - If failures: Debug and fix before continuing

- [ ] #S:m Run @blac/react tests
  - Command: `cd packages/blac-react && pnpm test`
  - Expected: All 197 tests pass (7 previously failing now pass)
  - Verify specific tests:
    - `dependency-tracking.test.tsx:156` - "should track getter access correctly"
    - `edge-cases.test.tsx:513` - "should handle very deep nesting"
    - `dependency-tracking.advanced.test.tsx` - 4 getter-related tests

### Task 3.3: Verify Fix

- [ ] #S:m Manually verify no extra re-renders
  - Create test component with getter
  - Add render spy
  - Change unrelated state property
  - Verify render spy NOT called (was called before fix)

- [ ] #P #S:m Run type checking
  - Command: `cd packages/blac && pnpm typecheck`
  - Expected: No type errors

- [ ] #P #S:m Run linter
  - Command: `cd packages/blac && pnpm lint`
  - Expected: No lint errors

**Success Criteria:** All tests pass, no regressions, 7 failures fixed

---

## Phase 4: Documentation & Review

**Goal:** Document changes, prepare for review

### Tasks

- [ ] #P #S:s Add inline code comments
  - Document cache warming logic in commitTracking
  - Explain why transfer happens before early return
  - Reference spec document

- [ ] #P #S:m Update CHANGELOG
  - Add entry: "Fix: Eliminate unnecessary re-render for class getters"
  - Reference issue/PR number
  - Mention 7 tests fixed

- [ ] #S:m Create commit
  - Message: "fix(core): warm getter cache during initial tracking

Eliminates one unnecessary re-render that occurred when class getters
were first checked after initial component render. Implements temporary
map approach to store getter values during tracking phase and transfer
them to subscription cache during commit phase.

Fixes 7 failing tests in blac-react:
- dependency-tracking.test.tsx - getter access tracking
- edge-cases.test.tsx - deep nesting
- dependency-tracking.advanced.test.tsx - 4 getter tests

Implementation follows Option A from spec/2025-10-18-getter-cache-warming/
with ~20 lines added across 3 files.

Changes:
- ProxyFactory: Pass all getter values (not just primitives)
- BlacAdapter: Add pendingGetterValues temporary storage
- BlacAdapter: Store values in trackAccess, transfer in commitTracking
- BlacAdapter: Clear temporary storage in resetTracking"

**Success Criteria:** Changes documented, commit prepared

---

## Phase 5: Performance Validation (Optional)

**Goal:** Ensure no performance regressions

### Tasks

- [ ] #P #S:m Benchmark render performance
  - Test: Component with 5 getters, 100 renders
  - Metric: Average render time
  - Expected: No regression (< 5% increase acceptable)

- [ ] #P #S:m Benchmark memory usage
  - Test: Component lifecycle (mount → 10 renders → unmount)
  - Metric: Peak memory usage
  - Expected: < 1KB increase (temporary map overhead)

- [ ] #P #S:m Benchmark getter evaluation count
  - Test: First state change after initial render
  - Metric: Number of times getter executed
  - Before: 2 (render + first check)
  - After: 1 (render only, cached)
  - Expected: 50% reduction in getter evaluations

**Success Criteria:** No significant performance regressions, getter evaluation optimized

---

## Timeline Estimates

### Small (s) Tasks: 5-15 minutes each
- Verify specs, create branch, backup files
- Single-line code changes
- Remove debug logging
- Add inline comments

### Medium (m) Tasks: 15-45 minutes each
- Run test suites, verify results
- Multi-line code changes (trackAccess storage)
- Manual verification testing
- Update CHANGELOG

### Large (l) Tasks: 45-90 minutes each
- Implement commitTracking transfer logic (most complex)
- Debug any test failures

### Extra Large (xl) Tasks: None in this plan

**Total Estimated Time:** 3-5 hours
- Phase 1: 30 min
- Phase 2: 90-120 min
- Phase 3: 45-60 min
- Phase 4: 30 min
- Phase 5 (optional): 60 min

---

## Risk Mitigation

### Risk 1: Tests Still Fail After Implementation

**Likelihood:** Low
**Impact:** High
**Mitigation:**
- If tests still fail, check commit placement (before or after early return)
- Verify all 5 changes implemented correctly
- Add debug logging temporarily to trace cache population
- Fallback: Revert changes, analyze test failures more deeply

### Risk 2: New Test Failures Introduced

**Likelihood:** Low
**Impact:** Medium
**Mitigation:**
- Run full test suite after each phase
- If new failures: Isolate which change caused it
- Likely cause: Early return placement or missing clear in resetTracking
- Fix: Adjust code placement or add missing cleanup

### Risk 3: Type Errors

**Likelihood:** Very Low
**Impact:** Low
**Mitigation:**
- TypeScript will catch most issues at compile time
- Map<string, unknown> type is safe for all values
- If errors: Check subscription.getterCache type definition

### Risk 4: Performance Regression

**Likelihood:** Very Low
**Impact:** Medium
**Mitigation:**
- Temporary map overhead is minimal (< 500 bytes)
- Cleared on each render (no accumulation)
- If regression detected: Profile with Chrome DevTools
- Likely cause: leafPaths.has check overhead (negligible)

---

## Rollback Plan

If critical issues arise:

### Quick Rollback (< 5 min)

Comment out cache warming in `commitTracking`:
```typescript
// ROLLBACK: Disable cache warming
// if (this.pendingGetterValues.size > 0) { ... }
```

### Full Rollback (< 30 min)

Revert all changes:
1. `git checkout HEAD -- packages/blac/src/adapter/ProxyFactory.ts`
2. `git checkout HEAD -- packages/blac/src/adapter/BlacAdapter.ts`
3. `git checkout HEAD -- packages/blac/src/subscription/SubscriptionManager.ts`

System returns to current behavior (one extra re-render but functional).

---

## Success Metrics

### Phase-by-Phase

- **Phase 1:** Environment ready, baseline tests documented
- **Phase 2:** Code compiles without errors, no TypeScript warnings
- **Phase 3:** All 503 + 197 tests pass, 7 specific failures fixed
- **Phase 4:** Clean commit created, documented
- **Phase 5:** No performance regressions detected

### Overall Success

- ✅ All 7 failing tests pass
- ✅ No test regressions (all previously passing tests still pass)
- ✅ Zero extra re-renders when unrelated state changes
- ✅ Getter cache populated after first render
- ✅ Performance unchanged or improved
- ✅ Code review approved without blocking concerns

---

## Checklist Summary

**Setup (Phase 1):**
- [ ] Verify specs reviewed
- [ ] Run baseline tests
- [ ] Create branch
- [ ] Backup files

**Implementation (Phase 2):**
- [ ] ProxyFactory: Pass all values
- [ ] BlacAdapter: Add field
- [ ] BlacAdapter: Store in trackAccess
- [ ] BlacAdapter: Transfer in commitTracking (BEFORE early return!)
- [ ] BlacAdapter: Clear in resetTracking

**Testing (Phase 3):**
- [ ] Remove debug logging
- [ ] Run blac tests
- [ ] Run blac-react tests
- [ ] Verify 7 specific tests pass
- [ ] Type check
- [ ] Lint

**Finalize (Phase 4):**
- [ ] Add comments
- [ ] Update CHANGELOG
- [ ] Create commit

**Validate (Phase 5 - Optional):**
- [ ] Benchmark rendering
- [ ] Benchmark memory
- [ ] Verify getter evaluation reduction

---

## Next Steps After Implementation

1. Create Pull Request with reference to spec documents
2. Request code review from team
3. Monitor for any issues in production
4. Consider adding performance benchmarks to CI
5. Update architectural documentation if needed

---

## References

- Specifications: `spec/2025-10-18-getter-cache-warming/specifications.md`
- Research: `spec/2025-10-18-getter-cache-warming/research.md`
- Discussion: `spec/2025-10-18-getter-cache-warming/discussion.md`
- Recommendation: `spec/2025-10-18-getter-cache-warming/recommendation.md`
- Expert Council: Unanimously recommends Option A (Temporary Map)

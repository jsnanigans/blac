# Tasks: Consolidate KeepAlive Tests

**Action Item:** #002
**Priority:** 🟠 High
**Status:** Ready to Execute

---

## Quick Reference

**Goal:** Reduce 4-5 test files (~1,500 lines) to 1-2 files (~600-800 lines)
**Approach:** Analyze → Extract → Consolidate → Delete
**Duration:** 1 day (6-7 hours)

---

## Phase 1: Analysis

### Task 1.1: Read All KeepAlive Test Files
**Status:** ⏹️ | **Time:** 60 min

**Files to read:**
- [ ] `packages/blac/src/__tests__/keepalive-dependency-tracking.test.ts` (567 lines)
- [ ] `packages/blac/src/__tests__/keepalive-subscription-bug.test.ts`
- [ ] `packages/blac/src/__tests__/keepalive-improved-demo.test.ts`
- [ ] `packages/blac/src/__tests__/keepalive-react-simulation.test.ts`
- [ ] `packages/blac-react/src/__tests__/keepalive-hook-bug.test.tsx`

**For each file, document:**
- Number of test cases
- Test scenarios covered
- Code quality (High/Medium/Low)
- Apparent purpose
- Unique scenarios (not in other files)

---

### Task 1.2: Create Coverage Matrix
**Status:** ⏹️ | **Time:** 30 min

Create markdown table mapping scenarios across files:

```markdown
| Scenario | tracking | subscription | demo | simulation | hook-bug |
|----------|----------|--------------|------|------------|----------|
| Basic keepAlive vs regular | ✅ | ? | ? | ? | ? |
| State sync (2 consumers) | ✅ | ? | ? | ? | ? |
| ...etc | | | | | |
```

**Deliverable:** `spec/002-consolidate-keepalive-tests/coverage-matrix.md`

---

### Task 1.3: Check Git History
**Status:** ⏹️ | **Time:** 20 min

For each file:
```bash
cd packages/blac/src/__tests__
git log --oneline --follow keepalive-subscription-bug.test.ts
git log --oneline --follow keepalive-improved-demo.test.ts
git log --oneline --follow keepalive-react-simulation.test.ts

# Check for related issues
git log --grep="keepalive" --oneline
```

**Document:**
- When created
- Why created (commit message)
- Related issues/PRs
- Last modified date

---

### Task 1.4: Identify Unique Scenarios
**Status:** ⏹️ | **Time:** 30 min

For each non-canonical file, list unique scenarios:

**keepalive-subscription-bug.test.ts:**
- [ ] Scenario 1: ...
- [ ] Scenario 2: ...

**keepalive-improved-demo.test.ts:**
- [ ] Scenario 1: ...
- [ ] (Or mark as "No unique scenarios - DELETE")

**keepalive-react-simulation.test.ts:**
- [ ] Scenario 1: ...
- [ ] (Or mark as "Covered by React tests - DELETE")

**Deliverable:** `spec/002-consolidate-keepalive-tests/unique-scenarios.md`

---

### Task 1.5: Make Consolidation Decision
**Status:** ⏹️ | **Time:** 15 min

For each file, decide:
- [ ] keepalive-dependency-tracking.test.ts: **KEEP** (rename to keepalive.test.ts)
- [ ] keepalive-subscription-bug.test.ts: **EXTRACT** unique scenarios or **DELETE**
- [ ] keepalive-improved-demo.test.ts: **DELETE** (likely exploratory)
- [ ] keepalive-react-simulation.test.ts: **DELETE** (covered by React tests)
- [ ] keepalive-hook-bug.test.tsx: **MERGE** into useBloc.disposal.test.tsx or **KEEP**

**Deliverable:** Decision matrix with rationale

---

## Phase 2: Extraction

### Task 2.1: Create Enhanced Canonical Test Structure
**Status:** ⏹️ | **Time:** 30 min

Rename and reorganize:
```bash
cd packages/blac/src/__tests__
cp keepalive-dependency-tracking.test.ts keepalive.test.ts
```

Update structure:
```typescript
describe('KeepAlive', () => {
  describe('Core Behavior', () => {
    // From: Basic KeepAlive Behavior
  });

  describe('State Synchronization', () => {
    // From: State Synchronization Between Consumers
    describe('Two Consumers', () => {});
    describe('Multiple Consumers', () => {});
  });

  describe('Dependency Tracking', () => {
    // From: Dependency Tracking with Proxy
  });

  describe('Lifecycle and Memory', () => {
    // From: Memory Management
  });

  describe('Edge Cases', () => {
    // From: Edge Cases
  });

  describe('Regression Tests', () => {
    // NEW: for bug-specific tests
  });
});
```

---

### Task 2.2: Extract Unique Scenarios from subscription-bug
**Status:** ⏹️ | **Time:** 30 min

If unique scenarios exist:
- [ ] Copy test code
- [ ] Add context comment:
  ```typescript
  // Regression test for subscription bug
  // Originally from: keepalive-subscription-bug.test.ts
  // Issue: [link or description]
  // Fixed in: [commit hash]
  ```
- [ ] Place in appropriate section

---

### Task 2.3: Extract Unique Scenarios from improved-demo
**Status:** ⏹️ | **Time:** 20 min

Review for unique value:
- [ ] If has unique scenarios: Extract to canonical test
- [ ] If exploratory: Note in doc but don't extract

**Expected:** DELETE (no extraction needed)

---

### Task 2.4: Extract Unique Scenarios from react-simulation
**Status:** ⏹️ | **Time:** 20 min

Check if any scenarios are pure core logic (not React-specific):
- [ ] If yes: Extract to canonical test
- [ ] If all React-specific: Verify covered in React tests

**Expected:** DELETE (covered by React integration tests)

---

### Task 2.5: Handle React hook-bug Test
**Status:** ⏹️ | **Time:** 30 min

**File:** `packages/blac-react/src/__tests__/keepalive-hook-bug.test.tsx`

Decision tree:
- [ ] Read test file
- [ ] Check if scenarios in useBloc.disposal.test.tsx
- [ ] If duplicate: Merge into disposal test
- [ ] If unique: Keep but rename to `useBloc.keepalive.test.tsx`

---

## Phase 3: Reorganization

### Task 3.1: Improve Test Organization
**Status:** ⏹️ | **Time:** 30 min

**File:** `packages/blac/src/__tests__/keepalive.test.ts`

- [ ] Group related tests
- [ ] Add descriptive comments for each section
- [ ] Ensure consistent naming
- [ ] Add setup utilities if needed

---

### Task 3.2: Add Documentation Comments
**Status:** ⏹️ | **Time:** 20 min

Add file-level comment:
```typescript
/**
 * KeepAlive Behavior Tests
 *
 * Tests for blocs with `static keepAlive = true`, which persist
 * even when all consumers unsubscribe.
 *
 * Consolidated from:
 * - keepalive-dependency-tracking.test.ts (primary)
 * - keepalive-subscription-bug.test.ts (bug-specific scenarios)
 * - keepalive-improved-demo.test.ts (deleted - exploratory)
 * - keepalive-react-simulation.test.ts (deleted - covered by React tests)
 *
 * @see packages/blac-react/src/__tests__/useBloc.keepalive.test.tsx for React integration
 */
```

---

### Task 3.3: Add Bug Context Comments
**Status:** ⏹️ | **Time:** 15 min

For regression tests:
```typescript
describe('Regression Tests', () => {
  describe('Issue #123: Subscription Race Condition', () => {
    // Bug description:
    // When rapidly subscribing/unsubscribing from a keepAlive bloc,
    // subscriptions could be lost due to...
    //
    // Originally from: keepalive-subscription-bug.test.ts
    // Fixed in: commit abc123

    it('should handle rapid subscribe/unsubscribe', () => {
      // Test code
    });
  });
});
```

---

## Phase 4: Verification

### Task 4.1: Run Coverage Report (Before)
**Status:** ⏹️ | **Time:** 5 min

```bash
cd packages/blac
pnpm coverage

# Save output
pnpm coverage > ../../spec/002-consolidate-keepalive-tests/coverage-before.txt
```

---

### Task 4.2: Run Consolidated Tests
**Status:** ⏹️ | **Time:** 5 min

```bash
cd packages/blac
pnpm test src/__tests__/keepalive.test.ts
```

**Verify:**
- [ ] All tests pass
- [ ] No errors or warnings
- [ ] Test count is reasonable

---

### Task 4.3: Run Full Test Suite
**Status:** ⏹️ | **Time:** 5 min

```bash
cd packages/blac
pnpm test
```

**Verify:**
- [ ] All tests pass
- [ ] No regressions

---

### Task 4.4: Run Coverage Report (After)
**Status:** ⏹️ | **Time:** 5 min

```bash
cd packages/blac
pnpm coverage

# Save output
pnpm coverage > ../../spec/002-consolidate-keepalive-tests/coverage-after.txt
```

**Compare:**
- [ ] Coverage % is same or better
- [ ] No uncovered lines introduced

---

### Task 4.5: Create Comparison Report
**Status:** ⏹️ | **Time:** 15 min

Create `spec/002-consolidate-keepalive-tests/comparison.md`:

```markdown
# Before/After Comparison

## Test Files
**Before:** 4 files
**After:** 1 file
**Reduction:** 75%

## Lines of Code
**Before:** ~1,500 lines
**After:** ~650 lines
**Reduction:** 57%

## Test Count
**Before:** X tests
**After:** Y tests
**Change:** +/- Z tests

## Coverage
**Before:** X%
**After:** Y%
**Change:** +/- Z%

## Unique Scenarios Preserved
- Scenario 1 (from subscription-bug)
- Scenario 2 (from improved-demo)
- ...

## Files Deleted
- keepalive-subscription-bug.test.ts (scenarios extracted)
- keepalive-improved-demo.test.ts (exploratory, no unique value)
- keepalive-react-simulation.test.ts (covered by React tests)
```

---

## Phase 5: Cleanup

### Task 5.1: Delete Old Test Files
**Status:** ⏹️ | **Time:** 5 min

```bash
cd packages/blac/src/__tests__

# Delete redundant files
rm keepalive-dependency-tracking.test.ts  # Renamed to keepalive.test.ts
rm keepalive-subscription-bug.test.ts     # Extracted and deleted
rm keepalive-improved-demo.test.ts        # Deleted (exploratory)
rm keepalive-react-simulation.test.ts     # Deleted (covered by React)
```

**Verify no imports reference these files:**
```bash
rg "keepalive-subscription-bug|keepalive-improved-demo|keepalive-react-simulation" packages/
```

---

### Task 5.2: Update Documentation
**Status:** ⏹️ | **Time:** 15 min

**Files to update:**
- [ ] `reports/test-suite-analysis.md` (if needed)
- [ ] `packages/blac/README.md` (if test docs exist)
- [ ] Any test guides

**Update:**
- Remove references to deleted files
- Add reference to consolidated keepalive.test.ts

---

### Task 5.3: Create Commit Messages
**Status:** ⏹️ | **Time:** 10 min

**Commit 1: Analysis**
```
refactor(test): analyze keepalive test coverage

- Created coverage matrix for 4 keepalive test files
- Identified redundant and unique scenarios
- Documented consolidation plan

See: spec/002-consolidate-keepalive-tests/
```

**Commit 2: Consolidation**
```
refactor(test): consolidate keepalive tests

- Renamed keepalive-dependency-tracking.test.ts → keepalive.test.ts
- Reorganized test structure for clarity
- Extracted unique scenarios from subscription-bug test
- Added regression test section with bug context
- Improved documentation and comments

Before: 4 files, ~1,500 lines
After: 1 file, ~650 lines
Coverage: Maintained at 100%
```

**Commit 3: Cleanup**
```
refactor(test): delete redundant keepalive test files

Deleted:
- keepalive-subscription-bug.test.ts (scenarios extracted)
- keepalive-improved-demo.test.ts (exploratory, no unique value)
- keepalive-react-simulation.test.ts (covered by React integration tests)

All scenarios preserved in packages/blac/src/__tests__/keepalive.test.ts
```

---

### Task 5.4: Final Verification
**Status:** ⏹️ | **Time:** 10 min

Run full verification suite:
- [ ] `pnpm test` - All tests pass
- [ ] `pnpm typecheck` - No type errors
- [ ] `pnpm lint` - No lint errors
- [ ] `pnpm coverage` - Coverage maintained
- [ ] Visual inspection of git diff

---

### Task 5.5: Update PR Description
**Status:** ⏹️ | **Time:** 10 min

Create PR with description:
```markdown
## Consolidate KeepAlive Tests

### Summary
Consolidated 4 redundant keepalive test files into 1 well-organized canonical test.

### Changes
- **Renamed:** keepalive-dependency-tracking.test.ts → keepalive.test.ts
- **Deleted:** 3 redundant test files
- **Extracted:** Unique scenarios from deleted files
- **Reorganized:** Test structure for clarity

### Impact
- **Files:** 4 → 1 (75% reduction)
- **Lines:** ~1,500 → ~650 (57% reduction)
- **Coverage:** Maintained at 100%
- **Tests:** All passing

### Rationale
- keepalive-improved-demo.test.ts: Exploratory code, no unique value
- keepalive-react-simulation.test.ts: Covered by React integration tests
- keepalive-subscription-bug.test.ts: Unique scenarios extracted to canonical test

### Verification
- ✅ All tests pass
- ✅ Coverage maintained
- ✅ No regressions
- ✅ Clear organization
```

---

## Summary

**Total Tasks:** 28
**Estimated Time:** 6-7 hours
**Expected Outcome:**
- 1 consolidated test file (~650 lines)
- 3 deleted redundant files (~850 lines deleted)
- 100% coverage maintained
- Improved maintainability

**Success Criteria:**
- ✅ All tests pass
- ✅ Coverage ≥ previous
- ✅ Clear organization
- ✅ No duplication
- ✅ Context preserved

---

**Ready to Execute:** ✅
**Start with:** Phase 1, Task 1.1

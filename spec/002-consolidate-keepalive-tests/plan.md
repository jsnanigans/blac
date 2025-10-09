# Implementation Plan: Consolidate KeepAlive Tests

**Action Item:** #002
**Priority:** 🟠 High
**Estimated Effort:** 1 day
**Risk Level:** Low

---

## Executive Summary

Consolidate 4-5 redundant keepalive test files into 1-2 well-organized canonical tests. This will reduce ~1,500 lines to ~600-800 lines while maintaining full coverage.

**Approach:** Analyze → Extract → Consolidate → Delete
**Primary Goal:** Reduce maintenance burden without losing coverage

---

## Solution Architecture

### Approach: Analysis-Driven Consolidation

1. **Analyze** all keepalive test files
2. **Identify** canonical test (keepalive-dependency-tracking.test.ts)
3. **Extract** unique scenarios from other files
4. **Merge** into canonical test with clear organization
5. **Delete** redundant files
6. **Verify** no coverage loss

### Success Criteria

✅ Reduce from 4-5 files to 1-2 files
✅ Maintain 100% test coverage
✅ All tests pass
✅ Clear test organization
✅ Documented rationale for consolidation

---

## Technical Design

### Target File Structure

**After consolidation:**

```
packages/blac/src/__tests__/
  keepalive.test.ts              # ← Consolidated core tests

packages/blac-react/src/__tests__/
  useBloc.keepalive.test.tsx     # ← React-specific keepalive tests (if needed)
```

**Deleted:**
- `keepalive-subscription-bug.test.ts`
- `keepalive-improved-demo.test.ts`
- `keepalive-react-simulation.test.ts`

**Renamed:**
- `keepalive-dependency-tracking.test.ts` → `keepalive.test.ts`

### Test Organization

```typescript
describe('KeepAlive Behavior', () => {
  describe('Basic Behavior', () => {
    // Core keepAlive vs. regular cubit behavior
  });

  describe('State Synchronization', () => {
    // Multi-consumer state sharing
  });

  describe('Dependency Tracking', () => {
    // Proxy-based dependency tracking with keepAlive
  });

  describe('Memory Management', () => {
    // Instance persistence, disposal prevention
  });

  describe('Edge Cases', () => {
    // Rapid subscribe/unsubscribe, etc.
  });

  describe('Regression Tests', () => {
    // Bug-specific tests with context comments
    // Grouped by bug/issue number
  });
});
```

---

## Implementation Phases

### Phase 1: Analysis (Morning, 2-3 hours)

**Tasks:**
1. Read all 5 test files
2. Create coverage matrix
3. Identify unique scenarios
4. Document each file's purpose
5. Make consolidation decision

**Deliverables:**
- Coverage matrix (markdown table)
- Analysis document
- Consolidation plan

### Phase 2: Extraction (Afternoon, 2-3 hours)

**Tasks:**
1. Copy unique scenarios from non-canonical files
2. Add explanatory comments for bug-specific tests
3. Organize into canonical test structure
4. Add git blame context where relevant

**Deliverables:**
- Enhanced canonical test file

### Phase 3: Verification (30 minutes)

**Tasks:**
1. Run all tests
2. Check coverage report
3. Verify no regression
4. Compare test count before/after

**Deliverables:**
- Test coverage report
- Verification checklist

### Phase 4: Cleanup (30 minutes)

**Tasks:**
1. Delete redundant files
2. Update any imports (if needed)
3. Update documentation
4. Commit with clear message

**Deliverables:**
- Clean git history
- Updated documentation

---

## Detailed Steps

### Step 1: Create Coverage Matrix

For each test file, map coverage:

```markdown
| Scenario | tracking | subscription-bug | improved-demo | react-sim | hook-bug |
|----------|----------|------------------|---------------|-----------|----------|
| Basic keepAlive vs regular | ✅ | ❓ | ❓ | ❓ | ❌ |
| State sync (2 consumers) | ✅ | ❓ | ❓ | ❓ | ❌ |
| State sync (3+ consumers) | ✅ | ❓ | ❓ | ❓ | ❌ |
| Sequential show/hide | ✅ | ❓ | ❓ | ❓ | ❌ |
| Rapid state changes | ✅ | ❓ | ❓ | ❓ | ❌ |
| Memory persistence | ✅ | ❓ | ❓ | ❓ | ❌ |
| Dependency tracking bug | ✅ | ❓ | ❓ | ❓ | ❌ |
| [Unique scenario from file X] | ❌ | ✅ | ❌ | ❌ | ❌ |
```

Legend:
- ✅ = Covered
- ❌ = Not covered
- ❓ = Need to check

### Step 2: Extract Unique Scenarios

For each unique scenario:

1. **Copy test code** from source file
2. **Add comment** explaining origin:
   ```typescript
   describe('Regression: Subscription Bug #123', () => {
     // Originally from keepalive-subscription-bug.test.ts
     // Issue: https://github.com/project/blac/issues/123
     // Fixed in: commit abc123

     it('should not unsubscribe twice when...', () => {
       // Test code
     });
   });
   ```
3. **Integrate** into appropriate section

### Step 3: Reorganize Canonical Test

Current structure (keepalive-dependency-tracking.test.ts):
```typescript
describe('KeepAlive Dependency Tracking', () => {
  describe('Basic KeepAlive Behavior', () => {});
  describe('State Synchronization Between Consumers', () => {});
  describe('Dependency Tracking with Proxy', () => {});
  describe('Memory Management', () => {});
  describe('Specific Dependency Tracking Bug', () => {});
  describe('Edge Cases', () => {});
});
```

New structure (keepalive.test.ts):
```typescript
describe('KeepAlive', () => {
  // Setup and utilities

  describe('Core Behavior', () => {
    // Basic keepAlive vs regular, instance persistence
  });

  describe('State Synchronization', () => {
    // Multi-consumer scenarios
    describe('Two Consumers', () => {});
    describe('Three+ Consumers', () => {});
    describe('Complex Interaction Patterns', () => {});
  });

  describe('Dependency Tracking', () => {
    // Proxy-based tracking
    describe('Automatic Tracking', () => {});
    describe('Manual Dependencies', () => {});
  });

  describe('Lifecycle and Memory', () => {
    // Instance persistence, disposal prevention
  });

  describe('Edge Cases', () => {
    // Rapid operations, race conditions
  });

  describe('Regression Tests', () => {
    // Bug-specific tests with context
  });
});
```

### Step 4: Verification Checklist

Before deletion:
- [ ] All unique scenarios extracted
- [ ] All tests in canonical file pass
- [ ] Test coverage ≥ previous coverage
- [ ] No imports reference deleted files
- [ ] Documentation updated

---

## Testing Strategy

### Coverage Verification

**Before consolidation:**
```bash
cd packages/blac
pnpm coverage
# Save coverage report
```

**After consolidation:**
```bash
cd packages/blac
pnpm coverage
# Compare with previous report
# Ensure coverage is same or better
```

### Test Execution

**Before:**
```bash
pnpm test keepalive-dependency-tracking.test.ts
pnpm test keepalive-subscription-bug.test.ts
pnpm test keepalive-improved-demo.test.ts
pnpm test keepalive-react-simulation.test.ts
# Record: number of tests, duration
```

**After:**
```bash
pnpm test keepalive.test.ts
# Verify: test count is same or higher
```

---

## File-by-File Plan

### keepalive-dependency-tracking.test.ts
**Action:** Rename to `keepalive.test.ts` + reorganize
**Status:** ✅ Keep (canonical)
**Tasks:**
- Rename file
- Reorganize into new structure
- Add any missing documentation

### keepalive-subscription-bug.test.ts
**Action:** Review → Extract unique scenarios or delete
**Analysis needed:**
- Read file
- Identify unique scenarios
- Check git history for bug context

**If unique:** Extract to Regression Tests section
**If duplicate:** Delete

### keepalive-improved-demo.test.ts
**Action:** Review → Likely delete
**Expected:** Exploratory/demo code
**Verification:**
- Check for console.log
- Check for incomplete tests
- Check commit message

**If exploratory:** Delete
**If has unique value:** Extract and delete

### keepalive-react-simulation.test.ts
**Action:** Review → Likely delete
**Rationale:** React simulations should use actual React tests
**Verification:**
- Check if covered by React integration tests
- Check for unique core logic tests

**If simulated only:** Delete
**If has unique core tests:** Extract to canonical

### packages/blac-react keepalive-hook-bug.test.tsx
**Action:** Review → Merge or keep
**Analysis:**
- Check if covered by useBloc.disposal.test.tsx
- Check for React-specific scenarios

**If duplicate:** Merge into disposal test
**If unique:** Keep but organize better

---

## Risk Mitigation

### Risk 1: Accidentally delete unique tests
**Probability:** Low
**Mitigation:**
- Careful analysis before deletion
- Use git to track changes
- Can always recover from git history

### Risk 2: Break coverage
**Probability:** Low
**Mitigation:**
- Coverage report before/after
- Run full test suite
- Verify test count

### Risk 3: Lose context
**Probability:** Medium
**Mitigation:**
- Add comments with git history
- Link to issues/PRs
- Document bug numbers

---

## Timeline

| Time Slot | Activity | Deliverable |
|-----------|----------|-------------|
| 9:00-10:30 AM | Read and analyze files | Coverage matrix |
| 10:30-12:00 PM | Create consolidation plan | Plan document |
| 1:00-2:30 PM | Extract unique scenarios | Enhanced canonical test |
| 2:30-3:00 PM | Reorganize and clean up | Final test file |
| 3:00-3:30 PM | Verify coverage | Coverage report |
| 3:30-4:00 PM | Delete files, commit | Clean repo |

**Total Time:** 1 day (6-7 hours active work)

---

## Commit Strategy

### Commits:
1. `refactor(test): analyze keepalive test coverage`
   - Add coverage matrix document
2. `refactor(test): extract unique scenarios to canonical test`
   - Add extracted tests with comments
3. `refactor(test): reorganize keepalive.test.ts structure`
   - Improve organization
4. `refactor(test): delete redundant keepalive test files`
   - Delete files, update docs
5. `docs: update test documentation`
   - Update README if needed

---

## Success Metrics

**Quantitative:**
- Reduce from 4-5 files to 1-2 files ✅
- Reduce from ~1,500 lines to ~600-800 lines ✅
- Maintain 100% test coverage ✅
- All tests pass ✅

**Qualitative:**
- Clear test organization ✅
- Easy to find relevant tests ✅
- Easy to add new tests ✅
- No duplication ✅
- Historical context preserved ✅

---

## Future Improvements

After consolidation:
1. Consider splitting by feature if file >800 lines
2. Add performance benchmarks for keepAlive
3. Add integration tests with React
4. Document keepAlive patterns in guide

---

**Ready to Execute:** ⏸️ Awaiting Analysis
**Next Step:** Phase 1 - Analysis

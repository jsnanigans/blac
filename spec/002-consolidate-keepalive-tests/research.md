# Research: Consolidate KeepAlive Tests

**Action Item:** #002
**Priority:** 🟠 High
**Status:** Research Phase

---

## Problem Statement

The project has **4 separate keepalive test files** totaling ~1,500+ lines:

1. `keepalive-dependency-tracking.test.ts` (567 lines) - **Comprehensive**
2. `keepalive-subscription-bug.test.ts` (? lines) - Specific bug fix
3. `keepalive-improved-demo.test.ts` (? lines) - Appears to be demo/exploratory
4. `keepalive-react-simulation.test.ts` (? lines) - React simulation

This redundancy indicates:
- Iterative bug fixing without cleanup
- Exploratory testing that wasn't removed
- Lack of consolidation during refactoring

---

## Research Questions

### Q1: What does each test file cover?

Need to read each file and analyze:
- Test cases
- Coverage
- Duplication
- Unique value

**Files to analyze:**
```bash
packages/blac/src/__tests__/keepalive-dependency-tracking.test.ts
packages/blac/src/__tests__/keepalive-subscription-bug.test.ts
packages/blac/src/__tests__/keepalive-improved-demo.test.ts
packages/blac/src/__tests__/keepalive-react-simulation.test.ts
packages/blac-react/src/__tests__/keepalive-hook-bug.test.tsx
```

### Q2: Is there a specific bug each test addresses?

Check git history:
```bash
cd packages/blac/src/__tests__
git log --oneline --follow keepalive-*.test.ts
```

### Q3: Which test file should be the canonical one?

**Hypothesis:** `keepalive-dependency-tracking.test.ts` is the most comprehensive (567 lines)

**Criteria for canonical test:**
- Most comprehensive coverage
- Well-organized
- Clear test names
- Covers edge cases
- No duplication

### Q4: Are there unique test cases in non-canonical files?

Analyze each test to find unique scenarios not covered in canonical file.

### Q5: What is the coverage overlap?

Create a matrix of test scenarios across all files to identify duplication.

---

## Investigation Tasks

### Task 1: Read and Categorize Each Test File

Create a map of test coverage:

**Template:**
```markdown
### File: [filename]
**Purpose:** [What bug/feature does this test?]
**Test Scenarios:**
- Scenario 1
- Scenario 2
- ...

**Unique Scenarios:** [Scenarios not in other files]
**Duplicated Scenarios:** [Scenarios also in other files]
**Quality:** High/Medium/Low
**Recommendation:** Keep/Merge/Delete
```

### Task 2: Create Test Coverage Matrix

| Scenario | tracking | subscription-bug | improved-demo | react-simulation | hook-bug (React) |
|----------|----------|------------------|---------------|------------------|------------------|
| Basic keepAlive vs regular | ✅ | ? | ? | ? | ? |
| State synchronization | ✅ | ? | ? | ? | ? |
| ...etc | | | | | |

### Task 3: Identify Git History Context

For each file, find:
- When was it created?
- What bug/issue prompted it?
- Has it been updated since?
- Are there related issues in GitHub?

### Task 4: Check for Comments/TODOs

Look for comments that explain purpose:
```bash
grep -n "TODO\|FIXME\|BUG\|NOTE" keepalive-*.test.ts
```

---

## Preliminary Analysis

Based on test suite analysis report:

### keepalive-dependency-tracking.test.ts ✅
**Status:** **Keep as primary**
**Coverage:** Comprehensive
- Basic keepAlive vs regular cubit
- State synchronization between consumers
- Sequential show/hide/increment scenarios
- Complex interaction patterns (3+ consumers)
- Dependency tracking with proxy
- Rapid state changes
- Memory management
- Specific dependency tracking bugs
- Alternating show/hide patterns
- Edge cases

**Quality:** 🟢 High
**Recommendation:** This is the canonical keepalive test

### keepalive-subscription-bug.test.ts ❓
**Status:** **Review needed**
**Purpose:** Likely tests a specific bug fix

**Questions:**
- What specific bug?
- Is it covered in tracking test?
- Can we extract unique scenarios?

**Recommendation:** Review → Merge unique tests or delete

### keepalive-improved-demo.test.ts ❌
**Status:** **Likely delete**
**Purpose:** Name suggests demo, not test

**Red flags:**
- "demo" in filename
- "improved" suggests iteration

**Recommendation:** Review → Likely delete (exploratory code)

### keepalive-react-simulation.test.ts ❌
**Status:** **Likely delete**
**Purpose:** Simulates React without using React

**Red flags:**
- Should use actual React tests in @blac/react package
- Simulation tests are less reliable than integration tests

**Recommendation:** Review → Likely delete (covered by React tests)

### keepalive-hook-bug.test.tsx (React package) ❓
**Status:** **Review - may keep**
**Purpose:** React-specific keepalive bug

**Questions:**
- Is this covered by useBloc.disposal.test.tsx?
- Does it test unique React behavior?

**Recommendation:** Review → Merge into disposal test or keep if unique

---

## Hypotheses

### H1: Most tests are redundant
**Hypothesis:** >80% of test scenarios are duplicated across files

**Test:** Create coverage matrix and count duplicates

### H2: "demo" and "simulation" tests are exploratory
**Hypothesis:** These were created during debugging and never cleaned up

**Evidence:**
- Naming convention
- Lack of focused test scenarios
- May contain console.log or debugging code

**Test:** Review code for debugging artifacts

### H3: One comprehensive test can replace all
**Hypothesis:** keepalive-dependency-tracking.test.ts covers 95%+ of scenarios

**Test:** Map all unique scenarios to tracking test

### H4: Bug-specific tests have historical value
**Hypothesis:** *-bug.test.ts files document specific regressions

**Value:**
- Documents bug context
- Provides regression test

**Counter:** Could be preserved in tracking test with comments

---

## Decision Framework

For each test file, answer:

1. **Does it test unique scenarios?**
   - Yes → Extract and merge
   - No → Delete

2. **Is it well-organized?**
   - Yes → Consider as canonical
   - No → Merge into canonical

3. **Does it have historical context?**
   - Yes → Preserve context in comments
   - No → Safe to delete

4. **Does it duplicate canonical test?**
   - Yes → Delete
   - No → Review for merge

5. **Is it exploratory/demo code?**
   - Yes → Delete
   - No → Review for value

---

## Expected Outcomes

After consolidation:

**Before:**
- 4-5 test files
- ~1,500+ lines
- High redundancy
- Unclear which test to update
- Difficult to maintain

**After:**
- 1-2 test files
- ~600-800 lines
- No redundancy
- Clear canonical test
- Easy to maintain

**Reduction:** ~50-70% fewer lines, 3-4 fewer files

---

## Risk Assessment

### Risk 1: Lose unique test scenarios
**Mitigation:** Careful analysis of each file before deletion

### Risk 2: Lose historical context
**Mitigation:** Document bug context in comments

### Risk 3: Break existing functionality
**Mitigation:** Run all tests before and after to ensure coverage

### Risk 4: Merge conflicts
**Mitigation:** Coordinate with team, do in single PR

---

## Next Steps

1. Read all 5 keepalive test files
2. Create coverage matrix
3. Identify unique scenarios
4. Extract unique tests to canonical file
5. Delete redundant files
6. Update git history with context
7. Run full test suite to verify no regression

---

**Research Status:** 🟡 Ready for Investigation
**Next Phase:** Plan Development

# Test Suite Improvement Action Items

This directory contains detailed research, implementation plans, and tasks for improving the BlaC test suite based on the comprehensive analysis in `/reports/test-suite-analysis.md`.

---

## Action Items Overview

| # | Item | Priority | Effort | Status | Dependencies |
|---|------|----------|--------|--------|--------------|
| 001 | Fix React Strict Mode Disposal Bug | 🔴 Critical | 2-3 days | Ready | None |
| 002 | Consolidate KeepAlive Tests | 🟠 High | 1 day | Ready | None |
| 003 | Add React 18+ Feature Tests | 🟠 High | 1-2 days | Ready | None |
| 004 | Add Error Boundary Tests | 🟡 Medium | 0.5-1 day | Ready | None |
| 005 | Improve Memory Leak Tests | 🟡 Medium | 0.5-1 day | Ready | None |

**Total Estimated Effort:** 5-8 days
**Can be parallelized:** Yes (all independent)

---

## 001: Fix React Strict Mode Disposal Bug 🔴

**Priority:** Critical
**Problem:** Skipped test fails due to 16ms disposal timeout conflicting with React 18+ Strict Mode double-mounting

### Files
- `001-fix-strict-mode-disposal/research.md` - Deep analysis of the problem
- `001-fix-strict-mode-disposal/plan.md` - Implementation strategy
- `001-fix-strict-mode-disposal/tasks.md` - Detailed task breakdown (43 tasks)

### Quick Summary
- **Root Cause:** Hardcoded 16ms disposal timeout in BlocBase.ts:343
- **Solution:** Configurable timeout (default 100ms) + improved cancellation logic
- **Impact:** Fixes critical React 18+ compatibility issue
- **Phases:** 5 phases over 2-3 days

### Key Changes
- Add `Blac.setConfig({ disposalTimeout: number })`
- Allow per-bloc timeout overrides
- Add Strict Mode detection
- Improve cancellation error handling

---

## 002: Consolidate KeepAlive Tests 🟠

**Priority:** High
**Problem:** 4-5 redundant keepalive test files (~1,500 lines) with significant duplication

### Files
- `002-consolidate-keepalive-tests/research.md` - Coverage analysis
- `002-consolidate-keepalive-tests/plan.md` - Consolidation strategy
- `002-consolidate-keepalive-tests/tasks.md` - Step-by-step tasks (28 tasks)

### Quick Summary
- **Goal:** Reduce from 4-5 files to 1-2 files
- **Savings:** ~850 lines deleted (57% reduction)
- **Approach:** Analyze → Extract → Consolidate → Delete
- **Duration:** 1 day (6-7 hours)

### Key Actions
- Keep `keepalive-dependency-tracking.test.ts` as canonical (rename to `keepalive.test.ts`)
- Delete `keepalive-improved-demo.test.ts` (exploratory code)
- Delete `keepalive-react-simulation.test.ts` (covered by React tests)
- Extract unique scenarios from `keepalive-subscription-bug.test.ts` or delete

---

## 003: Add React 18+ Feature Tests 🟠

**Priority:** High
**Problem:** No test coverage for React 18+ features (useTransition, useDeferredValue, Suspense)

### Files
- `003-add-react18-tests/plan.md` - Complete test strategy

### Quick Summary
- **Tests to Add:** ~15-20 new tests
- **Features Covered:** useTransition, useDeferredValue, Suspense, Concurrent Rendering
- **Duration:** 1-2 days

### Test Files to Create
- `useBloc.useTransition.test.tsx` - Transition integration (4-6 tests)
- `useBloc.useDeferredValue.test.tsx` - Deferred values (3-4 tests)
- `useBloc.suspense.test.tsx` - Suspense boundaries (4-5 tests)
- `useBloc.concurrent.test.tsx` - Concurrent rendering (3-4 tests)

---

## 004: Add Error Boundary Tests 🟡

**Priority:** Medium
**Problem:** No test coverage for Error Boundary integration

### Files
- `004-add-error-boundary-tests/plan.md` - Test strategy

### Quick Summary
- **Tests to Add:** ~10 new tests
- **Coverage:** Error catching, recovery patterns, integration
- **Duration:** 0.5-1 day (4-6 hours)

### Test Scenarios
- Errors in bloc state updates
- Errors in event handlers
- Error recovery patterns
- Suspense + Error Boundary integration

---

## 005: Improve Memory Leak Tests 🟡

**Priority:** Medium
**Problem:** Memory leak tests have unused code and rely on unreliable manual GC

### Files
- `005-improve-memory-leak-tests/plan.md` - Improvement strategy

### Quick Summary
- **Improvements:** Remove unused code, add explicit tracking, add benchmarks
- **Duration:** 0.5-1 day (4-6 hours)

### Key Changes
- Remove unused `_waitForCleanup` helper
- Add `InstanceTracker` utility for explicit reference tracking
- Add performance benchmarks
- Document memory management patterns

---

## Implementation Order Recommendations

### Parallel Track (Recommended)
Since all items are independent, they can be worked on in parallel by different team members:

**Track A (Critical Path):**
1. #001 - Fix Strict Mode (2-3 days)

**Track B (Test Improvements):**
1. #002 - Consolidate KeepAlive (1 day)
2. #003 - React 18+ Tests (1-2 days)
3. #004 - Error Boundaries (0.5-1 day)
4. #005 - Memory Leaks (0.5-1 day)

**Total Parallel Time:** 2-3 days (with 2 people)

### Sequential Track
If working alone:

**Week 1:**
- Day 1-2: #001 (Critical - Strict Mode fix)
- Day 3: #002 (High - KeepAlive consolidation)
- Day 4-5: #003 (High - React 18+ tests)

**Week 2:**
- Day 1: #004 (Medium - Error boundaries)
- Day 2: #005 (Medium - Memory leaks)

**Total Sequential Time:** 5-8 days

---

## Success Metrics

After completing all action items:

### Quantitative Improvements
- **Test Files:** -3 files (consolidation)
- **Test Lines:** -850 lines (deleted) + 400 lines (new tests) = -450 net
- **Coverage:** Maintained or improved
- **Critical Bugs Fixed:** 1 (Strict Mode)

### Qualitative Improvements
- ✅ React 18+ compatibility guaranteed
- ✅ Reduced maintenance burden
- ✅ Better test organization
- ✅ More comprehensive coverage
- ✅ Improved reliability

---

## Getting Started

### For Action Item #001 (Critical)
```bash
# Start with research
cd spec/001-fix-strict-mode-disposal
cat research.md  # Understand the problem
cat plan.md      # Review the solution
cat tasks.md     # Follow the tasks

# Begin implementation
cd packages/blac/src
# Follow Phase 1 tasks
```

### For Action Item #002 (High)
```bash
cd spec/002-consolidate-keepalive-tests
cat plan.md      # Review consolidation strategy
cat tasks.md     # Follow the analysis tasks

# Start analysis
cd packages/blac/src/__tests__
# Read all keepalive-*.test.ts files
```

### For Other Items
Each directory contains a `plan.md` with complete instructions.

---

## Document Structure

Each action item directory contains:

### research.md (if applicable)
- Problem statement
- Root cause analysis
- Research questions
- Investigation tasks
- Hypotheses
- Verification criteria

### plan.md
- Executive summary
- Solution architecture
- Implementation phases
- Testing strategy
- Risk mitigation
- Timeline

### tasks.md (if applicable)
- Granular task checklist
- Time estimates per task
- Acceptance criteria
- Verification steps
- Commit strategy

---

## Contributing

When implementing these action items:

1. **Read the full plan first** - Don't skip ahead
2. **Follow the phases in order** - Dependencies exist within phases
3. **Run tests frequently** - Verify no regressions
4. **Document as you go** - Update docs, add comments
5. **Commit incrementally** - Small, focused commits
6. **Get reviews** - Especially for #001 (critical)

---

## Additional Resources

- **Main Analysis:** `/reports/test-suite-analysis.md`
- **Test Files:** `packages/*/src/__tests__/` and `packages/*/tests/`
- **Documentation:** `apps/docs/`
- **Examples:** `apps/playground/`

---

## Questions?

If you need clarification on any action item:

1. Check the detailed plan in the action item directory
2. Review the research document (if available)
3. Read the main test analysis report
4. Check git history for context
5. Ask for clarification with specific questions

---

## Status Dashboard

Track progress here:

### Week 1 Progress
- [ ] #001 Phase 1: Configuration ⏹️
- [ ] #001 Phase 2: BlocBase Updates ⏹️
- [ ] #001 Phase 3: Strict Mode Detection ⏹️
- [ ] #001 Phase 4: React Tests ⏹️
- [ ] #001 Phase 5: Documentation ⏹️
- [ ] #002 Analysis Complete ⏹️
- [ ] #002 Consolidation Complete ⏹️

### Week 2 Progress
- [ ] #003 useTransition Tests ⏹️
- [ ] #003 useDeferredValue Tests ⏹️
- [ ] #003 Suspense Tests ⏹️
- [ ] #003 Concurrent Tests ⏹️
- [ ] #004 Error Boundary Tests ⏹️
- [ ] #005 Memory Leak Improvements ⏹️

### Completion
- [ ] All action items complete
- [ ] Full test suite passes
- [ ] Coverage maintained/improved
- [ ] Documentation updated
- [ ] Ready for release

---

**Last Updated:** 2025-10-07
**Total Pages:** ~15 pages of detailed planning
**Ready to Execute:** ✅

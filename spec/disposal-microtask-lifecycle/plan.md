# Implementation Plan: Disposal System Refactor

**Feature:** Microtask-based disposal with lifecycle hooks
**Version:** 2.0.0-rc.2
**Date:** 2025-01-10
**Status:** Ready for Implementation
**Breaking Changes:** Yes

---

## Executive Summary

This plan details the implementation of deterministic microtask-based disposal to replace the current timeout-based disposal system. The implementation follows **Option 1** from the discussion phase: using `queueMicrotask()` for disposal scheduling with synchronous lifecycle hooks.

**Key Changes:**
- Remove timeout-based disposal and related configs
- Implement microtask-based disposal scheduling
- Add `onDisposalScheduled` lifecycle hook
- Block state emissions on non-ACTIVE blocs
- Maintain 4-state lifecycle model with improved transitions

**Estimated Total Effort:** 18-24 hours (2.5-3 days)

---

## Phase 1: Core Architecture Refactor

**Goal:** Replace timeout-based disposal with microtask-based disposal in `BlocLifecycleManager`

**File:** `/packages/blac/src/lifecycle/BlocLifecycle.ts`

### Tasks

#### [✅] #P #S:m Task 1.1: Refactor disposal state tracking
**Description:** Update `BlocLifecycleManager` to track microtask references instead of timers

**Changes:**
```typescript
// REMOVE
private disposalTimer?: NodeJS.Timeout;

// ADD
private disposalMicrotaskScheduled: boolean = false;
```

**Rationale:** Microtasks cannot be cancelled by reference like timers, so we track scheduling state instead.

**Files to modify:**
- `/packages/blac/src/lifecycle/BlocLifecycle.ts`

**Estimated effort:** 30 minutes

---

#### [✅] #P #S:m Task 1.2: Implement microtask disposal scheduling
**Description:** Replace `scheduleDisposal()` implementation with microtask-based approach

**Current signature:**
```typescript
scheduleDisposal(delay: number, canDispose: () => boolean, onDispose: () => void): void
```

**New signature:**
```typescript
scheduleDisposal(canDispose: () => boolean, onDispose: () => void): void
```

**Implementation:**
```typescript
scheduleDisposal(canDispose: () => boolean, onDispose: () => void): void {
  // Prevent duplicate scheduling
  if (this.disposalMicrotaskScheduled) {
    return;
  }

  // Transition ACTIVE → DISPOSAL_REQUESTED
  if (!this.atomicStateTransition(
    BlocLifecycleState.ACTIVE,
    BlocLifecycleState.DISPOSAL_REQUESTED
  )) {
    return; // Already in disposal process
  }

  // Mark as scheduled
  this.disposalMicrotaskScheduled = true;

  // Queue disposal check
  queueMicrotask(() => {
    this.disposalMicrotaskScheduled = false;

    // Check if disposal should proceed
    if (canDispose() && this.currentState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      onDispose();
    } else if (this.currentState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      // Revert to ACTIVE (resubscription occurred)
      this.atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.ACTIVE
      );
    }
  });
}
```

**Files to modify:**
- `/packages/blac/src/lifecycle/BlocLifecycle.ts`

**Estimated effort:** 1 hour

---

#### [ ] #P #S:s Task 1.3: Update disposal cancellation logic
**Description:** Simplify `cancelDisposal()` for microtask-based approach

**Implementation:**
```typescript
cancelDisposal(): boolean {
  if (this.currentState === BlocLifecycleState.DISPOSAL_REQUESTED) {
    // Clear scheduled flag (microtask will check state and abort)
    this.disposalMicrotaskScheduled = false;

    // Transition back to ACTIVE
    const success = this.atomicStateTransition(
      BlocLifecycleState.DISPOSAL_REQUESTED,
      BlocLifecycleState.ACTIVE
    );

    return success;
  }

  return false;
}
```

**Files to modify:**
- `/packages/blac/src/lifecycle/BlocLifecycle.ts`

**Estimated effort:** 30 minutes

---

#### [✅] #S:s Task 1.4: Update BlocBase disposal scheduling call
**Description:** Update `BlocBase._scheduleDisposal()` to remove delay parameter

**Current:**
```typescript
this._lifecycleManager.scheduleDisposal(
  this._getDisposalTimeout(),
  () => this._canDispose(),
  () => this.dispose()
);
```

**New:**
```typescript
this._lifecycleManager.scheduleDisposal(
  () => this._canDispose(),
  () => this.dispose()
);
```

**Files to modify:**
- `/packages/blac/src/BlocBase.ts`

**Estimated effort:** 15 minutes

**Dependencies:** Tasks 1.1, 1.2

---

## Phase 2: Lifecycle Hooks

**Goal:** Add `onDisposalScheduled` and `onDispose` lifecycle hooks to `BlocBase`

**File:** `/packages/blac/src/BlocBase.ts`

### Tasks

#### [✅] #P #S:s Task 2.1: Add lifecycle hook properties
**Description:** Add optional hook properties to `BlocBase`

**Implementation:**
```typescript
abstract class BlocBase<S> {
  /**
   * Called synchronously when disposal is scheduled (subscriptionCount === 0).
   * Use this to clean up intervals, timers, pending promises, and other resources
   * that might prevent disposal.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal
   * - Called before disposal microtask is queued
   * - Cannot prevent disposal (that's what plugins are for)
   *
   * @example
   * ```typescript
   * class TimerCubit extends Cubit<number> {
   *   interval?: NodeJS.Timeout;
   *
   *   constructor() {
   *     super(0);
   *
   *     this.onDisposalScheduled = () => {
   *       if (this.interval) {
   *         clearInterval(this.interval);
   *         this.interval = undefined;
   *       }
   *     };
   *
   *     this.interval = setInterval(() => {
   *       this.emit(this.state + 1);
   *     }, 100);
   *   }
   * }
   * ```
   */
  onDisposalScheduled?: () => void;

  /**
   * Called when disposal completes (bloc is fully disposed).
   * Use for final cleanup like closing connections, clearing caches, etc.
   *
   * IMPORTANT:
   * - Must be synchronous (no async/await)
   * - Errors are logged but do not prevent disposal completion
   * - Called after all subscriptions are cleared
   *
   * @example
   * ```typescript
   * class DatabaseBloc extends Bloc<DbState, DbEvents> {
   *   constructor(private connection: DbConnection) {
   *     super(initialState);
   *
   *     this.onDispose = () => {
   *       this.connection.close();
   *     };
   *   }
   * }
   * ```
   */
  onDispose?: () => void;
}
```

**Files to modify:**
- `/packages/blac/src/BlocBase.ts`

**Estimated effort:** 30 minutes

---

#### [✅] #S:m Task 2.2: Implement onDisposalScheduled hook execution
**Description:** Call `onDisposalScheduled` hook in `_scheduleDisposal()` with error handling

**Implementation:**
```typescript
protected _scheduleDisposal(): void {
  // Call cleanup hook synchronously BEFORE scheduling disposal
  if (this.onDisposalScheduled) {
    try {
      this.onDisposalScheduled();
    } catch (error) {
      // Log error but don't crash - disposal must proceed
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Error in onDisposalScheduled hook:`,
        error
      );
      // Continue with disposal
    }
  }

  // Schedule disposal (Task 1.2)
  this._lifecycleManager.scheduleDisposal(
    () => this._canDispose(),
    () => this.dispose()
  );
}
```

**Files to modify:**
- `/packages/blac/src/BlocBase.ts`

**Estimated effort:** 30 minutes

**Dependencies:** Task 2.1

---

#### [✅] #S:m Task 2.3: Implement onDispose hook execution
**Description:** Call `onDispose` hook in `dispose()` method with error handling

**Implementation:**
```typescript
dispose(): void {
  // ... existing disposal logic (state transitions, subscription clearing, etc.)

  // Call onDispose hook before final cleanup
  if (this.onDispose) {
    try {
      this.onDispose();
    } catch (error) {
      // Log error but don't crash - disposal must complete
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Error in onDispose hook:`,
        error
      );
      // Continue with disposal
    }
  }

  // ... remaining disposal logic (plugin notifications, final state transition)
}
```

**Files to modify:**
- `/packages/blac/src/BlocBase.ts`

**Estimated effort:** 30 minutes

**Dependencies:** Task 2.1

---

## Phase 3: Emission Control

**Goal:** Block state emissions on non-ACTIVE blocs to prevent interval bug

**File:** `/packages/blac/src/BlocBase.ts`

### Tasks

#### [✅] #S:m Task 3.1: Update _pushState emission guard
**Description:** Modify `_pushState()` to only allow emissions on ACTIVE blocs

**Current behavior:**
```typescript
// Allows emissions on ACTIVE and DISPOSAL_REQUESTED
if (this._lifecycleManager.isDisposed) {
  // Only blocks DISPOSING and DISPOSED
  return;
}
```

**New behavior:**
```typescript
_pushState(newState: S, oldState: S, action?: unknown): void {
  const currentState = this._lifecycleManager.currentState;

  // Only allow emissions on ACTIVE blocs
  if (currentState !== BlocLifecycleState.ACTIVE) {
    this.blacInstance?.error(
      `[${this._name}:${this._id}] Cannot emit state on ${currentState} bloc. ` +
      `State update ignored. ` +
      `If this bloc uses setInterval/setTimeout, clean up in onDisposalScheduled hook.`
    );
    return;
  }

  // ... rest of emission logic
}
```

**Rationale:** Blocking emissions on DISPOSAL_REQUESTED prevents intervals from keeping blocs "alive" indefinitely.

**Files to modify:**
- `/packages/blac/src/BlocBase.ts`

**Estimated effort:** 45 minutes

---

#### [✅] #S:s Task 3.2: Verify emit() and patch() consistency
**Description:** Ensure both `emit()` and `patch()` use `_pushState()` and are affected identically

**Verification steps:**
1. Confirm `emit()` calls `_pushState()`
2. Confirm `patch()` calls `_pushState()`
3. Confirm no other code paths can bypass `_pushState()` guard

**Files to review:**
- `/packages/blac/src/BlocBase.ts`
- `/packages/blac/src/Cubit.ts`
- `/packages/blac/src/Bloc.ts`

**Estimated effort:** 30 minutes

**Dependencies:** Task 3.1

---

## Phase 4: Configuration Removal

**Goal:** Remove deprecated disposal configuration options

### Tasks

#### [✅] #P #S:s Task 4.1: Remove disposalTimeout from BlacConfig
**Description:** Remove `disposalTimeout` property and validation

**Files to modify:**
- `/packages/blac/src/BlacConfig.ts` - Remove property from interface
- `/packages/blac/src/BlacConfigValidator.ts` - Remove validation logic

**Changes:**
```typescript
// REMOVE from BlacConfig interface
export interface BlacConfig {
  // disposalTimeout?: number; // ❌ REMOVE THIS
}

// REMOVE from validation
export class BlacConfigValidator {
  static validate(config: Partial<BlacConfig>): void {
    // Remove disposalTimeout validation
  }
}
```

**Estimated effort:** 20 minutes

---

#### [✅] #P #S:s Task 4.2: Remove strictModeCompatibility from BlacConfig
**Description:** Remove dead code for `strictModeCompatibility` config

**Files to modify:**
- `/packages/blac/src/BlacConfig.ts`
- `/packages/blac/src/BlacConfigValidator.ts`

**Estimated effort:** 15 minutes

---

#### [✅] #S:s Task 4.3: Remove _getDisposalTimeout() method
**Description:** Remove method that retrieves disposal timeout from config/static property

**Files to modify:**
- `/packages/blac/src/BlocBase.ts` - Remove `_getDisposalTimeout()` method

**Implementation:**
```typescript
// ❌ REMOVE THIS METHOD
protected _getDisposalTimeout(): number {
  // ... implementation
}
```

**Estimated effort:** 10 minutes

**Dependencies:** Tasks 1.4, 4.1

---

#### [✅] #S:s Task 4.4: Remove static disposalTimeout support
**Description:** Remove documentation and references to `static disposalTimeout` on bloc classes

**Files to search and update:**
- Search for `disposalTimeout` across codebase
- Remove from examples and documentation comments
- Remove any type definitions related to it

**Search command:**
```bash
rg -n "disposalTimeout" --type ts
```

**Estimated effort:** 30 minutes

**Dependencies:** Tasks 4.1, 4.3

---

## Phase 5: Testing

**Goal:** Comprehensive test coverage for new disposal behavior

**Files:** Various test files in `/packages/blac/src/__tests__/` and `/packages/blac-react/src/__tests__/`

### Tasks

#### [ ] #S:l Task 5.1: Create microtask disposal test suite
**Description:** Add comprehensive tests for microtask-based disposal

**New test file:** `/packages/blac/src/__tests__/BlocBase.disposal.microtask.test.ts`

**Test cases:**
```typescript
describe('Microtask Disposal', () => {
  it('should not dispose synchronously', () => {
    // unsubscribe() should not dispose immediately
  });

  it('should dispose on next microtask', async () => {
    // await Promise.resolve() should trigger disposal
  });

  it('should cancel disposal on resubscription', async () => {
    // resubscribe before microtask runs
  });

  it('should transition ACTIVE → DISPOSAL_REQUESTED → DISPOSING → DISPOSED', async () => {
    // verify state transitions
  });

  it('should prevent duplicate disposal scheduling', () => {
    // multiple unsubscribe calls
  });

  it('should handle rapid subscribe/unsubscribe cycles', async () => {
    // stress test
  });
});
```

**Estimated effort:** 2 hours

---

#### [ ] #S:m Task 5.2: Add lifecycle hook tests
**Description:** Test `onDisposalScheduled` and `onDispose` hook execution

**New test file:** `/packages/blac/src/__tests__/BlocBase.lifecycle-hooks.test.ts`

**Test cases:**
```typescript
describe('Lifecycle Hooks', () => {
  it('should call onDisposalScheduled synchronously', () => {
    // hook called before microtask
  });

  it('should call onDispose when disposal completes', async () => {
    // hook called during dispose()
  });

  it('should handle hook errors gracefully', async () => {
    // log error, continue disposal
  });

  it('should not call hooks if disposal is cancelled', () => {
    // resubscription prevents disposal
  });

  it('should clean up interval in onDisposalScheduled', async () => {
    // interval cleanup pattern
  });

  it('should work with both hooks defined', async () => {
    // both onDisposalScheduled and onDispose
  });
});
```

**Estimated effort:** 1.5 hours

---

#### [ ] #S:m Task 5.3: Add emission control tests
**Description:** Test that emissions are blocked on non-ACTIVE blocs

**New test file:** `/packages/blac/src/__tests__/BlocBase.emission-control.test.ts`

**Test cases:**
```typescript
describe('Emission Control', () => {
  it('should allow emissions on ACTIVE bloc', () => {
    // normal operation
  });

  it('should block emissions on DISPOSAL_REQUESTED bloc', () => {
    // after unsubscribe, before microtask
  });

  it('should block emissions on DISPOSING bloc', () => {
    // during disposal
  });

  it('should block emissions on DISPOSED bloc', () => {
    // after disposal
  });

  it('should log helpful error for blocked emission', () => {
    // error message mentions onDisposalScheduled
  });

  it('should block both emit() and patch()', () => {
    // both methods affected
  });
});
```

**Estimated effort:** 1.5 hours

---

#### [ ] #S:l Task 5.4: Fix interval disposal test
**Description:** Update existing failing test to use new hook pattern

**File to update:** `/packages/blac/src/__tests__/BlocBase.disposal.test.ts` (or similar)

**Changes:**
```typescript
// OLD (failing test)
it('should dispose bloc with interval', async () => {
  class IntervalCubit extends Cubit<number> {
    interval = setInterval(() => this.emit(this.state + 1), 50);
  }

  const cubit = new IntervalCubit();
  const unsub = cubit.subscribe(() => {});
  unsub();

  await new Promise(resolve => setTimeout(resolve, 200));
  expect(cubit.isDisposed).toBe(true); // ❌ FAILS
});

// NEW (should pass)
it('should dispose bloc with interval using cleanup hook', async () => {
  class IntervalCubit extends Cubit<number> {
    interval?: NodeJS.Timeout;

    constructor() {
      super(0);

      this.onDisposalScheduled = () => {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = undefined;
        }
      };

      this.interval = setInterval(() => this.emit(this.state + 1), 50);
    }
  }

  const cubit = new IntervalCubit();
  const unsub = cubit.subscribe(() => {});
  unsub();

  await Promise.resolve(); // Flush microtask
  expect(cubit.isDisposed).toBe(true); // ✅ PASSES
});
```

**Estimated effort:** 1 hour

---

#### [ ] #S:l Task 5.5: Update React Strict Mode tests
**Description:** Update Strict Mode tests to work with microtask disposal

**File to update:** `/packages/blac-react/src/__tests__/useBloc.strictMode.test.tsx`

**Changes:**
- Remove timeout-based waiting (`setTimeout`)
- Use `await Promise.resolve()` for microtask flushing
- Verify disposal is cancelled on remount
- Add tests for emission blocking

**Test cases to verify/update:**
```typescript
it('should not dispose on Strict Mode remount', async () => {
  // Mount → Unmount → Remount (synchronous)
  // Bloc should NOT dispose
});

it('should handle multiple Strict Mode cycles', async () => {
  // Multiple mount/unmount cycles
});

it('should dispose after final unmount in Strict Mode', async () => {
  // Final unmount → await microtask → disposed
});
```

**Estimated effort:** 2 hours

---

#### [ ] #S:m Task 5.6: Update existing disposal tests
**Description:** Update all existing disposal tests to use microtask pattern

**Files to update:**
- `/packages/blac/src/__tests__/BlocBase.disposal.test.ts`
- `/packages/blac/src/__tests__/Cubit.test.ts`
- `/packages/blac/src/__tests__/Bloc.test.ts`

**Pattern to apply:**
```typescript
// BEFORE
await new Promise(resolve => setTimeout(resolve, 150));

// AFTER
await Promise.resolve(); // Flush microtask queue
```

**Search command:**
```bash
rg -n "setTimeout.*resolve.*\d+" --type ts packages/blac/src/__tests__/
```

**Estimated effort:** 2 hours

---

#### [ ] #S:s Task 5.7: Add performance benchmark
**Description:** Add benchmark to verify disposal is faster than timeout approach

**File to update:** `/apps/perf/src/__tests__/performance-benchmarks.test.ts` (or create new)

**Benchmark cases:**
```typescript
describe('Disposal Performance', () => {
  it('should dispose within 1ms', async () => {
    const start = performance.now();
    const cubit = new TestCubit();
    const unsub = cubit.subscribe(() => {});
    unsub();
    await Promise.resolve();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1); // Sub-millisecond
    expect(cubit.isDisposed).toBe(true);
  });

  it('should handle 1000 rapid disposal cycles', async () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      const cubit = new TestCubit();
      const unsub = cubit.subscribe(() => {});
      unsub();
      await Promise.resolve();
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // <1ms per disposal
  });
});
```

**Estimated effort:** 1 hour

---

## Phase 6: Documentation

**Goal:** Update documentation for new disposal behavior and migration guide

### Tasks

#### [ ] #S:m Task 6.1: Update API documentation
**Description:** Update JSDoc comments and TypeScript types

**Files to update:**
- `/packages/blac/src/BlocBase.ts` - Lifecycle hooks (done in Task 2.1)
- `/packages/blac/src/BlacConfig.ts` - Remove disposed options
- `/packages/blac/README.md` - Update disposal section

**Changes:**
- Document `onDisposalScheduled` hook with examples
- Document `onDispose` hook with examples
- Remove all references to `disposalTimeout`
- Add migration notes

**Estimated effort:** 1 hour

---

#### [ ] #S:m Task 6.2: Write migration guide
**Description:** Create comprehensive migration guide for v2.0

**New file:** `/packages/blac/MIGRATION_V2.md`

**Content:**
```markdown
# Migration Guide: v1.x → v2.0

## Breaking Changes

### 1. Removal of `disposalTimeout` Configuration
**REMOVED:**
- `Blac.setConfig({ disposalTimeout: number })`
- `static disposalTimeout` on bloc classes

**Migration:** No action needed. Disposal is now deterministic (microtask-based).

### 2. Emission Behavior Change
**OLD:** State emissions allowed on `DISPOSAL_REQUESTED` blocs
**NEW:** State emissions blocked on `DISPOSAL_REQUESTED` blocs

**Migration:** Add `onDisposalScheduled` hook to clean up intervals/timers.

### 3. New Lifecycle Hooks
**ADDED:**
- `onDisposalScheduled` - Called when disposal is scheduled
- `onDispose` - Called when disposal completes

**Migration:** Use these hooks for cleanup.

## Common Patterns

### Pattern 1: Cleaning Up Intervals
[Example code]

### Pattern 2: Cleaning Up Timers
[Example code]

### Pattern 3: Cancelling Async Operations
[Example code]
```

**Estimated effort:** 1.5 hours

---

#### [ ] #S:s Task 6.3: Add code examples
**Description:** Add practical examples to docs and demo app

**Files to create/update:**
- `/packages/blac/examples/lifecycle-hooks.ts` - Lifecycle hook examples
- `/apps/playground/src/examples/disposal-patterns.tsx` - Interactive examples
- `/apps/docs/pages/guides/lifecycle.mdx` - Documentation page

**Examples to include:**
1. Basic interval cleanup
2. Timer cleanup
3. Async operation cancellation
4. Resource cleanup (connections, caches)
5. Error handling in hooks

**Estimated effort:** 2 hours

---

#### [ ] #S:s Task 6.4: Update troubleshooting guide
**Description:** Add common issues and solutions

**File to update:** `/apps/docs/pages/troubleshooting.mdx`

**New sections:**
- "Bloc with interval not disposing" → Use `onDisposalScheduled`
- "Cannot emit state on disposed bloc" → Check lifecycle state
- "React Strict Mode disposal issues" → Explain microtask behavior

**Estimated effort:** 45 minutes

---

## Phase 7: Integration & Verification

**Goal:** Ensure all changes integrate correctly and pass CI

### Tasks

#### [ ] #S:m Task 7.1: Run full test suite
**Description:** Verify all tests pass

**Commands:**
```bash
pnpm test                    # All tests
pnpm test:watch              # Watch mode
pnpm coverage                # Coverage report
```

**Success criteria:**
- All tests pass (or intentionally updated)
- No memory leaks (use `--expose-gc` for GC tests)
- Coverage ≥90% for disposal-related code

**Estimated effort:** 1 hour (includes fixing failures)

**Dependencies:** All testing tasks (Phase 5)

---

#### [ ] #S:s Task 7.2: Run type checking
**Description:** Verify no TypeScript errors

**Commands:**
```bash
pnpm typecheck               # All packages
pnpm -w run typecheck        # Workspace root
```

**Success criteria:**
- No TypeScript errors
- No type regressions

**Estimated effort:** 30 minutes

**Dependencies:** All code tasks (Phases 1-4)

---

#### [ ] #S:s Task 7.3: Run linter
**Description:** Verify code quality

**Commands:**
```bash
pnpm lint                    # All packages
pnpm lint:fix                # Auto-fix issues
```

**Success criteria:**
- No ESLint errors
- All auto-fixable issues resolved

**Estimated effort:** 20 minutes

---

#### [ ] #S:m Task 7.4: Test demo applications
**Description:** Manually test playground and demo apps

**Apps to test:**
- `/apps/playground` - Interactive editor
- `/apps/perf` - Performance tests
- `/apps/docs` - Documentation site

**Test scenarios:**
1. Create bloc with interval → unmount → verify disposal
2. React Strict Mode behavior
3. Multiple rapid mount/unmount cycles
4. Error handling in hooks

**Estimated effort:** 1 hour

---

#### [ ] #S:s Task 7.5: Create changeset
**Description:** Generate changeset for version bump

**Command:**
```bash
pnpm changeset
```

**Changeset content:**
```
---
"@blac/core": major
"@blac/react": major
---

# Breaking: Microtask-based disposal system

## Major Changes
- Removed `disposalTimeout` configuration
- Removed `strictModeCompatibility` configuration
- Added `onDisposalScheduled` lifecycle hook
- Added `onDispose` lifecycle hook
- Changed behavior: State emissions now blocked on DISPOSAL_REQUESTED blocs

## Migration Guide
See MIGRATION_V2.md for full migration instructions.

## Fixes
- Fixed interval disposal bug (blocs with intervals now dispose correctly)
- Fixed React Strict Mode disposal timing issues
- Improved disposal determinism and predictability
```

**Estimated effort:** 15 minutes

---

## Phase 8: Documentation & Release Prep

**Goal:** Finalize documentation and prepare for release

### Tasks

#### [ ] #S:m Task 8.1: Update CHANGELOG
**Description:** Document all changes in CHANGELOG.md

**File to update:** `/packages/blac/CHANGELOG.md`

**Sections to add:**
- Breaking Changes
- New Features
- Bug Fixes
- Migration Guide link

**Estimated effort:** 45 minutes

---

#### [ ] #S:s Task 8.2: Update README badges
**Description:** Ensure README reflects v2.0 status

**Files to update:**
- `/packages/blac/README.md`
- `/README.md` (root)

**Changes:**
- Update version badges
- Add "v2.0" callout if appropriate

**Estimated effort:** 15 minutes

---

#### [ ] #S:m Task 8.3: Review and merge
**Description:** Final code review and merge to main branch

**Steps:**
1. Self-review all changes
2. Run final test suite
3. Create pull request
4. Address review feedback
5. Merge to `v1` branch (main)

**Estimated effort:** 1-2 hours

---

## Dependencies & Critical Path

### Critical Path (Must be done sequentially)

1. **Phase 1** → **Phase 2** → **Phase 3** → **Phase 5**
   - Core refactor must be done before hooks, hooks before emission control, all before testing

2. **Phase 4** can be done in parallel with **Phase 2-3** (#P tasks)

3. **Phase 6** can be done in parallel with **Phase 5** (#P tasks in Phase 6)

4. **Phase 7** requires all previous phases complete

5. **Phase 8** requires Phase 7 complete

### Parallelization Opportunities

**Can be done concurrently:**
- Task 1.1, 1.2, 1.3 (all marked #P)
- Task 4.1, 4.2 (remove configs in parallel with core refactor)
- Task 6.1, 6.2, 6.3 (documentation tasks)
- Task 5.1, 5.2, 5.3 (new test suites)

**Must be sequential:**
- Task 1.4 depends on 1.1, 1.2 (updated signature)
- Task 2.2, 2.3 depend on 2.1 (hook properties must exist)
- Task 3.2 depends on 3.1 (emission guard must be implemented)
- Task 7.1 depends on all Phase 5 tasks (tests must exist)

---

## Risk Assessment & Mitigations

### High-Priority Risks

#### Risk 1: Existing tests fail due to timing changes
**Likelihood:** High
**Impact:** Medium (delays release)
**Mitigation:**
- Thorough review of all disposal-related tests (Task 5.6)
- Use `await Promise.resolve()` pattern consistently
- Add explicit state transition checks

#### Risk 2: Plugin compatibility issues
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Test persistence plugin and render-logging plugin
- Verify plugin hooks still work correctly
- Document plugin API changes (if any)

#### Risk 3: Performance regression
**Likelihood:** Low
**Impact:** High (unacceptable)
**Mitigation:**
- Add performance benchmarks (Task 5.7)
- Profile before/after
- Target: Sub-millisecond disposal

### Medium-Priority Risks

#### Risk 4: Migration guide unclear
**Likelihood:** Medium
**Impact:** Medium (bad user experience)
**Mitigation:**
- Comprehensive examples (Task 6.3)
- Clear migration guide (Task 6.2)
- Helpful error messages (Task 3.1)

#### Risk 5: Edge cases not covered
**Likelihood:** Medium
**Impact:** Medium
**Mitigation:**
- Comprehensive test coverage (≥90%)
- Manual testing of demo apps (Task 7.4)
- Test rapid subscribe/unsubscribe cycles

---

## Success Criteria

### Must Pass (Ship Blockers)
- [ ] All existing tests pass or are intentionally updated
- [ ] Interval disposal test passes (Task 5.4)
- [ ] React Strict Mode tests pass (Task 5.5)
- [ ] No memory leaks
- [ ] No performance regression (<1ms disposal)
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes with no errors

### Should Pass (Quality Gates)
- [ ] Test coverage ≥90% for disposal code
- [ ] All edge cases tested (Phase 5)
- [ ] Migration guide complete (Task 6.2)
- [ ] API documentation complete (Task 6.1)
- [ ] Demo apps work correctly (Task 7.4)
- [ ] Helpful error messages (Task 3.1)

### Nice to Have (Future Enhancements)
- [ ] Devtools integration for disposal visualization
- [ ] Performance metrics collection
- [ ] Generator-based disposal (v2.2+)

---

## Timeline Estimate

### Optimistic (Single developer, no blockers): 18 hours
- Phase 1: 2.5 hours
- Phase 2: 1.5 hours
- Phase 3: 1.25 hours
- Phase 4: 1.25 hours
- Phase 5: 11 hours
- Phase 6: 5.25 hours
- Phase 7: 2.75 hours
- Phase 8: 2.5 hours

### Realistic (Including reviews, breaks, blockers): 24 hours
- Account for test debugging: +3 hours
- Account for integration issues: +2 hours
- Account for review cycles: +1 hour

### Pessimistic (Multiple blockers, major issues): 32 hours
- Significant test failures: +5 hours
- Unexpected edge cases: +3 hours

**Recommended schedule:** 3 full days (8 hours/day)

---

## Post-Implementation Checklist

After implementation, verify:

- [ ] All tasks marked complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration guide reviewed
- [ ] Changeset created
- [ ] Demo apps tested
- [ ] Performance benchmarks run
- [ ] No memory leaks
- [ ] Code review complete
- [ ] Ready to merge

---

## Related Documents

### Specification Phase
- [specifications.md](./specifications.md) - Requirements and constraints
- [research.md](./research.md) - Technical research and findings
- [discussion.md](./discussion.md) - Design decisions and alternatives

### Codebase References
- `/packages/blac/src/lifecycle/BlocLifecycle.ts` - Lifecycle management
- `/packages/blac/src/BlocBase.ts` - Base class implementation
- `/packages/blac/src/BlacConfig.ts` - Configuration system
- `/packages/blac-react/src/__tests__/useBloc.strictMode.test.tsx` - Strict Mode tests

### Related Work
- `/spec/001-fix-strict-mode-disposal/plan.md` - Previous disposal work
- `/blac-improvements.md` - Overall architecture improvements
- `/reports/disposal-refactor-plan.md` - Initial planning

---

**Plan Version:** 1.0
**Date:** 2025-01-10
**Status:** ✅ Ready for Implementation
**Approved By:** Expert Council (Butler Lampson, Nancy Leveson, Matt Blaze, Barbara Liskov, Alan Kay, Don Norman, Leslie Lamport, Michael Feathers)

**Next Step:** Begin Phase 1 (Core Architecture Refactor)

# Disposal System Refactor: Remove Timeouts, Add Proper Lifecycle

**Status:** Planning
**Priority:** Critical
**Breaking Changes:** Yes (pre-release v2.0)

---

## Executive Summary

**Problem:** The current disposal system uses arbitrary timeouts (100ms) which:
1. ❌ Fails for blocs with intervals/timers (they keep themselves alive indefinitely)
2. ❌ Creates race conditions with React Strict Mode
3. ❌ Is non-deterministic (magic numbers)
4. ❌ Doesn't provide cleanup hooks for async operations

**Solution:** Remove timeouts entirely and implement:
1. ✅ Microtask-based disposal (deterministic, Strict Mode compatible)
2. ✅ Lifecycle hooks for cleanup (`onDisposalScheduled`)
3. ✅ Block state emissions on disposal-pending blocs
4. ✅ Remove dead config options (`strictModeCompatibility`)

**Impact:** This properly solves the interval bug, Strict Mode issues, and provides a solid foundation for future improvements.

---

## -- COUNCIL REVIEW --

**Task:** Replace timeout-based disposal with microtask-based deterministic lifecycle

**Approach:** Use microtask queue for disposal (like SubscriptionManager already does for WeakRef cleanup)

**Council's Key Concern(s):**
• **Butler Lampson:** "Microtasks are the right primitive for 'do this after current work'. Much clearer than arbitrary timeouts."
• **Nancy Leveson:** "But we MUST add cleanup hooks. Otherwise intervals still break the system."
• **Barbara Liskov:** "Block emissions during disposal-pending. That's the correct invariant: 'disposal pending means no more work'."
• **Alan Kay:** "This is good, but don't stop here. Reference counting should come next (v2.1)."

**Recommendation:** Proceed with microtask approach + lifecycle hooks + emission blocking

---

## Part 1: Replace Timeouts with Microtasks

### Current Problem
```typescript
// BlocBase.ts:387
_scheduleDisposal(): void {
  const timeout = this._getDisposalTimeout(); // 100ms

  this._lifecycleManager.scheduleDisposal(
    timeout,  // ❌ Arbitrary timeout
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}
```

**Why this fails:**
- React Strict Mode: unmount→remount happens in <1ms (faster than any timeout)
- Intervals: emit state every Nms, keeping bloc alive forever
- Non-deterministic: different timeouts needed for different scenarios

### New Solution: Microtask-Based Disposal

```typescript
// BlocBase.ts
_scheduleDisposal(): void {
  const shouldDispose = this._subscriptionManager.size === 0 && !this._keepAlive;

  if (!shouldDispose) return;

  // Call cleanup hooks IMMEDIATELY
  this.onDisposalScheduled?.();

  // Queue disposal check for next microtask
  // This gives React Strict Mode time to remount
  this._lifecycleManager.scheduleDisposal(
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}
```

```typescript
// BlocLifecycle.ts
class BlocLifecycleManager {
  private disposalState = BlocLifecycleState.ACTIVE;
  private disposalMicrotask: (() => void) | null = null;

  /**
   * Schedule disposal to run after current execution context
   * Uses microtask queue (not timeout) for deterministic behavior
   */
  scheduleDisposal(
    canDispose: () => boolean,
    onDispose: () => void,
  ): void {
    // Cancel any existing disposal
    if (this.disposalMicrotask) {
      this.disposalMicrotask = null; // Cancel by clearing reference
    }

    // Transition to DISPOSAL_REQUESTED
    const transitionResult = this.atomicStateTransition(
      BlocLifecycleState.ACTIVE,
      BlocLifecycleState.DISPOSAL_REQUESTED,
    );

    if (!transitionResult.success) return;

    // Create cancellable disposal callback
    const disposalCallback = () => {
      // Check if disposal was cancelled
      if (this.disposalMicrotask !== disposalCallback) return;
      this.disposalMicrotask = null;

      // Double-check disposal conditions
      if (canDispose() && this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
        onDispose();
      } else {
        // Conditions no longer met, cancel disposal
        this.atomicStateTransition(
          BlocLifecycleState.DISPOSAL_REQUESTED,
          BlocLifecycleState.ACTIVE,
        );
      }
    };

    this.disposalMicrotask = disposalCallback;

    // Queue for next microtask
    queueMicrotask(disposalCallback);
  }

  /**
   * Cancel disposal if in disposal_requested state
   */
  cancelDisposal(): boolean {
    if (this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      // Clear the microtask reference to cancel it
      this.disposalMicrotask = null;

      // Transition back to active
      const result = this.atomicStateTransition(
        BlocLifecycleState.DISPOSAL_REQUESTED,
        BlocLifecycleState.ACTIVE,
      );

      return result.success;
    }
    return false;
  }
}
```

**Why microtasks work:**

1. **React Strict Mode:** Unmount→remount happens synchronously in same task
   - Unmount: subscription removed → scheduleDisposal() → DISPOSAL_REQUESTED
   - **Microtask queued but not executed yet** (current task still running)
   - Remount: new subscription added → cancelDisposal() → ACTIVE
   - Microtask runs: `this.disposalMicrotask !== disposalCallback`, returns early ✅

2. **Deterministic:** No guessing about timing, no magic numbers

3. **Fast:** Production disposal happens on next microtask (~0ms practical delay)

---

## Part 2: Lifecycle Hooks for Cleanup

### The Problem
```typescript
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;

  start = () => {
    this.interval = setInterval(() => {
      this.emit({ count: this.state.count + 1 }); // Keeps bloc alive!
    }, 50);
  };

  // ❌ No way to clean up when disposal is scheduled
  // ❌ Interval continues emitting forever
}
```

### The Solution: `onDisposalScheduled` Hook

```typescript
// BlocBase.ts
abstract class BlocBase<S> {
  /**
   * Called IMMEDIATELY when disposal is scheduled (subscriptionCount === 0).
   * Use this to clean up intervals, timers, pending promises, etc.
   *
   * This runs BEFORE the microtask disposal check, guaranteeing cleanup happens
   * before the bloc tries to dispose.
   */
  onDisposalScheduled?: () => void;

  /**
   * Called when disposal COMPLETES (bloc is fully disposed).
   * Use this for final cleanup (close connections, clear caches, etc.)
   */
  onDispose?: () => void;
}
```

**Usage:**
```typescript
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super({ count: 0, isRunning: false });

    // Set up cleanup hook
    this.onDisposalScheduled = () => {
      // Clear interval IMMEDIATELY when disposal is scheduled
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    };
  }

  start = () => {
    this.interval = setInterval(() => {
      this.emit({ count: this.state.count + 1 });
    }, 50);
  };
}
```

**Benefits:**
- ✅ Intervals/timers cleaned up immediately
- ✅ No more memory leaks from long-running operations
- ✅ Clear, explicit cleanup contract
- ✅ Runs synchronously when disposal is scheduled (not deferred)

---

## Part 3: Block State Emissions on Disposal Pending

Currently, state emissions are **allowed** on DISPOSAL_REQUESTED blocs (BlocBase.ts:189).
This lets intervals keep the bloc alive indefinitely.

### New Rule: Block Emissions During Disposal

```typescript
// BlocBase.ts
_pushState(newState: S, oldState: S, action?: unknown): void {
  const currentState = this._lifecycleManager.currentState;

  // ❌ OLD: Allow emissions on DISPOSAL_REQUESTED
  // ✅ NEW: Only allow emissions on ACTIVE blocs
  if (currentState !== BlocLifecycleState.ACTIVE) {
    this.blacInstance?.warn(
      `[${this._name}:${this._id}] Attempted state update on ${currentState} bloc. Update ignored.`,
    );
    return;
  }

  // ... rest of emission logic
}
```

**Impact:**
- ✅ Intervals can't keep blocs alive during disposal
- ✅ Clear invariant: "disposal pending = no more work"
- ✅ Forces proper use of `onDisposalScheduled` for cleanup

---

## Part 4: Remove Dead/Problematic Configs

### Remove `strictModeCompatibility`
```typescript
// Blac.ts - REMOVE THIS
export interface BlacConfig {
  proxyDependencyTracking?: boolean;
  disposalTimeout?: number;
  strictModeCompatibility?: boolean; // ❌ DELETE - never implemented
}
```

**Why:** Dead code, never used, adds confusion

### Remove `disposalTimeout`
```typescript
// Blac.ts - REMOVE THIS
export interface BlacConfig {
  proxyDependencyTracking?: boolean;
  disposalTimeout?: number; // ❌ DELETE - replaced by microtasks
}
```

**Why:** No longer needed with microtask-based disposal

### Remove `static disposalTimeout` from BlocBase
```typescript
// BlocBase.ts - REMOVE THIS
abstract class BlocBase<S> {
  static disposalTimeout?: number; // ❌ DELETE
}
```

**Why:** No longer needed

---

## Part 5: Update Tests

### Fix the Interval Test
```typescript
// BlocBase.disposal.test.ts:297
it('should dispose cubit with running interval when consumer unmounts', async () => {
  // ... existing test setup ...

  // ✅ Now set up cleanup hook
  cubit.onDisposalScheduled = () => {
    if (cubit.interval) {
      clearInterval(cubit.interval);
      cubit.interval = null;
    }
  };

  // ... rest of test ...

  // Should now pass!
  expect(cubit.isDisposed).toBe(true);
  expect(states.length).toBe(statesAfterDisposal);
});
```

### Add Test for Microtask Disposal
```typescript
it('should dispose on next microtask when subscriptions reach 0', async () => {
  const cubit = new TestCubit();
  const unsub = cubit.subscribe(() => {});

  // Unsubscribe
  unsub();

  // Should be in DISPOSAL_REQUESTED (not disposed yet)
  expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');
  expect(cubit.isDisposed).toBe(false);

  // Flush microtasks
  await Promise.resolve();

  // Should now be disposed
  expect(cubit.isDisposed).toBe(true);
});
```

### Add Test for Microtask Cancellation (Strict Mode)
```typescript
it('should cancel disposal when resubscribing before microtask', async () => {
  const cubit = new TestCubit();
  const unsub1 = cubit.subscribe(() => {});

  // Unsubscribe (schedules disposal for next microtask)
  unsub1();
  expect((cubit as any)._lifecycleManager.currentState).toBe('disposal_requested');

  // Re-subscribe BEFORE microtask runs (simulates Strict Mode remount)
  const unsub2 = cubit.subscribe(() => {});

  // Should cancel disposal immediately
  expect((cubit as any)._lifecycleManager.currentState).toBe('active');

  // Flush microtasks
  await Promise.resolve();

  // Should still be active (disposal was cancelled)
  expect(cubit.isDisposed).toBe(false);

  unsub2();
});
```

---

## Implementation Plan

### Phase 1: Lifecycle Hooks (Low Risk)
**Effort:** 2-3 hours
**Files:**
- `packages/blac/src/BlocBase.ts` - Add `onDisposalScheduled` hook
- `packages/blac/src/__tests__/BlocBase.disposal.test.ts` - Add tests

**Changes:**
```typescript
// BlocBase.ts
_scheduleDisposal(): void {
  // ... existing checks ...

  // NEW: Call cleanup hook immediately
  if (this.onDisposalScheduled) {
    try {
      this.onDisposalScheduled();
    } catch (error) {
      this.blacInstance?.error(
        `[${this._name}:${this._id}] Error in onDisposalScheduled:`,
        error,
      );
    }
  }

  // ... continue with existing disposal logic ...
}
```

**Verification:**
- Add hook to TimerCubit in test
- Verify interval is cleared
- Verify test passes

---

### Phase 2: Replace Timeout with Microtask (Medium Risk)
**Effort:** 4-5 hours
**Files:**
- `packages/blac/src/lifecycle/BlocLifecycle.ts` - Replace timeout with microtask
- `packages/blac/src/BlocBase.ts` - Update `_scheduleDisposal()` call
- `packages/blac/src/__tests__/BlocBase.disposal.test.ts` - Update tests

**Changes:**
1. Rewrite `BlocLifecycleManager.scheduleDisposal()` to use `queueMicrotask`
2. Update `cancelDisposal()` to clear microtask reference
3. Remove `clearTimeout()` logic, replace with reference clearing
4. Update all tests to use `await Promise.resolve()` instead of `vi.advanceTimersByTime()`

**Verification:**
- All existing disposal tests pass
- Strict Mode tests pass
- No timer mocks needed

---

### Phase 3: Block Emissions on Disposal (Medium Risk)
**Effort:** 2-3 hours
**Files:**
- `packages/blac/src/BlocBase.ts` - Update `_pushState()` logic
- `packages/blac/src/__tests__/cubit-emit-disposal.test.ts` - Update tests

**Changes:**
```typescript
// BlocBase.ts:_pushState()
if (currentState !== BlocLifecycleState.ACTIVE) {
  // ❌ OLD: Also allowed DISPOSAL_REQUESTED
  // ✅ NEW: Only ACTIVE
  this.blacInstance?.warn(
    `[${this._name}:${this._id}] State update on ${currentState} bloc ignored.`,
  );
  return;
}
```

**Verification:**
- Update tests that expect emissions on DISPOSAL_REQUESTED to expect blocking
- Add test: emissions during disposal are blocked
- Add test: cleanup hooks work properly

---

### Phase 4: Remove Dead Configs (Low Risk)
**Effort:** 1-2 hours
**Files:**
- `packages/blac/src/Blac.ts` - Remove config options
- `packages/blac/src/BlocBase.ts` - Remove static disposalTimeout
- `packages/blac/src/__tests__/Blac.config.test.ts` - Remove config tests
- Update all tests that use these configs

**Changes:**
1. Remove `strictModeCompatibility` from BlacConfig
2. Remove `disposalTimeout` from BlacConfig
3. Remove `static disposalTimeout` from BlocBase
4. Remove `_getDisposalTimeout()` method
5. Remove validation logic for these configs

**Verification:**
- All tests pass without these configs
- Config validation tests removed/updated

---

### Phase 5: Documentation & Migration (Low Risk)
**Effort:** 2-3 hours
**Files:**
- `CHANGELOG.md`
- `packages/blac/README.md`
- Update JSDoc comments
- Add migration examples

**Content:**
1. Document new `onDisposalScheduled` hook
2. Explain microtask-based disposal
3. Show interval/timer cleanup patterns
4. Note breaking changes (config removal)

---

## Timeline

| Phase | Effort | Risk | Dependencies |
|-------|--------|------|--------------|
| 1. Lifecycle Hooks | 2-3h | Low | None |
| 2. Microtask Disposal | 4-5h | Medium | Phase 1 |
| 3. Block Emissions | 2-3h | Medium | Phase 2 |
| 4. Remove Configs | 1-2h | Low | Phase 3 |
| 5. Documentation | 2-3h | Low | All phases |

**Total:** 11-16 hours (~2 days)

---

## Breaking Changes

### Removed APIs
- ❌ `Blac.setConfig({ disposalTimeout: number })`
- ❌ `Blac.setConfig({ strictModeCompatibility: boolean })`
- ❌ `static disposalTimeout` on Bloc/Cubit classes

### Behavior Changes
- ✅ Disposal happens on next microtask (not after timeout)
- ✅ State emissions blocked during disposal (were allowed before)
- ✅ Cleanup must use `onDisposalScheduled` hook (new requirement)

### Migration Guide
```typescript
// ❌ Before
class MyCubit extends Cubit<MyState> {
  static disposalTimeout = 0; // Immediate disposal
}

// ✅ After
// Just remove it - disposal is now always on next microtask

// ❌ Before
Blac.setConfig({ disposalTimeout: 100 });

// ✅ After
// Just remove it - no longer needed

// ❌ Before (interval keeps bloc alive)
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;

  start = () => {
    this.interval = setInterval(() => {
      this.emit({ count: this.state.count + 1 });
    }, 1000);
  };
}

// ✅ After (proper cleanup)
class TimerCubit extends Cubit<TimerState> {
  private interval: NodeJS.Timeout | null = null;

  constructor() {
    super(initialState);
    this.onDisposalScheduled = () => {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    };
  }

  start = () => {
    this.interval = setInterval(() => {
      this.emit({ count: this.state.count + 1 });
    }, 1000);
  };
}
```

---

## Success Criteria

- ✅ Interval test passes (disposal properly cleans up intervals)
- ✅ All Strict Mode tests pass
- ✅ No flaky tests (deterministic behavior)
- ✅ All existing tests pass (or updated for new behavior)
- ✅ No performance regression
- ✅ Code is simpler (removed complexity)
- ✅ Clear migration guide
- ✅ Proper JSDoc documentation

---

## Future Work (v2.1+)

After this is stable, consider:

1. **Reference Counting** - Track subscriptions properly (mentioned in blac-improvements.md)
2. **Disposal Events** - Emit events for devtools integration
3. **Disposal Metrics** - Track disposal timing for debugging
4. **Async Disposal** - Handle async cleanup operations
5. **Disposal Middleware** - Allow plugins to participate in disposal

---

## Approval

**Technical Review:** ⏸️ Awaiting approval
**Ready to Implement:** ⏸️ Pending approval
**Risk Level:** Medium (breaking changes, but pre-release)
**Recommendation:** Proceed - this fixes fundamental architectural issues

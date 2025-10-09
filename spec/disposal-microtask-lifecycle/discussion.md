# Discussion: Disposal System Implementation Approaches

**Feature:** Microtask-based disposal with lifecycle hooks
**Date:** 2025-01-10
**Status:** Design Review

---

## Executive Summary

**Goal:** Replace timeout-based disposal with deterministic microtask-based disposal and provide lifecycle hooks for resource cleanup.

**Core Problems:**
1. Arbitrary timeout (100ms) causes race conditions with React Strict Mode
2. Blocs with intervals/timers never dispose (interval keeps bloc "alive")
3. Non-deterministic behavior (different timings for different scenarios)

**Key Requirements:**
- Remove `disposalTimeout` and `strictModeCompatibility` configs
- Use microtask scheduling for disposal
- Add `onDisposalScheduled` hook for cleanup
- Block state emissions on non-ACTIVE blocs
- Simple, performant, maintainable

---

## Important Considerations

### 1. React Strict Mode Timing

React 18+ Strict Mode performs synchronous unmount→remount in the same task. Any disposal delay (including microtasks) gives time for cancellation, but timeouts are too slow and non-deterministic.

### 2. Self-Sustaining Operations

Blocs with `setInterval` or `setTimeout` that emit state updates will prevent disposal indefinitely if emissions are allowed on DISPOSAL_REQUESTED blocs. Cleanup hooks are essential.

### 3. Plugin Safety

Plugins must be able to participate in disposal without breaking the system. Error isolation is critical.

### 4. Performance Requirements

Disposal should be as fast as possible while remaining correct. No arbitrary delays.

### 5. Testing Complexity

Microtask-based code requires different testing patterns than timeout-based code.

---

## Common Approaches

### Timeout-Based Disposal (Current)
Used by many libraries for "debouncing" rapid subscribe/unsubscribe cycles.

**Pros:**
- Simple to understand
- Gives "grace period" for resubscription

**Cons:**
- Arbitrary timeout values
- Race conditions
- Fails with React Strict Mode
- Doesn't solve interval bug

### Microtask-Based Disposal
Schedule disposal for next microtask using `queueMicrotask()`.

**Pros:**
- Deterministic timing
- Works with React Strict Mode
- Fast (effectively 0ms)
- Standards-compliant

**Cons:**
- Still needs cleanup hooks for intervals
- Different testing patterns needed

### Immediate Disposal (No Delay)
Dispose synchronously when subscriptionCount hits 0.

**Pros:**
- Simplest possible implementation
- Fastest
- No timing issues

**Cons:**
- Breaks React Strict Mode (disposes before remount)
- No cancellation window
- Too aggressive for prod use

### Reference Counting with `retain()`/`release()`
Explicit API for managing bloc lifecycle.

**Pros:**
- Maximum control
- Deterministic
- Common in other languages (C#, Swift)

**Cons:**
- Manual management required
- More complex API
- We already have implicit reference counting (subscriptionCount)
- Doesn't solve timing issues

---

## Common Mistakes

### Mistake 1: Choosing Arbitrary Timeouts
**Problem:** No timeout value works for all scenarios
**Example:** 16ms too short for Strict Mode, 100ms too long for prod

### Mistake 2: Allowing Emissions During Disposal
**Problem:** Self-sustaining operations (intervals) prevent disposal
**Example:** Timer emits every 50ms → bloc never reaches disposal check

### Mistake 3: Crashing on Hook Errors
**Problem:** User code errors break system
**Example:** Hook throws → disposal fails → memory leak

### Mistake 4: Using `Promise.resolve().then()` for Microtasks
**Problem:** Creates unnecessary promise objects, slower
**Better:** `queueMicrotask()` is standardized and faster

### Mistake 5: No Cancellation Mechanism
**Problem:** Disposal proceeds even when inappropriate
**Example:** Disposal queued → resubscription → disposal still happens

---

## Options Comparison

### Option 1: Microtask Disposal + Synchronous Hooks (Recommended)

**Description:**
- Use `queueMicrotask()` for disposal scheduling
- Add synchronous `onDisposalScheduled` hook
- Block emissions on DISPOSAL_REQUESTED
- Keep 4-state lifecycle model (ACTIVE, DISPOSAL_REQUESTED, DISPOSING, DISPOSED)

**Implementation:**
```typescript
_scheduleDisposal(): void {
  // Call cleanup hook synchronously
  this.onDisposalScheduled?.();

  // Queue disposal check
  queueMicrotask(() => {
    if (subscriptionCount === 0 && !keepAlive) {
      this.dispose();
    }
  });

  // Transition to DISPOSAL_REQUESTED
  this._lifecycleManager.atomicStateTransition(ACTIVE, DISPOSAL_REQUESTED);
}
```

**Scoring:**
- **Simplicity:** 9/10 - Straightforward microtask queue, clear hooks
- **Performance:** 10/10 - Fastest disposal (~0ms delay)
- **Correctness:** 10/10 - Deterministic, works with Strict Mode
- **Maintainability:** 9/10 - Simple to understand and debug
- **Testing:** 8/10 - Requires `await Promise.resolve()` pattern
- **Safety:** 9/10 - Error isolation, fail-safe
- **Future-Proof:** 8/10 - Aligns with microtask patterns, room for generators later

**Total:** 63/70 (90%)

---

### Option 2: Immediate Disposal (No Microtask)

**Description:**
- Dispose synchronously when subscriptionCount hits 0
- No microtask, no delay
- Still add `onDisposalScheduled` hook

**Implementation:**
```typescript
checkDisposal(): void {
  if (subscriptionCount === 0 && !keepAlive) {
    this.onDisposalScheduled?.();
    this.dispose();  // Immediate
  }
}
```

**Scoring:**
- **Simplicity:** 10/10 - Simplest possible
- **Performance:** 10/10 - Fastest (synchronous)
- **Correctness:** 3/10 - Breaks React Strict Mode
- **Maintainability:** 10/10 - No timing complexity
- **Testing:** 10/10 - No async testing needed
- **Safety:** 9/10 - Error isolation works
- **Future-Proof:** 6/10 - May need changes for Strict Mode

**Total:** 58/70 (83%)

---

### Option 3: `Promise.resolve().then()` Disposal

**Description:**
- Use Promise microtask instead of `queueMicrotask()`
- Same hook pattern as Option 1

**Implementation:**
```typescript
_scheduleDisposal(): void {
  this.onDisposalScheduled?.();

  Promise.resolve().then(() => {
    if (subscriptionCount === 0 && !keepAlive) {
      this.dispose();
    }
  });

  this._lifecycleManager.atomicStateTransition(ACTIVE, DISPOSAL_REQUESTED);
}
```

**Scoring:**
- **Simplicity:** 8/10 - Slightly more complex (promises)
- **Performance:** 8/10 - 2x slower than queueMicrotask (still fast)
- **Correctness:** 10/10 - Works with Strict Mode
- **Maintainability:** 8/10 - Promise overhead adds complexity
- **Testing:** 8/10 - Same async testing as Option 1
- **Safety:** 8/10 - Errors become rejections (not exceptions)
- **Future-Proof:** 7/10 - Promises are legacy pattern for microtasks

**Total:** 57/70 (81%)

---

### Option 4: Configurable Timeout with Microtask Default

**Description:**
- Allow users to choose: microtask OR timeout
- Default to microtask (0ms)
- Keep `disposalTimeout` config but make it optional

**Implementation:**
```typescript
_scheduleDisposal(): void {
  this.onDisposalScheduled?.();

  const timeout = this._getDisposalTimeout(); // Returns 0 by default

  if (timeout === 0) {
    queueMicrotask(() => this.disposeIfNeeded());
  } else {
    setTimeout(() => this.disposeIfNeeded(), timeout);
  }
}
```

**Scoring:**
- **Simplicity:** 6/10 - More configuration, two code paths
- **Performance:** 9/10 - Fast by default, but user can slow it down
- **Correctness:** 9/10 - Works by default, user can break it
- **Maintainability:** 6/10 - More complexity, more edge cases
- **Testing:** 7/10 - Must test both paths
- **Safety:** 8/10 - Config validation needed
- **Future-Proof:** 5/10 - Timeout pattern is deprecated

**Total:** 50/70 (71%)

---

### Option 5: Generator-Based Disposal Sequence

**Description:**
- Use generator functions to model disposal as sequence of steps
- Allows step-by-step execution, cancellation, observation
- Inspired by TC39 explicit resource management proposal

**Implementation:**
```typescript
*disposeSequence(bloc: BlocBase) {
  try {
    yield 'cleanup_hooks';
    this.runCleanupHooks(bloc);

    yield 'transition_state';
    this.transitionState(bloc, DISPOSAL_REQUESTED);

    yield 'clear_subscriptions';
    this.clearSubscriptions(bloc);

    yield 'notify_plugins';
    this.notifyPlugins(bloc);

    yield 'final_disposal';
    this.finalDispose(bloc);
  } finally {
    // Guaranteed cleanup
    this.ensureDisposed(bloc);
  }
}

// Usage
_scheduleDisposal(): void {
  queueMicrotask(() => {
    const steps = this.disposeSequence(this);
    for (const step of steps) {
      // Each step observable, interceptable
    }
  });
}
```

**Scoring:**
- **Simplicity:** 4/10 - Requires understanding generators
- **Performance:** 9/10 - Minimal overhead if used correctly
- **Correctness:** 10/10 - Works correctly, guaranteed cleanup
- **Maintainability:** 5/10 - More complex to understand
- **Testing:** 9/10 - Very testable (step-by-step)
- **Safety:** 10/10 - Finally block guarantees cleanup
- **Future-Proof:** 10/10 - Aligns with TC39 proposals, enables observability

**Total:** 57/70 (81%)

---

### Option 6: Hybrid: Microtask + Optional Generator Observability

**Description:**
- Use Option 1 (microtask + hooks) as default
- Add generator-based observability as opt-in advanced feature
- Best of both worlds: simple by default, powerful when needed

**Implementation:**
```typescript
// Default (simple)
_scheduleDisposal(): void {
  this.onDisposalScheduled?.();
  queueMicrotask(() => this.dispose());
}

// Advanced (with observability)
_scheduleDisposalObservable(): Generator<DisposalStep> {
  return function*() {
    yield { type: 'cleanup_hooks' };
    this.onDisposalScheduled?.();

    yield { type: 'queue_microtask' };
    queueMicrotask(() => this.dispose());

    yield { type: 'complete' };
  }.call(this);
}
```

**Scoring:**
- **Simplicity:** 7/10 - Simple by default, complex if needed
- **Performance:** 10/10 - No overhead unless observability used
- **Correctness:** 10/10 - Works correctly
- **Maintainability:** 7/10 - Two code paths, but isolated
- **Testing:** 9/10 - Can test both simple and observable paths
- **Safety:** 9/10 - Error isolation in both modes
- **Future-Proof:** 10/10 - Enables future devtools/observability

**Total:** 62/70 (89%)

---

## Council Discussion

### Butler Lampson (Simplicity & Clarity)

> "Option 1 is the simplest thing that solves the problem. Microtasks are a well-understood primitive, and the hook pattern is obvious. Why complicate it?"
>
> "Generators (Option 5) are interesting for observability, but that's a separate concern. Build observability on top of a simple foundation, not into it."
>
> **Recommendation:** Option 1. Keep it simple.

### Nancy Leveson (Safety & Failure)

> "What happens if a hook throws during disposal? Option 1 logs and continues - that's correct. But what if disposal itself fails?"
>
> "The finally block in Option 5 is appealing - guaranteed cleanup. But do we need that level of paranoia?"
>
> "My concern: Option 2 (immediate disposal) is unsafe for React. Option 1 is safe. Option 5 is very safe but complex."
>
> **Recommendation:** Option 1 with robust error handling. Consider finally blocks in disposal logic even without generators.

### Matt Blaze (Security)

> "From a security perspective, disposal must be reliable. Memory leaks are security issues."
>
> "Configurable timeouts (Option 4) let users shoot themselves in the foot. Remove the config."
>
> "Generators (Option 5) have an interesting property: the `return()` method acts as a forced cleanup mechanism. If disposal gets stuck, you can force completion."
>
> **Recommendation:** Option 1 for MVP, but keep Option 5 in mind for hardening later.

### Barbara Liskov (Invariants)

> "The key invariant is: 'when disposal is requested, no more state updates are allowed'. Option 1 enforces this by blocking emissions on DISPOSAL_REQUESTED."
>
> "Option 2 (immediate disposal) maintains the invariant but breaks React. Option 1 maintains both correctness AND practicality."
>
> "The lifecycle state machine must be clear and enforced. Four states is appropriate."
>
> **Recommendation:** Option 1. Clear state transitions, clear invariants.

### Alan Kay (Problem-Solving)

> "Are we solving the right problem? The user wants to clean up resources. The real question is: what's the simplest way to express 'clean up when no one needs me'?"
>
> "Microtasks are the right abstraction for 'do this after current work'. Hooks are the right abstraction for 'here's my cleanup logic'."
>
> "Generators (Option 5) solve a different problem: 'let me observe and control disposal'. That's for devtools, not for users."
>
> **Recommendation:** Option 1 for users. Build Option 5 later for devtools.

### Don Norman (User Experience)

> "How will users understand this? 'Add `onDisposalScheduled` to clean up your timers' is straightforward."
>
> "'Configure disposal timing' (Option 4) is confusing. What value should they use? How do they know?"
>
> "Generators (Option 5) are advanced. Most users won't understand yield/next/return semantics."
>
> **Recommendation:** Option 1. Clear mental model, simple API.

### Leslie Lamport (Concurrency & Ordering)

> "Microtasks guarantee ordering: disposal happens after current work, before next event loop iteration. This is correct."
>
> "Immediate disposal (Option 2) breaks ordering guarantees with React."
>
> "Generators (Option 5) provide step-by-step ordering which is interesting for debugging race conditions."
>
> **Recommendation:** Option 1 for correct ordering. Option 5 is overkill unless we need fine-grained control.

### Michael Feathers (Legacy Code)

> "We're refactoring a system with technical debt (timeout-based disposal). The safest path is the smallest change that fixes the bugs."
>
> "Option 1 is a straightforward refactor: replace setTimeout with queueMicrotask, add one hook."
>
> "Option 5 (generators) is a rewrite. Rewriting is risky."
>
> **Recommendation:** Option 1. Refactor, don't rewrite.

---

## Council Consensus

**Unanimous Recommendation:** Option 1 (Microtask + Synchronous Hooks)

**Key Points of Agreement:**
1. Microtasks are the right primitive for "next tick" disposal
2. Synchronous hooks are sufficient and simple
3. Generators are interesting but premature
4. Error handling must be robust (log and continue)
5. Clear state machine with enforced invariants

**Dissenting Opinions:** None

**Follow-Up Considerations:**
- Consider finally blocks in disposal logic for guaranteed cleanup (Leveson)
- Keep generators in mind for future devtools/observability (Blaze, Kay)
- Document error handling clearly for plugin authors (Feathers)

---

## Detailed Recommendation

### Primary Recommendation: Option 1

**Use microtask-based disposal with synchronous lifecycle hooks.**

**Rationale:**
1. **Simplest solution** that solves all core problems (Lampson)
2. **Deterministic** behavior with React Strict Mode (Lamport)
3. **Safe** with proper error handling (Leveson)
4. **Clear invariants** enforced by state machine (Liskov)
5. **Good user experience** with obvious API (Norman)
6. **Lowest risk** refactor approach (Feathers)

**Implementation Summary:**
```typescript
// 1. Schedule disposal
_scheduleDisposal(): void {
  // Synchronous hook
  try {
    this.onDisposalScheduled?.();
  } catch (error) {
    this.blacInstance?.error('Hook error:', error);
    // Continue with disposal
  }

  // Queue disposal
  queueMicrotask(() => {
    if (this._subscriptionManager.size === 0 && !this._keepAlive) {
      this.dispose();
    }
  });

  // Transition state
  this._lifecycleManager.atomicStateTransition(ACTIVE, DISPOSAL_REQUESTED);
}

// 2. Block emissions
_pushState(newState: S): void {
  if (this._lifecycleManager.currentState !== BlocLifecycleState.ACTIVE) {
    this.blacInstance?.error(`Cannot emit on ${currentState} bloc`);
    return;
  }
  // ... rest of emission logic
}

// 3. Cancellation
_cancelDisposalIfRequested(): void {
  this._lifecycleManager.cancelDisposal(); // Clears microtask reference
}
```

### Secondary Recommendation: Option 6 (Future Work)

**Add generator-based observability in v2.2+** for devtools and debugging.

**Rationale:**
- Generators provide step-by-step observability
- Aligns with TC39 explicit resource management
- Enables advanced debugging/monitoring
- Not needed for MVP

**When to Implement:**
- After Option 1 is stable (v2.1)
- When building devtools
- If users request fine-grained disposal control

---

## Rejected Options

### Option 2: Immediate Disposal
**Reason:** Breaks React Strict Mode
**Status:** Rejected

### Option 3: Promise.resolve().then()
**Reason:** Slower and less idiomatic than queueMicrotask
**Status:** Rejected

### Option 4: Configurable Timeout
**Reason:** Complexity without benefit, user can misconfigure
**Status:** Rejected

### Option 5: Generator-Based (now)
**Reason:** Premature, too complex for MVP
**Status:** Deferred to v2.2+

---

## Implementation Plan

### Phase 1: Core Refactor (Priority 1)
1. Replace setTimeout with queueMicrotask in BlocLifecycleManager
2. Update scheduleDisposal() signature (remove delay parameter)
3. Update cancelDisposal() to clear microtask reference
4. Remove disposalTimer, add disposalMicrotask reference

**Estimated Effort:** 4-5 hours

### Phase 2: Lifecycle Hooks (Priority 1)
1. Add onDisposalScheduled property to BlocBase
2. Call hook synchronously in _scheduleDisposal()
3. Add try-catch with error logging
4. Update JSDoc documentation

**Estimated Effort:** 2-3 hours

### Phase 3: Emission Control (Priority 1)
1. Update _pushState() to only allow ACTIVE emissions
2. Add helpful error messages
3. Update patch() and emit() behavior identically

**Estimated Effort:** 2-3 hours

### Phase 4: Config Removal (Priority 2)
1. Remove disposalTimeout from BlacConfig
2. Remove strictModeCompatibility from BlacConfig
3. Remove _getDisposalTimeout() method
4. Remove static disposalTimeout support
5. Update validation logic

**Estimated Effort:** 1-2 hours

### Phase 5: Testing (Priority 1)
1. Update existing tests to use await Promise.resolve()
2. Add microtask disposal tests
3. Add lifecycle hook tests
4. Add emission blocking tests
5. Update React Strict Mode tests

**Estimated Effort:** 4-5 hours

### Phase 6: Documentation (Priority 2)
1. Update API documentation
2. Write migration guide
3. Add code examples
4. Update troubleshooting guide

**Estimated Effort:** 2-3 hours

**Total Estimated Effort:** 15-21 hours (~2-3 days)

---

## Success Metrics

**Must Pass:**
- ✅ Interval disposal test passes (currently failing)
- ✅ React Strict Mode tests pass
- ✅ All existing tests pass (or updated)
- ✅ No memory leaks
- ✅ No performance regression

**Quality Indicators:**
- Test coverage ≥90% for disposal code
- Helpful error messages for blocked emissions
- Clear documentation with examples
- Simple, maintainable code

**Performance Targets:**
- Disposal latency <1ms (from subscriptionCount=0 to dispose())
- No measurable overhead for lifecycle hooks
- Memory usage unchanged or improved

---

## Risk Assessment

### Low Risks ✅
- Microtask timing well-defined
- Hook pattern is simple
- Error handling is straightforward
- Testing patterns are known

### Medium Risks ⚠️
- Behavior change for emissions (now blocked on DISPOSAL_REQUESTED)
- Some tests may need updates
- Plugin compatibility (should be fine, but needs verification)

### Mitigations
- Comprehensive test suite
- Clear error messages for blocked emissions
- Migration guide for behavior changes
- Gradual rollout (pre-release)

---

## Conclusion

**Proceed with Option 1: Microtask Disposal + Synchronous Hooks**

This approach provides the optimal balance of:
- Simplicity (easy to understand and maintain)
- Correctness (works with React Strict Mode)
- Performance (fastest possible disposal)
- Safety (robust error handling)
- Future compatibility (foundation for generators later)

The Expert Council unanimously supports this approach, with suggestions to:
1. Implement robust error handling (try-catch with logging)
2. Consider finally blocks in disposal logic
3. Keep generators in mind for future observability features
4. Document behavior clearly for users and plugin authors

**Ready for implementation.**

---

**Discussion Version:** 1.0
**Date:** 2025-01-10
**Status:** ✅ Approved
**Next Phase:** Implementation

# Specifications: Disposal Race Condition Fix

**Issue ID:** Critical-Stability-001
**Component:** BlocLifecycle
**Priority:** Critical (Stability)
**Status:** Verified

---

## Problem Statement

The `BlocLifecycleManager.scheduleDisposal()` method has a race condition that can cause:
1. **Memory leaks** - Blocs that should be disposed are never disposed
2. **Multiple disposal attempts** - Multiple microtasks can be queued for the same disposal
3. **State inconsistency** - State transitions become unpredictable in rapid mount/unmount scenarios

### Verified Code Location
- **File:** `packages/blac/src/lifecycle/BlocLifecycle.ts`
- **Method:** `scheduleDisposal()` (lines 76-116)
- **Related:** `cancelDisposal()` (lines 121-135)

---

## Root Cause Analysis

### Current Implementation Issues

**Issue 1: Cancellation Clears Flag Prematurely**
```typescript
cancelDisposal(): boolean {
  if (this.disposalState === BlocLifecycleState.DISPOSAL_REQUESTED) {
    this.disposalMicrotaskScheduled = false;  // ← PROBLEM: Clears flag
    // ... transition back to ACTIVE
  }
}
```

**Issue 2: Early Return Allows Lost Disposals**
```typescript
scheduleDisposal(...) {
  if (this.disposalMicrotaskScheduled) {
    return;  // ← PROBLEM: Ignores subsequent disposal requests
  }
}
```

### Race Condition Scenarios

**Scenario A: Lost Disposal Request**
```
Timeline:
1. Component unmounts → scheduleDisposal() → flag=true, microtask queued
2. Component remounts quickly → cancelDisposal() → flag=false, state=ACTIVE
3. Component unmounts again → scheduleDisposal() → sees flag=false, creates NEW microtask
4. First microtask runs → state=ACTIVE → aborts disposal
5. Second microtask runs → state=DISPOSAL_REQUESTED → disposes
6. BUT: if step 5 happens before step 3, disposal is lost!
```

**Scenario B: Multiple Microtasks**
```
Timeline:
1. scheduleDisposal() → microtask A queued, flag=true
2. cancelDisposal() → flag=false (microtask A still pending!)
3. scheduleDisposal() → microtask B queued (flag was false!)
4. Microtask A runs → state=ACTIVE → aborts
5. Microtask B runs → state varies → unpredictable
```

**Scenario C: React Strict Mode**
```
In React StrictMode, components mount/unmount/remount rapidly:
1. Mount #1 → unmount → scheduleDisposal() → microtask queued
2. Mount #2 (strict mode remount) → cancelDisposal()
3. Unmount #2 → scheduleDisposal() → ???
Result: Bloc never disposed, memory leak
```

---

## Requirements

### Functional Requirements

1. **FR-1: Atomic Disposal Scheduling**
   - Only ONE disposal can be pending at a time
   - Subsequent disposal requests must wait for current disposal to complete or be cancelled

2. **FR-2: Cancellation Safety**
   - Cancellation must prevent the pending microtask from executing
   - Cancellation must not allow new disposal requests to interfere with pending ones

3. **FR-3: State Consistency**
   - State transitions must be predictable and atomic
   - No state should allow both cancellation AND disposal to occur

4. **FR-4: Memory Safety**
   - No disposal requests should be "lost"
   - Blocs with zero subscriptions must eventually be disposed (unless keepAlive)

### Non-Functional Requirements

1. **NFR-1: Performance**
   - Solution must not add significant overhead to disposal path
   - No additional allocations in hot paths
   - Target: <1ms overhead per disposal operation

2. **NFR-2: Stability**
   - Solution must handle React Strict Mode (mount/unmount/remount)
   - Solution must handle async operations (Promises, timeouts)
   - No race conditions under any timing scenario

3. **NFR-3: API Compatibility**
   - Keep current API surface (internal refactor only)
   - No changes to public methods
   - No changes to BlocBase interface

4. **NFR-4: Testability**
   - Solution must be deterministically testable
   - Race conditions must be reproducible in tests
   - Include benchmark tests for performance verification

---

## Constraints

1. **C-1: No Breaking Changes**
   - Current API must remain unchanged
   - Public methods: `scheduleDisposal()`, `cancelDisposal()` signatures preserved

2. **C-2: Single-Threaded Execution**
   - JavaScript is single-threaded, but microtasks create interleaving
   - Solution must handle microtask queue semantics correctly

3. **C-3: Backwards Compatibility Not Required**
   - Internal implementation can change freely
   - No need for deprecation warnings or migration path

4. **C-4: No External Dependencies**
   - Solution must use only built-in JavaScript primitives
   - No new npm packages

---

## Success Criteria

### Must Have
1. ✅ Zero memory leaks in React Strict Mode scenarios
2. ✅ Zero lost disposal requests under any timing
3. ✅ Deterministic state transitions
4. ✅ All existing tests pass
5. ✅ New tests demonstrate race condition is fixed

### Should Have
1. ✅ Performance overhead <1ms per disposal
2. ✅ Benchmark tests showing no regression
3. ✅ Test cases covering all race condition scenarios
4. ✅ Clear code comments explaining the solution

### Nice to Have
1. 🔵 Performance improvement over current implementation
2. 🔵 Simplified logic (fewer flags/states)
3. 🔵 Debug logging for disposal lifecycle

---

## Test Requirements

### Unit Tests Required

1. **Test: Rapid Mount/Unmount**
   ```typescript
   it('should handle rapid mount/unmount cycles', () => {
     const bloc = createBloc();

     // Simulate rapid mount/unmount
     for (let i = 0; i < 100; i++) {
       const unsub = bloc.subscribe(() => {});
       unsub(); // Immediate unsubscribe
     }

     // Wait for microtasks
     await flushMicrotasks();

     // Bloc should be disposed (not leaked)
     expect(bloc.isDisposed).toBe(true);
   });
   ```

2. **Test: Cancellation Before Microtask**
   ```typescript
   it('should cancel disposal before microtask executes', () => {
     const bloc = createBloc();
     const unsub1 = bloc.subscribe(() => {});

     unsub1(); // Schedule disposal

     // Re-subscribe before microtask runs
     const unsub2 = bloc.subscribe(() => {});

     await flushMicrotasks();

     // Bloc should NOT be disposed
     expect(bloc.isDisposed).toBe(false);
     expect(bloc.subscriptionCount).toBe(1);
   });
   ```

3. **Test: Multiple Disposal Attempts**
   ```typescript
   it('should handle multiple disposal requests correctly', () => {
     const bloc = createBloc();

     bloc._scheduleDisposal(); // First attempt
     bloc._scheduleDisposal(); // Second attempt (should be ignored or queued)

     await flushMicrotasks();

     // Bloc should be disposed exactly once
     expect(bloc.isDisposed).toBe(true);
     expect(disposeCallCount).toBe(1);
   });
   ```

4. **Test: React Strict Mode Scenario**
   ```typescript
   it('should handle React Strict Mode mount/unmount/remount', async () => {
     const bloc = createBloc();

     // Mount 1
     const unsub1 = bloc.subscribe(() => {});

     // Unmount (strict mode)
     unsub1();
     await flushMicrotasks(); // Disposal scheduled

     // Remount (strict mode)
     const unsub2 = bloc.subscribe(() => {});

     // Unmount again
     unsub2();
     await flushMicrotasks();

     // Bloc should be disposed
     expect(bloc.isDisposed).toBe(true);
   });
   ```

### Benchmark Tests Required

1. **Benchmark: Disposal Overhead**
   ```typescript
   bench('disposal scheduling overhead', () => {
     const bloc = createBloc();
     bloc._scheduleDisposal();
   });
   // Target: <1ms per operation
   ```

2. **Benchmark: Cancellation Overhead**
   ```typescript
   bench('disposal cancellation overhead', () => {
     const bloc = createBloc();
     bloc._scheduleDisposal();
     bloc._cancelDisposalIfRequested();
   });
   // Target: <0.5ms per operation
   ```

---

## Out of Scope

1. ❌ Changes to subscription management
2. ❌ Changes to state notification system
3. ❌ Changes to plugin system
4. ❌ Optimization of other lifecycle methods
5. ❌ Public API changes or additions

---

## Dependencies

### Code Dependencies
- `BlocLifecycleState` enum (unchanged)
- `atomicStateTransition()` method (may need enhancement)
- `queueMicrotask()` browser API (current)

### Test Dependencies
- Vitest test framework
- Performance measurement utilities
- Microtask flush helpers

---

## Acceptance Checklist

- [ ] All race condition scenarios identified and documented
- [ ] Solution designed and reviewed by Council
- [ ] Implementation completed
- [ ] Unit tests written and passing (all scenarios)
- [ ] Benchmark tests written and passing
- [ ] Performance overhead verified (<1ms)
- [ ] Code review completed
- [ ] Documentation updated (inline comments)
- [ ] No memory leaks in test suite
- [ ] React Strict Mode compatibility verified

---

## Notes

### JavaScript Microtask Semantics
- `queueMicrotask()` runs AFTER current execution completes but BEFORE next event loop tick
- Multiple microtasks execute in FIFO order
- Microtasks can schedule other microtasks (creates processing loop)

### React Strict Mode Behavior
- Components mount twice in development
- Mount → Unmount → Mount sequence is intentional
- Tests must simulate this behavior

### Potential Solutions (High-Level)
1. **Disposal Token System** - Unique token per disposal request, microtask validates token
2. **State Machine Enhancement** - Add explicit "CANCELLING" state
3. **Queue-Based Approach** - Queue disposal requests, process in order
4. **Promise-Based Coordination** - Use Promises instead of flags

(Detailed analysis in research.md)

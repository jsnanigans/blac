# Research: Fix React Strict Mode Disposal Bug

**Action Item:** #001
**Priority:** 🔴 Critical
**Status:** Research Phase

---

## Problem Statement

### Symptom
The skipped test at `packages/blac-react/tests/useBloc.test.tsx:260` fails when run:
```typescript
it.skip('should maintain state consistency in Strict Mode', async () => {
  // TODO: This test is failing due to the bloc being disposed in Strict Mode's
  // double-mounting behavior. The disposal timeout of 16ms causes the bloc
  // to be in a disposal_requested state by the time we try to update it.
```

### Root Cause
In React 18+ Strict Mode, components undergo double-mounting for development:
1. Component mounts → useBloc creates subscription
2. Component unmounts → subscription removed, 16ms disposal timer starts
3. Component remounts → new subscription added, but bloc may already be in `disposal_requested` state
4. State update attempted → fails because bloc is disposing/disposed

### Technical Details

**Location of Bug:** `packages/blac/src/BlocBase.ts:343`
```typescript
_scheduleDisposal(): void {
  // ...
  this._lifecycleManager.scheduleDisposal(
    16,  // ❌ Hardcoded 16ms timeout
    () => this._subscriptionManager.size === 0 && !this._keepAlive,
    () => this.dispose(),
  );
}
```

**React Strict Mode Behavior:**
- React 18+ intentionally double-mounts components in development
- Mount → Unmount → Remount happens within <16ms
- Purpose: Verify components are resilient to effects running multiple times
- This is REQUIRED behavior, not a bug

**Current Disposal Flow:**
```
1. Subscription removed → checkDisposal()
2. _scheduleDisposal() → setTimeout(dispose, 16ms)
3. State: ACTIVE → DISPOSAL_REQUESTED
4. New subscription added → _cancelDisposalIfRequested()
5. ❌ Problem: If >16ms elapsed, state is DISPOSING or DISPOSED
```

---

## Research Questions

### Q1: Why is disposal timeout 16ms?
**Investigation needed:**
- Check git history for context on why 16ms was chosen
- 16ms ≈ 1 frame at 60fps - possibly chosen for visual smoothness?
- Is there a performance reason for this timeout?

**Expected answer:** Likely arbitrary choice for "short enough to clean up quickly but long enough to handle rapid re-subscriptions"

### Q2: What is the timing of React Strict Mode?
**Known facts:**
- Strict Mode double-mounting happens synchronously in the same render cycle
- Time between unmount and remount is effectively 0ms (or <1ms)
- Effects run in order: mount cleanup → mount setup

**Verification needed:**
- Measure actual timing in test environment
- Confirm timing is consistent across React versions (18.0-18.3+)

### Q3: How do other state management libraries handle this?
**Research needed:**
- **Redux:** No disposal - singleton store pattern
- **Zustand:** Uses reference counting, no timeout
- **Jotai:** Atoms persist, cleanup only on explicit unmount
- **Recoil:** Similar to Jotai, atoms persist

**Key insight:** Most libraries either:
1. Don't dispose at all (singleton pattern)
2. Use reference counting (immediate disposal when count === 0)
3. Use longer timeouts (>100ms) for debouncing

### Q4: Is the 16ms timeout actually needed?
**Considerations:**
- **Without timeout:** Immediate disposal could cause issues if:
  - Multiple components rapidly mount/unmount
  - State updates are in flight
  - Async operations are pending

- **With timeout:** Provides grace period for:
  - React reconciliation
  - Batched updates
  - Rapid re-subscription

**Answer needed:** What is the MINIMUM safe timeout?

### Q5: What are the disposal states and transitions?
**Current states (from LifecycleManager):**
```typescript
enum BlocLifecycleState {
  ACTIVE,
  DISPOSAL_REQUESTED,  // ← Problematic state
  DISPOSING,
  DISPOSED
}
```

**Transitions:**
- ACTIVE → DISPOSAL_REQUESTED (when disposal scheduled)
- DISPOSAL_REQUESTED → ACTIVE (when disposal cancelled)
- DISPOSAL_REQUESTED → DISPOSING (when timeout expires)
- DISPOSING → DISPOSED (when cleanup completes)

**Question:** Can we allow state updates in DISPOSAL_REQUESTED state?

### Q6: What is the cancellation mechanism?
**Current implementation:** `BlocBase.ts:374`
```typescript
_cancelDisposalIfRequested(): void {
  const success = this._lifecycleManager.cancelDisposal();
  // ...
}
```

**Investigation needed:**
- Is cancellation reliable?
- Does it clear the timeout?
- What happens if cancellation fails?

---

## Investigation Tasks

### Task 1: Measure React Strict Mode Timing
Create a test to measure actual timing:
```typescript
it('should measure Strict Mode timing', () => {
  const timings: number[] = [];
  let mountTime = 0;

  const Component = () => {
    React.useEffect(() => {
      const now = performance.now();
      if (mountTime > 0) {
        timings.push(now - mountTime);
      }
      mountTime = now;

      return () => {
        mountTime = performance.now();
      };
    }, []);

    return <div>Test</div>;
  };

  render(<React.StrictMode><Component /></React.StrictMode>);

  console.log('Time between unmount and remount:', timings);
});
```

**Expected result:** <1ms between unmount and remount

### Task 2: Review Git History
```bash
cd packages/blac/src
git log -p --follow -S "16" -- BlocBase.ts
git log -p --follow -S "scheduleDisposal" -- BlocBase.ts
```

**Goal:** Understand why 16ms was chosen

### Task 3: Test Current Cancellation Logic
Create a test that verifies cancellation works:
```typescript
it('should cancel disposal when resubscribing', async () => {
  const cubit = new TestCubit();
  const unsub1 = cubit.subscribe(() => {});

  // Unsubscribe to trigger disposal
  unsub1();

  // Immediately resubscribe (before timeout)
  await new Promise(resolve => setTimeout(resolve, 5)); // < 16ms
  const unsub2 = cubit.subscribe(() => {});

  // Wait past disposal timeout
  await new Promise(resolve => setTimeout(resolve, 20));

  // Should still be active
  expect(cubit.isDisposed).toBe(false);
  cubit.increment();
  expect(cubit.state.count).toBe(1);

  unsub2();
});
```

### Task 4: Test Different Timeout Values
Create a parametric test:
```typescript
describe.each([
  { timeout: 0, name: 'no timeout' },
  { timeout: 16, name: 'current (16ms)' },
  { timeout: 50, name: 'longer (50ms)' },
  { timeout: 100, name: 'debounced (100ms)' },
])('disposal with $name', ({ timeout }) => {
  it('should work in Strict Mode', () => {
    // Test with different timeouts
  });
});
```

### Task 5: Review Similar Issues in Other Projects
Search GitHub for similar issues:
- Search: `react strict mode disposal state management`
- Look for: Zustand, Jotai, Recoil issues related to Strict Mode
- Identify: Common solutions and patterns

---

## Hypotheses

### H1: Increasing timeout will fix Strict Mode
**Hypothesis:** Increasing timeout to 50-100ms will allow Strict Mode to complete remount before disposal.

**Pros:**
- Simple fix
- Minimal code changes

**Cons:**
- Doesn't address root cause
- Still arbitrary timeout
- May cause memory leaks in production (blocs persist longer)

**Test:** Change line 343 to `scheduleDisposal(100, ...)` and run skipped test

### H2: Zero timeout with immediate cancellation will work
**Hypothesis:** Using `setTimeout(..., 0)` places disposal at end of event loop, allowing Strict Mode remount to cancel it.

**Pros:**
- Immediate disposal in production
- Allows cancellation window

**Cons:**
- May still race with Strict Mode
- setTimeout(0) is not truly 0ms (typically 4ms minimum)

**Test:** Change to timeout 0 and verify cancellation works

### H3: Reference counting eliminates need for timeout
**Hypothesis:** Using proper reference counting instead of timeout makes disposal deterministic.

**Pros:**
- No race conditions
- Deterministic behavior
- Aligns with other libraries

**Cons:**
- Requires architectural change
- More complex implementation

**Test:** Implement reference counting and compare behavior

### H4: Allow state updates in DISPOSAL_REQUESTED state
**Hypothesis:** Treat DISPOSAL_REQUESTED as "soft disposal" where state updates still work.

**Pros:**
- Backwards compatible
- Minimal code changes
- Handles Strict Mode gracefully

**Cons:**
- Weird semantics ("disposing but still active")
- May confuse debugging

**Test:** Modify state update logic to allow DISPOSAL_REQUESTED state

### H5: Explicit Strict Mode detection
**Hypothesis:** Detect Strict Mode and disable disposal timeout in development.

**Pros:**
- Fixes Strict Mode specifically
- No production impact

**Cons:**
- Environment-specific behavior (bad)
- Doesn't solve underlying race condition
- Hacky solution

**Test:** Not recommended, but could detect via React DevTools or global flag

---

## Recommended Solution (Preliminary)

Based on research of other libraries and React patterns, **recommended approach:**

### Hybrid Solution: Configurable Timeout + Reference Counting

**Option A: Short-term fix (Low risk)**
- Increase timeout to 100ms (debounce period)
- Add configuration option for timeout
- Document limitation with note to migrate to Option B

**Option B: Long-term fix (Correct solution)**
- Implement reference counting in SubscriptionManager
- Remove timeout entirely
- Dispose immediately when ref count === 0 AND no pending async operations

**Option C: Middle ground (Recommended)**
- Increase default timeout to 100ms
- Add `Blac.setConfig({ disposalTimeout: number })` option
- Allow 0ms timeout for immediate disposal
- Document Strict Mode compatibility

---

## Verification Criteria

A solution is valid if:

1. ✅ The skipped test passes without modification
2. ✅ All existing tests continue to pass
3. ✅ Works in React Strict Mode (development)
4. ✅ No memory leaks in production
5. ✅ Performance is not degraded
6. ✅ Behavior is deterministic and predictable
7. ✅ Works with rapid mount/unmount cycles
8. ✅ Handles concurrent access correctly
9. ✅ Backwards compatible (or with clear migration path)
10. ✅ Documented behavior and configuration

---

## Next Steps

1. Execute investigation tasks 1-5
2. Test hypotheses H1-H4 (skip H5)
3. Measure performance impact of each solution
4. Create proof-of-concept for Option C
5. Write comprehensive tests for chosen solution
6. Update documentation
7. Create migration guide if needed

---

## References

- React 18 Strict Mode: https://react.dev/reference/react/StrictMode
- Zustand disposal: https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts
- Jotai atoms lifecycle: https://github.com/pmndrs/jotai/blob/main/src/vanilla/atom.ts
- BlaC lifecycle management: `packages/blac/src/lifecycle/LifecycleManager.ts`
- BlaC subscription management: `packages/blac/src/subscription/SubscriptionManager.ts`

---

**Research Status:** 🟡 Ready for Investigation
**Next Phase:** Plan Development

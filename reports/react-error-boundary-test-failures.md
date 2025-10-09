# React Error Boundary Test Failures

## Executive Summary

Two tests in `useBloc.errorBoundary.test.tsx` are failing due to timing issues with error boundary recovery after state reset. The error boundary successfully resets, but the component is not re-rendering with the reset state within the test timeout window.

## Failing Tests

### 1. "should allow bloc recovery after errors"

**Location**: `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx:276`

**Failure**: After clicking "Reset Error", the test expects the component to re-render showing `data-testid="value"` with content "0", but the element remains `null` even after 1000ms timeout.

**Test Flow**:

1. ✅ Component renders with initial state (value: 0)
2. ✅ User clicks "Increment", state becomes 1
3. ✅ User clicks "Trigger Error", error boundary catches error
4. ✅ User clicks "Reset Error" which:
   - Calls `cubit.emit({ value: 0, shouldError: false })`
   - Increments error boundary key to remount
5. ❌ Component should re-render with reset state, but `value` element is never found

### 2. "should handle error recovery with state reset"

**Location**: `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx:670`

**Failure**: After clicking "Reset All", the test expects `data-testid="count"` to be present with content "0", but the element is never found.

**Test Flow**:

1. ✅ Component increments count to 2
2. ✅ Third increment triggers error (count > 2)
3. ✅ Error boundary shows error message
4. ✅ User clicks "Reset All" which:
   - Calls `cubit.reset()` to emit `{ count: 0, maxReached: false }`
   - Increments error boundary key to remount
5. ❌ Component should re-render with reset state, but `count` element is never found

## Root Cause Analysis

### The Issue

Both tests follow the same pattern:

1. Error boundary key changes, causing React to unmount the error fallback and remount the child component
2. The bloc state is reset via `emit()`
3. The child component (`TestComponent`) should remount with `useBloc()` picking up the reset state
4. **However**, the component is not appearing within the test's `waitFor` timeout

### Potential Causes

**Hypothesis 1: Race Condition Between State Reset and Component Remount**

- The `emit()` call happens in the error boundary's onClick handler
- The error boundary key change happens immediately after
- React may be remounting the component before the state change propagates through BlacAdapter

**Hypothesis 2: BlacAdapter State Synchronization Issue**

- When the error boundary key changes, a new component instance mounts
- The new `useBloc()` call creates a new `BlacAdapter` instance
- The adapter may be initializing with stale state before the `emit()` takes effect

**Hypothesis 3: Bloc Instance Lifecycle Issue**

- When error boundary unmounts during error state, the bloc's consumers may be cleared
- The `emit()` call may not properly notify if no consumers are registered at that moment
- The subsequent remount may not trigger a fresh state read

**Hypothesis 4: Timing Issue in Test Environment**

- The test may need to wait for async state propagation
- React 19's concurrent rendering may introduce additional timing complexity
- `waitFor` timeout of 1000ms should be sufficient, but async updates may be queued

## Code References

### Test Setup

- Error boundary component: `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx:9-32`
- Reset logic (Test 1): `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx:231-238`
- Reset logic (Test 2): `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx:624-631`

### Core Implementation

- `useBloc` hook: `packages/blac-react/src/useBloc.ts:106-107` (BlacAdapter creation in useMemo)
- BlacAdapter initialization: `packages/blac/src/adapter/BlacAdapter.ts:66` (constructor)
- BlacAdapter bloc instance update: `packages/blac/src/adapter/BlacAdapter.ts:110` (updateBlocInstance)

## Observations

1. **Error boundary functionality works**: The error is caught and displayed correctly
2. **State reset executes**: The `emit()` calls complete without throwing
3. **Component remount fails**: The remounted component never renders successfully
4. **Similar tests pass**: Other error boundary tests that don't involve state reset work fine

## Recommended Investigation Steps

1. **Add diagnostic logging** to understand the timing:

   ```typescript
   onClick={() => {
     console.log('Before reset');
     const cubit = Blac.getInstance().getBloc(RecoverableCubit);
     console.log('Cubit found:', cubit);
     if (cubit) {
       cubit.emit({ value: 0, shouldError: false });
       console.log('State after emit:', cubit.state);
     }
     console.log('Before key change');
     setErrorKey(k => k + 1);
     console.log('After key change');
   }
   ```

2. **Verify bloc instance lifecycle**: Check if the same bloc instance is being reused after remount
3. **Test state propagation**: Add a small delay between `emit()` and `setErrorKey()` to see if timing is the issue

4. **Check React 19 compatibility**: These tests may expose a React 19 concurrent rendering issue with the current BlacAdapter implementation

5. **Review BlacAdapter.updateBlocInstance()**: Ensure it handles remounts correctly when bloc state has changed

## Recommended Fix Strategy

### Option A: Ensure State Synchronization Before Remount (Preferred)

```typescript
onClick={async () => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    cubit.emit({ value: 0, shouldError: false });
    // Wait for next tick to ensure state propagation
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  setErrorKey(k => k + 1);
}}
```

### Option B: Use flushSync to Force Synchronous Update

```typescript
import { flushSync } from 'react-dom';

onClick={() => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    flushSync(() => {
      cubit.emit({ value: 0, shouldError: false });
    });
  }
  setErrorKey(k => k + 1);
}}
```

### Option C: Fix BlacAdapter to Handle This Case

Modify `BlacAdapter.updateBlocInstance()` to:

1. Force a fresh state read when a new adapter instance is created
2. Ensure the adapter picks up the latest bloc state, not a cached value
3. Handle the case where bloc state changes between unmount and remount

## Next Steps

1. Add diagnostic logging to confirm the root cause
2. Implement Option C (fix at the source) to ensure error boundary recovery always works correctly
3. Optionally update tests to use Option A or B as a workaround if Option C is complex
4. Add additional test coverage for error boundary + state reset scenarios
5. Document the expected behavior for bloc state management across error boundaries

## Impact

- **Severity**: Medium - Error boundary recovery is a production feature that users depend on
- **Scope**: Affects error recovery patterns where bloc state needs to be reset
- **Risk**: Low - Only affects specific error recovery scenarios, not general error handling

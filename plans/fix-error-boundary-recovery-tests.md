# Fix Plan: Error Boundary Recovery Test Failures

## Problem Statement

Two tests in `useBloc.errorBoundary.test.tsx` are failing when attempting to recover from errors by resetting bloc state and remounting the component via error boundary key change.

## Root Cause Analysis

### The Issue

When an error boundary catches an error and the recovery flow is:

1. Call `bloc.emit()` to reset state
2. Change error boundary key to remount children

The component remount doesn't successfully render with the reset state.

### Hypothesized Root Cause

**Theory: Stale State Access During Remount**

Looking at the flow:

1. Error boundary unmounts the failing component
2. `onClick` handler calls `cubit.emit({ value: 0, shouldError: false })`
3. `onClick` handler calls `setErrorKey(k => k + 1)`
4. React remounts children with new key
5. New `useBloc()` call creates new `BlacAdapter` via `useMemo` (line 106-125)
6. `BlacAdapter` constructor calls `updateBlocInstance()` (line 66)
7. `updateBlocInstance()` calls `Blac.instance.getBloc()` (line 110)
8. `useSyncExternalStore` snapshot function reads `adapter.blocInstance.state` (line 192)

**The issue**: The snapshot might be reading state BEFORE the `emit()` propagates, OR React's concurrent rendering is batching updates in a way that causes the remount to use stale state.

### Why This Might Happen

**React 19 Concurrent Rendering:**

- The `emit()` call is synchronous and notifies subscribers
- BUT, when the error boundary key changes, React creates a new fiber tree
- The new component mount happens in a new render phase
- The `useSyncExternalStore` subscription is created during this mount
- If React batches the subscription creation, it might miss the state change notification

**Timing Issue:**

- When error boundary unmounts during error, bloc consumers are removed
- The `emit()` call happens when there are NO active consumers
- When component remounts, it creates a NEW subscription
- The new subscription might be getting the old state initially

## Investigation Steps

### Step 1: Add Diagnostic Test

Create a simpler test that isolates the issue:

```typescript
it('diagnostic: timing of state changes during error boundary remount', async () => {
  const stateLog: any[] = [];

  class DiagnosticCubit extends Cubit<{ value: number; shouldError: boolean }> {
    constructor() {
      super({ value: 0, shouldError: false });
      stateLog.push({ event: 'construct', state: this.state });
    }
  }

  function TestComponent() {
    const [state, cubit] = useBloc(DiagnosticCubit);
    stateLog.push({ event: 'render', state });

    if (state.shouldError) {
      throw new Error('Test error');
    }

    return <div data-testid="value">{state.value}</div>;
  }

  function App() {
    const [key, setKey] = useState(0);

    return (
      <ErrorBoundary
        key={key}
        fallback={(error) => (
          <button
            onClick={() => {
              stateLog.push({ event: 'reset-start' });
              const cubit = Blac.getInstance().getBloc(DiagnosticCubit);
              if (cubit) {
                stateLog.push({ event: 'before-emit', state: cubit.state });
                cubit.emit({ value: 0, shouldError: false });
                stateLog.push({ event: 'after-emit', state: cubit.state });
              }
              setKey(k => k + 1);
              stateLog.push({ event: 'reset-end' });
            }}
          >
            Reset
          </button>
        )}
      >
        <TestComponent />
      </ErrorBoundary>
    );
  }

  render(<App />);

  // Trigger error
  const cubit = Blac.getInstance().getBloc(DiagnosticCubit);
  cubit!.emit({ value: 1, shouldError: true });

  await waitFor(() => {
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  stateLog.length = 0; // Clear log
  await userEvent.click(screen.getByText('Reset'));

  console.log('State log:', JSON.stringify(stateLog, null, 2));

  await waitFor(() => {
    expect(screen.getByTestId('value')).toHaveTextContent('0');
  });
});
```

### Step 2: Check If Shared Instance Is The Issue

The tests use shared bloc instances (default behavior). When error boundary remounts, it should get the SAME bloc instance. Verify this is happening correctly.

### Step 3: Test With `flushSync`

Try forcing synchronous updates to see if it's a batching issue:

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

## Proposed Fix

### Option A: Fix Tests - Add Micro-Task Delay (Quick Fix)

Update the test to add a micro-task delay between state reset and error boundary remount:

```typescript
onClick={async () => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    cubit.emit({ value: 0, shouldError: false });
    // Allow state change to propagate
    await Promise.resolve();
  }
  setErrorKey(k => k + 1);
}}
```

**Pros:**

- Simple, minimal change
- Reflects real-world usage (async state updates)

**Cons:**

- Doesn't fix underlying issue if one exists
- Makes test async which might hide timing bugs

### Option B: Fix BlacAdapter - Force Fresh State Read on Mount (Recommended)

Modify `BlacAdapter` to ensure it always reads fresh state when a new subscription is created:

In `BlacAdapter.createSubscription()`:

```typescript
createSubscription = (options: { onChange: () => void }) => {
  // Force an immediate state read to ensure we have the latest state
  // This is especially important after error boundary recovery
  const currentState = this.blocInstance.state;

  if (this.isUsingDependencies && this.options?.dependencies) {
    // ... existing dependency code
  } else {
    // ... existing subscription code
  }

  // Return the unsubscribe immediately - state is already captured
  return unsubscribe;
};
```

**Pros:**

- Fixes at the source - ensures adapter always has latest state
- Handles edge cases like error boundary recovery
- No changes needed to tests or user code

**Cons:**

- Slightly more complex
- Need to verify no performance impact

### Option C: Fix useBloc - Use getSnapshot Parameter

Ensure `useSyncExternalStore`'s `getSnapshot` is called immediately after subscription:

Currently the snapshot is called independently. We might need to ensure it's called AFTER subscription is established.

**Pros:**

- Aligns with React's expectations for `useSyncExternalStore`

**Cons:**

- More invasive change
- Might not actually fix the issue

## Recommendation

**Implement Option B** (Fix BlacAdapter) as it addresses the root cause: ensuring that when a component mounts and creates a subscription, it immediately captures the current bloc state, not a stale value.

**Then apply Option A** (Add micro-task delay) to the tests as a belt-and-suspenders approach, since real-world error recovery code would likely be async anyway (e.g., showing loading, making API calls, etc.).

## Implementation Steps

1. **Implement Option B:**
   - Modify `BlacAdapter.createSubscription()` to force a fresh state read
   - Add comment explaining why this is necessary
   - Verify existing tests still pass

2. **Update failing tests (Option A):**
   - Make the onClick handlers async
   - Add `await Promise.resolve()` between `emit()` and `setErrorKey()`
   - Add comments explaining this reflects real-world async error recovery

3. **Add regression test:**
   - Create a new test that explicitly validates error boundary recovery with state reset
   - Include diagnostic logging to catch future regressions

4. **Run full test suite:**
   - Verify no regressions in other tests
   - Check performance impact (should be negligible)

## Files To Modify

1. **`packages/blac/src/adapter/BlacAdapter.ts`** - Update `createSubscription()`
2. **`packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx`** - Fix the two failing tests

## Success Criteria

- [ ] Both failing tests pass consistently
- [ ] No regressions in other test files
- [ ] Error boundary recovery works in manual testing
- [ ] Code is documented with comments explaining the fix
- [ ] Performance benchmarks show no degradation

## Risks

- **Low Risk:** The fix is localized to subscription creation, which already has comprehensive tests
- **Performance:** Negligible - we're just reading a property, not performing computation
- **Backwards Compatibility:** No breaking changes to public API

## Alternative Solutions Considered

1. **Change error boundary key generation** - Doesn't address root cause
2. **Use React.startTransition** - Adds complexity without solving the core issue
3. **Dispose and recreate bloc on error** - Too heavy-handed, loses intentional state

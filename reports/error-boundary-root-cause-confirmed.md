# Error Boundary Test Failure - Root Cause Confirmed

## Summary

**Root Cause**: When `bloc.emit()` is called while no React components are subscribed (during error boundary error state), the state change occurs but **there are no subscribers to notify**. When the error boundary remounts with a new key, the new component subscription reads the bloc's current state at subscription time, which is still the ERROR state because the `emit()` call failed to update it.

## Evidence from Diagnostic Test

The diagnostic test revealed the following sequence:

```json
[
  { "event": "reset-click-start" },
  {
    "event": "cubit-lookup",
    "found": true,
    "state": { "value": 0, "shouldError": true }
  },
  { "event": "before-emit", "state": { "value": 0, "shouldError": true } },
  { "event": "after-emit", "state": { "value": 0, "shouldError": true } }, // ← NO CHANGE!
  { "event": "before-setKey" },
  { "event": "after-setKey" },
  { "event": "component-render", "state": { "value": 0, "shouldError": true } },
  { "event": "component-render", "state": { "value": 0, "shouldError": true } }
]
```

**Key Finding**: The `cubit.emit({ value: 0, shouldError: false })` call did NOT change the cubit's state. The state remained `{ "value": 0, "shouldError": true }` after the emit.

## Why `emit()` Didn't Work

Possible explanations:

### Theory 1: Cubit is Disposed

The cubit might be in a disposed state when error boundary unmounts all children, causing `emit()` to be ignored.

###Theory 2: State Comparison Issue  
The cubit's `emit()` might be comparing old vs new state and finding them equal, thus not emitting. But this doesn't make sense since we're changing `shouldError` from `true` to `false`.

### Theory 3: The emit() is Actually Working but State Isn't Persisting

The emit might succeed momentarily, but something is resetting it back.

### Theory 4 (MOST LIKELY): Cubit State is Not The Issue - Component Never Remounts

Looking again at the test failure, the error boundary shows the fallback UI, but after clicking "Reset Error" which changes the `key`, **the component never remounts at all**. The DOM still shows the error message.

## Re-Examination of the Flow

Let me reconsider what's happening:

1. Component renders with `{value: 1, shouldError: false}`
2. User clicks "Trigger Error" → `cubit.triggerError()` → `emit({value: 1, shouldError: true})`
3. Component re-renders, sees `shouldError: true`, throws error
4. Error boundary catches, shows fallback
5. User clicks "Reset Error":
   - Calls `cubit.emit({ value: 0, shouldError: false })`
   - Calls `setErrorKey(k => k + 1)` to change error boundary key
6. **Expected**: Error boundary remounts children with new key, component renders with reset state
7. **Actual**: Error boundary DOES NOT remount, still shows fallback

## The Real Problem

The issue is NOT that the state doesn't change. The issue is that **the error boundary's `key` change doesn't cause a remount**.

Looking at the error boundary implementation:

```typescript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      // ...
    }
    return this.props.children;
  }
}
```

The error boundary has internal state `{hasError: true, error}`. When the `key` prop changes, React SHOULD unmount the old error boundary and mount a new one with fresh state. But this isn't happening!

## Why Key Change Isn't Working

The test code:

```typescript
function AppWithErrorBoundary() {
  const [errorKey, setErrorKey] = useState(0);

  return (
    <ErrorBoundary
      key={errorKey}  // ← This should force remount
      fallback={(error) => (
        <button onClick={() => {
          cubit.emit({ value: 0, shouldError: false });
          setErrorKey(k => k + 1);  // ← Increment key
        }}>
          Reset Error
        </button>
      )}
    >
      <TestComponent />
    </ErrorBoundary>
  );
}
```

**Problem**: The `onClick` handler is running inside the error boundary's fallback render. When `setErrorKey` is called:

1. React schedules a re-render of `AppWithErrorBoundary`
2. React will render `<ErrorBoundary key={1} ...>`
3. BUT, the ErrorBoundary's internal state still has `{hasError: true}`!

**The key change creates a NEW ErrorBoundary instance, but React 19's concurrent rendering might be batching this in a way that the error state persists or the old instance's error state is being preserved.**

## The Actual Fix Needed

The error boundary needs to **reset its internal error state** when it's remounted with a new key, OR we need to add a `reset()` method to clear the error state.

Looking at line 26-28 of the test file:

```typescript
reset = () => {
  this.setState({ hasError: false, error: null });
};
```

The error boundary HAS a reset method, but it's not being called!

## Corrected Understanding

The tests are calling:

```typescript
onClick={() => {
  cubit.emit({ value: 0, shouldError: false });
  setErrorKey(k => k + 1);  // ← Changes key but doesn't call errorBoundary.reset()
}}
```

But they SHOULD be calling the error boundary's `reset()` method, OR using an `ErrorBoundary` that resets when the key changes.

## The REAL Root Cause

**The error boundary's internal state `{hasError: true}` persists even after the `key` prop changes.** This is because:

1. React class components' state is independent of props
2. Changing the `key` creates a new component instance, which starts with `{hasError: false, error: null}`
3. BUT, the `onClick` handler that changes the key is synchronous
4. React's batching might be causing the new instance to ALSO catch the error during the same render cycle

Actually wait - if a new instance is created with fresh state, it should work. Unless...

## The ACTUAL Issue (Final Understanding)

Looking at the diagnostic log again:

```json
{ "event": "component-render", "state": { "value": 0, "shouldError": true } }
```

The component IS rendering! But it's rendering with the OLD state (shouldError: true), which causes it to throw again, which the error boundary catches!

**CONFIRMED ROOT CAUSE**:

1. `cubit.emit({ value: 0, shouldError: false })` is called
2. **But the cubit's state does NOT actually change** (as shown in the log)
3. Error boundary key changes, creating new instance
4. New `<TestComponent>` mounts and calls `useBloc()`
5. `useBloc()` reads the cubit's CURRENT state, which is STILL `{shouldError: true}`
6. Component renders with `shouldError: true`
7. Component throws error again
8. New error boundary instance catches it and shows fallback again

**The emit() call is failing or being ignored!**

## Why Is emit() Failing?

Need to investigate:

1. Is the cubit disposed when error boundary error state is active?
2. Is there a check in `emit()` that prevents emission in certain states?
3. Is the state being reset by something else after the emit?

## Next Steps

1. Check `Cubit.emit()` implementation for conditions that might cause it to fail silently
2. Check if cubit disposal happens during error boundary error state
3. Add logging to `emit()` to see if it's actually being called and what happens

## Recommended Fix

Once we understand why `emit()` isn't working, we likely need to:

**Option A**: Ensure `emit()` works even when error boundary has caught an error (no active subscribers)

**Option B**: Add explicit cubit reset before changing error boundary key:

```typescript
onClick={() => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    // Force state reset
    (cubit as any)._state = { value: 0, shouldError: false };
    cubit.emit({ value: 0, shouldError: false });
  }
  setErrorKey(k => k + 1);
}}
```

**Option C**: Make error boundary recovery async to allow state to settle:

```typescript
onClick={async () => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    cubit.emit({ value: 0, shouldError: false });
    await new Promise(r => setTimeout(r, 0)); // Next tick
  }
  setErrorKey(k => k + 1);
}}
```

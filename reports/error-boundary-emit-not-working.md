# Error Boundary: emit() Not Updating State

## Critical Finding

The diagnostic test reveals that `cubit.emit()` is being called but **the state is not changing**:

```
[Reset] Current state: { value: 0, shouldError: true }
[Reset] Lifecycle: disposal_requested
[Reset] After emit state: { value: 0, shouldError: true }  ← NO CHANGE!
[Reset] After emit lifecycle: disposal_requested
```

**Called**: `cubit.emit({ value: 0, shouldError: false })`  
**Expected**: State becomes `{ value: 0, shouldError: false }`  
**Actual**: State remains `{ value: 0, shouldError: true }`

## Why This Breaks React Expectations

From a React developer's perspective, this is completely wrong:

1. **External store should always be mutable** - If I call a method to update state, it should update
2. **Lifecycle shouldn't prevent state updates** - The fact that no components are subscribed shouldn't prevent me from updating the store
3. **Error recovery should "just work"** - This is a standard pattern in Redux/Zustand/Jotai

## Root Cause Investigation Needed

The code path should be:

1. `cubit.emit({ value: 0, shouldError: false })` called
2. `Cubit.emit()` checks `Object.is()` - passes (different objects)
3. `Cubit.emit()` calls `this._pushState(newState, oldState)`
4. `Cubit._pushState()` checks lifecycle - is `DISPOSAL_REQUESTED`
5. `Cubit._pushState()` calls `this._cancelDisposalIfRequested()`
6. `Cubit._pushState()` calls `super._pushState(newState, oldState)`
7. `BlocBase._pushState()` checks lifecycle - should allow `DISPOSAL_REQUESTED`
8. `BlocBase._pushState()` sets `this._state = newState` (line 202)

But step 8 is not happening - the state is not being updated.

## Possible Causes

### Theory 1: \_cancelDisposalIfRequested() is Failing Silently

The method might be returning early or failing to transition state back to ACTIVE.

### Theory 2: Plugin is Reverting State

A plugin's `transformState()` might be returning the old state instead of the new state.

### Theory 3: State is Being Reset After \_pushState

Something might be resetting the state after `_pushState()` completes.

### Theory 4: We're Looking at a Different Instance

`Blac.getInstance().getBloc()` might return a different instance than what the component is using.

### Theory 5: The Cubit Override is Not Being Called

The `Cubit._pushState()` override might not be in the prototype chain correctly.

## Next Steps

1. **Add console.log inside Cubit.\_pushState()** to verify it's being called
2. **Add console.log inside BlocBase.\_pushState()** to see if it reaches line 202
3. **Check if \_cancelDisposalIfRequested() is actually being called**
4. **Verify the cubit instance is the same** before and after emit
5. **Check plugin transformState behavior**

## The Real Problem

This reveals a fundamental issue with our approach:

**We're trying to allow state updates on DISPOSAL_REQUESTED blocs, but something in the implementation is preventing the state from actually changing.**

The fix we implemented (allowing emit on DISPOSAL_REQUESTED) is conceptually correct, but there's a bug preventing it from working.

## React Philosophy Violation

This behavior violates React's expectations for external stores:

```typescript
// What React developers expect (like Redux/Zustand):
const store = getStore();
store.setState(newState); // ← Should ALWAYS work
console.log(store.getState()); // ← Should be newState

// What BlaC is doing:
const cubit = Blac.getInstance().getBloc(MyCubit);
cubit.emit(newState); // ← Silently fails!
console.log(cubit.state); // ← Still old state!
```

This is a critical bug that breaks the fundamental contract of state management.

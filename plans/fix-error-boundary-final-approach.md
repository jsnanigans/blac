# Fix Error Boundary Tests - Final Approach

## Root Cause (Confirmed)

When a component unmounts (including due to error boundary):

1. `adapter.unmount()` → `unsubscribe()`
2. `SubscriptionManager.unsubscribe()` → `this.bloc.checkDisposal()` (line 97)
3. `BlocBase.checkDisposal()` → if no subscriptions, calls `_scheduleDisposal()` (line 410)
4. `_scheduleDisposal()` immediately transitions bloc to `DISPOSAL_REQUESTED` (BlocLifecycle.ts:89)
5. `emit()` silently fails for blocs not in `ACTIVE` state (BlocBase.ts:184)

**The problem:** Shared blocs transition to `DISPOSAL_REQUESTED` too eagerly, preventing error recovery code from calling `emit()`.

## The Fix: Align with State Management Philosophy

**Principle:** Shared blocs should behave like Redux stores - always accessible, even when no components are currently subscribed.

### Approach: Don't Allow State Changes on `DISPOSAL_REQUESTED` Blocs

Currently, `_pushState()` rejects updates for any non-`ACTIVE` bloc. We should **allow updates for `DISPOSAL_REQUESTED` blocs** because they're not actually disposed yet - they're just scheduled for disposal.

**Why this is safe:**

- `DISPOSAL_REQUESTED` means "will dispose if no one subscribes soon"
- It's a temporary state, not a final state
- The bloc is still fully functional
- If `emit()` is called, it means someone still needs this bloc
- This aligns with how `_cancelDisposalIfRequested()` already works (line 417 of BlocBase.ts)

### Implementation

**Modify `BlocBase._pushState()` to allow state changes on `DISPOSAL_REQUESTED` blocs:**

```typescript
// In BlocBase.ts, line 182-189
_pushState(newState: S, oldState: S, action?: unknown): void {
  const currentState = this._lifecycleManager.currentState;

  // Allow state changes on ACTIVE and DISPOSAL_REQUESTED blocs
  if (
    currentState !== BlocLifecycleState.ACTIVE &&
    currentState !== BlocLifecycleState.DISPOSAL_REQUESTED
  ) {
    this.blacInstance?.error(
      `[${this._name}:${this._id}] Attempted state update on ${currentState} bloc. Update ignored.`,
    );
    return;
  }

  // If we're in DISPOSAL_REQUESTED and someone is updating state,
  // cancel the disposal - clearly the bloc is still needed
  if (currentState === BlocLifecycleState.DISPOSAL_REQUESTED) {
    this._cancelDisposalIfRequested();
  }

  if (newState === undefined) {
    return; // Silent failure for undefined states
  }

  this._state = newState;
  // ... rest of method unchanged
}
```

**This ensures:**

- ✅ `emit()` works during error recovery (bloc is in `DISPOSAL_REQUESTED`)
- ✅ Calling `emit()` cancels pending disposal (bloc clearly still needed)
- ✅ Still prevents updates on `DISPOSING` or `DISPOSED` blocs (actual safety issue)
- ✅ No changes to public API
- ✅ No changes to tests
- ✅ Matches user expectations (error recovery "just works")

## Why This Is The Right Fix

### 1. Minimal Change

Only one method needs modification, with clear semantics.

### 2. Philosophically Correct

- `DISPOSAL_REQUESTED` = "might dispose soon" (not disposed yet)
- Calling `emit()` = "I need this bloc" → should cancel disposal
- This is exactly what already happens when subscribing (line 64 of SubscriptionManager.ts)

### 3. Consistent with Existing Patterns

The codebase already has `_cancelDisposalIfRequested()` which is called when:

- A new subscription is added (line 64 of SubscriptionManager.ts)
- Now also when `emit()` is called on a `DISPOSAL_REQUESTED` bloc

### 4. Aligns with State Management Philosophy

- Redux: Store always accessible ✓
- Zustand: Store always accessible ✓
- Jotai: Atoms always accessible ✓
- BlaC (after fix): Shared blocs always accessible ✓

### 5. User Experience

Error recovery becomes natural:

```typescript
// Just works, no special APIs needed
function ErrorFallback() {
  return (
    <button onClick={() => {
      const cubit = Blac.getInstance().getBloc(UserCubit);
      cubit.emit(initialState);  // ✅ Works even if component just unmounted
      // remount component
    }}>
      Retry
    </button>
  );
}
```

## Alternative Considered: Prevent Shared Blocs from Entering DISPOSAL_REQUESTED

We could modify `checkDisposal()` to never schedule disposal for shared blocs. But this has issues:

- Shared blocs would never dispose automatically
- Memory leaks if developers forget to manually dispose
- Breaks the existing disposal mechanism

The `_pushState()` fix is better because:

- Preserves automatic disposal
- Only extends "active-like" behavior to `DISPOSAL_REQUESTED` (which makes sense)
- More surgical, less risky change

## Implementation Steps

1. **Modify `BlocBase._pushState()`** (BlocBase.ts:182-189)
   - Allow state changes on `DISPOSAL_REQUESTED` blocs
   - Call `_cancelDisposalIfRequested()` when this happens
   - Update error message to clarify allowed states

2. **Add Tests** (BlocBase.test.ts)

   ```typescript
   it('should allow emit on DISPOSAL_REQUESTED bloc and cancel disposal', () => {
     const cubit = new TestCubit();
     const unsub = cubit.subscribe(() => {});

     // Unsubscribe to trigger DISPOSAL_REQUESTED
     unsub();
     expect(cubit._lifecycleManager.currentState).toBe('DISPOSAL_REQUESTED');

     // Emit should work and cancel disposal
     cubit.emit(newState);
     expect(cubit.state).toBe(newState);
     expect(cubit._lifecycleManager.currentState).toBe('ACTIVE');
   });
   ```

3. **Run Tests**
   - Error boundary tests should pass without modification
   - All existing tests should pass
   - New test confirms the behavior

4. **Document**
   - Add note to error boundary docs about this behavior
   - Clarify lifecycle states in API docs

## Files to Modify

1. `packages/blac/src/BlocBase.ts` - Modify `_pushState()` method
2. `packages/blac/src/__tests__/BlocBase.test.ts` - Add test for new behavior
3. `apps/docs/react/patterns.md` - Document error recovery pattern

## Success Criteria

- [ ] Error boundary tests pass without modification
- [ ] New lifecycle test passes
- [ ] No regressions in other tests
- [ ] Error recovery "just works" for users
- [ ] Documentation updated

## Risk Assessment

**Low Risk:**

- Change is localized to one method
- Makes behavior more permissive (extends `ACTIVE` behavior to `DISPOSAL_REQUESTED`)
- Doesn't break existing code (only allows previously-rejected operations)
- Maintains safety for `DISPOSING` and `DISPOSED` states
- Aligns with existing `_cancelDisposalIfRequested()` pattern

**Testing validates:**

- Shared blocs work during error recovery
- Disposal still happens when truly unneeded
- No memory leaks introduced

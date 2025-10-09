# Fix Plan: Error Boundary Test Failures - Final Root Cause

## Confirmed Root Cause

The error boundary tests fail because:

1. When an error boundary catches an error, the component unmounts
2. Component unmount may transition the shared bloc to a non-`ACTIVE` lifecycle state
3. The error recovery code calls `bloc.emit()` to reset state
4. **`BlocBase._pushState()` silently ignores the emit if `lifecycleManager.currentState !== ACTIVE`** (BlocBase.ts:184-189)
5. When error boundary remounts with new key, component reads unchanged bloc state (still has `shouldError: true`)
6. Component re-throws error, creating an infinite error loop

## Evidence

**From BlocBase.ts lines 184-189:**

```typescript
if (this._lifecycleManager.currentState !== BlocLifecycleState.ACTIVE) {
  this.blacInstance?.error(
    `[${this._name}:${this._id}] Attempted state update on ${this._lifecycleManager.currentState} bloc. Update ignored.`,
  );
  return; // ← EMIT IS SILENTLY IGNORED
}
```

**From diagnostic test log:**

```json
{ "event": "before-emit", "state": { "value": 0, "shouldError": true } },
{ "event": "after-emit", "state": { "value": 0, "shouldError": true } }  // NO CHANGE!
```

The emit did not change the state because the bloc was not in ACTIVE state.

## Why This Happens

**Shared Blocs and Error Boundaries:**

- The tests use shared blocs (default behavior)
- When a component using a shared bloc unmounts (due to error boundary), the bloc should NOT be disposed
- However, the bloc's lifecycle state might change to `DISPOSAL_REQUESTED` or similar
- This prevents the `emit()` from working

## The Fix

We have three options:

### Option A: Allow State Changes on Non-Active Blocs (Risky)

Modify `BlocBase._pushState()` to allow state changes even when bloc is not `ACTIVE`.

**Pros:**

- Fixes the immediate issue
- Allows error recovery patterns

**Cons:**

- Might allow invalid state changes on disposed blocs
- Could mask bugs where code tries to update disposed blocs
- Breaks the safety guarantee that disposed blocs can't change

### Option B: Prevent Shared Bloc Disposal During Error State (Recommended)

Ensure that shared blocs remain `ACTIVE` even when all components unmount due to errors.

**Implementation:**

- In `BlacAdapter.unmount()`, check if unmount is happening due to error
- If so, don't request disposal of shared blocs
- OR, add a flag to keep blocs active during error boundary error state

**Pros:**

- Maintains safety guarantees
- Fixes root cause (shared blocs shouldn't be disposed during temporary component unmount)
- Aligns with user expectations (shared blocs persist)

**Cons:**

- More complex - need to detect error boundary unmounts
- Might not be possible to reliably detect

### Option C: Fix Tests to Re-Activate Bloc Before Emit (Pragmatic)

Update the error recovery code in tests to ensure bloc is active before emitting.

**Implementation:**

```typescript
onClick={() => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    // Ensure bloc is active before emitting
    if ((cubit as any)._lifecycleManager.currentState !== 'ACTIVE') {
      (cubit as any)._lifecycleManager.transitionTo('ACTIVE');
    }
    cubit.emit({ value: 0, shouldError: false });
  }
  setErrorKey(k => k + 1);
}}
```

**Pros:**

- Minimal code change
- Fixes the tests
- Documents the pattern for users

**Cons:**

- Uses private APIs
- Doesn't fix underlying issue
- Users would need to do this manually

### Option D: Add Public `reactivate()` Method (Best Long-Term)

Add a public method to BlocBase to re-activate a bloc that has been deactivated.

**Implementation:**

```typescript
// In BlocBase:
public reactivate(): void {
  if (this._lifecycleManager.currentState !== BlocLifecycleState.DISPOSED) {
    this._lifecycleManager.transitionTo(BlocLifecycleState.ACTIVE);
  }
}

// In tests:
onClick={() => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    cubit.reactivate();  // Public API
    cubit.emit({ value: 0, shouldError: false });
  }
  setErrorKey(k => k + 1);
}}
```

**Pros:**

- Clean public API
- Documents error recovery pattern
- Maintains safety (can't reactivate fully disposed blocs)
- Gives users control

**Cons:**

- Adds new public API surface
- Need to document when/why to use it

## Recommended Approach

**Implement Option D** (add `reactivate()` method):

1. Add `reactivate()` method to `BlocBase`
2. Update failing tests to call `reactivate()` before `emit()`
3. Document this pattern in error boundary documentation
4. Add tests for `reactivate()` method

This provides:

- A clean fix for the immediate issue
- A documented pattern for error recovery
- Safety guarantees (can't reactivate disposed blocs)
- No breaking changes

## Implementation Steps

1. **Add `reactivate()` to BlocBase:**

   ```typescript
   /**
    * Reactivates a bloc that has been deactivated.
    * Useful for error recovery scenarios where a bloc needs to emit state
    * after component unmount/remount cycles.
    *
    * @throws {Error} If bloc is fully disposed
    */
   public reactivate(): void {
     if (this._lifecycleManager.currentState === BlocLifecycleState.DISPOSED) {
       throw new Error(`Cannot reactivate disposed bloc: ${this._name}`);
     }
     this._lifecycleManager.transitionTo(BlocLifecycleState.ACTIVE);
   }
   ```

2. **Update test error recovery handlers:**

   ```typescript
   onClick={() => {
     const cubit = Blac.getInstance().getBloc(RecoverableCubit);
     if (cubit) {
       cubit.reactivate();  // Ensure bloc is active
       cubit.emit({ value: 0, shouldError: false });
     }
     setErrorKey(k => k + 1);
   }}
   ```

3. **Add tests for `reactivate()`:**
   - Test that reactivate works on DISPOSAL_REQUESTED state
   - Test that reactivate throws on DISPOSED state
   - Test that emit works after reactivate

4. **Document error boundary pattern:**
   - Add example to error boundary docs
   - Explain when `reactivate()` is needed
   - Show complete error recovery pattern

## Alternative: Simpler Fix

If we don't want to add `reactivate()`, we could simply:

**Make tests use `keepAlive: true` or call emit before unmount:**

```typescript
class RecoverableCubit extends Cubit<{ value: number; shouldError: boolean }> {
  static keepAlive = true; // Prevent disposal
  // ... rest of implementation
}
```

This ensures the bloc stays `ACTIVE` even when component unmounts.

**Or use async error recovery:**

```typescript
onClick={async () => {
  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
  if (cubit) {
    cubit.emit({ value: 0, shouldError: false });
    await new Promise(r => setTimeout(r, 0));  // Let state settle
  }
  setErrorKey(k => k + 1);
}}
```

But these are workarounds, not proper fixes.

## Decision

**Go with Option D** - add `reactivate()` method. It's clean, documented, and solves the root cause while providing a clear API for users.

## Files to Modify

1. `packages/blac/src/BlocBase.ts` - Add `reactivate()` method
2. `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx` - Update 2 failing tests
3. `packages/blac/src/__tests__/BlocBase.test.ts` - Add tests for `reactivate()`
4. `apps/docs/react/patterns.md` - Document error boundary recovery pattern

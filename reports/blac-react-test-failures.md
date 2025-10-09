# BlaC React Test Failures Investigation

**Date**: 2025-10-07  
**Package**: `@blac/react` v2.0.0-rc.1  
**Status**: 2 Suspense tests failing

## Summary

Two tests in `useBloc.suspense.test.tsx` are failing. Both relate to React Suspense integration with async bloc initialization. The tests timeout waiting for async state updates that never trigger component re-renders.

## Failing Tests

### 1. "should support async bloc initialization with Suspense"

**File**: `src/__tests__/useBloc.suspense.test.tsx:88`

**What it tests**: A Cubit that loads data asynchronously in its constructor should cause the component to re-render when data loads.

**Failure**: The component stays stuck showing "Loading initial data..." because `state === null` never changes to the loaded data.

**Expected behavior**:

1. Component renders with `state === null` → shows "Loading initial data..."
2. After 50ms delay, cubit emits data
3. Component re-renders with loaded data → shows `<div data-testid="loaded">Data: ...</div>`

**Actual behavior**: Component never re-renders after step 2. The state update from the cubit constructor's async function doesn't trigger a component update.

### 2. "should handle Suspense boundaries correctly"

**File**: `src/__tests__/useBloc.suspense.test.tsx:127`

**What it tests**: A Cubit that uses a Suspense resource (throws promise) should work with React Suspense boundaries.

**Failure**: The component stays suspended (showing "Suspended..." fallback) and never resolves to show the actual component.

**Expected behavior**:

1. Component renders → cubit.getData() throws promise → Suspense shows fallback
2. Promise resolves after 100ms
3. Component re-renders → shows loaded data

**Actual behavior**: Promise appears to resolve but component never re-renders or Suspense never recovers.

## Root Cause Analysis

### Issue 1: Async Constructor Pattern

The `createAsyncCubit` helper creates a Cubit with this pattern:

```typescript
class AsyncCubit extends Cubit<T | null> {
  static isolated = true;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    super(null);
    this.loadPromise = this.load(); // Fires async operation immediately
  }

  private load = async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    this.emit(initialValue); // This emit happens AFTER constructor completes
    this.loadPromise = null;
  };
}
```

**Problem**: The `this.emit()` call in the async `load()` method happens _after_ the constructor completes and _after_ the initial `useBloc` subscription is set up. However, the component may not be listening to state changes yet when the emit happens.

**Potential causes**:

- Race condition between subscription setup and async emit
- The BlacAdapter subscription isn't fully active when constructor async work completes
- Happy-dom environment may not be flushing microtasks/promises correctly

### Issue 2: Suspense Resource Pattern

The `SuspenseCubit` throws a promise in `getData()`:

```typescript
getData = () => {
  if (!this.state && this.resource) {
    const data = this.resource.read(); // Throws promise if pending
    this.emit(data);
    return data;
  }
  return this.state;
};
```

**Problem**: When the promise thrown by `resource.read()` resolves, React should re-render the component. But the component appears to stay suspended.

**Potential causes**:

- The Suspense implementation in happy-dom may not fully support this pattern
- The promise being thrown may not be the same instance that resolves
- The re-render after promise resolution doesn't trigger useBloc properly

## Test Environment Observations

- **Environment**: happy-dom (lightweight DOM implementation)
- **React version**: 19.1.1
- **Test runner**: Vitest 3.2.4

**Happy-dom limitations**:

- May not fully implement all React Suspense behaviors
- Microtask/promise scheduling may differ from real browser
- Timer-based async operations may not integrate perfectly with act()

## Working Tests

These related tests **pass**, which provides clues:

1. ✓ "should work with nested Suspense boundaries" - Uses same `createAsyncCubit` helper
2. ✓ "should handle async initialization with multiple blocs" - Uses same `createAsyncCubit` helper

**Key difference**: The passing tests use `waitFor()` with longer timeouts and multiple state checks. They may be working due to different timing or test structure.

## Proposed Solutions

### Option 1: Fix the Async Constructor Pattern (Recommended)

**Problem**: State emitted during async constructor execution may not trigger subscriptions.

**Solution**: Ensure subscriptions are active before any async state updates.

**Approach**:

1. Move async loading outside of constructor
2. Use a separate initialization method that's called after subscription setup
3. Add explicit `act()` wrapping in tests for async operations

**Changes needed**:

- Modify `createAsyncCubit` helper to expose an explicit `load()` method
- Update test to call `cubit.load()` after component mounts
- Ensure proper `act()` wrapping

**Example**:

```typescript
export function createAsyncCubit<T>(initialValue: T, delay: number = 100) {
  class AsyncCubit extends Cubit<T | null> {
    static isolated = true;

    constructor() {
      super(null);
      // Don't start loading immediately
    }

    load = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      this.emit(initialValue);
    };
  }
  return AsyncCubit;
}

// In test:
const [state, cubit] = useBloc(AsyncCubit);
useEffect(() => {
  cubit.load();
}, []);
```

### Option 2: Fix Test Timing with act()

**Problem**: Tests may not be properly waiting for async updates.

**Solution**: Wrap all async operations in `act()` and add explicit waits.

**Changes needed**:

- Add `act()` wrapping around timer-based operations
- Use `flushMicrotasks()` helper after async operations
- Increase timeout values in `waitFor()`

### Option 3: Switch Test Environment

**Problem**: happy-dom may not fully support React 19 Suspense features.

**Solution**: Use jsdom or @vitest/browser for these specific tests.

**Changes needed**:

- Configure separate test file pattern for Suspense tests
- Use jsdom environment for Suspense tests
- Keep happy-dom for other tests (faster)

### Option 4: Simplify Suspense Tests

**Problem**: Tests may be testing React Suspense more than useBloc integration.

**Solution**: Simplify tests to focus on useBloc behavior, not Suspense edge cases.

**Changes needed**:

- Remove complex Suspense resource pattern
- Focus on testing that useBloc subscriptions work with async state updates
- Test Suspense integration more superficially

## Recommended Fix Plan

**Phase 1: Quick Fix (Option 1 + Option 2)**

1. Update `createAsyncCubit` to defer loading until explicitly called
2. Modify failing tests to explicitly trigger loading with proper `act()` wrapping
3. Add `flushMicrotasks()` calls where needed
4. Verify tests pass

**Phase 2: Investigation (If Phase 1 doesn't work)**

1. Try jsdom environment for Suspense tests (Option 3)
2. Add debug logging to understand subscription timing
3. Check if issue exists in real browser environment using @vitest/browser

**Phase 3: Simplification (If needed)**

1. Simplify Suspense tests to focus on core useBloc functionality
2. Add comment explaining Suspense integration limitations in test environment
3. Consider adding integration tests in playground app for real-world validation

## Files to Modify

1. `packages/blac-react/src/__tests__/utils/react18-helpers.ts` - Update `createAsyncCubit`
2. `packages/blac-react/src/__tests__/useBloc.suspense.test.tsx` - Fix failing tests
3. `packages/blac-react/vitest.config.ts` - Potentially add jsdom for specific tests

## Security & Stability Considerations

**Nancy Leveson** - _"What is the worst thing that could happen if this fails?"_

- These are test failures, not production code issues
- No user-facing impact
- However, if tests are masking a real subscription timing bug, that could affect real applications

**Recommendation**: Validate fix doesn't just silence tests but actually verifies correct behavior.

## Next Steps

1. Implement Phase 1 fix
2. Run full test suite to ensure no regressions
3. If Phase 1 works, close issue
4. If Phase 1 fails, proceed to Phase 2 investigation
5. Document any environment-specific limitations discovered

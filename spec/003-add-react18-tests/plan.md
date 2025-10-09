# Action Item #003: Add React 18+ Feature Tests

**Priority:** 🟠 High
**Effort:** 1-2 days
**Risk:** Low

---

## Overview

Add comprehensive test coverage for React 18+ features (useTransition, useDeferredValue, Suspense) to ensure BlaC works correctly with modern React patterns.

**Current State:** No tests for React 18+ specific features
**Desired State:** Complete test coverage for all React 18+ integrations

---

## Research Phase

### Key React 18 Features to Test

#### 1. useTransition
**Purpose:** Mark state updates as non-urgent
**BlaC Integration:** Bloc state updates within transitions should work correctly

**Test Scenarios:**
- State updates within `startTransition` callback
- `isPending` flag during bloc operations
- Multiple concurrent transitions
- Transition interruption

#### 2. useDeferredValue
**Purpose:** Defer expensive updates
**BlaC Integration:** Deferred values from bloc state

**Test Scenarios:**
- Defer bloc state values
- Interaction with dependency tracking
- Performance with large state objects

#### 3. Suspense
**Purpose:** Loading states and code splitting
**BlaC Integration:** Blocs with async initialization

**Test Scenarios:**
- Async bloc initialization
- Suspense boundaries around bloc-consuming components
- Error boundaries + Suspense
- Nested Suspense boundaries

#### 4. Concurrent Rendering
**Purpose:** Interruptible rendering
**BlaC Integration:** State updates during concurrent renders

**Test Scenarios:**
- Rapid state changes during concurrent mode
- State consistency across render phases
- No tearing (UI showing mixed states)

---

## Implementation Plan

### Phase 1: useTransition Tests

**File:** `packages/blac-react/src/__tests__/useBloc.useTransition.test.tsx`

**Tests to Add:**
```typescript
describe('useBloc with useTransition', () => {
  it('should handle state updates within transition', () => {
    const [isPending, startTransition] = useTransition();
    const [state, bloc] = useBloc(CounterCubit);

    startTransition(() => {
      bloc.increment();
    });

    // Verify isPending is true
    // Wait for transition to complete
    // Verify state updated correctly
  });

  it('should maintain reactivity during transitions', () => {
    // Verify component re-renders when state changes in transition
  });

  it('should handle multiple concurrent transitions', () => {
    // Test multiple transitions affecting same bloc
  });

  it('should handle transition interruption', () => {
    // Start transition, interrupt with another, verify state consistency
  });
});
```

---

### Phase 2: useDeferredValue Tests

**File:** `packages/blac-react/src/__tests__/useBloc.useDeferredValue.test.tsx`

**Tests to Add:**
```typescript
describe('useBloc with useDeferredValue', () => {
  it('should defer expensive state derivations', () => {
    const [state] = useBloc(LargeDataCubit);
    const deferredData = useDeferredValue(state.expensiveComputation);

    // Verify deferred value lags behind actual value
    // Verify eventual consistency
  });

  it('should work with dependency tracking', () => {
    // Verify dependency tracking still works with deferred values
  });

  it('should handle rapid state changes', () => {
    // Verify deferred value doesn't cause excessive re-renders
  });
});
```

---

### Phase 3: Suspense Tests

**File:** `packages/blac-react/src/__tests__/useBloc.suspense.test.tsx`

**Tests to Add:**
```typescript
describe('useBloc with Suspense', () => {
  it('should support async bloc initialization', async () => {
    // Create bloc that loads data asynchronously
    // Wrap in Suspense boundary
    // Verify loading state shown
    // Verify component renders after loading
  });

  it('should handle Suspense boundaries correctly', () => {
    // Test that Suspense doesn't interfere with bloc lifecycle
  });

  it('should work with nested Suspense', () => {
    // Multiple levels of Suspense with different blocs
  });

  it('should integrate with Error Boundaries', () => {
    // Suspense + Error Boundary + Bloc errors
  });
});
```

---

### Phase 4: Concurrent Rendering Tests

**File:** `packages/blac-react/src/__tests__/useBloc.concurrent.test.tsx`

**Tests to Add:**
```typescript
describe('useBloc in Concurrent Mode', () => {
  it('should handle rapid state changes without tearing', () => {
    // Verify no visual tearing (mixed states visible)
  });

  it('should maintain state consistency across renders', () => {
    // Verify state is consistent even with interrupted renders
  });

  it('should handle priority updates correctly', () => {
    // Mix of urgent and non-urgent updates
  });
});
```

---

## Testing Strategy

### Prerequisites
- React 18.2+ installed
- @testing-library/react updated to support React 18
- Test environment configured for concurrent features

### Test Utilities

Create helper utilities:
```typescript
// packages/blac-react/src/__tests__/utils/react18-helpers.ts

export function waitForTransition(callback: () => void): Promise<void> {
  return act(async () => {
    startTransition(callback);
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

export function createAsyncBloc<T>(
  initialValue: T,
  delay: number = 100
): Cubit<T | null> {
  class AsyncCubit extends Cubit<T | null> {
    constructor() {
      super(null);
      this.load();
    }

    private load = async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      this.emit(initialValue);
    };
  }

  return new AsyncCubit();
}
```

---

## Tasks Breakdown

### Day 1: Setup and useTransition
- [ ] Set up test files
- [ ] Create test utilities
- [ ] Write useTransition tests (4-6 tests)
- [ ] Run and debug tests

### Day 2: useDeferredValue and Suspense
- [ ] Write useDeferredValue tests (3-4 tests)
- [ ] Write Suspense tests (4-5 tests)
- [ ] Write concurrent rendering tests (3-4 tests)
- [ ] Integration testing

### Documentation
- [ ] Update README with React 18 compatibility notes
- [ ] Add examples to docs
- [ ] Update migration guide if needed

---

## Success Criteria

- ✅ All React 18 features tested
- ✅ Tests pass in React 18.2+
- ✅ No regressions in React 17 (if supported)
- ✅ Documentation updated
- ✅ Examples added

---

## Resources

- [React 18 Release Notes](https://react.dev/blog/2022/03/29/react-v18)
- [useTransition API](https://react.dev/reference/react/useTransition)
- [useDeferredValue API](https://react.dev/reference/react/useDeferredValue)
- [Suspense API](https://react.dev/reference/react/Suspense)
- [Concurrent Features](https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react)

---

**Status:** Ready for Implementation
**Dependencies:** None (can run in parallel with #001)
**Next Step:** Create test files and utilities

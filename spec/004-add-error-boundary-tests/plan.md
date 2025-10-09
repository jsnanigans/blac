# Action Item #004: Add Error Boundary Integration Tests

**Priority:** 🟡 Medium
**Effort:** 0.5-1 day
**Risk:** Low

---

## Overview

Add tests for Error Boundary integration with BlaC to ensure errors in blocs are properly caught and handled by React error boundaries.

---

## Test Scenarios

### 1. Basic Error Boundary Integration
**File:** `packages/blac-react/src/__tests__/useBloc.errorBoundary.test.tsx`

```typescript
describe('useBloc with Error Boundaries', () => {
  class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    render() {
      if (this.state.hasError) {
        return <div data-testid="error">{this.state.error.message}</div>;
      }
      return this.props.children;
    }
  }

  it('should catch errors in bloc state updates', () => {
    class ErrorCubit extends Cubit<number> {
      throwError = () => {
        throw new Error('Bloc error');
      };
    }

    // Test that error boundary catches bloc errors
  });

  it('should catch errors in event handlers', () => {
    class ErrorBloc extends Bloc<number, ErrorEvent> {
      constructor() {
        super(0);
        this.on(ErrorEvent, () => {
          throw new Error('Event handler error');
        });
      }
    }

    // Test error boundary with Bloc events
  });

  it('should maintain bloc instance after error', () => {
    // Verify bloc isn't disposed after error
    // Test recovery scenarios
  });

  it('should work with multiple error boundaries', () => {
    // Nested error boundaries with different blocs
  });
});
```

### 2. Error Recovery Patterns

```typescript
describe('Error Recovery', () => {
  it('should allow state reset after error', () => {
    // Error boundary with reset button
    // Verify bloc can recover
  });

  it('should handle async errors', async () => {
    // Async operations that fail
    // Verify error boundary catches them
  });

  it('should integrate with Suspense + Error Boundary', () => {
    // Combined Suspense and Error Boundary
  });
});
```

---

## Implementation Tasks

### Day 1 (Morning): Setup
- [ ] Create ErrorBoundary test component
- [ ] Create error-throwing test blocs
- [ ] Set up test utilities

### Day 1 (Afternoon): Tests
- [ ] Write basic error boundary tests (4 tests)
- [ ] Write error recovery tests (3 tests)
- [ ] Write integration tests (2 tests)

### Documentation
- [ ] Add error handling section to docs
- [ ] Add error boundary examples
- [ ] Update troubleshooting guide

---

## Success Criteria

- ✅ Error boundaries catch bloc errors
- ✅ Blocs remain functional after errors
- ✅ Recovery patterns documented
- ✅ All tests pass

---

**Status:** Ready for Implementation
**Dependencies:** None
**Estimated Time:** 4-6 hours

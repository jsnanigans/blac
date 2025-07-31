# Blac Testing Utilities

Comprehensive testing utilities for the Blac state management library, providing powerful tools for testing Blocs, Cubits, and detecting memory leaks.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [BlocTest Class](#bloctest-class)
- [MockBloc](#mockbloc)
- [MockCubit](#mockcubit)
- [MemoryLeakDetector](#memoryleakdetector)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Installation

The testing utilities are included in the `@blac/core` package:

```typescript
import { BlocTest, MockBloc, MockCubit, MemoryLeakDetector } from '@blac/core';
```

## Quick Start

### Basic Test Setup

```typescript
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { BlocTest, Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

describe('Counter Tests', () => {
  beforeEach(() => {
    BlocTest.setUp();
  });

  afterEach(() => {
    BlocTest.tearDown();
  });

  it('should increment counter', async () => {
    const counter = BlocTest.createBloc(CounterCubit);

    counter.increment();

    expect(counter.state.count).toBe(1);
  });
});
```

## BlocTest Class

The `BlocTest` class provides utilities for setting up clean test environments and testing state changes.

### Static Methods

#### `setUp()`

Sets up a clean test environment by resetting the Blac instance and disabling logging.

```typescript
beforeEach(() => {
  BlocTest.setUp();
});
```

#### `tearDown()`

Tears down the test environment and cleans up resources.

```typescript
afterEach(() => {
  BlocTest.tearDown();
});
```

#### `createBloc<T>(BlocClass, ...args)`

Creates and activates a bloc instance for testing.

```typescript
const userBloc = BlocTest.createBloc(UserBloc, 'initialUserId');
```

#### `waitForState<T, S>(bloc, predicate, timeout?)`

Waits for a bloc to emit a state matching the given predicate.

```typescript
// Wait for loading to complete
await BlocTest.waitForState(
  userBloc,
  (state) => !state.isLoading,
  3000, // timeout in milliseconds
);
```

#### `expectStates<T, S>(bloc, expectedStates, timeout?)`

Expects a bloc to emit specific states in order.

```typescript
// Test a sequence of state changes
await BlocTest.expectStates(counterBloc, [
  { count: 1 },
  { count: 2 },
  { count: 3 },
]);
```

### Error Handling

All async methods throw descriptive errors when timeouts occur:

```typescript
try {
  await BlocTest.waitForState(bloc, (state) => state.loaded, 1000);
} catch (error) {
  console.log(error.message); // "Timeout waiting for state matching predicate after 1000ms"
}
```

## MockBloc

`MockBloc` extends `Bloc` to provide testing-specific functionality for event-driven blocs.

### Creating a MockBloc

```typescript
interface CounterState {
  count: number;
  loading: boolean;
}

class IncrementEvent {
  constructor(public amount: number = 1) {}
}

class LoadingEvent {}

const mockBloc = new MockBloc<CounterState>({
  count: 0,
  loading: false,
});
```

### Mocking Event Handlers

```typescript
// Mock the increment event handler
mockBloc.mockEventHandler(IncrementEvent, (event, emit) => {
  const currentState = mockBloc.state;
  emit({
    ...currentState,
    count: currentState.count + event.amount,
  });
});

// Mock async event handler
mockBloc.mockEventHandler(LoadingEvent, async (event, emit) => {
  emit({ ...mockBloc.state, loading: true });

  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 100));

  emit({ ...mockBloc.state, loading: false });
});
```

### Testing Event Handlers

```typescript
it('should handle increment events', async () => {
  await mockBloc.add(new IncrementEvent(5));
  expect(mockBloc.state.count).toBe(5);
});

it('should track registered handlers', () => {
  expect(mockBloc.hasHandler(IncrementEvent)).toBe(true);
  expect(mockBloc.getHandlerCount()).toBe(2);
});
```

## MockCubit

`MockCubit` extends `Cubit` to provide state history tracking for testing.

### Creating a MockCubit

```typescript
interface UserState {
  name: string;
  email: string;
}

const mockCubit = new MockCubit<UserState>({
  name: 'John',
  email: 'john@example.com',
});
```

### State History Tracking

```typescript
it('should track state history', () => {
  mockCubit.emit({ name: 'Jane', email: 'jane@example.com' });
  mockCubit.emit({ name: 'Bob', email: 'bob@example.com' });

  const history = mockCubit.getStateHistory();
  expect(history).toHaveLength(3); // Initial + 2 emissions
  expect(history[0]).toEqual({ name: 'John', email: 'john@example.com' });
  expect(history[1]).toEqual({ name: 'Jane', email: 'jane@example.com' });
  expect(history[2]).toEqual({ name: 'Bob', email: 'bob@example.com' });
});

it('should clear state history', () => {
  mockCubit.emit({ name: 'Test', email: 'test@example.com' });
  mockCubit.clearStateHistory();

  const history = mockCubit.getStateHistory();
  expect(history).toHaveLength(1); // Only current state
  expect(history[0]).toEqual(mockCubit.state);
});
```

## MemoryLeakDetector

Detects potential memory leaks by monitoring bloc instances before and after test execution.

### Basic Usage

```typescript
describe('Memory Leak Tests', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    BlocTest.setUp();
    detector = new MemoryLeakDetector();
  });

  afterEach(() => {
    const result = detector.checkForLeaks();

    if (result.hasLeaks) {
      console.warn('Memory leak detected:', result.report);
    }

    BlocTest.tearDown();
  });

  it('should not leak memory', () => {
    const bloc1 = BlocTest.createBloc(CounterCubit);
    const bloc2 = BlocTest.createBloc(UserCubit);

    // Test operations...

    // Clean up blocs
    Blac.disposeBloc(bloc1);
    Blac.disposeBloc(bloc2);

    const result = detector.checkForLeaks();
    expect(result.hasLeaks).toBe(false);
  });
});
```

### Leak Detection Report

```typescript
const result = detector.checkForLeaks();

console.log(result.report);
// Output:
// Memory Leak Detection Report:
// - Initial registered blocs: 0
// - Current registered blocs: 2
// - Initial isolated blocs: 0
// - Current isolated blocs: 1
// - Initial keep-alive blocs: 0
// - Current keep-alive blocs: 0
// - Potential leaks detected: YES
```

## Best Practices

### 1. Always Use setUp/tearDown

```typescript
describe('Test Suite', () => {
  beforeEach(() => BlocTest.setUp());
  afterEach(() => BlocTest.tearDown());

  // Your tests...
});
```

### 2. Test State Transitions

```typescript
it('should transition through loading states', async () => {
  const bloc = BlocTest.createBloc(DataBloc);

  // Trigger async operation
  bloc.loadData();

  // Test state sequence
  await BlocTest.expectStates(bloc, [
    { data: null, loading: true, error: null },
    { data: mockData, loading: false, error: null },
  ]);
});
```

### 3. Test Error Scenarios

```typescript
it('should handle errors gracefully', async () => {
  const mockBloc = new MockBloc<DataState>(initialState);

  mockBloc.mockEventHandler(LoadDataEvent, async (event, emit) => {
    emit({ ...mockBloc.state, loading: true });
    throw new Error('Network error');
  });

  await expect(mockBloc.add(new LoadDataEvent())).rejects.toThrow(
    'Network error',
  );
});
```

### 4. Monitor Memory Usage

```typescript
describe('Performance Tests', () => {
  let detector: MemoryLeakDetector;

  beforeEach(() => {
    BlocTest.setUp();
    detector = new MemoryLeakDetector();
  });

  afterEach(() => {
    const result = detector.checkForLeaks();
    expect(result.hasLeaks).toBe(false);
    BlocTest.tearDown();
  });

  // Tests that verify no memory leaks...
});
```

## Examples

### Testing Async Operations

```typescript
class ApiBloc extends Bloc<ApiState, ApiEvent> {
  constructor() {
    super({ data: null, loading: false, error: null });

    this.on(FetchDataEvent, this.handleFetchData);
  }

  private async handleFetchData(
    event: FetchDataEvent,
    emit: (state: ApiState) => void,
  ) {
    emit({ ...this.state, loading: true, error: null });

    try {
      const data = await apiService.fetchData(event.id);
      emit({ data, loading: false, error: null });
    } catch (error) {
      emit({ data: null, loading: false, error: error.message });
    }
  }
}

it('should handle successful API call', async () => {
  const bloc = BlocTest.createBloc(ApiBloc);

  // Mock the API service
  vi.spyOn(apiService, 'fetchData').mockResolvedValue(mockData);

  bloc.add(new FetchDataEvent('123'));

  await BlocTest.expectStates(bloc, [
    { data: null, loading: true, error: null },
    { data: mockData, loading: false, error: null },
  ]);
});

it('should handle API errors', async () => {
  const bloc = BlocTest.createBloc(ApiBloc);

  vi.spyOn(apiService, 'fetchData').mockRejectedValue(new Error('API Error'));

  bloc.add(new FetchDataEvent('123'));

  await BlocTest.expectStates(bloc, [
    { data: null, loading: true, error: null },
    { data: null, loading: false, error: 'API Error' },
  ]);
});
```

### Testing State Dependencies

```typescript
it('should wait for specific conditions', async () => {
  const userBloc = BlocTest.createBloc(UserBloc);
  const permissionBloc = BlocTest.createBloc(PermissionBloc);

  // Start async operations
  userBloc.loadUser('123');
  permissionBloc.loadPermissions('123');

  // Wait for both to complete
  await Promise.all([
    BlocTest.waitForState(userBloc, (state) => state.user !== null),
    BlocTest.waitForState(
      permissionBloc,
      (state) => state.permissions !== null,
    ),
  ]);

  expect(userBloc.state.user).toBeDefined();
  expect(permissionBloc.state.permissions).toBeDefined();
});
```

### Testing Complex State Changes

```typescript
it('should handle complex wizard flow', async () => {
  const wizardBloc = BlocTest.createBloc(WizardBloc);

  // Navigate through wizard steps
  wizardBloc.add(new NextStepEvent());
  wizardBloc.add(new SetDataEvent({ name: 'John' }));
  wizardBloc.add(new NextStepEvent());
  wizardBloc.add(new SetDataEvent({ email: 'john@example.com' }));
  wizardBloc.add(new SubmitEvent());

  // Verify final state
  await BlocTest.waitForState(
    wizardBloc,
    (state) => state.isComplete && !state.isSubmitting,
  );

  expect(wizardBloc.state.data).toEqual({
    name: 'John',
    email: 'john@example.com',
  });
});
```

## Integration with Testing Frameworks

### Vitest

```typescript
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { BlocTest } from '@blac/core';

describe('Integration with Vitest', () => {
  beforeEach(() => BlocTest.setUp());
  afterEach(() => BlocTest.tearDown());

  // Tests...
});
```

### Jest

```typescript
import { BlocTest } from '@blac/core';

describe('Integration with Jest', () => {
  beforeEach(() => BlocTest.setUp());
  afterEach(() => BlocTest.tearDown());

  // Tests...
});
```

---

## API Reference

### BlocTest

| Method                | Parameters                      | Returns         | Description                    |
| --------------------- | ------------------------------- | --------------- | ------------------------------ |
| `setUp()`             | None                            | `void`          | Sets up clean test environment |
| `tearDown()`          | None                            | `void`          | Cleans up test environment     |
| `createBloc<T>()`     | `BlocClass`, `...args`          | `T`             | Creates and activates bloc     |
| `waitForState<T,S>()` | `bloc`, `predicate`, `timeout?` | `Promise<S>`    | Waits for state condition      |
| `expectStates<T,S>()` | `bloc`, `states[]`, `timeout?`  | `Promise<void>` | Expects state sequence         |

### MockBloc

| Method                  | Parameters                    | Returns   | Description              |
| ----------------------- | ----------------------------- | --------- | ------------------------ |
| `mockEventHandler<E>()` | `eventConstructor`, `handler` | `void`    | Mocks event handler      |
| `getHandlerCount()`     | None                          | `number`  | Gets handler count       |
| `hasHandler()`          | `eventConstructor`            | `boolean` | Checks handler existence |

### MockCubit

| Method                | Parameters | Returns | Description          |
| --------------------- | ---------- | ------- | -------------------- |
| `getStateHistory()`   | None       | `S[]`   | Gets state history   |
| `clearStateHistory()` | None       | `void`  | Clears state history |

### MemoryLeakDetector

| Method            | Parameters | Returns      | Description             |
| ----------------- | ---------- | ------------ | ----------------------- |
| `checkForLeaks()` | None       | `LeakReport` | Checks for memory leaks |

---

_"By the infinite power of the galaxy, test with confidence!"_ ⭐️

# The Blac Pattern

The Blac (Bloc + React) pattern provides a structured approach to state management by enforcing a unidirectional data flow and a clear separation of concerns between your UI and business logic. This makes your applications more scalable, testable, and easier to understand.

## Core Components of the Blac Pattern

The pattern revolves around three key elements:

### 1. State

State is a plain, immutable JavaScript object (or primitive) that represents the data for your application or a specific feature at a point in time. It should be serializable to facilitate debugging and potential persistence.

```typescript
// Example of a state object
interface CounterState {
  count: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated?: number;
}
```

**Best Practices for State Design:**

- Keep state serializable (avoid complex class instances, functions, etc., directly in the state if persistence or straightforward debugging is a goal).
- Prefer flatter state structures where possible, but organize logically.
- Explicitly include UI-related states like `isLoading`, `error`, etc.
- Utilize TypeScript interfaces or types for robust type safety.

See more in [Best Practices for State Container Design](/learn/best-practices#state-container-design).

### 2. State Containers (`Cubit` or `Bloc`)

State containers are classes that hold the current `State` and contain the business logic that dictates how that state can change. They are independent of the UI layer, which makes them highly testable.

Blac offers two main types of state containers:

- **`Cubit<State>`**: A simpler container that exposes methods to directly `emit` new states or `patch` the existing state.

  ```typescript
  // Example of a Cubit state container
  import { Cubit } from '@blac/core';

  class CounterCubit extends Cubit<CounterState> {
    constructor() {
      super({ count: 0, isLoading: false, error: null });
    }

    increment = () => {
      this.patch({ count: this.state.count + 1, lastUpdated: Date.now() });
    };

    decrement = () => {
      this.patch({ count: this.state.count - 1, lastUpdated: Date.now() });
    };

    reset = () => {
      // 'emit' can be used to completely replace the state
      this.emit({
        count: 0,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      });
    };

    // Example async operation
    fetchCount = async () => {
      this.patch({ isLoading: true, error: null });
      try {
        // const response = await api.fetchCount(); // Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
        const fetchedCount = Math.floor(Math.random() * 100);
        this.patch({
          count: fetchedCount,
          isLoading: false,
          lastUpdated: Date.now(),
        });
      } catch (err) {
        this.patch({
          isLoading: false,
          error:
            err instanceof Error ? err.message : 'An unknown error occurred',
          lastUpdated: Date.now(),
        });
      }
    };
  }
  ```

- **`Bloc<State, A extends BlocEventConstraint>`**: A more structured container that processes instances of event _classes_ through registered _handler functions_ to produce new `State`. Event instances are dispatched via `this.add(new EventType())`, and handlers are registered with `this.on(EventType, handler)`. This is ideal for more complex, type-safe state transitions.

Details on these are in the [Core Classes API](/api/core-classes) and [Core Concepts](/learn/core-concepts).

### 3. UI Components

UI components are primarily responsible for rendering the `State` they receive from a state container and dispatching user intentions (e.g., button clicks) by calling methods on the state container instance.

```tsx
// Example of a UI component using the CounterCubit
import { useBloc } from '@blac/react';
// Assume CounterCubit is imported from its file

function CounterDisplay() {
  const [state, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="counter">
      {state.isLoading && <p>Loading...</p>}
      {!state.isLoading && state.error && (
        <p className="error">Error: {state.error}</p>
      )}
      {!state.isLoading && !state.error && <h1>Count: {state.count}</h1>}
      <p>
        Last updated:{' '}
        {state.lastUpdated
          ? new Date(state.lastUpdated).toLocaleTimeString()
          : 'N/A'}
      </p>
      <div className="button-group">
        <button onClick={counterCubit.increment} disabled={state.isLoading}>
          Increment
        </button>
        <button onClick={counterCubit.decrement} disabled={state.isLoading}>
          Decrement
        </button>
        <button onClick={counterCubit.reset} disabled={state.isLoading}>
          Reset
        </button>
        <button onClick={counterCubit.fetchCount} disabled={state.isLoading}>
          {state.isLoading ? 'Fetching...' : 'Fetch Random Count'}
        </button>
      </div>
    </div>
  );
}
```

Connect UI components using hooks from `@blac/react`. See the [React Hooks API](/api/react-hooks).

## Unidirectional Data Flow

The Blac pattern enforces a strict unidirectional data flow, making state changes predictable and traceable:

```text
                 ┌───────────────────┐
                 │  State Container  │
                 │ (Cubit / Bloc)    │
                 └────────┬──────────┘
                          │
State updates via internal │ State (Immutable)
logic (Cubit) or event   │
handlers (Bloc)          │
                          ▼
                 ┌────────┴──────────┐
                 │   UI Component    │
                 │ (Renders State)   │
                 └────────┬──────────┘
                          │
                          │ User Interactions / Events
                          │ (e.g., button clicks)
                          │
                          └─► Call Methods on State Container
```

1.  **UI Components** render based on the current `State` from a `Cubit` or `Bloc`.
2.  **User interactions** (or other events) in the UI trigger method calls on the `Cubit`/`Bloc` instance.
3.  The **`Cubit`/`Bloc`** contains business logic. A `Cubit` processes the method call directly. A `Bloc` processes dispatched event instances through its registered event handlers. It produces a new `State`.
4.  The **State Container** notifies its listeners (including the `useBloc` hook) that its state has changed.
5.  The **UI Component** re-renders with the new `State`.

This cycle ensures that changes are easy to follow and debug.

## Advantages of the Blac Pattern

1.  **Clear Separation of Concerns**: UI is distinct from business logic.
2.  **Enhanced Testability**: State containers can be unit-tested in isolation from the UI.
3.  **Improved Maintainability**: Logic and UI can be modified independently.
4.  **Predictable State Management**: Unidirectional flow makes state changes easy to trace.
5.  **Optimized Rendering**: React components re-render efficiently due to Blac's state subscription model.

## When to Use the Blac Pattern

The Blac pattern is beneficial for:

- Components or features with non-trivial business logic.
- Managing asynchronous operations, including loading and error states.
- Sharing state across multiple components or sections of your application.
- Applications requiring a robust, predictable, and traceable state management architecture.

## How to Choose: `Cubit` vs. `Bloc`

- Use **`Cubit`** when:
  - State logic is relatively simple.
  - You prefer updating state via direct method calls (`emit`, `patch`).
  - Formal event classes and handlers feel like overkill.
- Use **`Bloc`** (with its `this.on(EventType, handler)` and `this.add(new EventType())` pattern) when:
  - State transitions are complex and benefit from distinct, type-safe event classes and dedicated handlers.
  - You want a clear, event-driven architecture for managing state changes and side effects, enhancing traceability and maintainability.

Refer to the [Core Classes API](/api/core-classes) and [Key Methods API](/api/key-methods) for more implementation details.

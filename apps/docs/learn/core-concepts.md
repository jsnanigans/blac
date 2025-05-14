# Core Concepts

Blac (Bloc + React) is designed to help you manage state in your applications effectively by promoting a clear separation of concerns and a unidirectional data flow.

## The Blac Architecture

Blac's architecture encourages separating your application into three main parts:

1.  **UI Components**: Responsible for rendering the state and capturing user input/intentions.
2.  **State Containers (`Cubit` or `Bloc`)**: Hold the application state and contain the business logic to manage state transitions.
3.  **State**: Immutable data objects that represent the condition of your application at any given time. State flows from your containers to your UI.

This separation enhances testability, maintainability, and overall code clarity.

## State Containers: `Cubit` and `Bloc`

Blac offers two primary types of state containers, both built upon a common `BlocBase`, allowing you to choose the pattern that best fits the complexity of your state logic:

### `BlocBase`

`BlocBase` is the abstract foundation for all state containers. It provides core functionalities like:

-   Internal state management and update mechanisms (`_state`, `_pushState`).
-   An observer notification system (`_observer`).
-   Lifecycle event dispatching through the main `Blac` instance.
-   Instance management (ID, isolation, keep-alive status).

You typically won't extend `BlocBase` directly. Instead, you'll use `Cubit` or `Bloc` (or `createBloc`). Refer to the [Core Classes API](/api/core-classes) for deeper details.

### `Cubit<State, Props>`

A `Cubit` is the simpler of the two. It exposes methods that directly cause state changes by calling `this.emit()` or `this.patch()`. This approach is often preferred for straightforward state management where the logic for state changes can be encapsulated within direct method calls, similar to how state is managed in libraries like Zustand.

-   `emit(newState: State)`: Replaces the entire current state with `newState`.
-   `patch(partialState: Partial<State>)`: Merges `partialState` with the current state (if the state is an object).

```tsx
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
  lastAction?: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 }); // Initial state
  }

  increment = () => {
    // 'emit' replaces the whole state
    this.emit({ count: this.state.count + 1, lastAction: 'incremented' });
  };

  decrement = () => {
    // 'patch' merges with the existing state (if state is an object)
    this.patch({ count: this.state.count - 1, lastAction: 'decremented' });
  };

  reset = () => {
    this.emit({ count: 0, lastAction: 'reset' });
  }
}
```
Cubits are excellent for straightforward state management. See [Cubit API details](/api/core-classes#cubit-s-p).

### `Bloc<State, Action, Props>`

A `Bloc` is more structured and suited for complex state logic. It processes `Action`s (events) which are dispatched to it via its `add(action)` method. These actions are then handled by a `reducer` function. The `reducer` is a pure function that takes the current state and the dispatched action, and returns a new state. This event-driven update cycle, where state transitions are explicit and decoupled, is similar to the reducer pattern found in Redux.

-   `add(action: Action)`: Dispatches an action to the `reducer`.
-   `reducer(action: Action, currentState: State): State`: A pure function that defines how the state changes in response to actions.

```tsx
import { Bloc } from '@blac/core';

// 1. Define State and Actions
interface CounterState {
  count: number;
}

type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' };

// 2. Create the Bloc
class CounterBloc extends Bloc<CounterState, CounterAction> {
  constructor() {
    super({ count: 0 }); // Initial state
  }

  // 3. Implement the reducer
  reducer = (action: CounterAction, state: CounterState): CounterState => {
    switch (action.type) {
      case 'INCREMENT':
        return { ...state, count: state.count + 1 };
      case 'DECREMENT':
        return { ...state, count: state.count - 1 };
      case 'RESET':
        return { ...state, count: 0 };
      default:
        return state;
    }
  };

  // 4. (Optional) Helper methods to dispatch actions
  increment = () => this.add({ type: 'INCREMENT' });
  decrement = () => this.add({ type: 'DECREMENT' });
  reset = () => this.add({ type: 'RESET' });
}
```
Blocs are ideal for complex state logic where transitions need to be more explicit and benefit from an event-driven architecture. See [Bloc API details](/api/core-classes#bloc-s-a-p).

## State Updates & Reactivity

When a `Cubit` calls `emit`/`patch`, or a `Bloc`'s reducer produces a new state after an `add` call, the state container updates its internal state and notifies its observers.

In React applications, the `useBloc` hook subscribes your components to these updates, triggering re-renders efficiently when relevant parts of the state change.

## React Integration: `useBloc`

The primary hook for connecting React components to `Cubit` or `Bloc` instances is `useBloc` from `@blac/react`.

```tsx
import { useBloc } from '@blac/react';
// Assuming CounterCubit or CounterBloc is defined elsewhere

function CounterComponent() {
  // Returns [currentState, instance]
  const [state, counterContainer] = useBloc(CounterCubit); // Or useBloc(CounterBloc)

  return (
    <div>
      <h1>Count: {state.count}</h1>
      {/* Call methods directly on the instance */} 
      <button onClick={counterContainer.increment}>Increment</button>
    </div>
  );
}
```

Key features of `useBloc`:

-   **Automatic Property Tracking**: Efficiently re-renders components only when the state properties they *actually access* change.
-   **Instance Management**: Handles creation and retrieval of shared or isolated state container instances.
-   **Props for Blocs**: Allows passing props to your `Bloc` or `Cubit` constructors.

For more details, see the [React Hooks API](/api/react-hooks).

## Instance Management Patterns

Blac, through its central `Blac` instance, offers flexible ways to manage your `Bloc` or `Cubit` instances:

1.  **Shared State (Default for non-isolated Blocs)**:
    When a `Bloc` or `Cubit` is *not* marked as `static isolated = true;`, instances are typically shared.
    Components requesting such a `Bloc`/`Cubit` (e.g., via `useBloc(MyBloc)`) will receive the same instance if one already exists with a matching ID.
    By default, Blac uses the class name as the ID (e.g., `"MyBloc"`). You can also provide a specific `id` in the `useBloc` options (e.g., `useBloc(MyBloc, { id: 'customSharedId' })`) to share an instance under that custom ID. If no instance exists for the determined ID, a new one is created and registered for future sharing.

2.  **Isolated State**:
    To ensure a component gets its own unique instance of a `Bloc` or `Cubit`, you can either:
    *   Set `static isolated = true;` on your `Bloc`/`Cubit` class. When using `useBloc(MyIsolatedBloc)`, Blac will attempt to find an existing isolated instance using the class name as the default ID. If you need multiple, distinct isolated instances of the *same class* for different components or use cases, you *must* provide a unique `id` via `useBloc` options (e.g., `useBloc(MyIsolatedBloc, { id: 'uniqueInstance1' })`). Blac's `findIsolatedBlocInstance` method will use this ID to retrieve the specific instance. If no isolated instance with that ID is found, a new one is created and registered under that ID in a separate registry for isolated blocs.
    *   Even if a Bloc is not `static isolated`, you can achieve a similar effect by always providing a guaranteed unique `id` string through `useBloc` options. The `Blac` instance will then manage it as a distinct, non-isolated instance under that unique ID.

3.  **In-Memory Persistence (`keepAlive`)**:
    You can prevent a `Bloc`/`Cubit` (whether shared or isolated, though more common for shared) from being automatically disposed when no components are actively listening to it. Set `static keepAlive = true;` on the `Bloc`/`Cubit` class. The instance will remain in memory until manually disposed or the `Blac` instance is reset.

4.  **Automatic Disposal**:
    Unless `keepAlive` is true, `Bloc`s/`Cubit`s are automatically disposed of (and removed from Blac's internal registries) when they no longer have any active listeners (e.g., components using `useBloc`) or consumers. This helps prevent memory leaks.

5.  **Storage Persistence (Addons)**:
    For persisting state to external storage like `localStorage` or `sessionStorage`, Blac supports an addon system. You can use or create addons like the `Persist` addon for this purpose.

The central `Blac` instance (accessible via `Blac.getInstance()`) is responsible for all these behaviors, using methods like `getBloc`, `disposeBloc`, and managing internal maps of registered and isolated bloc instances.

Learn more in the [State Management Patterns](/learn/state-management-patterns) section.

## Next Steps

With these core concepts in mind, you are ready to:

-   Delve into the [Blac Pattern](/learn/blac-pattern) for a deeper architectural understanding.
-   Review [Best Practices](/learn/best-practices) for writing effective and maintainable Blac code.
-   Consult the full [API Reference](/api/core-classes) for detailed documentation on all classes and methods. 
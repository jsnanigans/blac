# Core Concepts

Blac (Bloc + React) is designed to help you manage state in your applications effectively by promoting a clear separation of concerns and a unidirectional data flow.

## The Blac Architecture

Blac's architecture encourages separating your application into three main parts:

1.  **UI Components**: Responsible for rendering the state and capturing user input/intentions.
2.  **State Containers (`Cubit` or `Bloc`)**: Hold the application state and contain the business logic to manage state transitions.
3.  **State**: Immutable data objects that represent the condition of your application at any given time. State flows from your containers to your UI.

This separation enhances testability, maintainability, and overall code clarity.

## State Containers: `Cubit` and `Bloc`

Blac offers two primary types of state containers, both built upon a common `BlocBase`:

### `BlocBase`

`BlocBase` is the abstract foundation for all state containers. It provides core functionalities like:

-   Internal state management and update mechanisms (`_state`, `_pushState`).
-   An observer notification system (`_observer`).
-   Lifecycle event dispatching through the main `Blac` instance.
-   Instance management (ID, isolation, keep-alive status).

You typically won't extend `BlocBase` directly. Instead, you'll use `Cubit` or `Bloc` (or `createBloc`). Refer to the [Core Classes API](/api/core-classes) for deeper details.

### `Cubit<State, Props>`

A `Cubit` is the simpler of the two. It exposes methods that directly cause state changes by calling `this.emit()` or `this.patch()`.

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

A `Bloc` is more structured, processing `Action`s through a `reducer` function to produce new `State`.

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
Blocs are ideal for complex state logic where transitions need to be more explicit. See [Bloc API details](/api/core-classes#bloc-s-a-p).

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

Blac offers flexibility in how state container instances are managed:

1.  **Shared State (Default)**: Components requesting the same `Bloc`/`Cubit` class (by default, using its name as ID) share a single instance and its state.
2.  **Isolated State**: Each component gets its own unique instance. Achieved by setting `static isolated = true;` on your `Bloc`/`Cubit` class, or by providing a unique `id` via `useBloc` options.
3.  **In-Memory Persistence (`keepAlive`)**: Prevents a shared `Bloc`/`Cubit` from being disposed when no components are listening if `static keepAlive = true;` is set on the class.
4.  **Storage Persistence (Addons)**: For persisting state to `localStorage`, `sessionStorage`, etc., use addons like the built-in `Persist` addon.

Learn more in the [State Management Patterns](/learn/state-management-patterns) section.

## Next Steps

With these core concepts in mind, you are ready to:

-   Delve into the [Blac Pattern](/learn/blac-pattern) for a deeper architectural understanding.
-   Review [Best Practices](/learn/best-practices) for writing effective and maintainable Blac code.
-   Consult the full [API Reference](/api/core-classes) for detailed documentation on all classes and methods. 
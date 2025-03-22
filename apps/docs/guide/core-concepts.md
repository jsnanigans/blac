# Core Concepts

## The Blac Architecture

Blac implements a unidirectional data flow pattern that encourages clean separation of business logic from UI components. The core architecture consists of three main parts:

1. **UI Components**: Pure renderers that display state and dispatch user intentions
2. **Blocs/Cubits**: State containers that handle business logic and state transitions
3. **State**: Immutable data that flows from Blocs to UI components

This separation makes your code more testable, maintainable, and easier to reason about.

## Blocs and Cubits

Blac provides two main types of state containers:

### Cubit

A `Cubit` is the simplest form of state container in Blac. It manages state changes through methods that call `emit()` or `patch()`:

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}
```

### Bloc

A `Bloc` is a more sophisticated state container that follows the reducer pattern, handling state changes in response to actions:

```tsx
// Define actions
type CounterAction = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

class CounterBloc extends Bloc<{ count: number }, CounterAction> {
  constructor() {
    super({ count: 0 });
  }

  // Reducer function
  reducer = (state: { count: number }, action: CounterAction) => {
    switch (action.type) {
      case 'increment':
        return { count: state.count + 1 };
      case 'decrement':
        return { count: state.count - 1 };
      case 'reset':
        return { count: 0 };
      default:
        return state;
    }
  };

  // Methods to dispatch actions
  increment = () => this.add({ type: 'increment' });
  decrement = () => this.add({ type: 'decrement' });
  reset = () => this.add({ type: 'reset' });
}
```

## React Integration

Blac provides React hooks to connect components to state containers:

### useBloc

The primary hook for connecting a component to a Bloc:

```tsx
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={bloc.increment}>Increment</button>
    </div>
  );
}
```

## State Management Patterns

Blac offers three key state management patterns:

1. **Shared State**: Default pattern where all components share a single Bloc instance
2. **Isolated State**: Each component gets its own state instance
3. **Persistent State**: State persists even when no components are using it

You'll learn more about these patterns in the [State Management Patterns](/guide/state-management-patterns) section. 
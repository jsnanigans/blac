# Core Concepts

## The Blac Architecture

Blac implements a unidirectional data flow pattern that encourages clean separation of business logic from UI components. The core architecture consists of three main parts:

1. **UI Components**: Pure renderers that display state and dispatch user intentions
2. **Blocs/Cubits**: State containers that handle business logic and state transitions
3. **State**: Immutable data that flows from Blocs to UI components

This separation makes your code more testable, maintainable, and easier to reason about.

## State Containers

Blac provides three main state container classes, each with increasing levels of sophistication:

### BlocBase

`BlocBase` is the abstract foundation for all state containers in Blac. It provides core functionality like:

- State management and updates
- Observer notification system
- Lifecycle event handling
- Instance management

While you won't typically extend BlocBase directly, understanding it helps when working with Blac at an advanced level. See the [Core Classes API](/api/core-classes) for more details.

### Cubit

A `Cubit` is the simplest form of state container in Blac. It manages state changes through methods that call `emit()` or `patch()`:

```tsx
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0, factor: 1 });
  }

  increment = () => {
    this.emit({ 
      ...this.state,
      count: this.state.count + 1 
    });
  };
  
  // Or using patch for partial updates
  incrementBy = (amount: number) => {
    this.patch({ count: this.state.count + amount });
  };
}
```

Cubits are perfect for simpler features where you don't need the formality of actions and reducers. For more on Cubit, see the [Core Classes API](/api/core-classes#cubits-p).

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
  reducer = (action: CounterAction, state: { count: number }) => {
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

Blocs are ideal for complex features with multiple state transitions or when you want a more formal approach to state management. For more on Bloc, see the [Core Classes API](/api/core-classes#blocs-a-p).

## Key Methods

All state containers provide key methods for state management:

### Cubit State Update Methods

- `emit()`: Completely replaces the current state with a new state object
- `patch()`: Updates specific properties of the state while preserving others

### Bloc State Update Methods

- `add()`: Dispatches an action to the reducer

### Event Subscription

- `on()`: Subscribes to state changes and other events

For detailed information on these methods, see the [Key Methods API](/api/key-methods).

## React Integration

Blac provides React hooks to connect components to state containers:

### useBloc

The primary hook for connecting a component to a Bloc or Cubit:

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

The `useBloc` hook offers several powerful features:

- Automatic property tracking for optimized rendering
- Support for shared, isolated, and persistent state
- Dependency injection through props
- Custom instance management with IDs

For more on React integration, see the [React Hooks API](/api/react-hooks).

## State Management Patterns

Blac offers three key state management patterns to suit different needs:

1. **Shared State**: The default pattern where all components share a single Bloc instance
2. **Isolated State**: Each component gets its own state instance, set with `static isolated = true`
3. **Persistent State**: State persists even when no components are using it, set with `static keepAlive = true`

These patterns give you flexibility in how state is shared and managed throughout your application. You'll learn more about these patterns in the [State Management Patterns](/guide/state-management-patterns) section.

## Next Steps

Now that you understand the core concepts, you can:

- Explore the [Blac Pattern](/guide/blac-pattern) to understand the recommended architecture
- Check out the [Best Practices](/guide/best-practices) for writing effective Blac code
- Dive into the [API Reference](/api/core-classes) for detailed documentation 
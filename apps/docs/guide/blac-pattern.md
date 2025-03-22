# The Blac Pattern

The Blac pattern is a unidirectional data flow architecture designed to separate business logic from UI components. This pattern makes your code more maintainable, testable, and easier to reason about.

## Core Components

The Blac pattern consists of three main components:

### 1. State

State is a plain, immutable object that represents the data for your application or a specific feature. It should be designed to be serializable and easy to debug.

```tsx
// Example of a state object
interface CounterState {
  count: number;
  isLoading: boolean;
  error: string | null;
}
```

### 2. State Containers (Blocs/Cubits)

State containers hold the current state and define how the state can change. They encapsulate all business logic and are independent of the UI layer.

```tsx
// Example of a Cubit state container
class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, isLoading: false, error: null });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };

  // Async operations
  fetchCount = async () => {
    try {
      this.patch({ isLoading: true, error: null });
      const response = await api.fetchCount();
      this.patch({ count: response.count, isLoading: false });
    } catch (error) {
      this.patch({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };
}
```

### 3. UI Components

UI components are pure renderers that display state and dispatch user intentions to state containers. They should not contain business logic.

```tsx
// Example of a UI component
function Counter() {
  const [state, bloc] = useBloc(CounterCubit);
  
  return (
    <div>
      {state.isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>Count: {state.count}</h1>
          <button onClick={bloc.increment}>Increment</button>
          <button onClick={bloc.decrement}>Decrement</button>
          <button onClick={bloc.reset}>Reset</button>
          <button onClick={bloc.fetchCount}>Fetch Count</button>
          {state.error && <p className="error">{state.error}</p>}
        </>
      )}
    </div>
  );
}
```

## Data Flow

The Blac pattern follows a strict unidirectional data flow:

1. UI components display the current state
2. User interactions trigger methods on the state container
3. State container methods update the state
4. UI components re-render with the new state

This cycle ensures that state changes are predictable and traceable, making debugging and testing easier.

## Advantages of the Blac Pattern

1. **Clean Separation of Concerns**: UI components focus on rendering, while state containers handle business logic
2. **Improved Testability**: State containers can be tested independently of UI components
3. **Better Maintainability**: Changes to business logic don't affect UI components and vice versa
4. **Predictable State Changes**: State only changes through defined methods in state containers
5. **Optimized Rendering**: Components only re-render when their specific dependencies change

## When to Use the Blac Pattern

The Blac pattern is ideal for:

- Components with complex business logic
- Features that require asynchronous operations
- Shared state between multiple components
- Applications that need predictable state management 
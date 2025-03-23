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

#### Best Practices for State Design:

- Keep your state serializable (avoid functions, class instances, etc.)
- Flatten state structures when possible
- Include UI states like loading and error flags
- Consider using TypeScript interfaces for better type safety

For more information on state design, check the [Best Practices](/learn/best-practices#state-container-design) section.

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

Blac provides two main types of state containers:

- **Cubit**: A simpler container with direct method calls that update state
- **Bloc**: A more sophisticated container that uses actions and reducers

For detailed information on these containers, see the [Core Classes API](/api/core-classes).

### 3. UI Components

UI components are pure renderers that display state and dispatch user intentions to state containers. They should not contain business logic.

```tsx
// Example of a UI component
function Counter() {
  const [state, bloc] = useBloc(CounterCubit);
  
  return (
    <div className="counter">
      {state.isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>Count: {state.count}</h1>
          <div className="button-group">
            <button onClick={bloc.increment}>Increment</button>
            <button onClick={bloc.decrement}>Decrement</button>
            <button onClick={bloc.reset}>Reset</button>
            <button onClick={bloc.fetchCount}>Fetch Count</button>
          </div>
          {state.error && <p className="error">{state.error}</p>}
        </>
      )}
    </div>
  );
}
```

For more on connecting UI components to Blac state containers, see the [React Hooks API](/api/react-hooks).

## Data Flow

The Blac pattern follows a strict unidirectional data flow:

```
┌─────────────────-┐
│                  │
│  State Container │◄────┐
│  (Bloc or Cubit) │     │
│                  │     │
└───────┬─────────-┘     │
        │                │
        │ State          │ Method Calls
        ▼                │
┌──-───────────────┐     │
│                  │     │
│   UI Component   │─────┘
│                  │
└───-──────────────┘
```

1. **UI components** display the current state
2. **User interactions** trigger methods on the state container
3. **State container methods** update the state
4. **UI components** re-render with the new state

This cycle ensures that state changes are predictable and traceable, making debugging and testing easier.

## Advantages of the Blac Pattern

1. **Clean Separation of Concerns**: UI components focus on rendering, while state containers handle business logic
2. **Improved Testability**: State containers can be tested independently of UI components
3. **Better Maintainability**: Changes to business logic don't affect UI components and vice versa
4. **Predictable State Changes**: State only changes through defined methods in state containers
5. **Optimized Rendering**: Components only re-render when their specific dependencies change

## When to Use the Blac Pattern

The Blac pattern is ideal for:

- **Components with complex business logic**: When your component needs to handle complex state transitions or side effects
- **Features that require asynchronous operations**: When you need to handle loading states, errors, and async data fetching
- **Shared state between multiple components**: When multiple components need access to the same state
- **Applications that need predictable state management**: When you want a clear, traceable flow of state changes

## How to Choose Between Bloc and Cubit

- Use **Cubit** when:
  - You have simple state logic
  - You prefer direct method calls
  - You don't need formal action objects

- Use **Bloc** when:
  - You have complex state transitions
  - You want to leverage the reducer pattern
  - You need a formal action-based approach
  - You want better traceability of state changes

For more information on implementation details, see the [Core Classes API](/api/core-classes) and [Key Methods](/api/key-methods) sections. 
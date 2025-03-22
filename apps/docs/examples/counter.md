# Counter Example

The counter example is a simple demonstration of Blac's state management capabilities. It's a great starting point for understanding how Blac works.

## Basic Counter

This example shows a simple counter with increment and decrement functionality.

### Counter Cubit

```tsx
import { Cubit } from 'blac-next';

// Define the state interface
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    // Initialize with a count of 0
    super({ count: 0 });
  }

  // Method to increment the counter
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  // Method to decrement the counter
  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  // Method to reset the counter
  reset = () => {
    this.emit({ count: 0 });
  };
}

export default CounterCubit;
```

### Counter Component

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import CounterCubit from './CounterCubit';

function Counter() {
  // Connect the component to the CounterCubit
  const [state, bloc] = useBloc(CounterCubit);

  return (
    <div className="counter">
      <h1>Counter Example</h1>
      <div className="counter-display">
        <h2>{state.count}</h2>
      </div>
      <div className="counter-controls">
        <button onClick={bloc.decrement}>-</button>
        <button onClick={bloc.reset}>Reset</button>
        <button onClick={bloc.increment}>+</button>
      </div>
    </div>
  );
}

export default Counter;
```

## Advanced Counter

This more advanced example adds loading state and async operations.

### Advanced Counter Cubit

```tsx
import { Cubit } from 'blac-next';

interface AdvancedCounterState {
  count: number;
  isLoading: boolean;
  error: string | null;
}

class AdvancedCounterCubit extends Cubit<AdvancedCounterState> {
  constructor() {
    super({
      count: 0,
      isLoading: false,
      error: null
    });
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

  // Async method that simulates an API call
  fetchRandomCount = async () => {
    try {
      this.patch({ isLoading: true, error: null });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const randomCount = Math.floor(Math.random() * 100);
      
      this.patch({ count: randomCount, isLoading: false });
    } catch (error) {
      this.patch({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };
}

export default AdvancedCounterCubit;
```

### Advanced Counter Component

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import AdvancedCounterCubit from './AdvancedCounterCubit';

function AdvancedCounter() {
  const [state, bloc] = useBloc(AdvancedCounterCubit);

  return (
    <div className="counter advanced">
      <h1>Advanced Counter Example</h1>
      
      <div className="counter-display">
        {state.isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <h2>{state.count}</h2>
        )}
        {state.error && <div className="error">{state.error}</div>}
      </div>
      
      <div className="counter-controls">
        <button onClick={bloc.decrement} disabled={state.isLoading}>-</button>
        <button onClick={bloc.reset} disabled={state.isLoading}>Reset</button>
        <button onClick={bloc.increment} disabled={state.isLoading}>+</button>
      </div>
      
      <div className="counter-actions">
        <button 
          onClick={bloc.fetchRandomCount} 
          disabled={state.isLoading}
          className="fetch-button"
        >
          Fetch Random Count
        </button>
      </div>
    </div>
  );
}

export default AdvancedCounter;
```

## Counter with Bloc Pattern

This example uses the Bloc class with the reducer pattern for the same counter functionality.

### Counter Bloc

```tsx
import { Bloc } from 'blac-next';

// Define the state interface
interface CounterState {
  count: number;
}

// Define action types
type CounterAction = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' };

class CounterBloc extends Bloc<CounterState, CounterAction> {
  constructor() {
    // Initialize with a count of 0
    super({ count: 0 });
  }

  // Define the reducer function to handle state changes based on actions
  reducer = (state: CounterState, action: CounterAction): CounterState => {
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

  // Helper methods to dispatch actions
  increment = () => this.add({ type: 'increment' });
  decrement = () => this.add({ type: 'decrement' });
  reset = () => this.add({ type: 'reset' });
}

export default CounterBloc;
```

### Counter Component with Bloc

The component remains the same as in the Cubit example, just import the CounterBloc instead:

```tsx
import React from 'react';
import { useBloc } from '@blac/react';
import CounterBloc from './CounterBloc';

function CounterWithBloc() {
  // Connect the component to the CounterBloc
  const [state, bloc] = useBloc(CounterBloc);

  return (
    <div className="counter">
      <h1>Counter with Bloc Example</h1>
      <div className="counter-display">
        <h2>{state.count}</h2>
      </div>
      <div className="counter-controls">
        <button onClick={bloc.decrement}>-</button>
        <button onClick={bloc.reset}>Reset</button>
        <button onClick={bloc.increment}>+</button>
      </div>
    </div>
  );
}

export default CounterWithBloc;
```

## Key Takeaways

- The Counter example demonstrates the basic pattern of state management in Blac
- Both Cubit and Bloc approaches can be used to achieve the same result
- The Bloc pattern is more verbose but scales better for complex state logic
- The useBloc hook provides a React component with both state and methods 
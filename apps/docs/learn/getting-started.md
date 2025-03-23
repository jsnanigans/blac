# Getting Started

Blac is a collection of packages that work together to provide a complete state management solution.

- `@blac/core` - The core of Blac
- `@blac/react` - Use Blac with React

## Installation

```bash
npm install @blac/core @blac/react
```

## Quick Start

Here's a simple counter example to get you started:

```tsx
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// 1. Create a state container with business logic
class CounterBloc extends Cubit {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };
}

// 2. Create a React component that uses the bloc
function Counter() {
  // Connect component to the bloc
  const [{ count }, bloc] = useBloc(CounterBloc);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={bloc.increment}>Increment</button>
      <button onClick={bloc.decrement}>Decrement</button>
    </div>
  );
}
```

## How It Works

Let's break down what's happening in the code above:

1. We create a `CounterBloc` class that extends `Cubit`. This class:
   - Defines the state structure (`{ count: number }`)
   - Sets an initial state (`{ count: 0 }`)
   - Provides methods to update the state (`increment`, `decrement`)

2. In our React component, we use the `useBloc` hook to:
   - Connect to an instance of `CounterBloc`
   - Get the current state and the bloc instance
   - Destructure the state to access `count` directly
   - Connect UI events to bloc methods

3. When a user clicks a button, the corresponding bloc method is called, which updates the state, and React automatically re-renders the component with the new state.

## Important Note on Arrow Functions

⚠️ **Important**: All methods in Bloc or Cubit classes must use arrow function syntax to preserve the `this` context:

```tsx
// ✅ Correct way (will maintain context)
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// ❌ Incorrect way (will lose 'this' context)
increment() { 
  this.emit({ count: this.state.count + 1 });
}
```

## Adding Async Operations

Let's extend our counter example to include an async operation:

```tsx
class CounterBloc extends Cubit<{ 
  count: number;
  isLoading: boolean;
  error: string | null;
}> {
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

  fetchRandomCount = async () => {
    try {
      this.patch({ isLoading: true, error: null });
      
      // Simulate API call
      const response = await fetch('https://api.example.com/random-number');
      const data = await response.json();
      
      this.patch({ 
        count: data.number,
        isLoading: false
      });
    } catch (error) {
      this.patch({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch'
      });
    }
  };
}

function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      {state.isLoading && <p>Loading...</p>}
      {state.error && <p className="error">{state.error}</p>}
      <button onClick={bloc.increment}>Increment</button>
      <button onClick={bloc.fetchRandomCount}>Fetch Random</button>
    </div>
  );
}
```

Notice how we:
- Expanded the state to include loading and error states
- Used `patch()` to update only specific parts of the state
- Added error handling in the async method
- Updated the UI to show loading and error states

## Next Steps

Now that you've created your first Blac component, explore these concepts:

1. [Core Concepts](/guide/core-concepts) - Understand the foundational ideas behind Blac
2. [The Blac Pattern](/guide/blac-pattern) - Learn about the unidirectional data flow pattern
3. [State Management Patterns](/guide/state-management-patterns) - Explore different state sharing approaches
4. [API Reference](/api/core-classes) - Dive deeper into the available classes and methods 
# Getting Started

## Installation

You can install Blac using npm or yarn:

```bash
# Using npm
npm install blac-next @blac/react

# Using yarn
yarn add blac-next @blac/react
```

## Quick Start

Here's a simple counter example to get you started:

```tsx
import { useBloc } from '@blac/react';
import { Cubit } from 'blac-next';

// 1. Create a state container with business logic
class CounterBloc extends Cubit<{ count: number }> {
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

## Important Note on Arrow Functions

⚠️ **Important**: All methods in Bloc or Cubit classes must use arrow function syntax to preserve the `this` context:

```tsx
// Correct way (will maintain context)
increment = () => {
  this.emit({ count: this.state.count + 1 });
};

// Incorrect way (will lose 'this' context)
increment() { 
  this.emit({ count: this.state.count + 1 });
}
```

## Next Steps

Now that you've created your first Blac component, you can explore more advanced concepts:

1. [Core Concepts](/guide/core-concepts) - Understand the foundational ideas behind Blac
2. [The Blac Pattern](/guide/blac-pattern) - Learn about the unidirectional data flow pattern
3. [State Management Patterns](/guide/state-management-patterns) - Explore different state sharing approaches
4. [Examples](/examples/counter) - See practical examples of Blac in action 
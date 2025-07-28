# Your First Cubit

Let's learn Cubits by building a simple counter. This focuses on the core concepts without overwhelming complexity.

## What is a Cubit?

A Cubit is a simple state container that:
- Holds a single piece of state
- Provides methods to update that state
- Notifies listeners when state changes
- Lives outside your React components

Think of it as a self-contained box of logic that your UI can connect to.

## Building a Counter

Let's build a counter step by step to understand how Cubits work.

### Step 1: Create the Cubit

```typescript
// src/CounterCubit.ts
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}
```

### Key Concepts

Let's break down what's happening:

1. **State Type**: We define an interface to describe our state shape
2. **Initial State**: The constructor calls `super()` with the starting state `{ count: 0 }`
3. **Arrow Functions**: All methods use arrow function syntax to maintain proper `this` binding
4. **emit() Method**: Updates the entire state with a new object

### Step 2: Use the Cubit in React

Now let's create a component that uses our CounterCubit:

```tsx
// src/Counter.tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './CounterCubit';

export function Counter() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
      <button onClick={counter.reset}>Reset</button>
    </div>
  );
}
```

### Step 3: Understanding the Flow

Here's what happens when a user clicks the "+" button:

1. **User clicks "+"** → `counter.increment()` is called
2. **Cubit updates state** → `emit()` creates new state `{ count: 1 }`
3. **React re-renders** → `useBloc` detects state change
4. **UI updates** → Counter displays the new count

This unidirectional flow makes debugging easy and state changes predictable.

## Adding More Features

Once you understand the basics, you can extend your counter:

### Adding More State

```typescript
interface CounterState {
  count: number;
  step: number; // How much to increment/decrement by
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, step: 1 });
  }

  increment = () => {
    this.emit({ 
      count: this.state.count + this.state.step,
      step: this.state.step 
    });
  };

  setStep = (step: number) => {
    this.emit({ 
      count: this.state.count,
      step: step 
    });
  };
}
```

### Using patch() for Partial Updates

Instead of `emit()`, you can use `patch()` to update only specific properties:

```typescript
increment = () => {
  this.patch({ count: this.state.count + this.state.step });
};

setStep = (step: number) => {
  this.patch({ step });
};
```

### Adding Computed Properties

```typescript
export class CounterCubit extends Cubit<CounterState> {
  // ... methods ...

  get isEven() {
    return this.state.count % 2 === 0;
  }

  get isPositive() {
    return this.state.count > 0;
  }
}

// Use in React
function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  
  return (
    <div>
      <h1>Count: {state.count}</h1>
      <p>{counter.isEven ? 'Even' : 'Odd'}</p>
      <p>{counter.isPositive ? 'Positive' : 'Zero or Negative'}</p>
    </div>
  );
}
```

## What You've Learned

Congratulations! You've now:
- ✅ Created your first Cubit
- ✅ Managed state with `emit()` and `patch()`
- ✅ Connected a Cubit to React components with `useBloc`
- ✅ Understood the unidirectional data flow
- ✅ Added computed properties with getters

## What's Next?

Ready to level up? Learn about Blocs for event-driven state management:

<div style="margin-top: 48px;">
  <a href="/getting-started/first-bloc" style="
    display: inline-block;
    padding: 12px 24px;
    background: var(--vp-c-brand-3);
    color: white;
    border-radius: 24px;
    text-decoration: none;
    font-weight: 500;
  ">
    Learn About Blocs →
  </a>
</div>

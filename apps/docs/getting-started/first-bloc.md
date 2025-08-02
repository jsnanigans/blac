# Your First Bloc

Blocs provide event-driven state management for more complex scenarios. To demonstrate, we'll build a simple counter app using Blocs and events.

## When to Use Blocs

**Use Cubit when:**

- Simple state updates
- Direct method calls are fine

**Use Bloc when:**

- You want a clear audit trail
- Multiple events affect the same state
- Complex async operations

## Basic Example

### 1. Define Events

```typescript
// Events are simple classes
export class Increment {}
export class Decrement {}
export class Reset {}
```

### 2. Create the Bloc

```typescript
import { Bloc } from '@blac/core';

interface CounterState {
  count: number;
}

type CounterEvent = Increment | Decrement | Reset;

export class CounterBloc extends Bloc<CounterState, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(Increment, this.handleIncrement);
    this.on(Decrement, this.handleDecrement);
    this.on(Reset, this.handleReset);
  }

  // IMPORTANT: Always use arrow functions for methods!
  private handleIncrement = (
    event: Increment,
    emit: (state: CounterState) => void,
  ) => {
    emit({ count: this.state.count + 1 });
  };

  private handleDecrement = (
    event: Decrement,
    emit: (state: CounterState) => void,
  ) => {
    emit({ count: this.state.count - 1 });
  };

  private handleReset = (event: Reset, emit: (state: CounterState) => void) => {
    emit({ count: 0 });
  };

  // Helper methods for convenience
  increment = () => this.add(new Increment());
  decrement = () => this.add(new Decrement());
  reset = () => this.add(new Reset());
}
```

### 3. Use in React

```tsx
import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';

export function Counter() {
  const [state, counterBloc] = useBloc(CounterBloc);

  return (
    <div>
      <h2>Count: {state.count}</h2>
      <button onClick={counterBloc.increment}>+</button>
      <button onClick={counterBloc.decrement}>-</button>
      <button onClick={counterBloc.reset}>Reset</button>
    </div>
  );
}
```

## Key Concepts

:::warning Critical: Arrow Functions Required
Just like with Cubits, you MUST use arrow function syntax for all Bloc methods and event handlers:

```typescript
// ✅ CORRECT
handleIncrement = (event, emit) => { ... };
increment = () => this.add(new Increment());

// ❌ WRONG - Will break in React
handleIncrement(event, emit) { ... }
increment() { this.add(new Increment()); }
```

:::

### Events vs Methods

```typescript
// Cubit: Direct method calls
cubit.increment();

// Bloc: Events
bloc.add(new Increment());
// Or use helper methods
bloc.increment(); // which calls this.add(new Increment())
```

### Event Handlers

Event handlers receive:

- The event instance
- An `emit` function to update state

```typescript
private handleIncrement = (event: Increment, emit: (state: CounterState) => void) => {
  // Access current state: this.state
  // Access event data: event.someProperty
  // Update state: emit(newState)
  emit({ count: this.state.count + 1 });
};
```

### Events with Data

```typescript
export class IncrementBy {
  constructor(public readonly amount: number) {}
}

// Usage
bloc.add(new IncrementBy(5));

// Handler
private handleIncrementBy = (event: IncrementBy, emit: (state: CounterState) => void) => {
  emit({ count: this.state.count + event.amount });
};
```

## Benefits

1. **Audit Trail**: Every state change has a corresponding event
2. **Debugging**: Log all events to see exactly what happened
3. **Testing**: Dispatch specific events and verify state changes
4. **Time Travel**: Replay events to recreate states

## Simple Async Example

```typescript
export class LoadUser {
  constructor(public readonly userId: string) {}
}

export class UserLoaded {
  constructor(public readonly user: User) {}
}

export class LoadUserFailed {
  constructor(public readonly error: string) {}
}

// Handler
private handleLoadUser = async (event: LoadUser, emit: (state: UserState) => void) => {
  emit({ ...this.state, isLoading: true });

  try {
    const user = await api.getUser(event.userId);
    this.add(new UserLoaded(user));
  } catch (error) {
    this.add(new LoadUserFailed(error.message));
  }
};
```

## What's Next?

- [React Patterns](/react/patterns) - Advanced component patterns
- [API Reference](/api/core/bloc) - Complete Bloc API
- [Testing](/patterns/testing) - How to test Blocs

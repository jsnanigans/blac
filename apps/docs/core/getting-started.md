# Getting Started

## Installation

```bash
npm install @blac/core
# or
pnpm add @blac/core
```

## Basic Cubit

Cubit is the simplest state container. Use it for direct state mutations.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }); // Initial state (must be an object)
  }

  // Always use arrow functions for React compatibility
  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}
```

### Using a Cubit

```typescript
// Get or create instance
const counter = CounterCubit.resolve();

// Read state
console.log(counter.state.count); // 0

// Call methods
counter.increment();
console.log(counter.state.count); // 1

// Subscribe to changes
const unsubscribe = counter.subscribe((state) => {
  console.log('State changed:', state);
});

// Clean up
unsubscribe();
CounterCubit.release();
```

## Event-Driven Vertex

Vertex uses events for state transitions. Use it when you need explicit event handling.

```typescript
import { Vertex, BaseEvent } from '@blac/core';

// Define events
class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent implements BaseEvent {
  readonly type = 'decrement';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

// Create Vertex
class CounterVertex extends Vertex<{ count: number }> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });
  }

  // Public methods dispatch events
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };
}
```

## State Must Be an Object

State must always be an object, not a primitive:

```typescript
// ✅ Correct
class Counter extends Cubit<{ count: number }> {
  constructor() { super({ count: 0 }); }
}

// ❌ Wrong - primitives not allowed
class Counter extends Cubit<number> {
  constructor() { super(0); }
}
```

## Next Steps

- [Cubit](/core/cubit) - Complete Cubit documentation
- [Vertex](/core/vertex) - Event-driven state management
- [React Integration](/react/getting-started) - Using BlaC with React

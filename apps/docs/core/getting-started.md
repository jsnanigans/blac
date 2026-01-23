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
import { acquire } from '@blac/core';

// Get or create instance
const counter = acquire(CounterCubit);

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

## State Must Be an Object

State must always be an object, not a primitive:

```typescript
// ✅ Correct
class Counter extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

// ❌ Wrong - primitives not allowed
class Counter extends Cubit<number> {
  constructor() {
    super(0);
  }
}
```

## Next Steps

- [Cubit](/core/cubit) - Complete Cubit documentation
- [React Integration](/react/getting-started) - Using BlaC with React

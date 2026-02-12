# Getting Started

## Installation

```bash
pnpm add @blac/core
```

## Basic Cubit

```ts
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((state) => ({ count: state.count - 1 }));
  reset = () => this.patch({ count: 0 });
}
```

## Using a Cubit

```ts
import { acquire, release } from '@blac/core';

const counter = acquire(CounterCubit);
console.log(counter.state.count);

const unsubscribe = counter.subscribe((state) => {
  console.log('State changed:', state);
});

counter.increment();

unsubscribe();
release(CounterCubit);
```

## State Must Be an Object

State types must extend `object`:

```ts
class Valid extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}
```

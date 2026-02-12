# React Getting Started

## Installation

```bash
pnpm add @blac/react @blac/core
```

## Basic Usage

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}

export function Counter() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <p>{state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </div>
  );
}
```

## Manual Dependencies

```tsx
function CountOnly() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });

  return <p>{state.count}</p>;
}
```

## No Tracking

```tsx
function FullState() {
  const [state] = useBloc(CounterCubit, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

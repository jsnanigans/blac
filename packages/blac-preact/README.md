# @blac/preact

Preact integration for BlaC state management. Provides the same `useBloc` hook API as `@blac/react` but for Preact.

## Installation

```bash
pnpm add @blac/preact @blac/core
```

## Usage

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/preact';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>{state.count}</button>;
}
```

## License

MIT

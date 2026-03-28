# @blac/preact

Preact bindings for BlaC — same `useBloc` API as `@blac/react`, built for Preact 10+.

**[Documentation](https://blac-docs.pages.dev/react/preact)** · **[npm](https://www.npmjs.com/package/@blac/preact)**

## Installation

```bash
pnpm add @blac/preact @blac/core
```

Requires Preact 10.17+.

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

The hook signature and options are identical to `@blac/react` — see the [`@blac/react` README](../blac-react/README.md) for the full `useBloc` API including tracking modes, `instanceId`, `onMount`/`onUnmount`, and manual dependencies.

## License

MIT

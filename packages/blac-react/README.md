# @blac/react

React hooks for Blac.

## Install

```bash
pnpm add @blac/react
```

## useBloc

```tsx
import { useBloc } from '@blac/react'
import { CounterCubit } from './CounterCubit'

function Counter() {
  const [state, counter] = useBloc(CounterCubit)
  return <button onClick={counter.increment}>{state.count}</button>
}
```

Options: `{ id, props, onMount, dependencySelector }`.

Bloc methods should be arrow functions so `this` stays bound.

MIT License.

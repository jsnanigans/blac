# Preact

BlaC supports Preact through the `@blac/preact` package. It provides the same `useBloc` hook with the same API as `@blac/react`.

## Installation

::: code-group
```bash [pnpm]
pnpm add @blac/core @blac/preact
```
```bash [npm]
npm install @blac/core @blac/preact
```
:::

Requires Preact 10.x.

## Usage

```tsx
import { useBloc } from '@blac/preact';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.patch({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return (
    <div>
      <p>{state.count}</p>
      <button onClick={counter.increment}>+</button>
    </div>
  );
}
```

## API

The hook signature and options are identical to the React version:

```ts
const [state, bloc, ref] = useBloc(MyCubit, {
  instanceId: 'optional-key',
  autoTrack: true,
  dependencies: (state, bloc) => [bloc.someGetter],
  onMount: (bloc) => { /* ... */ },
  onUnmount: (bloc) => { /* ... */ },
});
```

All three tracking modes (auto-tracking, manual dependencies, no tracking) work the same way.

## Global configuration

```ts
import { configureBlacPreact } from '@blac/preact';

configureBlacPreact({
  autoTrack: true, // default tracking mode
});
```

## Differences from React

- Uses `preact/hooks` internally instead of React hooks
- No `useSyncExternalStore` — uses `useState` + `useEffect` subscription pattern
- Everything else (core, registry, plugins, tracking) is shared

See also: [useBloc](/react/use-bloc), [Dependency Tracking](/react/dependency-tracking)

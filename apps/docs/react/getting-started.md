# React Getting Started

## Installation

::: code-group

```bash [pnpm]
pnpm add @blac/core @blac/react
```

```bash [npm]
npm install @blac/core @blac/react
```

:::

Requires React 18+ and TypeScript is recommended.

## Basic usage

Define a Cubit for your state, then connect it to a component with `useBloc`:

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((s) => ({ count: s.count - 1 }));
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </div>
  );
}
```

`useBloc` returns `[state, bloc]`:

- **state** — current state, tracked for re-renders (only properties you read trigger updates)
- **bloc** — the Cubit instance (call methods on it)

## Global configuration

Optionally configure defaults for all `useBloc` calls:

```ts
import { configureBlacReact } from '@blac/react';

configureBlacReact({
  autoTrack: true, // default: true
});
```

## Tracking modes at a glance

| Mode          | How to enable                    | Re-renders when           |
| ------------- | -------------------------------- | ------------------------- |
| Auto-tracking | Default                          | Tracked properties change |
| Manual deps   | `dependencies: (s) => [s.count]` | Dependency values change  |
| No tracking   | `autoTrack: false`               | Any state change          |

See [Dependency Tracking](/react/dependency-tracking) for details.

## Instance modes at a glance

| Mode   | How to enable           | Behavior                          |
| ------ | ----------------------- | --------------------------------- |
| Shared | Default                 | All components share one instance |
| Named  | `{ instanceId: 'key' }` | Shared within same key            |

## What's next?

- [useBloc](/react/use-bloc) — Full hook reference
- [Dependency Tracking](/react/dependency-tracking) — Understanding re-render optimization
- [Performance](/react/performance) — Patterns and anti-patterns

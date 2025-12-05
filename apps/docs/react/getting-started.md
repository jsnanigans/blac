# React Getting Started

## Installation

```bash
npm install @blac/core @blac/react
# or
pnpm add @blac/core @blac/react
```

## Basic Usage

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// 1. Define a Cubit
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };
}

// 2. Use in React
function Counter() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <span>{state.count}</span>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

## Auto-Tracking

BlaC automatically tracks which state properties you access during render. Components only re-render when those specific properties change:

```tsx
function UserProfile() {
  const [user] = useBloc(UserCubit);

  // Only re-renders when name or avatar changes
  // Changes to email, bio, settings won't trigger re-render
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
}
```

No selectors needed. No manual memoization. Just access what you need.

## Multiple Components, Shared State

By default, all components using the same Cubit share state:

```tsx
function DisplayCount() {
  const [state] = useBloc(CounterCubit);
  return <div>Count: {state.count}</div>;
}

function IncrementButton() {
  const [, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.increment}>+</button>;
}

function App() {
  return (
    <>
      <DisplayCount />     {/* Shows count */}
      <IncrementButton />  {/* Updates count */}
      <DisplayCount />     {/* Also shows updated count */}
    </>
  );
}
```

## Actions Without State

When you only need to call methods (no state reading), use `useBlocActions`:

```tsx
import { useBlocActions } from '@blac/react';

function ResetButton() {
  const cubit = useBlocActions(CounterCubit);

  // This component NEVER re-renders from state changes
  return <button onClick={cubit.reset}>Reset</button>;
}
```

## Next Steps

- [useBloc Hook](/react/use-bloc) - Complete hook documentation
- [Dependency Tracking](/react/dependency-tracking) - How auto-tracking works
- [Shared vs Isolated](/react/shared-vs-isolated) - Instance patterns
- [Performance](/react/performance) - Optimization tips

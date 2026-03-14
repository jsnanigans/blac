# Quick Start

## Installation

::: code-group
```bash [pnpm]
pnpm add @blac/core @blac/react
```
```bash [npm]
npm install @blac/core @blac/react
```
```bash [yarn]
yarn add @blac/core @blac/react
```
:::

BlaC requires React 18+ and TypeScript is strongly recommended.

## Step 1: Define a Cubit

A Cubit is a class that holds state and exposes methods to change it.

```ts
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((s) => ({ count: s.count - 1 }));
  reset = () => this.patch({ count: 0 });
}
```

Three ways to change state:

| Method | What it does | When to use |
|--------|-------------|-------------|
| `emit(newState)` | Replace the entire state | You have the full new state ready |
| `update(fn)` | Derive new state from current | You need to read current state first |
| `patch(partial)` | Shallow-merge partial changes | You want to update some fields |

## Step 2: Use it in React

The `useBloc` hook connects your component to a Cubit.

```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
      <button onClick={counter.reset}>Reset</button>
    </div>
  );
}
```

`useBloc` returns a tuple:
- `state` — the current state snapshot (tracked for re-renders)
- `counter` — the Cubit instance (call methods on it)

## Step 3: Share state across components

By default, every component that calls `useBloc(CounterCubit)` gets the **same instance**. State is automatically shared.

```tsx
function CounterDisplay() {
  const [state] = useBloc(CounterCubit);
  return <p>Count: {state.count}</p>;
}

function CounterControls() {
  const [, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>+</button>;
}

function App() {
  return (
    <>
      <CounterDisplay />
      <CounterControls />
    </>
  );
}
```

When `CounterControls` calls `increment`, `CounterDisplay` re-renders with the new count. No providers, no context, no prop drilling.

## Step 4: Add business logic

Keep logic in the class, not in the component.

```ts
class TodoCubit extends Cubit<{ items: string[]; input: string }> {
  constructor() {
    super({ items: [], input: '' });
  }

  setInput = (value: string) => this.patch({ input: value });

  addTodo = () => {
    const trimmed = this.state.input.trim();
    if (!trimmed) return;
    this.update((s) => ({
      items: [...s.items, trimmed],
      input: '',
    }));
  };

  removeTodo = (index: number) => {
    this.update((s) => ({
      ...s,
      items: s.items.filter((_, i) => i !== index),
    }));
  };

  get isEmpty() {
    return this.state.items.length === 0;
  }
}
```

Getters like `isEmpty` are tracked automatically — components that read them only re-render when the underlying data changes.

## What just happened?

When you call `useBloc(CounterCubit)`:

1. The **registry** checks if an instance of `CounterCubit` already exists
2. If not, it creates one and stores it. If yes, it returns the existing one
3. A **ref count** is incremented (tracking how many components use this instance)
4. The hook subscribes to state changes using **auto-tracking** — a Proxy wraps the state and records which properties your render function accesses
5. On re-render, only changes to those specific properties trigger an update
6. When the component unmounts, the ref count decrements. At zero, the instance is disposed

## What's next?

- [Core Concepts](/guide/concepts) — Registry, tracking, and lifecycle
- [Cubit](/core/cubit) — Full Cubit API
- [useBloc](/react/use-bloc) — Hook options and tracking modes
- [Shared vs Isolated](/react/shared-vs-isolated) — Instance management patterns

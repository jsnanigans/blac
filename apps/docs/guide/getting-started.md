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

| Method           | What it does                       | When to use                          |
| ---------------- | ---------------------------------- | ------------------------------------ |
| `emit(newState)` | Replace the entire state           | You have the full new state ready    |
| `update(fn)`     | Derive new state from current      | You need to read current state first |
| `patch(partial)` | Deep-merge partial changes (`DeepPartial<S>`) | You want to update some fields and keep the rest |

::: warning `emit` and `update` replace; only `patch` merges
`emit(next)` and `update(fn)` set state to *exactly* what you return — any key you forget to include is dropped. `patch(partial)` deep-merges, so the keys you omit survive. The `increment` above is fine because `count` is the only key; for multi-field state, either spread the previous state (`update((s) => ({ ...s, count: s.count + 1 }))`) or use `patch`.
:::

::: tip Define methods as arrow-function fields
Every method here is an arrow-function class field (`increment = () => …`), not a regular method. This binds `this` to the instance, so `counter.increment` keeps working when passed straight to `onClick`. A regular method (`increment() { … }`) loses `this` once detached from the instance.
:::

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
    // emit/update REPLACE state, so list every key you want to keep.
    this.update((s) => ({ items: [...s.items, trimmed], input: '' }));
  };

  removeTodo = (index: number) => {
    // patch deep-merges, so we only mention the key we change.
    this.patch({ items: this.state.items.filter((_, i) => i !== index) });
  };

  get isEmpty() {
    return this.state.items.length === 0;
  }
}
```

Notice the two write styles: `addTodo` uses `update` and lists *both* keys (replacing the whole state), while `removeTodo` uses `patch` and mentions *only* `items` (merging into the rest). Both are correct — the difference is exactly the replace-vs-merge rule from Step 1.

Getters like `isEmpty` derive a value on every read, so they can never drift from `items`. One subtlety: auto-tracking records reads on the `state` proxy, *not* on the bloc instance — so reading `todo.isEmpty` alone won't wake the component. Read the getter's source through `state` in render (e.g. `state.items.length`) to stay subscribed, or depend on the getter explicitly with `select`. The full rule is in [Dependency Tracking](/react/dependency-tracking). For async work (loading flags, fetches, request guards), see [Patterns & Recipes](/guide/patterns).

## What just happened?

When you call `useBloc(CounterCubit)`:

1. The **registry** checks if an instance of `CounterCubit` already exists
2. If not, it creates one and stores it. If yes, it returns the existing one
3. A **ref count** is incremented (tracking how many components use this instance)
4. The hook subscribes to state changes using **auto-tracking** — a Proxy wraps the state and records which properties your render function accesses
5. On re-render, only changes to those specific properties trigger an update
6. When the component unmounts, the ref count decrements. At zero, the instance is disposed

Each of these steps has a "why" worth understanding once your app grows — why a proxy beats selectors, why disposal is automatic, why updates batch on a microtask. That deep version lives in the [Mental Model](/guide/mental-model).

## What's next?

- [Core Concepts](/guide/concepts) — A quick tour of registry, tracking, and lifecycle
- [Mental Model](/guide/mental-model) — The deep version of "what just happened?"
- [Patterns & Recipes](/guide/patterns) — Async patterns, cross-bloc communication, persistence
- [Cubit](/core/cubit) — Full Cubit API
- [useBloc](/react/use-bloc) — Hook options and tracking modes

## See also

- [Core Concepts](/guide/concepts) — the quick conceptual tour
- [Cubit](/core/cubit) — `emit` / `update` / `patch` in full
- [useBloc](/react/use-bloc) — every hook option and both tracking modes
- [DevTools](/plugins/devtools) — inspect state and re-renders in real time

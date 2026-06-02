# Testing

BlaC provides first-party testing utilities so you can write fast, isolated tests for your cubits and the components that use them. The utilities live in two entry points:

- **`@blac/core/testing`** — registry isolation, state seeding, stubs, and method mocks
- **`@blac/react/testing`** — React component rendering with controlled bloc state

Both are tree-shakable and shipped as separate entry points, so they are never included in your production bundle.

## Installation

The core testing utilities have no extra dependencies. Install your test runner of choice (Vitest is recommended):

::: code-group

```bash [pnpm]
pnpm add -D vitest
```

```bash [npm]
npm install -D vitest
```

```bash [yarn]
yarn add -D vitest
```

:::

For React component tests, you also need `@testing-library/react`:

::: code-group

```bash [pnpm]
pnpm add -D @testing-library/react
```

```bash [npm]
npm install -D @testing-library/react
```

```bash [yarn]
yarn add -D @testing-library/react
```

:::

## Why registry isolation matters

BlaC stores every bloc instance in a single global [registry](/core/instance-management). That is what lets any component call `useBloc(CounterCubit)` and reach the _same_ instance without prop drilling. In tests, that same shared-by-default behavior works against you: a bloc created or mutated in one test is still in the registry when the next test runs, so tests leak state into each other and fail depending on execution order.

The mental model for testing BlaC is therefore simple: **give every test its own registry.** Once each test starts from an empty registry, the shared-instance model becomes a feature again — you seed exactly the instances a test needs and nothing carries over.

Every testing utility in this guide is built around that idea. The most common approach is `blacTestSetup()`, which swaps in a fresh registry before each test and restores the original after:

```ts
import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { ensure } from '@blac/core';

blacTestSetup();

describe('CounterCubit', () => {
  it('starts at zero', () => {
    const counter = ensure(CounterCubit);
    expect(counter.state.count).toBe(0);
  });

  it('does not see state from the previous test', () => {
    // This test gets a completely fresh registry
    const counter = ensure(CounterCubit);
    expect(counter.state.count).toBe(0);
  });
});
```

## Quick start

### Testing a cubit in isolation

```ts
import { it, expect } from 'vite-plus/test';
import { blacTestSetup, withBlocState } from '@blac/core/testing';
import { ensure } from '@blac/core';
import { TodoCubit } from '../blocs/TodoCubit';

blacTestSetup();

it('adds an item', () => {
  const todo = ensure(TodoCubit);
  todo.addItem('Buy milk');
  expect(todo.state.items).toHaveLength(1);
});

it('can start with seeded state', () => {
  withBlocState(TodoCubit, { items: ['Existing item'] });
  const todo = ensure(TodoCubit);
  expect(todo.state.items).toHaveLength(1);
});
```

### Testing a React component

```tsx
import { it, expect } from 'vite-plus/test';
import { screen } from '@testing-library/react';
import { renderWithBloc } from '@blac/react/testing';
import { Counter } from '../components/Counter';
import { CounterCubit } from '../blocs/CounterCubit';

it('displays the current count', () => {
  renderWithBloc(<Counter />, {
    bloc: CounterCubit,
    state: { count: 42 },
  });
  expect(screen.getByText('42')).toBeInTheDocument();
});
```

::: warning Import test globals from `vite-plus/test`
This project runs tests through `vite-plus`, so `describe`/`it`/`expect`/`vi` are imported from `vite-plus/test`, not from `vitest` directly:

```ts
import { describe, it, expect, vi } from 'vite-plus/test';
```

Tests still run if you import bare globals, but linting fails. If you use a different runner, substitute its import — the BlaC helpers themselves are runner-agnostic.
:::

::: danger Common mistakes

- **Forgetting `blacTestSetup()`** (or another isolation helper). Without it, a bloc mutated in one test survives into the next and you get order-dependent, flaky failures — exactly the problem isolation exists to prevent. See [Core Testing API](/testing/core) for the lower-level alternatives.
- **Asserting on async state too early.** State changes are flushed on a microtask, so a value set inside an async action may not be visible on the very next line. `await flushBlocUpdates()` (or React Testing Library's `findBy*` queries) before asserting. See [System Events](/core/system-events) for the batching model.
  :::

## See also

- [Core Testing API](/testing/core) — the full helper reference (`blacTestSetup`, stubs, overrides, seeding)
- [React Testing API](/testing/react) — rendering components with controlled bloc state
- [Instance Management](/core/instance-management) — the registry these helpers isolate
- [Glossary](/guide/glossary) — definitions for _registry_, _stub_, _override_, _instance key_

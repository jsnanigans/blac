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

BlaC uses a global registry to store bloc instances. Without isolation, tests that create or modify blocs will leak state into subsequent tests, causing flaky failures that depend on test execution order.

Every testing utility in this guide is designed to solve that problem. The most common approach is `blacTestSetup()`, which swaps in a fresh registry before each test and restores the original after:

```ts
import { describe, it, expect } from 'vitest';
import { blacTestSetup, withBlocState } from '@blac/core/testing';
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
import { it, expect } from 'vitest';
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

See also: [Core Testing API](/testing/core), [React Testing API](/testing/react)

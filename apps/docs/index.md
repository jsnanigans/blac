---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Blac State Management for React
description: State management for React applications.
head:
  - - meta
    - name: description
      content: State management for React applications.
  - - meta
    - name: keywords
      content: blac, react, state management, bloc, cubit, typescript, reactive, predictable state
  - - meta
    - property: og:title
      content: Blac State Management for React
  - - meta
    - property: og:description
      content: State management for React applications.
  - - meta
    - property: og:type
      content: website
  - - meta
    - property: og:image
      content: /logo.svg
  - - meta
    - name: twitter:card
      content: summary
  - - meta
    - name: twitter:title
      content: Blac State Management for React
  - - meta
    - name: twitter:description
      content: State management for React applications.
---

# Blac

<div class="tagline"><strong>State management for React applications.</strong></div>

> "Talk is cheap. Show me the code." — Linus Torvalds

<div class="image-container">
  <img src="/logo.svg" alt="Blac Logo" style="width: 150px;" />
</div>

<div class="actions">
  <a href="/learn/introduction" class="action">Get Started</a>
  <a href="https://github.com/jsnanigans/blac" class="action alt">View on GitHub</a>
</div>

## Features

> "Don't panic." — *The Hitchhiker's Guide to the Galaxy*

- Simple API with minimal boilerplate
- Automatic instance management with optional isolation
- Written in TypeScript
- Extensible via plugins and addons
- Small bundle size

::: tip Just getting started?
Check out the [Introduction](/learn/introduction) to get started.
:::

## Quick Example

> "Logic is the beginning of wisdom, not the end." — Spock

```tsx
// 1. Define your Cubit (e.g., in src/cubits/CounterCubit.ts)
import { Cubit } from '@blac/core';

interface CounterState {
  count: number;
}

export class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 }); // Initial state
  }

  // Methods must be arrow functions!
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}

// 2. Use the Cubit in your React component
import { useBloc } from '@blac/react';
import { CounterCubit } from '../cubits/CounterCubit'; // Adjust path

function MyCounter() {
  const [state, counterCubit] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counterCubit.decrement}>-</button>
      <button onClick={counterCubit.increment}>+</button>
    </div>
  );
}

export default MyCounter;
```


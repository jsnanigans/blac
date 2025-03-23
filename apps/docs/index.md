---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Blac - A Beautiful State Management Library
description: Lightweight, flexible state management for React applications with predictable data flow
head:
  - - meta
    - name: description
      content: Blac is a lightweight, flexible state management library for React applications with predictable data flow.
  - - meta
    - name: keywords
      content: blac, react, state management, redux alternative, typescript
  - - meta
    - property: og:title
      content: Blac - A Beautiful State Management Library
  - - meta
    - property: og:description
      content: Lightweight, flexible state management for React applications with predictable data flow
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
      content: Blac - A Beautiful State Management Library
  - - meta
    - name: twitter:description
      content: Lightweight, flexible state management for React applications with predictable data flow
---

# Blac

A Beautiful State Management Library.

<div class="tagline">Lightweight, flexible state management for React applications with predictable data flow.</div>

<div class="image-container">
  <img src="/logo.svg" alt="Blac Logo" />
</div>

<div class="actions">
  <a href="/learn/introduction" class="action">Get Started</a>
  <a href="https://github.com/jsnanigans/blac" class="action alt">View on GitHub</a>
</div>

## Features

<div class="features">
  <div class="feature">
    <h3>Simple Yet Powerful</h3>
    <p>Blac combines the best of Redux and React Context with a more intuitive API, reducing boilerplate while maintaining powerful state management capabilities.</p>
  </div>
  <div class="feature">
    <h3>Smart Instance Management</h3>
    <p>Automatic lifecycle handling ensures your state containers are created and disposed of exactly when needed, preventing memory leaks and undefined behavior.</p>
  </div>
  <div class="feature">
    <h3>TypeScript First</h3>
    <p>Built from the ground up with TypeScript, Blac provides excellent type safety and autocompletion for a superior developer experience.</p>
  </div>
</div>

::: tip Just getting started?
Check out the [Introduction](/learn/introduction) for a comprehensive guide to using Blac in your projects.
:::

## Quick Example

```tsx
// Define your state container
import { createBloc } from '@blac/react';

interface CounterState {
  count: number;
}

class CounterBloc extends createBloc<CounterState>() {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.setState({ count: this.state.count + 1 });
  }

  decrement() {
    this.setState({ count: Math.max(0, this.state.count - 1) });
  }
}

// Use in your component
import { useBloc } from '@blac/react';

function Counter() {
  const counterBloc = useBloc(CounterBloc);
  const count = counterBloc.useValue(state => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterBloc.decrement()}>-</button>
      <button onClick={() => counterBloc.increment()}>+</button>
    </div>
  );
}
```


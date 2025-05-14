---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Blac - Beautiful State Management for React
description: Lightweight, flexible, and predictable state management for modern React applications.
head:
  - - meta
    - name: description
      content: Blac is a lightweight, flexible, and predictable state management library for React applications.
  - - meta
    - name: keywords
      content: blac, react, state management, bloc, cubit, typescript, reactive, predictable state
  - - meta
    - property: og:title
      content: Blac - Beautiful State Management for React
  - - meta
    - property: og:description
      content: Lightweight, flexible, and predictable state management for modern React applications.
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
      content: Blac - Beautiful State Management for React
  - - meta
    - name: twitter:description
      content: Lightweight, flexible, and predictable state management for modern React applications.
---

# Blac

<div class="tagline"><strong>Lightweight, flexible, and predictable state management for modern React applications.</strong></div>

<div class="image-container">
  <img src="/logo.svg" alt="Blac Logo" style="width: 150px;" />
</div>

<div class="actions">
  <a href="/learn/introduction" class="action">Get Started</a>
  <a href="https://github.com/jsnanigans/blac" class="action alt">View on GitHub</a>
</div>

## Features

<div class="features">
  <div class="feature">
    <h3>💡 Simple & Intuitive API</h3>
    <p>Get started quickly with familiar concepts and less boilerplate. Focus on your business logic, not on complex state management rituals.</p>
  </div>
  <div class="feature">
    <h3>🧠 Smart Instance Management</h3>
    <p>Automatic creation, sharing (default for non-isolated Blocs using class name or provided ID), and disposal of Bloc/Cubit instances by the central `Blac` class. Supports `keepAlive` for in-memory persistence and isolated instances (via `static isolated = true` or unique IDs) for component-specific or distinct states.</p>
  </div>
  <div class="feature">
    <h3>🔒 TypeScript First</h3>
    <p>Built from the ground up with TypeScript, offering full type safety for robust applications and an excellent developer experience with autocompletion and refactoring support.</p>
  </div>
  <div class="feature">
    <h3>🧩 Extensible via Plugins & Addons</h3>
    <p>Enhance Blac's core or individual Bloc capabilities. Use the plugin system for global extensions (like logging) or addons for Bloc-specific features (like state persistence).</p>
  </div>
  <div class="feature">
    <h3>🚀 Performance Focused</h3>
    <p>Minimal dependencies for a small bundle size. Efficient state updates and optimized re-renders in React components.</p>
  </div>
  <div class="feature">
    <h3>🧩 Flexible Architecture</h3>
    <p>Adapts to various React project structures and complexities. Suitable for small features or large-scale applications.</p>
  </div>
</div>

::: tip Just getting started?
Check out the [Introduction](/learn/introduction) for a comprehensive guide to using Blac in your projects.
:::

## Quick Example

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


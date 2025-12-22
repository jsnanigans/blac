---
layout: home

hero:
  name: Blac
  text: Business Logic Component
  tagline: A TypeScript + React state management library inspired by the BLoC pattern
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/jsnanigans/blac

features:
  - icon: 🎯
    title: Type-Safe State Management
    details: Full TypeScript support with inferred types for state, events, and props.

  - icon: ⚡
    title: Fine-Grained Reactivity
    details: Auto-tracking proxy system ensures components only re-render when their dependencies change.

  - icon: 🔄
    title: Event-Driven Architecture
    details: Vertex pattern provides structured event handling with type-safe event classes.

  - icon: 🧩
    title: Extensible Plugin System
    details: Add functionality through plugins for persistence, logging, devtools, and more.

  - icon: 🎨
    title: React 18+ Integration
    details: Built for Concurrent Mode with useSyncExternalStore, Suspense, and useTransition support.

  - icon: 🛡️
    title: Memory Safe
    details: Automatic ref counting and disposal prevents memory leaks in component lifecycles.
---

## Quick Example

```typescript
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>{state.count}</button>;
}
```

## Installation

```bash
npm install @blac/core @blac/react
```

---
layout: home

hero:
  name: Blac
  text: Business Logic Components
  tagline: Type-safe state containers with React integration
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/jsnanigans/blac

features:
  - icon: 🎯
    title: Type-Safe State Containers
    details: Strong TypeScript inference for state, instances, and registry helpers.

  - icon: ⚡
    title: Proxy-Based Tracking
    details: Auto-tracking proxies detect accessed state and getters for precise re-renders.

  - icon: ♻️
    title: Registry + Ref Counting
    details: Acquire/release instances with automatic disposal when ref counts drop to zero.

  - icon: 🧩
    title: Extensible Plugins
    details: Observe lifecycle and state changes with a safe plugin API.

  - icon: ⚛️
    title: React 18+ Hook
    details: "useBloc is built on useSyncExternalStore for concurrent-safe updates."

  - icon: 👀
    title: Watch Utilities
    details: "watch and tracked let you react to state and getter dependencies outside React."
---

## Quick Example

```tsx
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

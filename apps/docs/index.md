---
layout: home

hero:
  name: BlaC
  text: Business Logic Components
  tagline: Type-safe state management for React with automatic re-render optimization
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: Quick Start
      link: /guide/getting-started
    - theme: alt
      text: Reference
      link: /core/cubit

features:
  - icon: 🎯
    title: Type-Safe by Default
    details: Full TypeScript inference from your state type through the hook return value. No manual type annotations needed.

  - icon: ⚡
    title: Smart Re-renders
    details: Auto-tracking proxies detect which state properties you read. Components only re-render when those specific properties change.

  - icon: 🔌
    title: Zero Providers
    details: No context providers or component wrappers. Import a class, call useBloc, and state is shared automatically.

  - icon: ♻️
    title: Automatic Lifecycle
    details: The registry manages instance creation, sharing, and disposal with ref counting. Instances clean up when no longer needed.

  - icon: 🧩
    title: Plugin Ecosystem
    details: Official plugins for DevTools integration, console logging, and IndexedDB persistence. Or build your own.

  - icon: ⚛️
    title: Batched Updates
    details: "Changes coalesce on the microtask queue and dispatch through React's normal update path, so a burst of updates in one tick re-renders a component once."
---

<script setup>
import { perConsumerTrackingFiles } from './demos/per-consumer-tracking';
</script>

## Quick Example

```tsx twoslash
import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

// 1. Define your state in a class
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

// 2. Use it in any component — state is shared automatically
function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return <button onClick={counter.increment}>{state.count}</button>;
}
```

## See It: Only the Reader Re-renders

Auto-tracking means each component re-renders only when the state properties it actually read have changed. Click "Bump left" and watch: the left counter's render count ticks up, but the right counter stays put. The right component never re-rendered because it never read `state.left`.

<BlacSandpack :files="perConsumerTrackingFiles" active-file="/App.tsx" :editor-height="500" />

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

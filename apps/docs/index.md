---
layout: home

hero:
  name: BlaC
  text: Business Logic as Components
  tagline: Simple, powerful state management for React with zero boilerplate
  image:
    src: /logo.svg
    alt: BlaC
  actions:
    - theme: brand
      text: Get Started
      link: /introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/jsnanigans/blac

features:
  - icon: ⚡
    title: Zero Boilerplate
    details: Get started in seconds. No actions, reducers, or complex setup required.
  - icon: 🎯
    title: Type-Safe by Default
    details: Full TypeScript support with perfect type inference and autocompletion.
  - icon: 🚀
    title: Optimized Performance
    details: Automatic render optimization through intelligent dependency tracking.
  - icon: 🧩
    title: Flexible Architecture
    details: Scale from simple Cubits to complex event-driven Blocs as needed.
---

<style>
.VPHome {
  padding-bottom: 96px !important;
}

.VPHero {
  padding: 64px 24px 48px !important;
}

.VPFeatures {
  padding: 64px 24px 0 !important;
}

.VPFeature {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px !important;
}
</style>

## Quick Start

```typescript
// 1. Define your state container
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}

// 2. Use it in your React component
import { useBloc } from '@blac/react';

function Counter() {
  const [state, cubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <button onClick={cubit.decrement}>-</button>
      <span>{state.count}</span>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

That's it. No providers, no boilerplate, just clean state management.

<div style="text-align: center; margin: 48px 0;">
  <a href="/introduction" style="
    display: inline-block;
    padding: 12px 24px;
    background: var(--vp-c-brand);
    color: white;
    border-radius: 24px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.25s;
  " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
    Learn More →
  </a>
</div>
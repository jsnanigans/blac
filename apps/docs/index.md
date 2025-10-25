---
layout: home

hero:
  name: BlaC
  text: Business Logic Component
  tagline: A sophisticated TypeScript state management library implementing the BLoC pattern with innovative proxy-based dependency tracking
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/yourusername/blac

features:
  - icon: 🎯
    title: Type-Safe State Management
    details: Built with TypeScript from the ground up, providing excellent type inference and compile-time safety for your application state.

  - icon: ⚡
    title: Fine-Grained Reactivity
    details: Selector-based subscriptions with version-based change detection for optimal React re-render control and performance.

  - icon: 🔄
    title: Event-Driven Architecture
    details: Powerful event handling with class-based events for Blocs, enabling complex business logic patterns.

  - icon: 🧩
    title: Extensible Plugin System
    details: Customize and extend functionality with a flexible plugin architecture for logging, persistence, and more.

  - icon: 🎨
    title: React 18+ Integration
    details: Clean adapter pattern using useSyncExternalStore for optimal React 18 compatibility and concurrent features.

  - icon: 🛡️
    title: Memory Safe
    details: Automatic lifecycle management with WeakRef-based tracking and generation counters to prevent memory leaks.
---

## Quick Example

::: code-group

```typescript [Cubit]
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}
```

```typescript [React]
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter-cubit';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}
```

```typescript [Event-Driven Bloc]
import { Bloc } from '@blac/core';

class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class CounterBloc extends Bloc<number, IncrementEvent> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
  }

  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}
```

:::

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

# Installation

## Prerequisites

- TypeScript 5.0 or higher (for TypeScript projects)

## Package Installation

Install BlaC packages using your preferred package manager:

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

## Package Overview

### Core Package

`@blac/core` provides the fundamental state management functionality:

- `Cubit` - Simple state containers
- `Bloc` - Event-driven state containers
- `Blac` - Global registry and configuration
- Plugin system
- Logging utilities

### React Package

`@blac/react` provides React integration:

- `useBloc` - React hook for consuming Blocs/Cubits
- `ReactBridge` - Adapter layer for React 18+ compatibility
- Type definitions for React-specific features

## Project Setup

### Basic Setup

1. Install the packages
2. Create your first Cubit:

```typescript
// counter-cubit.ts
import { Cubit } from '@blac/core';

export class CounterCubit extends Cubit<number> {
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

3. Use it in React:

```tsx
// Counter.tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter-cubit';

export function Counter() {
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

### With Vite

BlaC works seamlessly with Vite:

```bash
# Create Vite project
pnpm create vite my-app --template react-ts
cd my-app

# Install BlaC
pnpm add @blac/core @blac/react
```

### With Next.js

For Next.js projects:

```bash
# Create Next.js project
pnpm create next-app my-app --typescript
cd my-app

# Install BlaC
pnpm add @blac/core @blac/react
```

::: warning
When using Next.js with the App Router, ensure your Bloc/Cubit files are marked with `'use client'` directive if they're used in Client Components.
:::

## Optional Plugins

Install additional plugins as needed:

```bash
# Persistence plugin
pnpm add @blac/plugin-persistence

# Logging plugin
pnpm add @blac/plugin-render-logging

# Graph-based state management
pnpm add @blac/plugin-graph @blac/plugin-graph-react
```

## Next Steps

- Read the [Core Concepts](/guide/core-concepts) guide
- Start with [Cubit Quick Start](/core/getting-started)
- Explore [React Integration](/react/getting-started)

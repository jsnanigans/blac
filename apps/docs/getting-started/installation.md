# Installation

Getting started with BlaC is straightforward. This guide will walk you through installation and basic setup.

## Prerequisites

- Node.js 16.0 or later
- React 16.8 or later (for hooks support)
- TypeScript 4.0 or later (optional but recommended)

## Install BlaC

BlaC is distributed as two packages:

- `@blac/core` - The core state management engine
- `@blac/react` - React integration with hooks

For React applications, install the React package which includes core:

::: code-group

```bash [npm]
npm install @blac/react
```

```bash [yarn]
yarn add @blac/react
```

```bash [pnpm]
pnpm add @blac/react
```

:::

## TypeScript Configuration

BlaC is built with TypeScript and provides excellent type safety out of the box. If you're using TypeScript, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx" // or "react" for older React versions
  }
}
```

## Project Structure

We recommend organizing your BlaC code in a dedicated directory:

```
src/
├── state/          # BlaC state containers
│   ├── auth/      # Feature-specific folders
│   │   ├── auth.cubit.ts
│   │   └── auth.types.ts
│   └── todo/
│       ├── todo.bloc.ts
│       ├── todo.events.ts
│       └── todo.types.ts
├── components/     # React components
└── App.tsx
```

## Verify Installation

Create a simple counter to verify everything is working:

```typescript
// src/state/counter.cubit.ts
import { Cubit } from '@blac/core';

export class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}
```

```tsx
// src/App.tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './state/counter.cubit';

function App() {
  const [state, counter] = useBloc(CounterCubit);

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
      <button onClick={counter.reset}>Reset</button>
    </div>
  );
}

export default App;
```

If you see the counter working, congratulations! You've successfully installed BlaC.

## Optional: Global Configuration

BlaC works out of the box with sensible defaults, but you can customize its behavior:

```typescript
// src/index.tsx or src/main.tsx
import { Blac } from '@blac/core';

// Configure before your app renders
Blac.setConfig({
  // Enable console logging for debugging
  enableLog: process.env.NODE_ENV === 'development',

  // Control automatic render optimization
  proxyDependencyTracking: true,

  // Expose Blac instance globally (for debugging)
  exposeBlacInstance: process.env.NODE_ENV === 'development'
});

// Then render your app
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## What's Next?

Now that you have BlaC installed, let's create your first Cubit:

<div style="margin-top: 48px;">
  <a href="/getting-started/first-cubit" style="
    display: inline-block;
    padding: 12px 24px;
    background: var(--vp-c-brand-3);
    color: white;
    border-radius: 24px;
    text-decoration: none;
    font-weight: 500;
  ">
    Create Your First Cubit →
  </a>
</div>

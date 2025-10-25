# Installation

Install the React integration package for BlaC.

## Prerequisites

- React 18.0 or higher
- Node.js 16.0 or higher
- TypeScript 5.0 or higher (recommended)

## Package Installation

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

## React Version Compatibility

`@blac/react` is designed for **React 18+** and uses:

- `useSyncExternalStore` for optimal React 18 integration
- Support for Concurrent features (Suspense, Transitions)
- React Compiler compatibility

::: warning
React 17 and below are not supported. Please upgrade to React 18 or higher.
:::

## Framework-Specific Setup

### Vite

BlaC works out of the box with Vite:

```bash
# Create Vite project
pnpm create vite my-app --template react-ts

# Install BlaC
cd my-app
pnpm add @blac/core @blac/react
```

### Next.js (App Router)

For Next.js 13+ with App Router:

```bash
# Create Next.js project
pnpm create next-app my-app --typescript

# Install BlaC
cd my-app
pnpm add @blac/core @blac/react
```

::: warning Client Components
When using the App Router, Bloc/Cubit files used in Client Components must include the `'use client'` directive:

```typescript
'use client';

import { Cubit } from '@blac/core';

export class CounterCubit extends Cubit<number> {
  // ...
}
```
:::

### Next.js (Pages Router)

For Next.js with Pages Router:

```bash
pnpm create next-app my-app --typescript --pages

cd my-app
pnpm add @blac/core @blac/react
```

No special configuration needed for Pages Router.

### Create React App

```bash
pnpm create react-app my-app --template typescript

cd my-app
pnpm add @blac/core @blac/react
```

### Remix

```bash
pnpm create remix my-app

cd my-app
pnpm add @blac/core @blac/react
```

## TypeScript Configuration

Ensure your TypeScript configuration is compatible:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Optional Plugins

Install additional React-specific plugins:

```bash
# Render logging (development only)
pnpm add @blac/plugin-render-logging

# Graph-based state management with React bindings
pnpm add @blac/plugin-graph @blac/plugin-graph-react
```

## Verification

Verify your installation with this simple example:

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class TestCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  increment = () => this.emit(this.state + 1);
}

function App() {
  const [count, cubit] = useBloc(TestCubit);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>Increment</button>
    </div>
  );
}

export default App;
```

## Development Setup

For optimal development experience:

```typescript
// src/blac-config.ts
import { Blac, BlacLogger, LogLevel } from '@blac/core';

if (process.env.NODE_ENV === 'development') {
  BlacLogger.configure({
    enabled: true,
    level: LogLevel.DEBUG,
  });
}

export default Blac;
```

Import this configuration in your app entry point:

```tsx
// src/main.tsx or src/index.tsx
import './blac-config';
import App from './App';
// ... rest of your setup
```

## Next Steps

- Follow the [Quick Start Guide](/react/getting-started)
- Learn about the [useBloc Hook](/react/use-bloc)
- Explore [Selectors](/react/selectors) for performance optimization

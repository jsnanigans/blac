# BlaC

Type-safe state management for React with automatic re-render optimization.

**[Documentation](https://blac-docs.pages.dev)** · **[npm](https://www.npmjs.com/package/@blac/core)**

## Features

- **Class-based state containers** — Business logic lives in typed classes, not components
- **Automatic re-render optimization** — Proxy-based tracking detects which properties you read and only re-renders when those change
- **Zero providers** — No context wrappers. Import a class, call `useBloc`, and state is shared automatically
- **Lifecycle management** — Registry handles instance creation, sharing, ref counting, and disposal
- **Plugin system** — Official plugins for DevTools, logging, and IndexedDB persistence
- **Concurrent-safe** — Built on `useSyncExternalStore` for React 18+

## Quick Start

```bash
pnpm add @blac/core @blac/react
```

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

## Packages

| Package                                               | Description                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| [`@blac/core`](packages/blac-core)                    | State containers, registry, plugins, watch & tracking utilities |
| [`@blac/react`](packages/blac-react)                  | React hook (`useBloc`) with auto-tracking                       |
| [`@blac/preact`](packages/blac-preact)                | Preact integration                                              |
| [`@blac/adapter`](packages/blac-adapter)              | Framework-agnostic adapter layer                                |
| [`@blac/logging-plugin`](packages/logging-plugin)     | Console logging and monitoring plugin                           |
| [`@blac/devtools-connect`](packages/devtools-connect) | DevTools and Redux DevTools integration                         |
| [`@blac/plugin-persist`](packages/plugin-persist)     | IndexedDB state persistence                                     |
| [`@blac/devtools-ui`](packages/devtools-ui)           | DevTools UI components                                          |

## Development

This is a pnpm workspace monorepo.

```bash
# Install dependencies
pnpm install

# Dev mode (all packages)
pnpm dev

# Build all packages
pnpm build

# Run tests for a specific package
pnpm --filter @blac/core test
pnpm --filter @blac/react test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT

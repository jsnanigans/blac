# BlaC

Type-safe, class-based state management for React and Preact with automatic re-render optimization.

**[Documentation](https://blac-docs.pages.dev)** · **[npm](https://www.npmjs.com/package/@blac/core)** · **[GitHub](https://github.com/jsnanigans/blac)**

## Features

- **Class-based state containers** — Business logic lives in typed classes, not components
- **Automatic re-render optimization** — Proxy-based tracking detects which properties you read and only re-renders when those change
- **Zero providers** — No context wrappers. Import a class, call `useBloc`, done
- **Lifecycle management** — Registry handles instance creation, sharing, ref counting, and disposal
- **Plugin system** — DevTools, logging, and IndexedDB persistence out of the box
- **Concurrent-safe** — Built on `useSyncExternalStore` for React 18+
- **Framework adapters** — First-class React and Preact support, extensible adapter layer for others

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

Only `state.count` is tracked — the component won't re-render if other properties change.

## Packages

| Package                                               | Description                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| [`@blac/core`](packages/blac-core)                    | State containers, registry, plugins, watch & tracking utilities |
| [`@blac/react`](packages/blac-react)                  | React hook (`useBloc`) with proxy-based auto-tracking           |
| [`@blac/preact`](packages/blac-preact)                | Preact hook with the same API as `@blac/react`                  |
| [`@blac/adapter`](packages/blac-adapter)              | Framework-agnostic adapter layer for building integrations      |
| [`@blac/devtools-connect`](packages/devtools-connect) | DevTools connection plugin (browser inspector)                  |
| [`@blac/devtools-ui`](packages/devtools-ui)           | Embeddable DevTools UI — overlay or Picture-in-Picture          |
| [`@blac/logging-plugin`](packages/logging-plugin)     | Console logging with memory monitoring                          |
| [`@blac/plugin-persist`](packages/plugin-persist)     | IndexedDB state persistence with hydration                      |

## Development

This is a pnpm workspace monorepo using [vite-plus](https://github.com/nicksrandall/vite-plus) for builds.

```bash
pnpm install

pnpm dev                         # watch all packages
pnpm build                       # build all packages
pnpm --filter @blac/core test    # test a specific package
pnpm typecheck                   # type check all packages
pnpm lint                        # lint all packages
```

## License

MIT

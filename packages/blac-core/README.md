# @blac/core

Core state management primitives for BlaC — state containers, registry, plugins, and tracking utilities.

**[Documentation](https://blac-docs.pages.dev/guide/introduction)** · **[npm](https://www.npmjs.com/package/@blac/core)**

## Installation

```bash
pnpm add @blac/core
```

## State Containers

### Cubit

The primary building block. Extends `StateContainer` with public `emit`, `update`, and `patch` methods.

```ts
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((s) => ({ count: s.count - 1 }));
  reset = () => this.patch({ count: 0 });
}
```

- `emit(newState)` — replace the entire state
- `update(fn)` — derive new state from current
- `patch(partial)` — shallow merge (object state only)

### StateContainer

Abstract base class. Use this when you want `emit`/`update` to be protected (not callable from outside).

```ts
import { StateContainer } from '@blac/core';

class AuthContainer extends StateContainer<{ token: string | null }> {
  constructor() {
    super({ token: null });
  }

  login(token: string) {
    this.emit({ token });
  }

  logout() {
    this.emit({ token: null });
  }
}
```

**Public API:** `state`, `subscribe(listener)`, `dispose()`, `isDisposed`, `name`, `instanceId`, `createdAt`, `lastUpdateTimestamp`

**Protected API:** `emit(state)`, `update(fn)`, `onSystemEvent(event, handler)`, `depend(BlocClass, instanceKey?)`

## Registry

Manages instance lifecycles and ref counting.

```ts
import {
  acquire,
  ensure,
  borrow,
  borrowSafe,
  release,
  hasInstance,
  getRefCount,
} from '@blac/core';

const counter = acquire(CounterCubit); // create or reuse, increment ref count
const shared = ensure(CounterCubit); // create or reuse, no ref count change
const existing = borrow(CounterCubit); // get existing, throws if missing
const maybe = borrowSafe(CounterCubit); // get existing, returns { error, instance }

release(CounterCubit); // decrement ref count, auto-dispose at 0 (unless keepAlive)
```

## Configuration

```ts
import { Cubit, blac } from '@blac/core';

@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {}

@blac({ excludeFromDevTools: true })
class InternalCubit extends Cubit<State> {}
```

## Watch

Observe state changes outside of a UI framework.

```ts
import { watch, instance } from '@blac/core';

const stop = watch(CounterCubit, (counter) => {
  console.log(counter.state.count);
  if (counter.state.count >= 10) return watch.STOP;
});

// Watch a specific named instance
const stop2 = watch(instance(CounterCubit, 'counter-1'), (c) => {
  console.log(c.state.count);
});
```

## Tracked

Run a function and capture which blocs/state it accessed.

```ts
import { tracked } from '@blac/core';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserCubit);
  return user.state.name;
});
```

## Plugins

```ts
import { getPluginManager, type BlacPlugin } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  onStateChanged(instance, previousState, currentState) {
    console.log(instance.constructor.name, previousState, '→', currentState);
  },
};

getPluginManager().install(myPlugin, { environment: 'development' });
```

## Subpath Exports

| Export                | Contents                                               |
| --------------------- | ------------------------------------------------------ |
| `@blac/core`          | All core classes, registry, decorators, watch, tracked |
| `@blac/core/watch`    | `watch`, `instance`, `tracked`                         |
| `@blac/core/tracking` | Dependency tracking internals for framework adapters   |
| `@blac/core/plugins`  | Plugin system types and utilities                      |
| `@blac/core/debug`    | Registry introspection helpers                         |
| `@blac/core/testing`  | Test utilities                                         |
| `@blac/core/types`    | Type-only exports                                      |

## License

MIT

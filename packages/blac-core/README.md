# @blac/core

> ⚠️ **Warning:** This project is currently under active development. The API may change in future releases. Use with caution in production environments.

Core state management primitives for BlaC: state containers, registry, plugins, and tracking utilities.

## Installation

```bash
npm install @blac/core
# or
pnpm add @blac/core
# or
yarn add @blac/core
```

## Core Concepts

### StateContainer

`StateContainer` is the abstract base class. It provides state storage, subscriptions, lifecycle events, and registry integration.

```ts
import { StateContainer } from '@blac/core';

class CounterContainer extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.update((state) => ({ count: state.count + 1 }));
  }
}
```

Key public API:

- `state` (readonly)
- `subscribe(listener)` -> `unsubscribe`
- `dispose()`
- `isDisposed`, `name`, `debug`, `instanceId`, `createdAt`, `lastUpdateTimestamp`

Protected API for subclasses:

- `emit(newState)`
- `update(fn)`
- `onSystemEvent(event, handler)` for `stateChanged` and `dispose`
- `depend(BlocClass, instanceKey?)` for cross-bloc dependencies

### Cubit

`Cubit` extends `StateContainer` with public mutation methods.

```ts
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.update((state) => ({ count: state.count - 1 }));
  reset = () => this.patch({ count: 0 });
}
```

`patch()` performs a shallow merge for object state and is only available when `S extends object`.

## Registry API

The registry manages instance lifecycles and ref counting.

```ts
import {
  acquire,
  ensure,
  borrow,
  borrowSafe,
  release,
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  clear,
  clearAll,
} from '@blac/core';

const counter = acquire(CounterCubit); // increments ref count

const shared = ensure(CounterCubit); // no ref count increment
const existing = borrow(CounterCubit); // no create, no ref count
const maybe = borrowSafe(CounterCubit); // { error, instance }

release(CounterCubit); // decrements ref count, auto-dispose at 0 unless keepAlive

if (hasInstance(CounterCubit)) {
  console.log(getRefCount(CounterCubit));
}

forEach(CounterCubit, (inst) => console.log(inst.state));
clear(CounterCubit);
clearAll();
```

## Decorators

Configure container behavior with `@blac`.

```ts
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}

@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {}

@blac({ excludeFromDevTools: true })
class InternalCubit extends Cubit<State> {}
```

`BlacOptions` is a union type, so only one option can be specified at a time.

## Watch and Tracking

### watch

```ts
import { watch, instance } from '@blac/core';

const stop = watch(CounterCubit, (counter) => {
  console.log(counter.state.count);

  if (counter.state.count >= 10) {
    return watch.STOP; // stop from inside the callback
  }
});

const stopSpecific = watch(instance(CounterCubit, 'counter-1'), (counter) => {
  console.log(counter.state.count);
});
```

### tracked

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

const loggingPlugin: BlacPlugin = {
  name: 'logging',
  version: '1.0.0',
  onStateChanged(instance, previousState, currentState, callstack) {
    console.log(instance.constructor.name, previousState, currentState);
    if (callstack) console.log(callstack);
  },
};

getPluginManager().install(loggingPlugin, {
  enabled: true,
  environment: 'development',
});
```

## Subpath Exports

- `@blac/core/watch` -> `watch`, `instance`, `tracked` utilities
- `@blac/core/tracking` -> dependency tracking utilities for framework adapters
- `@blac/core/plugins` -> plugin system exports
- `@blac/core/debug` -> advanced registry introspection helpers

## License

MIT

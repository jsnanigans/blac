# BlaC Documentation

Type-safe state containers with React integration. BlaC focuses on clear instance lifecycles, registry-driven ownership, and fine-grained reactivity.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## @blac/core

### StateContainer

Abstract base class that stores state, handles subscriptions, and integrates with the registry.

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

Public API:

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

`Cubit` extends `StateContainer` with public mutation helpers.

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

Notes:

- `patch()` performs a shallow merge and is only available when `S extends object`.

### Registry

The registry manages lifecycle and ref counting for shared instances.

```ts
import {
  acquire,
  ensure,
  borrow,
  borrowSafe,
  release,
  hasInstance,
  getRefCount,
  clear,
  clearAll,
} from '@blac/core';

const counter = acquire(CounterCubit); // increments ref count
const shared = ensure(CounterCubit); // no ref count increment
const existing = borrow(CounterCubit); // must already exist
const maybe = borrowSafe(CounterCubit); // { error, instance }

release(CounterCubit); // auto-dispose at refCount 0 (unless keepAlive)

if (hasInstance(CounterCubit)) {
  console.log(getRefCount(CounterCubit));
}

clear(CounterCubit);
clearAll();
```

### Decorators

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

### Watch

`watch` runs a callback and re-runs when accessed state or getters change.

```ts
import { watch, instance } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);

  if (user.state.name === 'done') {
    return watch.STOP;
  }
});

const stopSpecific = watch(instance(UserCubit, 'user-123'), (user) => {
  console.log(user.state.name);
});
```

### tracked

```ts
import { tracked, ensure } from '@blac/core';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserCubit);
  return user.state.name;
});
```

### Plugins

```ts
import { getPluginManager, type BlacPlugin } from '@blac/core';

const plugin: BlacPlugin = {
  name: 'logger',
  version: '1.0.0',
  onStateChanged(instance, previousState, currentState, callstack) {
    console.log(instance.constructor.name, previousState, currentState);
    if (callstack) console.log(callstack);
  },
};

getPluginManager().install(plugin, {
  enabled: true,
  environment: 'development',
});
```

### Subpath Exports

- `@blac/core/watch` - `watch`, `instance`, `tracked`
- `@blac/core/tracking` - dependency tracking utilities for framework adapters
- `@blac/core/plugins` - plugin system exports
- `@blac/core/debug` - advanced registry introspection helpers

## @blac/react

### useBloc

Connects a component to a state container with optimized re-renders.

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

Return value: `[state, bloc, ref]`

- `state` is the current snapshot
- `bloc` is the proxied instance used for tracking and method calls
- `ref` is an internal component ref (advanced use)

#### Tracking Modes

Auto-tracking (default):

```tsx
function UserProfile() {
  const [state] = useBloc(UserCubit);
  return <h1>{state.name}</h1>;
}
```

Manual dependencies (disables auto-tracking):

```tsx
function Counter() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });

  return <p>{state.count}</p>;
}
```

No tracking:

```tsx
function FullState() {
  const [state] = useBloc(MyBloc, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

#### Options

```tsx
useBloc(MyBloc, {
  autoTrack: true,
  dependencies: (state, bloc) => [state.count],
  instanceId: 'editor-1',
  onMount: (bloc) => bloc.initialize?.(),
  onUnmount: (bloc) => bloc.dispose?.(),
});
```

- `instanceId` can be a string or number
- `dependencies` receives `(state, bloc)`

#### Instance Management

Shared instances (default):

```tsx
useBloc(CounterCubit); // shared
```

Isolated instances:

```tsx
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}

useBloc(FormCubit); // unique per component
```

Named instances:

```tsx
useBloc(EditorCubit, { instanceId: 'editor-1' });
useBloc(EditorCubit, { instanceId: 'editor-1' }); // same instance
useBloc(EditorCubit, { instanceId: 'editor-2' }); // different instance
```

### Global Configuration

```tsx
import { configureBlacReact } from '@blac/react';

configureBlacReact({
  autoTrack: true,
});
```

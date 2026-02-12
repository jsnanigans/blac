---
outline: [2, 3]
---

# @blac/core

Core state management primitives for BlaC: state containers, registry helpers, plugin system, and tracking utilities.

## Key Exports

- `StateContainer` - Abstract base class for state containers
- `Cubit` - Simple state container with `emit`, `update`, `patch`
- Registry helpers: `acquire`, `release`, `borrow`, `borrowSafe`, `ensure`, `clear`, `clearAll`
- Plugins: `PluginManager`, `getPluginManager`, `BlacPlugin`
- Watch + tracking: `watch`, `instance`, `tracked`, `createTrackedContext`

## Subpath Exports

- `@blac/core/watch` - `watch`, `instance`, `tracked`
- `@blac/core/tracking` - dependency tracking utilities for framework adapters
- `@blac/core/plugins` - plugin system exports
- `@blac/core/debug` - advanced registry introspection helpers

## Classes

### StateContainer

Abstract base class that stores state, exposes subscriptions, and integrates with the registry.

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

Extends `StateContainer` and exposes public mutation methods:

- `emit(newState)`
- `update(fn)`
- `patch(partial)` (shallow merge for object state)

## Registry Helpers

The registry manages instance lifecycle and ref counting.

- `acquire(BlocClass, instanceKey?, options?)`
- `ensure(BlocClass, instanceKey?)`
- `borrow(BlocClass, instanceKey?)`
- `borrowSafe(BlocClass, instanceKey?)` -> `{ error, instance }`
- `release(BlocClass, instanceKey?, forceDispose?)`
- `hasInstance(BlocClass, instanceKey?)`
- `getRefCount(BlocClass, instanceKey?)`
- `getAll(BlocClass)`
- `forEach(BlocClass, cb)`
- `clear(BlocClass)` / `clearAll()`

## Decorators

`@blac(options)` configures static behavior for a container class.

```ts
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {}
```

`BlacOptions` is a union type. Only one of:

- `{ isolated: true }`
- `{ keepAlive: true }`
- `{ excludeFromDevTools: true }`

## Watch + Tracking

```ts
import { watch, instance, tracked } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);
});

const stopSpecific = watch(instance(UserCubit, 'user-123'), (user) => {
  console.log(user.state.name);
});

const { result, dependencies } = tracked(() => {
  const user = ensure(UserCubit);
  return user.state.name;
});
```

## Plugins

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

getPluginManager().install(plugin, { environment: 'development' });
```

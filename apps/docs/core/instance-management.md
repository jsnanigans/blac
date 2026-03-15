# Instance Management

The registry is a global singleton that manages the lifecycle of state container instances. It handles creation, sharing, ref counting, and disposal.

## How it works

When you call `useBloc(CounterCubit)` in React:

1. The hook calls `acquire(CounterCubit)`, which either creates a new instance or returns the existing one
2. The ref count increments (+1)
3. When the component unmounts, `release(CounterCubit)` decrements the ref count (-1)
4. At ref count zero, the instance is disposed (unless `keepAlive` is set)

This means shared instances are automatically cleaned up when no component needs them.

## Registry functions

### Creating and accessing instances

```ts
import { acquire, ensure, borrow, borrowSafe } from '@blac/core';
```

| Function | Creates if missing? | Affects ref count? | Throws? |
|----------|--------------------|--------------------|---------|
| `acquire(Class, key?)` | Yes | +1 | No |
| `ensure(Class, key?)` | Yes | No | No |
| `borrow(Class, key?)` | No | No | Yes, if not found |
| `borrowSafe(Class, key?)` | No | No | No, returns `{ error, instance }` |

**`acquire`** — Use when you own the reference and will `release` it later. This is what `useBloc` calls internally.

**`ensure`** — Use when you need the instance to exist but don't want to affect its lifecycle. Common inside other cubits via `depend()`.

**`borrow`** — Use when the instance must already exist. Throws if it doesn't. Good for cases where the absence of an instance is a programming error.

**`borrowSafe`** — Like `borrow` but returns an object instead of throwing:

```ts
const { error, instance } = borrowSafe(AuthCubit);
if (error) {
  console.log('Auth not initialized yet');
}
```

### Releasing instances

```ts
import { release } from '@blac/core';

release(CounterCubit);          // release default instance
release(EditorCubit, 'doc-42'); // release named instance
```

At ref count zero, the instance is disposed automatically (unless `keepAlive` is set).

### Querying the registry

```ts
import { hasInstance, getRefCount, getAll, forEach, getStats } from '@blac/core';

hasInstance(CounterCubit);              // boolean
getRefCount(CounterCubit);             // number
getAll(CounterCubit);                  // all instances of this class
forEach(CounterCubit, (inst) => { });  // iterate instances
getStats();                            // { totalInstances, totalRefCount, types }
```

### Cleanup

```ts
import { clear, clearAll } from '@blac/core';

clear(CounterCubit);   // dispose and remove all instances of this class
clearAll();            // dispose and remove everything
```

## Named instances

Pass an instance key as the second argument to any registry function to manage named instances:

```ts
const editor1 = acquire(EditorCubit, 'doc-42');
const editor2 = acquire(EditorCubit, 'doc-99');

// These are different instances
editor1 !== editor2; // true

release(EditorCubit, 'doc-42');
release(EditorCubit, 'doc-99');
```

In React, use the `instanceId` option:

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

## In React vs outside React

In React, `useBloc` handles `acquire` and `release` automatically. You rarely call registry functions directly.

Outside React (tests, scripts, server-side code), manage the lifecycle manually:

```ts
const counter = acquire(CounterCubit);
counter.increment();
console.log(counter.state.count);
release(CounterCubit);
```

See also: [Configuration](/core/configuration), [API Reference](/api/core/registry)

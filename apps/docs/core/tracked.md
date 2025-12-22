# tracked

Low-level utilities for manual dependency tracking. Useful when building custom integrations.

## tracked()

Run a callback while tracking all bloc dependencies accessed:

```typescript
import { tracked, ensure } from '@blac/core';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserBloc);
  return user.fullName; // getter may access other blocs
});

// result: the return value of the callback
// dependencies: Set of all blocs accessed (including via getters)
```

### Options

```typescript
const { result, dependencies } = tracked(
  () => {
    return someBloc.computedValue;
  },
  {
    exclude: someBloc, // Exclude this bloc from dependencies
  },
);
```

## TrackedContext

For more control, use `TrackedContext` to manage tracking across multiple operations:

```typescript
import { createTrackedContext, ensure } from '@blac/core';

const ctx = createTrackedContext();
const userBloc = ensure(UserBloc);
const proxiedUser = ctx.proxy(userBloc);

ctx.start();
const value = proxiedUser.state.name + proxiedUser.fullName;
const deps = ctx.stop();
// deps contains external blocs accessed via getters (excludes userBloc)
```

### Methods

| Method              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `proxy(bloc)`       | Create a tracking proxy for a bloc             |
| `start()`           | Start tracking                                 |
| `stop()`            | Stop tracking and return external dependencies |
| `changed()`         | Check if any tracked values changed            |
| `getPrimaryBlocs()` | Get all proxied blocs                          |
| `reset()`           | Reset context for reuse                        |

### Example: Custom Hook

```typescript
function useCustomTracking(BlocClass) {
  const ctx = useMemo(() => createTrackedContext(), []);
  const bloc = ensure(BlocClass);
  const proxied = ctx.proxy(bloc);

  ctx.start();
  const value = proxied.state.someValue;
  const externalDeps = ctx.stop();

  // Subscribe to external dependencies for re-renders
  // ...

  return value;
}
```

::: tip
Most users won't need these utilities directly. Use `useBloc`, `watch`, or `waitUntil` which handle tracking automatically.
:::

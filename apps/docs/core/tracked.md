# tracked

`tracked` runs a callback and returns both the result and the list of dependencies that were accessed during execution.

```ts
import { tracked, ensure } from '@blac/core';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserCubit);
  return user.state.name;
});

// result: the user's name
// dependencies: Set of tracked property paths
```

## When to use

- **Debugging auto-tracking** — Check which properties a piece of code accesses to understand why re-renders happen
- **Building custom reactive systems** — Use the dependency list to set up manual subscriptions
- **Testing** — Verify that your code only reads the properties you expect

## Advanced: `createTrackedContext`

For fine-grained control, create a tracking context manually:

```ts
import { createTrackedContext, ensure } from '@blac/core';

const ctx = createTrackedContext();
ctx.start();

const user = ctx.proxy(ensure(UserCubit));
const name = user.state.name;

const deps = ctx.stop();
// deps contains the accessed property paths
```

This is useful when you need to track across multiple operations or integrate with custom frameworks.

See also: [watch](/core/watch), [Dependency Tracking](/react/dependency-tracking)

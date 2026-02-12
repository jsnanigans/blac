# tracked

`tracked()` runs a callback and returns the dependencies accessed during the run.

```ts
import { tracked, ensure } from '@blac/core';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserCubit);
  return user.state.name;
});
```

For advanced control, use `createTrackedContext()`:

```ts
import { createTrackedContext } from '@blac/core';

const ctx = createTrackedContext();
ctx.start();
const user = ctx.proxy(ensure(UserCubit));
const name = user.state.name;
const deps = ctx.stop();
```

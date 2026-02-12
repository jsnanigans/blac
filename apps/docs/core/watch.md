# watch

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

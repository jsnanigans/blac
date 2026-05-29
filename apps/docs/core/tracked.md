# tracked (removed)

::: warning Removed in v2
The standalone `tracked()` function has been removed. It was an internal utility that leaked implementation details. Use the alternatives below instead.
:::

## Migration

### Debugging which properties a component tracks

Auto-tracking now happens transparently through `useBloc`. To understand which paths trigger re-renders, use the [BlaC DevTools](/plugins/devtools) — the DevTools panel shows exactly which paths changed with each state update.

### Manual subscriptions outside React

Use `watch` to observe state changes reactively outside React. `watch` tracks which properties your callback reads and only re-runs when those change:

```ts
import { watch } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log(user.state.name); // only re-runs when 'name' changes
});
```

### Testing which properties are accessed

Write an assertion against the state directly, or subscribe to verify a specific property changed:

```ts
const cubit = ensure(UserCubit);
const before = cubit.state.name;
cubit.setName('Alice');
expect(cubit.state.name).toBe('Alice');
```

See also: [watch](/core/watch), [Dependency Tracking](/react/dependency-tracking)

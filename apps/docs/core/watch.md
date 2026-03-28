# watch

`watch` runs a callback and automatically re-runs it when any state or getter it accessed changes. It works outside of React.

```ts
import { watch } from '@blac/core';

const stop = watch(UserCubit, (user) => {
  console.log('User name changed:', user.state.name);
});
```

## How it works

1. `watch` resolves the instance from the registry (creating it if needed via `ensure`)
2. It runs your callback, tracking which state properties and getters are accessed
3. When any tracked property changes, the callback re-runs
4. Tracking is updated on each run — if your callback reads different properties based on conditions, only the latest set is tracked

## Stopping a watch

### Return the stop function

```ts
const stop = watch(UserCubit, (user) => {
  console.log(user.state.name);
});

// later:
stop();
```

### Return `watch.STOP` from the callback

```ts
watch(UserCubit, (user) => {
  console.log(user.state.name);

  if (user.state.name === 'done') {
    return watch.STOP; // stops watching
  }
});
```

## Watching a named instance

Use `instance()` to watch a specific named instance:

```ts
import { watch, instance } from '@blac/core';

const stop = watch(instance(UserCubit, 'user-123'), (user) => {
  console.log(user.state.name);
});
```

## When to use watch

| Scenario                                             | Use       |
| ---------------------------------------------------- | --------- |
| React component needs state                          | `useBloc` |
| Non-React side effects (logging, analytics, syncing) | `watch`   |
| Test assertions on state changes                     | `watch`   |
| Connecting BlaC to non-React UI                      | `watch`   |

## watch vs subscribe

`subscribe` on a state container fires on **every** state change. `watch` only fires when properties your callback actually reads have changed. This makes `watch` more efficient for selective observation.

```ts
// subscribe: fires on ANY state change
const unsub = ensure(UserCubit).subscribe((state) => {
  console.log(state.name);
});

// watch: fires only when accessed properties change
const stop = watch(UserCubit, (user) => {
  console.log(user.state.name); // only re-runs when 'name' changes
});
```

See also: [tracked](/core/tracked), [Patterns & Recipes](/guide/patterns), [API Reference](/api/core)

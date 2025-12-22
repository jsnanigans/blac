# watch

Reactively watch blocs for state changes outside of React. Automatically tracks state and getter accesses.

## Single Bloc

```typescript
import { watch } from '@blac/core';

const unwatch = watch(UserBloc, (userBloc) => {
  console.log(userBloc.state.name);
  console.log(userBloc.fullName); // getters tracked too
});

// Stop watching
unwatch();
```

## Multiple Blocs

Use `as const` for proper type inference:

```typescript
const unwatch = watch(
  [UserBloc, SettingsBloc] as const,
  ([userBloc, settingsBloc]) => {
    console.log(userBloc.state.name, settingsBloc.state.theme);
  },
);
```

## Specific Instance

Use `instance()` to target a specific instance ID:

```typescript
import { watch, instance } from '@blac/core';

const unwatch = watch(instance(UserBloc, 'user-123'), (userBloc) => {
  console.log(userBloc.state.name);
});
```

## Stop from Callback

Return `watch.STOP` to stop watching from within the callback:

```typescript
const unwatch = watch(UserBloc, (userBloc) => {
  console.log(userBloc.state.status);

  if (userBloc.state.status === 'complete') {
    return watch.STOP;
  }
});
```

## Mixed Instances

Combine default and specific instances:

```typescript
const unwatch = watch(
  [UserBloc, instance(ChatBloc, 'room-456')] as const,
  ([userBloc, chatBloc]) => {
    console.log(userBloc.state.name, chatBloc.state.messages.length);
  },
);
```

## Behavior

- Callback runs immediately on first call
- Re-runs when any tracked dependency changes
- Only properties accessed in the callback are tracked
- Automatically unsubscribes when `unwatch()` is called or `watch.STOP` is returned

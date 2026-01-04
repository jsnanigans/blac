# React Overview

Quick reference for BlaC React patterns.

## Hooks

| Hook             | Returns             | Use When                    |
| ---------------- | ------------------- | --------------------------- |
| `useBloc`        | `[state, instance]` | Need state and/or methods   |
| `useBlocActions` | `instance`          | Only need methods, no state |

```tsx
// State and methods
const [state, cubit] = useBloc(CounterCubit);

// Methods only (never re-renders)
const cubit = useBlocActions(CounterCubit);
```

## Instance Modes

| Mode             | Config                       | Behavior                           |
| ---------------- | ---------------------------- | ---------------------------------- |
| Shared (default) | None                         | One instance, all components share |
| Isolated         | `@blac({ isolated: true })`  | One instance per component         |
| Keep Alive       | `@blac({ keepAlive: true })` | Persists without consumers         |

```tsx
// Shared - all components share
class CounterCubit extends Cubit<State> {}

// Isolated - each component gets own instance
@blac({ isolated: true })
class FormCubit extends Cubit<State> {}

// Keep alive - persists after unmount
@blac({ keepAlive: true })
class AuthCubit extends Cubit<State> {}
```

## Tracking Modes

| Mode          | Config                       | Re-renders When            |
| ------------- | ---------------------------- | -------------------------- |
| Auto-tracking | Default                      | Accessed properties change |
| Manual        | `dependencies: (s) => [...]` | Dependency array changes   |
| None          | `autoTrack: false`           | Any state change           |

```tsx
// Auto-tracking (default)
const [state] = useBloc(UserCubit);
return <div>{state.name}</div>; // Tracks 'name'

// Manual dependencies
const [state] = useBloc(UserCubit, {
  dependencies: (s) => [s.name, s.email],
});

// No tracking
const [state] = useBloc(UserCubit, { autoTrack: false });
```

## Common Options

```tsx
useBloc(MyCubit, {
  props: { userId: '123' }, // Constructor args
  instanceId: 'main', // Named instance
  onMount: (c) => c.load(), // Mount callback
  onUnmount: (c) => c.cleanup(), // Unmount callback
});
```

## Best Practices

**DO:**

- Access only properties you render
- Use `useBlocActions` for action-only components
- Use getters for computed values
- Split large components

**DON'T:**

- Destructure entire state object
- Spread state as props `{...state}`
- Use `acquire()` in bloc methods (use `borrow()`)
- Subscribe to state you don't display

## Quick Links

- [useBloc Hook](/react/use-bloc) - Full hook documentation
- [useBlocActions](/react/use-bloc-actions) - Actions-only hook
- [Dependency Tracking](/react/dependency-tracking) - How tracking works
- [Shared vs Isolated](/react/shared-vs-isolated) - Instance patterns
- [Bloc Communication](/react/bloc-communication) - Cross-bloc patterns
- [Performance](/react/performance) - Optimization tips

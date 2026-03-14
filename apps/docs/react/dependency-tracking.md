# Dependency Tracking

BlaC uses dependency tracking to minimize re-renders. Instead of re-rendering on every state change, components only update when the specific properties they read have changed.

## The re-render problem

Without tracking, a component subscribed to a state container re-renders on **every** state change — even if the change is to a property the component doesn't use. For containers with many properties, this creates unnecessary work.

BlaC solves this with three tracking modes.

## Auto-tracking (default)

The state returned by `useBloc` is wrapped in a Proxy that records which properties your component reads during render.

```tsx
function UserAvatar() {
  const [state] = useBloc(UserCubit);
  return <img src={state.avatarUrl} />;
  // only 'avatarUrl' is tracked
  // changes to state.name, state.email, etc. won't trigger re-render
}
```

### How it works

1. On first render, the Proxy records every property access (`state.avatarUrl`)
2. On state change, BlaC compares only the tracked properties between old and new state
3. If none of the tracked properties changed, the component skips re-rendering
4. Tracking is updated on every render — if your component conditionally reads different properties, the tracked set adapts

### What gets tracked

- Direct property access: `state.name`
- Nested property access: `state.user.profile.name`
- Array access: `state.items[0]`, `state.items.length`
- Getter access on the bloc: `bloc.total`, `bloc.isEmpty`

### Limitations

- Only plain objects `{}` and arrays `[]` are proxied. Custom class instances inside your state are not deeply tracked.
- Conditional reads can cause missed updates:

```tsx
// Potential issue: 'email' is only tracked when showEmail is true
function UserInfo() {
  const [state] = useBloc(UserCubit);
  return (
    <div>
      <span>{state.name}</span>
      {state.showEmail && <span>{state.email}</span>}
    </div>
  );
}
```

This works correctly because `showEmail` is always read, and when it changes from `false` to `true`, the component re-renders and `email` gets tracked on that render.

## Manual dependencies

Provide an explicit dependency array. The component re-renders only when the shallow-compared values change.

```tsx
function CountOnly() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });
  return <span>{state.count}</span>;
}
```

The callback receives both state and the bloc instance:

```tsx
const [state, cart] = useBloc(CartCubit, {
  dependencies: (state, bloc) => [bloc.total, state.items.length],
});
```

### When to use

- Auto-tracking picks up too many properties and you want to narrow it down
- You need to depend on a computed value (getter) with specific inputs
- You want explicit control similar to React's `useMemo` dependency array

## No tracking

Disable tracking entirely. The component re-renders on **every** state change.

```tsx
function StateDebugger() {
  const [state] = useBloc(AppCubit, { autoTrack: false });
  return <pre>{JSON.stringify(state, null, 2)}</pre>;
}
```

### When to use

- Action-only components that don't display state (just call methods)
- Debug views that need to show the full state
- Components where you want to guarantee every update is reflected

```tsx
// action-only: doesn't read state, just calls methods
function CounterButtons() {
  const [, counter] = useBloc(CounterCubit, { autoTrack: false });
  return <button onClick={counter.increment}>+</button>;
}
```

## Choosing a mode

```
Start with auto-tracking (default)
    │
    ├─ Component only calls methods, never reads state?
    │   └─ Use autoTrack: false
    │
    ├─ Auto-tracking causes too many re-renders?
    │   └─ Use manual dependencies
    │
    └─ Otherwise: auto-tracking is fine
```

| Mode | Re-renders when | Best for |
|------|----------------|----------|
| Auto-tracking | Tracked properties change | Most components |
| Manual deps | Dependency values change | Computed conditions, narrowing |
| No tracking | Any state change | Action-only, debug views |

See also: [useBloc](/react/use-bloc), [Performance](/react/performance)

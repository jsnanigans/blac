# Dependency Tracking

`useBloc` supports three tracking modes:

- Auto-tracking (default): proxies track accessed state and getters.
- Manual dependencies: pass a selector to determine when to re-render.
- No tracking: re-render on any state change.

## Auto-tracking

```tsx
function UserCard() {
  const [state] = useBloc(UserCubit);
  return <span>{state.name}</span>;
}
```

## Manual dependencies

```tsx
function CountOnly() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });
  return <span>{state.count}</span>;
}
```

## No tracking

```tsx
function FullState() {
  const [state] = useBloc(CounterCubit, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

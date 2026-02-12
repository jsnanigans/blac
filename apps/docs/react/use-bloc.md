# useBloc Hook

`useBloc` connects a component to a BlaC state container with optimized re-renders.

```tsx
const [state, bloc, ref] = useBloc(MyBloc);
```

Return values:

- `state`: current snapshot of state
- `bloc`: proxied instance (call methods here)
- `ref`: internal component ref (advanced use cases)

## Tracking Modes

### Auto-tracking (default)

```tsx
function UserProfile() {
  const [state] = useBloc(UserBloc);
  return <h1>{state.name}</h1>;
}
```

### Manual dependencies

```tsx
function Counter() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });
  return <p>{state.count}</p>;
}
```

### No tracking

```tsx
function FullState() {
  const [state] = useBloc(MyBloc, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

## Options

```tsx
useBloc(MyBloc, {
  autoTrack: true,
  dependencies: (state, bloc) => [state.count, bloc],
  instanceId: 'editor-1',
  onMount: (bloc) => console.log('mounted', bloc),
  onUnmount: (bloc) => console.log('unmounted', bloc),
});
```

# Performance

BlaC optimizes re-renders by tracking accessed properties and getters. For best performance:

- Prefer auto-tracking for fine-grained updates.
- Use manual dependencies for computed render conditions.
- Split large components so each only reads the state it needs.

## Manual Dependencies

```tsx
function CountOnly() {
  const [state] = useBloc(CounterCubit, {
    dependencies: (state) => [state.count],
  });
  return <span>{state.count}</span>;
}
```

## No Tracking (Use Carefully)

```tsx
function FullState() {
  const [state] = useBloc(CounterCubit, { autoTrack: false });
  return <pre>{JSON.stringify(state)}</pre>;
}
```

## Split Components

```tsx
function Counter() {
  return (
    <>
      <CountLabel />
      <CountButtons />
    </>
  );
}

function CountLabel() {
  const [state] = useBloc(CounterCubit);
  return <span>{state.count}</span>;
}

function CountButtons() {
  const [, counter] = useBloc(CounterCubit, { autoTrack: false });
  return (
    <>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </>
  );
}
```

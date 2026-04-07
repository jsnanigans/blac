# useBloc

The `useBloc` hook connects a React component to a state container with optimized re-renders.

```tsx
const [state, bloc] = useBloc(CounterCubit);
```

## Signature

```ts
function useBloc<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): [state: ExtractState<T>, bloc: InstanceType<T>, ref: ComponentRef];
```

## Return values

| Index | Name    | Description                                                                                    |
| ----- | ------- | ---------------------------------------------------------------------------------------------- |
| 0     | `state` | Current state snapshot. In auto-tracking mode, this is a Proxy that records property access.   |
| 1     | `bloc`  | The Cubit instance. Call methods on it (`bloc.increment()`). Also proxied for getter tracking. |
| 2     | `ref`   | Internal component ref. Rarely needed outside of advanced use cases.                           |

Typically you destructure just the first two:

```tsx
const [state, counter] = useBloc(CounterCubit);
```

## Options

### `autoTrack`

**Type:** `boolean` — **Default:** `true`

Controls whether auto-tracking is enabled. Set to `false` to disable proxy-based tracking — the component re-renders on every state change.

```tsx
// action-only component — doesn't read state
const [, counter] = useBloc(CounterCubit, { autoTrack: false });
```

### `dependencies`

**Type:** `(state: S, bloc: T) => unknown[]`

Provide an explicit dependency array. The component re-renders only when the shallow-compared values change. Setting this disables auto-tracking.

```tsx
const [state] = useBloc(UserCubit, {
  dependencies: (state) => [state.name, state.email],
});
```

The function receives both state and the bloc instance, so you can depend on getters:

```tsx
const [state, cart] = useBloc(CartCubit, {
  dependencies: (state, bloc) => [bloc.total, state.items.length],
});
```

### `instanceId`

**Type:** `string | number`

Use a named instance instead of the default shared one. Components with the same `instanceId` share the same instance.

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

### `onMount`

**Type:** `(bloc: T) => void`

Called once when the component mounts with the bloc instance.

```tsx
const [state] = useBloc(DataCubit, {
  onMount: (bloc) => bloc.fetchData(),
});
```

### `onUnmount`

**Type:** `(bloc: T) => void`

Called when the component unmounts.

```tsx
const [state] = useBloc(StreamCubit, {
  onUnmount: (bloc) => bloc.disconnect(),
});
```

## Lifecycle

1. **Mount:** `acquire(BlocClass)` creates or retrieves the instance, incrementing the ref count
2. **Render:** `useSyncExternalStore` subscribes to state changes using the selected tracking mode
3. **Re-render:** Only triggered when tracked state properties or dependency values change
4. **Unmount:** `release(BlocClass)` decrements the ref count. At zero, the instance is disposed (unless `keepAlive`)

## Concurrent mode

`useBloc` is built on React's `useSyncExternalStore`, making it safe for concurrent features like Suspense and transitions. State reads are consistent within a single render.

See also: [Dependency Tracking](/react/dependency-tracking), [Performance](/react/performance)

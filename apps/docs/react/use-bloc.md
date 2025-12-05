# useBloc Hook

The main hook for using BlaC in React components.

## Signature

```typescript
function useBloc<C extends StateContainerConstructor>(
  BlocClass: C,
  options?: UseBlocOptions
): [State, Instance, ComponentRef]
```

**Returns:**
- `state` - Current state (tracked via Proxy)
- `instance` - The Cubit/Vertex instance
- `componentRef` - Internal reference (rarely needed)

## Basic Usage

```tsx
import { useBloc } from '@blac/react';

function Counter() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <span>{state.count}</span>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

## Options

### `props`

Pass constructor arguments to the Cubit/Vertex:

```tsx
class UserCubit extends Cubit<UserState, { userId: string }> {
  constructor(props?: { userId: string }) {
    super({ user: null });
    if (props?.userId) this.loadUser(props.userId);
  }
}

function UserProfile({ userId }: { userId: string }) {
  const [state] = useBloc(UserCubit, {
    props: { userId }
  });

  return <div>{state.user?.name}</div>;
}
```

Props are updated when they change (calls `updateProps()` internally).

### `instanceId`

Custom instance ID for named shared instances:

```tsx
// Both components share same instance via ID
function EditorA() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-123' });
  return <div>{state.content}</div>;
}

function EditorB() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-123' });
  return <div>{state.content}</div>; // Same content as EditorA
}

// Different ID = different instance
function EditorC() {
  const [state] = useBloc(DocumentCubit, { instanceId: 'doc-456' });
  return <div>{state.content}</div>; // Different content
}
```

### `dependencies`

Manual dependency tracking (overrides auto-tracking):

```tsx
const [state] = useBloc(UserCubit, {
  dependencies: (state, cubit) => [state.name, state.email]
});

// Only re-renders when name or email changes
// Other state changes ignored
```

Use when:
- Auto-tracking isn't detecting changes correctly
- You need explicit control over re-renders
- Optimizing for specific access patterns

### `autoTrack`

Disable automatic dependency tracking:

```tsx
const [state] = useBloc(UserCubit, {
  autoTrack: false
});

// Re-renders on ANY state change
```

Also disabled when `dependencies` is provided.

### `disableGetterCache`

Disable getter value caching (advanced):

```tsx
const [, cubit] = useBloc(TodoCubit, {
  disableGetterCache: true
});

// Getters recompute on every access instead of once per render
```

### `onMount`

Called when component mounts:

```tsx
const [state, cubit] = useBloc(DataCubit, {
  onMount: (cubit) => {
    cubit.fetchData();
  }
});
```

### `onUnmount`

Called when component unmounts:

```tsx
const [state, cubit] = useBloc(DataCubit, {
  onUnmount: (cubit) => {
    cubit.cleanup();
  }
});
```

## Options Summary

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `props` | `object` | - | Constructor arguments |
| `instanceId` | `string \| number` | - | Named shared instance |
| `dependencies` | `(state, bloc) => any[]` | - | Manual tracking |
| `autoTrack` | `boolean` | `true` | Enable auto-tracking |
| `disableGetterCache` | `boolean` | `false` | Disable getter caching |
| `onMount` | `(bloc) => void` | - | Mount callback |
| `onUnmount` | `(bloc) => void` | - | Unmount callback |

## Examples

### Fetch on Mount

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [state, cubit] = useBloc(UserCubit, {
    props: { userId },
    onMount: (cubit) => cubit.loadProfile()
  });

  if (state.isLoading) return <Spinner />;
  if (state.error) return <Error message={state.error} />;

  return <Profile user={state.user} />;
}
```

### Form with Isolated Instance

```tsx
function ContactForm() {
  const [state, form] = useBloc(FormCubit);

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
      <input
        value={state.values.email}
        onChange={(e) => form.setField('email', e.target.value)}
      />
      {state.errors.email && <span>{state.errors.email}</span>}
      <button disabled={state.isSubmitting}>Submit</button>
    </form>
  );
}
```

### Computed Values via Getters

```tsx
function TodoList() {
  const [, cubit] = useBloc(TodoCubit);

  // Getters are automatically tracked
  return (
    <div>
      <h2>Active: {cubit.activeCount}</h2>
      <ul>
        {cubit.visibleTodos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

## See Also

- [useBlocActions](/react/use-bloc-actions) - Actions-only hook
- [Dependency Tracking](/react/dependency-tracking) - How tracking works
- [Performance](/react/performance) - Optimization tips

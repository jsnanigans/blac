# useBlocActions Hook

Use when you only need to call methods without subscribing to state.

## Signature

```typescript
function useBlocActions<C extends StateContainerConstructor>(
  BlocClass: C,
  options?: UseBlocActionsOptions
): Instance
```

**Returns:** The Cubit/Vertex instance (no state tuple).

## Why Use It

`useBlocActions` has zero state subscription overhead:

- No Proxy wrapping
- No dependency tracking
- Never re-renders from state changes
- Lighter weight than `useBloc`

## Basic Usage

```tsx
import { useBlocActions } from '@blac/react';

function ResetButton() {
  const cubit = useBlocActions(CounterCubit);

  // This component NEVER re-renders from CounterCubit state changes
  return <button onClick={cubit.reset}>Reset</button>;
}
```

Compare with `useBloc`:

```tsx
// ❌ Wasteful - subscribes to state but never uses it
function ResetButton() {
  const [_, cubit] = useBloc(CounterCubit);
  return <button onClick={cubit.reset}>Reset</button>;
}

// ✅ Efficient - no subscription
function ResetButton() {
  const cubit = useBlocActions(CounterCubit);
  return <button onClick={cubit.reset}>Reset</button>;
}
```

::: warning Getters Are Not Reactive
Since `useBlocActions` has no state subscription, **getters will not trigger re-renders** when their underlying state changes:

```tsx
function MyComponent() {
  const cubit = useBlocActions(TodoCubit);

  // ❌ This only shows the INITIAL value
  // Changes to visibleTodos will NOT cause re-render
  return <div>{cubit.visibleTodos.length} items</div>;
}
```

If you need to display state or reactive getters, use `useBloc` instead:

```tsx
function MyComponent() {
  const [, cubit] = useBloc(TodoCubit);

  // ✅ Re-renders when visibleTodos changes
  return <div>{cubit.visibleTodos.length} items</div>;
}
```
:::

## Options

### `props`

Pass constructor arguments:

```tsx
const cubit = useBlocActions(UserCubit, {
  props: { userId: '123' }
});
```

### `instanceId`

Named shared instance:

```tsx
const cubit = useBlocActions(DocumentCubit, {
  instanceId: 'doc-123'
});
```

### `onMount`

Called when component mounts:

```tsx
const cubit = useBlocActions(DataCubit, {
  onMount: (cubit) => cubit.initialize()
});
```

### `onUnmount`

Called when component unmounts:

```tsx
const cubit = useBlocActions(DataCubit, {
  onUnmount: (cubit) => cubit.cleanup()
});
```

## Options Summary

| Option | Type | Description |
|--------|------|-------------|
| `props` | `object` | Constructor arguments |
| `instanceId` | `string \| number` | Named shared instance |
| `onMount` | `(bloc) => void` | Mount callback |
| `onUnmount` | `(bloc) => void` | Unmount callback |

Note: No `dependencies`, `autoTrack`, or `disableGetterCache` options since there's no state tracking.

## When to Use

Use `useBlocActions` when:

- Component only calls methods (buttons, controls)
- Component doesn't display any state
- You want to minimize re-renders

Use `useBloc` when:

- Component displays state
- Component needs to react to state changes

## Examples

### Action Buttons

```tsx
function TodoActions() {
  const cubit = useBlocActions(TodoCubit);

  return (
    <div>
      <button onClick={() => cubit.addTodo('New task')}>Add</button>
      <button onClick={cubit.clearCompleted}>Clear Done</button>
      <button onClick={cubit.toggleAll}>Toggle All</button>
    </div>
  );
}
```

### Form Submit Handler

```tsx
function SubmitButton() {
  const form = useBlocActions(FormCubit);

  return (
    <button onClick={form.submit}>
      Submit
    </button>
  );
}

// State displayed in separate component
function FormStatus() {
  const [state] = useBloc(FormCubit);
  return state.isSubmitting ? <Spinner /> : null;
}
```

### Navigation Actions

```tsx
function NavButtons() {
  const router = useBlocActions(RouterCubit);

  return (
    <nav>
      <button onClick={() => router.navigate('/home')}>Home</button>
      <button onClick={() => router.navigate('/about')}>About</button>
      <button onClick={router.goBack}>Back</button>
    </nav>
  );
}
```

### Split Display and Actions

```tsx
// Pattern: Split into display and action components
function TodoApp() {
  return (
    <>
      <TodoList />      {/* Uses useBloc - displays state */}
      <TodoActions />   {/* Uses useBlocActions - only calls methods */}
    </>
  );
}

function TodoList() {
  const [state] = useBloc(TodoCubit);
  return (
    <ul>
      {state.todos.map(todo => <TodoItem key={todo.id} {...todo} />)}
    </ul>
  );
}

function TodoActions() {
  const cubit = useBlocActions(TodoCubit);
  return <button onClick={() => cubit.addTodo('New')}>Add</button>;
}
```

## See Also

- [useBloc Hook](/react/use-bloc) - Main hook with state
- [Performance](/react/performance) - Optimization patterns

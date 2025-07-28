# React Hooks

This section provides a concise reference for BlaC's React hooks. For detailed API documentation, see the [Hooks API Reference](/api/react/hooks).

## Available Hooks

### useBloc

Connect components to state containers:

```typescript
const [state, cubit] = useBloc(CounterCubit);
```

With options:
```typescript
const [state, cubit] = useBloc(UserCubit, {
  id: 'user-123',          // Custom instance ID
  props: { userId: '123' }, // Constructor props
  deps: [userId]           // Re-create on change
});
```

### useValue

Get state without the instance:

```typescript
const count = useValue(CounterCubit);
const { todos, filter } = useValue(TodoCubit);
```

### createBloc

Create a Cubit with setState API:

```typescript
const FormBloc = createBloc({
  name: '',
  email: '',
  isValid: false
});

class FormManager extends FormBloc {
  updateField = (field: string, value: string) => {
    this.setState({ [field]: value });
  };
}
```

## Quick Examples

### Counter

```typescript
function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  
  return (
    <button onClick={cubit.increment}>
      Count: {count}
    </button>
  );
}
```

### Todo List

```typescript
function TodoList() {
  const [{ todos, isLoading }, cubit] = useBloc(TodoCubit);
  
  if (isLoading) return <Loading />;
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => cubit.toggle(todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

### Form

```typescript
function LoginForm() {
  const [state, form] = useBloc(LoginFormCubit);
  
  return (
    <form onSubmit={e => { e.preventDefault(); form.submit(); }}>
      <input
        type="email"
        value={state.email}
        onChange={e => form.setEmail(e.target.value)}
      />
      <button disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Performance Tips

1. **Automatic Optimization**: Components only re-render when accessed properties change
2. **Multiple Instances**: Use `id` option for independent instances
3. **Memoization**: Use `useMemo` for expensive computations
4. **Isolation**: Set `static isolated = true` for component-specific state

## Common Patterns

### Custom Hooks

```typescript
function useAuth() {
  const [state, bloc] = useBloc(AuthBloc);
  
  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    login: bloc.login,
    logout: bloc.logout
  };
}
```

### Conditional Rendering

```typescript
function UserProfile() {
  const [state] = useBloc(UserCubit);
  
  if (state.isLoading) return <Skeleton />;
  if (state.error) return <Error message={state.error} />;
  if (!state.user) return <NotFound />;
  
  return <Profile user={state.user} />;
}
```

### Effects

```typescript
function DataLoader({ id }: { id: string }) {
  const [state, cubit] = useBloc(DataCubit);
  
  useEffect(() => {
    cubit.load(id);
  }, [id, cubit]);
  
  return <DataView data={state.data} />;
}
```

## See Also

- [Hooks API Reference](/api/react/hooks) - Complete API documentation
- [React Patterns](/react/patterns) - Advanced patterns and best practices
- [Getting Started](/getting-started/first-cubit) - Basic usage tutorial
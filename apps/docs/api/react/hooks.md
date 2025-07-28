# React Hooks API

BlaC provides a set of React hooks that seamlessly integrate state management into your components. These hooks handle subscription, optimization, and lifecycle management automatically.

## useBloc

The primary hook for connecting React components to BlaC state containers.

### Signature

```typescript
function useBloc<T extends BlocBase<any, any>>(
  BlocClass: BlocConstructor<T>,
  options?: UseBlocOptions<T>
): [StateType<T>, T]
```

### Type Parameters

- `T` - The Cubit or Bloc class type

### Parameters

- `BlocClass` - The constructor of your Cubit or Bloc class
- `options` - Optional configuration object

### Options

```typescript
interface UseBlocOptions<T> {
  // Unique identifier for the instance
  id?: string;
  
  // Props to pass to the constructor
  props?: PropsType<T>;
  
  // Disable automatic render optimization
  disableProxyTracking?: boolean;
  
  // Dependencies array (similar to useEffect)
  deps?: React.DependencyList;
}
```

### Returns

Returns a tuple `[state, instance]`:
- `state` - The current state (with automatic dependency tracking)
- `instance` - The Cubit/Bloc instance

### Basic Usage

```typescript
import { useBloc } from '@blac/react';
import { CounterCubit } from './CounterCubit';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

### With Object State

```typescript
function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);
  
  return (
    <div>
      <h2>Todos ({state.items.length})</h2>
      {state.isLoading && <p>Loading...</p>}
      {state.items.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
```

### Multiple Instances

Use the `id` option to create separate instances:

```typescript
function Dashboard() {
  const [user1] = useBloc(UserCubit, { id: 'user-1' });
  const [user2] = useBloc(UserCubit, { id: 'user-2' });
  
  return (
    <div>
      <UserCard user={user1} />
      <UserCard user={user2} />
    </div>
  );
}
```

### With Props

Pass initialization props to your state container:

```typescript
interface TodoListProps {
  userId: string;
  filter?: 'all' | 'active' | 'completed';
}

function TodoList({ userId, filter = 'all' }: TodoListProps) {
  const [state, cubit] = useBloc(TodoCubit, {
    id: `todos-${userId}`,
    props: { userId, initialFilter: filter }
  });
  
  return <div>{/* ... */}</div>;
}
```

### Dependency Tracking

By default, useBloc uses proxy-based dependency tracking for optimal re-renders:

```typescript
function OptimizedComponent() {
  const [state] = useBloc(LargeStateCubit);
  
  // Only re-renders when state.specificField changes
  return <div>{state.specificField}</div>;
}
```

Disable if needed:

```typescript
const [state] = useBloc(CubitClass, { 
  disableProxyTracking: true // Re-renders on any state change
});
```

### With Dependencies

Re-create the instance when dependencies change:

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [state, cubit] = useBloc(UserCubit, {
    id: `user-${userId}`,
    props: { userId },
    deps: [userId] // Re-create when userId changes
  });
  
  return <div>{state.user?.name}</div>;
}
```

## useValue

A simplified hook for subscribing to a specific value without accessing the instance.

### Signature

```typescript
function useValue<T extends BlocBase<any, any>>(
  BlocClass: BlocConstructor<T>,
  options?: UseValueOptions<T>
): StateType<T>
```

### Parameters

- `BlocClass` - The Cubit or Bloc class constructor
- `options` - Same as `UseBlocOptions` but without instance-related options

### Returns

The current state value

### Usage

```typescript
function CountDisplay() {
  const count = useValue(CounterCubit);
  return <span>Count: {count}</span>;
}

function TodoCount() {
  const state = useValue(TodoCubit);
  return <span>Todos: {state.items.length}</span>;
}
```

## createBloc

Creates a Cubit-like class with a simplified API similar to React's setState.

### Signature

```typescript
function createBloc<S extends object>(
  initialState: S | (() => S)
): BlocConstructor<SetStateCubit<S>>
```

### Parameters

- `initialState` - Initial state object or factory function

### Returns

A Cubit class with `setState` method

### Usage

```typescript
// Define the state container
const CounterBloc = createBloc({
  count: 0,
  step: 1
});

// Extend with custom methods
class Counter extends CounterBloc {
  increment = () => {
    this.setState({ count: this.state.count + this.state.step });
  };
  
  setStep = (step: number) => {
    this.setState({ step });
  };
}

// Use in component
function CounterComponent() {
  const [state, counter] = useBloc(Counter);
  
  return (
    <div>
      <p>Count: {state.count} (step: {state.step})</p>
      <button onClick={counter.increment}>+</button>
      <input 
        type="number" 
        value={state.step}
        onChange={e => counter.setStep(Number(e.target.value))}
      />
    </div>
  );
}
```

### setState API

The `setState` method works like React's class component setState:

```typescript
// Replace entire state
setState({ count: 5, step: 1 });

// Merge with current state (most common)
setState({ count: 10 }); // step remains unchanged

// Function update
setState(prevState => ({
  count: prevState.count + 1
}));

// Async function update
setState(async (prevState) => {
  const data = await fetchData();
  return { ...prevState, data };
});
```

## Hook Patterns

### Conditional Usage

```typescript
function ConditionalComponent({ showCounter }: { showCounter: boolean }) {
  // ✅ Correct - always call hooks
  const [count, cubit] = useBloc(CounterCubit);
  
  if (!showCounter) {
    return null;
  }
  
  return <div>Count: {count}</div>;
}

// ❌ Wrong - conditional hook call
function BadComponent({ showCounter }: { showCounter: boolean }) {
  if (showCounter) {
    const [count] = useBloc(CounterCubit); // Error!
    return <div>Count: {count}</div>;
  }
  return null;
}
```

### Custom Hooks

Create custom hooks for complex logic:

```typescript
function useAuth() {
  const [state, bloc] = useBloc(AuthBloc);
  
  const login = useCallback(
    (email: string, password: string) => {
      bloc.login(email, password);
    },
    [bloc]
  );
  
  const logout = useCallback(() => {
    bloc.logout();
  }, [bloc]);
  
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout
  };
}

// Usage
function LoginButton() {
  const { isAuthenticated, login, logout } = useAuth();
  
  if (isAuthenticated) {
    return <button onClick={logout}>Logout</button>;
  }
  
  return <button onClick={() => login('user@example.com', 'password')}>Login</button>;
}
```

### Combining Multiple States

```typescript
function useAppState() {
  const [auth] = useBloc(AuthBloc);
  const [todos] = useBloc(TodoBloc);
  const [settings] = useBloc(SettingsBloc);
  
  return {
    isReady: auth.isAuthenticated && !todos.isLoading,
    isDarkMode: settings.theme === 'dark',
    userName: auth.user?.name
  };
}
```

## Performance Optimization

### Automatic Optimization

BlaC automatically optimizes re-renders by tracking which state properties your component uses:

```typescript
function UserCard() {
  const [state] = useBloc(UserBloc);
  
  // Only re-renders when state.user.name changes
  // Changes to other properties don't trigger re-renders
  return <h2>{state.user.name}</h2>;
}
```

### Manual Optimization

For fine-grained control, use React's built-in optimization:

```typescript
const MemoizedTodoItem = React.memo(({ todo }: { todo: Todo }) => {
  const [, cubit] = useBloc(TodoCubit);
  
  return (
    <div>
      <span>{todo.text}</span>
      <button onClick={() => cubit.toggle(todo.id)}>Toggle</button>
    </div>
  );
});
```

### Selector Pattern

For complex derived state:

```typescript
function TodoStats() {
  const [state] = useBloc(TodoCubit);
  
  // Memoize expensive computations
  const stats = useMemo(() => ({
    total: state.items.length,
    completed: state.items.filter(t => t.completed).length,
    active: state.items.filter(t => !t.completed).length
  }), [state.items]);
  
  return (
    <div>
      Total: {stats.total} | 
      Active: {stats.active} | 
      Completed: {stats.completed}
    </div>
  );
}
```

## TypeScript Support

### Type Inference

BlaC hooks provide full type inference:

```typescript
// State type is inferred
const [count, cubit] = useBloc(CounterCubit);
// count: number
// cubit: CounterCubit

// With complex state
const [state, bloc] = useBloc(TodoBloc);
// state: TodoState
// bloc: TodoBloc
```

### Generic Constraints

```typescript
// Custom hook with generic constraints
function useGenericBloc<T extends BlocBase<any, any>>(
  BlocClass: BlocConstructor<T>
) {
  return useBloc(BlocClass);
}
```

### Typing Props

```typescript
interface UserCubitProps {
  userId: string;
  initialData?: User;
}

class UserCubit extends Cubit<UserState, UserCubitProps> {
  constructor(props: UserCubitProps) {
    super({ user: props.initialData || null });
  }
}

// Props are type-checked
const [state] = useBloc(UserCubit, {
  props: { 
    userId: '123',
    // initialData is optional
  }
});
```

## Common Patterns

### Loading States

```typescript
function DataComponent() {
  const [state, cubit] = useBloc(DataCubit);
  
  useEffect(() => {
    cubit.load();
  }, [cubit]);
  
  if (state.isLoading) return <Spinner />;
  if (state.error) return <Error message={state.error} />;
  if (!state.data) return <Empty />;
  
  return <DataView data={state.data} />;
}
```

### Form Handling

```typescript
function LoginForm() {
  const [state, cubit] = useBloc(LoginFormCubit);
  
  return (
    <form onSubmit={e => { e.preventDefault(); cubit.submit(); }}>
      <input
        type="email"
        value={state.email.value}
        onChange={e => cubit.setEmail(e.target.value)}
        className={state.email.error ? 'error' : ''}
      />
      {state.email.error && <span>{state.email.error}</span>}
      
      <button type="submit" disabled={!cubit.isValid || state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Real-time Updates

```typescript
function LiveData() {
  const [state, cubit] = useBloc(LiveDataCubit);
  
  useEffect(() => {
    // Subscribe to updates
    const unsubscribe = cubit.subscribe();
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [cubit]);
  
  return <div>Live value: {state.value}</div>;
}
```

## Troubleshooting

### Instance Not Updating

If your component doesn't update when state changes:

1. Check that methods use arrow functions
2. Verify you're not mutating state
3. Ensure you're calling emit/patch correctly

```typescript
// ❌ Wrong
class BadCubit extends Cubit<State> {
  update() { // Regular method loses 'this'
    this.state.value = 5; // Mutating state
  }
}

// ✅ Correct
class GoodCubit extends Cubit<State> {
  update = () => { // Arrow function
    this.emit({ ...this.state, value: 5 }); // New state
  };
}
```

### Memory Leaks

BlaC automatically handles cleanup, but be careful with:

```typescript
function Component() {
  const [, cubit] = useBloc(TimerCubit);
  
  useEffect(() => {
    const timer = setInterval(() => {
      cubit.tick();
    }, 1000);
    
    // Important: cleanup
    return () => clearInterval(timer);
  }, [cubit]);
}
```

### Testing Components

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useBloc } from '@blac/react';

test('useBloc hook', () => {
  const { result } = renderHook(() => useBloc(CounterCubit));
  
  const [count, cubit] = result.current;
  expect(count).toBe(0);
  
  act(() => {
    cubit.increment();
  });
  
  expect(result.current[0]).toBe(1);
});
```

## See Also

- [Instance Management](/concepts/instance-management) - How instances are managed
- [React Patterns](/react/patterns) - Best practices and patterns
- [Cubit API](/api/core/cubit) - Cubit class reference
- [Bloc API](/api/core/bloc) - Bloc class reference
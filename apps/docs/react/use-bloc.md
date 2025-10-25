# useBloc Hook

The `useBloc` hook is the primary way to integrate BlaC state management in React components.

## Signature

```typescript
function useBloc<TState, TBloc extends BlocBase<TState>, TSelected = TState>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TState, TBloc, TSelected>
): [TSelected, TBloc];
```

## Basic Usage

```tsx
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter-cubit';

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

## Options

### selector

Select a subset of the state to minimize re-renders:

```tsx
function UserName() {
  const [name, userBloc] = useBloc(UserBloc, {
    selector: (state) => state.user?.name,
  });

  // Only re-renders when user.name changes
  return <div>{name}</div>;
}
```

**Selector with multiple fields:**

```tsx
function UserCard() {
  const [userData, userBloc] = useBloc(UserBloc, {
    selector: (state) => ({
      name: state.user?.name,
      email: state.user?.email,
      avatar: state.user?.avatar,
    }),
  });

  return (
    <div>
      <img src={userData.avatar} />
      <h2>{userData.name}</h2>
      <p>{userData.email}</p>
    </div>
  );
}
```

**Selector signature:**

```typescript
type Selector<TState, TSelected> = (
  currentState: TState,
  previousState: TState | undefined,
  instance: TBloc
) => TSelected;
```

### equals

Custom equality function for change detection:

```tsx
function UserList() {
  const [users, bloc] = useBloc(UserBloc, {
    selector: (state) => state.users,
    equals: (a, b) => {
      // Custom deep equality check
      return JSON.stringify(a) === JSON.stringify(b);
    },
  });

  return <ul>{users.map(user => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

Default equality uses `Object.is()`.

### onMount

Callback executed when the component mounts:

```tsx
function DataLoader() {
  const [data, bloc] = useBloc(DataBloc, {
    onMount: (bloc) => {
      console.log('Component mounted');
      bloc.fetchData();
    },
  });

  return <div>{data}</div>;
}
```

### onUnmount

Callback executed when the component unmounts:

```tsx
function DataLoader() {
  const [data, bloc] = useBloc(DataBloc, {
    onUnmount: (bloc) => {
      console.log('Component unmounting');
      bloc.cleanup();
    },
  });

  return <div>{data}</div>;
}
```

### props

Pass props to the Bloc constructor:

```typescript
class UserProfileBloc extends Cubit<UserProfile> {
  constructor(private userId: string) {
    super(null);
  }

  loadProfile = async () => {
    const profile = await api.fetchUser(this.userId);
    this.emit(profile);
  };
}
```

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [profile, bloc] = useBloc(UserProfileBloc, {
    props: { userId },
    onMount: (bloc) => bloc.loadProfile(),
  });

  return <div>{profile?.name}</div>;
}
```

## Return Value

The hook returns a tuple:

```typescript
[selectedState, blocInstance];
```

- **selectedState**: The current state (or selected subset)
- **blocInstance**: The Bloc/Cubit instance with all methods

## Performance Optimization

### Use Selectors

Always use selectors to avoid unnecessary re-renders:

```tsx
// ❌ Bad - re-renders on any state change
const [state, bloc] = useBloc(LargeStateBloc);
return <div>{state.user.name}</div>;

// ✅ Good - only re-renders when user.name changes
const [userName, bloc] = useBloc(LargeStateBloc, {
  selector: (state) => state.user.name,
});
return <div>{userName}</div>;
```

### Memoize Selectors

For expensive computations:

```tsx
import { useMemo } from 'react';

function CartTotal() {
  const selector = useMemo(
    () => (state: CartState) => state.items.reduce((sum, item) => sum + item.price, 0),
    []
  );

  const [total] = useBloc(CartBloc, { selector });

  return <div>Total: ${total}</div>;
}
```

### Custom Equality

Use custom equality for complex objects:

```tsx
function ProductList() {
  const [products, bloc] = useBloc(ProductBloc, {
    selector: (state) => state.products,
    equals: (a, b) => {
      // Only re-render if product IDs or count changed
      return (
        a.length === b.length &&
        a.every((product, i) => product.id === b[i]?.id)
      );
    },
  });

  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

## Instance Management

### Shared Instances (Default)

By default, all components share the same instance:

```tsx
function ComponentA() {
  const [count] = useBloc(CounterCubit);
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(CounterCubit);
  return <div>B: {count}</div>; // Same instance as ComponentA
}
```

### Isolated Instances

Each component gets its own instance:

```typescript
class IsolatedCounter extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }
  increment = () => this.emit(this.state + 1);
}
```

```tsx
function ComponentA() {
  const [count] = useBloc(IsolatedCounter);
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(IsolatedCounter);
  return <div>B: {count}</div>; // Different instance from ComponentA
}
```

### Persistent Instances

Keep instance alive even without consumers:

```typescript
class PersistentCubit extends Cubit<number> {
  static keepAlive = true;

  constructor() {
    super(0);
  }
}
```

## React 18 Features

### Concurrent Rendering

`useBloc` is fully compatible with React 18 concurrent features:

```tsx
import { useTransition } from 'react';

function SearchResults() {
  const [isPending, startTransition] = useTransition();
  const [results, searchBloc] = useBloc(SearchBloc, {
    selector: (state) => state.results,
  });

  const handleSearch = (query: string) => {
    startTransition(() => {
      searchBloc.search(query);
    });
  };

  return (
    <div>
      {isPending && <div>Searching...</div>}
      <ul>{results.map(r => <li key={r.id}>{r.title}</li>)}</ul>
    </div>
  );
}
```

### useDeferredValue

```tsx
import { useDeferredValue } from 'react';

function FilteredList() {
  const [items] = useBloc(ItemsBloc);
  const deferredItems = useDeferredValue(items);

  return <List items={deferredItems} />;
}
```

## Common Patterns

### Loading States

```tsx
function DataDisplay() {
  const [state, bloc] = useBloc(DataBloc, {
    onMount: (bloc) => bloc.loadData(),
  });

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <Error error={state.error} />;
  if (state.status === 'success') return <Content data={state.data} />;

  return null;
}
```

### Form Handling

```tsx
function LoginForm() {
  const [state, authBloc] = useBloc(AuthBloc);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authBloc.login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button disabled={state.isLoading}>
        {state.isLoading ? 'Logging in...' : 'Login'}
      </button>
      {state.error && <div className="error">{state.error}</div>}
    </form>
  );
}
```

### Pagination

```tsx
function PaginatedList() {
  const [currentPage, paginationBloc] = useBloc(PaginationBloc, {
    selector: (state) => state.currentPage,
  });

  const [items, itemsBloc] = useBloc(ItemsBloc, {
    selector: (state) => state.items.slice(
      (currentPage - 1) * 10,
      currentPage * 10
    ),
  });

  return (
    <div>
      <ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>
      <button onClick={() => paginationBloc.previousPage()}>Previous</button>
      <button onClick={() => paginationBloc.nextPage()}>Next</button>
    </div>
  );
}
```

## TypeScript Tips

### Type Inference

TypeScript automatically infers types:

```tsx
const [count, cubit] = useBloc(CounterCubit);
// count: number
// cubit: CounterCubit
```

### Explicit Types

You can provide explicit types if needed:

```tsx
const [state, bloc] = useBloc<UserState, UserBloc>(UserBloc);
```

### Generic Blocs

For generic Bloc classes:

```tsx
class DataBloc<T> extends Cubit<DataState<T>> {
  // ...
}

// Specify the type parameter
const [state, bloc] = useBloc(DataBloc<User>);
```

## Next Steps

- Learn about [Selectors](/react/selectors) in detail
- Explore [Lifecycle Callbacks](/react/lifecycle)
- Understand [Performance Optimization](/react/performance)
- Review [Instance Management](/react/isolated-instances)

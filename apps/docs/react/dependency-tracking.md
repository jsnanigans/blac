# Dependency Tracking

BlaC uses Proxy-based tracking to detect which state properties you access during render, then only re-renders when those properties change.

## How It Works

1. **During render**: State is wrapped in a Proxy that records property access
2. **After render**: Tracked properties are saved
3. **On state change**: Only tracked properties are compared
4. **Re-render**: Only if tracked properties changed

```tsx
function UserCard() {
  const [user] = useBloc(UserCubit);

  // Proxy records: accessed 'name' and 'avatar'
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
}

// Later: user.email changes → No re-render (not tracked)
// Later: user.name changes → Re-render (tracked)
```

## State Property Tracking

Access only what you render:

```tsx
// ✅ Optimal - tracks only accessed properties
function UserName() {
  const [user] = useBloc(UserCubit);
  return <span>{user.name}</span>; // Only tracks 'name'
}

// ✅ Nested access works
function UserAvatar() {
  const [user] = useBloc(UserCubit);
  return <img src={user.profile.avatar} />; // Tracks 'profile.avatar'
}

// ✅ Conditional access
function UserStatus() {
  const [user] = useBloc(UserCubit);
  return user.isOnline ? <span>Online</span> : null; // Tracks 'isOnline'
}
```

### What to Avoid

```tsx
// ❌ Destructuring tracks all destructured properties
function Bad() {
  const [user] = useBloc(UserCubit);
  const { name, email, bio, settings } = user; // Tracks ALL of these
  return <span>{name}</span>; // Even though only name is rendered
}

// ❌ Spreading defeats tracking
function Bad() {
  const [user] = useBloc(UserCubit);
  return <UserCard {...user} />; // Tracks everything
}

// ❌ Array iteration tracks the array
function Bad() {
  const [state] = useBloc(TodoCubit);
  const texts = state.todos.map((t) => t.text); // Tracks 'todos'
  return <span>{texts.join(', ')}</span>;
}
```

## Getter Tracking

Getters on Cubit/Vertex classes are automatically tracked:

```tsx
class TodoCubit extends Cubit<TodoState> {
  get visibleTodos() {
    return this.state.filter === 'active'
      ? this.state.todos.filter((t) => !t.done)
      : this.state.todos;
  }

  get activeCount() {
    return this.state.todos.filter((t) => !t.done).length;
  }
}

function TodoList() {
  const [, cubit] = useBloc(TodoCubit);

  // Getter values are tracked
  // Re-renders when visibleTodos result changes
  return (
    <ul>
      {cubit.visibleTodos.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### Getter Caching

Getters are cached per render cycle:

```tsx
function TodoStats() {
  const [, cubit] = useBloc(TodoCubit);

  // Same getter accessed multiple times = computed once
  return (
    <div>
      <span>Count: {cubit.visibleTodos.length}</span>
      <span>Empty: {cubit.visibleTodos.length === 0}</span>
    </div>
  );
}
```

## Cross-Bloc Dependencies

Getters can access other blocs. Dependencies are automatically tracked:

```tsx
import { borrow } from '@blac/core';

class CartCubit extends Cubit<CartState> {
  get totalWithShipping() {
    // borrow() in getter = auto-tracked
    const shipping = borrow(ShippingCubit);
    return this.itemTotal + shipping.state.cost;
  }
}

function CheckoutTotal() {
  const [, cart] = useBloc(CartCubit);

  // Re-renders when the result of `totalWithShipping` changes,
  // Blac will check for changes when state on CartCubit OR ShippingCubit changes
  return <span>Total: ${cart.totalWithShipping}</span>;
}
```

Use `borrow()`, `borrowSafe()`, or `ensure()` in getters. Never `acquire()` (causes memory leaks).

## Tracking Modes

### Auto-Tracking (Default)

```tsx
const [state] = useBloc(UserCubit);
// Automatically tracks accessed properties
```

### Manual Dependencies

Override auto-tracking with explicit list:

```tsx
const [state] = useBloc(UserCubit, {
  dependencies: (state, cubit) => [state.name, state.email],
});
// Only re-renders when name or email changes
```

### No Tracking

Disable tracking entirely:

```tsx
const [state] = useBloc(UserCubit, {
  autoTrack: false,
});
// Re-renders on ANY state change
```

## Comparison

| Mode                | Re-renders When            | Use When                     |
| ------------------- | -------------------------- | ---------------------------- |
| Auto-tracking       | Accessed properties change | Most cases                   |
| Manual dependencies | Dependency array changes   | Known patterns, optimization |
| No tracking         | Any state change           | Simple state, debugging      |

## Debugging

If a component isn't re-rendering as expected:

1. Check you're accessing state during render, not before
2. Avoid destructuring more than needed
3. Try `autoTrack: false` to verify state is changing
4. Check for nested object reference changes

```tsx
// Debug: log what's being tracked
const [state] = useBloc(UserCubit, {
  dependencies: (state) => {
    console.log('Tracking:', state);
    return [state.name]; // Manual tracking for debugging
  },
});
```

## See Also

- [Performance](/react/performance) - Optimization patterns
- [useBloc Hook](/react/use-bloc) - Complete options reference

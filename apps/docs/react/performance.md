# Performance

Optimize BlaC applications for best performance.

## Key Principles

1. **Access only what you render** - Proxy tracking records property access
2. **Use getters for computed values** - Cached per render cycle
3. **Use `useBlocActions` for action-only components** - No subscription overhead
4. **Split large components** - Smaller components re-render independently

## Optimal Property Access

```tsx
// ✅ OPTIMAL: Access only rendered properties
function UserCard() {
  const [user] = useBloc(UserCubit);
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
  // Only tracks 'avatar' and 'name'
  // Changes to email, bio won't trigger re-render
}

// ❌ AVOID: Destructuring tracks all destructured
function UserCard() {
  const [user] = useBloc(UserCubit);
  const { name, email, avatar, bio } = user;
  return <h2>{name}</h2>;
  // Tracks ALL four properties even though only name is rendered
}

// ❌ AVOID: Spreading defeats tracking
function UserCard() {
  const [user] = useBloc(UserCubit);
  return <Profile {...user} />;
  // Tracks everything!
}
```

## Nested Access

```tsx
// ✅ Direct nested access works
function UserAvatar() {
  const [user] = useBloc(UserCubit);
  return <img src={user.profile.avatar} />;
  // Tracks 'profile.avatar'
}

// ✅ Conditional access
function UserStatus() {
  const [user] = useBloc(UserCubit);
  return user.isOnline ? <span>Online</span> : null;
  // Tracks 'isOnline'
}

// ✅ Array index access
function FirstTodo() {
  const [state] = useBloc(TodoCubit);
  return <div>{state.todos[0]?.text}</div>;
  // Tracks todos[0]
}
```

## Computed Values with Getters

```tsx
class TodoCubit extends Cubit<TodoState> {
  // Getter computed once per render (cached)
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

  // Multiple accesses = one computation
  return (
    <div>
      <h2>{cubit.visibleTodos.length} visible</h2>
      <ul>
        {cubit.visibleTodos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Action-Only Components

```tsx
// ✅ OPTIMAL: No state subscription
function TodoActions() {
  const cubit = useBlocActions(TodoCubit);

  return (
    <div>
      <button onClick={() => cubit.addTodo('New')}>Add</button>
      <button onClick={cubit.clearCompleted}>Clear</button>
    </div>
  );
  // Never re-renders from TodoCubit state changes
}

// ❌ WASTEFUL: Subscribes but never uses state
function TodoActions() {
  const [_, cubit] = useBloc(TodoCubit);
  return <button onClick={cubit.addTodo}>Add</button>;
}
```

## Component Splitting

```tsx
// ✅ OPTIMAL: Split into focused components
function TodoApp() {
  return (
    <>
      <TodoCount />    {/* Re-renders on count change */}
      <TodoList />     {/* Re-renders on todos change */}
      <TodoFilter />   {/* Re-renders on filter change */}
      <TodoActions />  {/* Never re-renders */}
    </>
  );
}

function TodoCount() {
  const [, cubit] = useBloc(TodoCubit);
  return <span>Active: {cubit.activeCount}</span>;
}

function TodoList() {
  const [, cubit] = useBloc(TodoCubit);
  return <ul>{cubit.visibleTodos.map(...)}</ul>;
}

function TodoFilter() {
  const [state, cubit] = useBloc(TodoCubit);
  return (
    <select value={state.filter} onChange={e => cubit.setFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
    </select>
  );
}

function TodoActions() {
  const cubit = useBlocActions(TodoCubit);
  return <button onClick={() => cubit.addTodo('New')}>Add</button>;
}

// ❌ AVOID: One big component
function TodoApp() {
  const [state, cubit] = useBloc(TodoCubit);
  return (
    <div>
      <span>{cubit.activeCount}</span>
      <ul>{cubit.visibleTodos.map(...)}</ul>
      <select value={state.filter} onChange={...} />
      <button onClick={cubit.addTodo}>Add</button>
    </div>
  );
  // Entire component re-renders on ANY state change
}
```

## Memory-Efficient Patterns

```tsx
// ✅ Use .get() in bloc-to-bloc (no ref count)
class UserCubit extends Cubit<UserState> {
  loadProfile = () => {
    const analytics = AnalyticsCubit.get(); // Borrow
    analytics.trackEvent('profile_loaded');
    // No cleanup needed
  };
}

// ✅ Use .forEach() for large instance sets
function cleanupStaleSessions() {
  // Memory efficient, safe to dispose during iteration
  UserSessionCubit.forEach((session) => {
    if (session.state.isStale) {
      UserSessionCubit.release(session.instanceId);
    }
  });
}

// ❌ Avoid .getAll() for large sets
const sessions = UserSessionCubit.getAll(); // Creates array copy
```

## Manual Dependencies

When you know exactly what to track:

```tsx
// Override auto-tracking for specific cases
const [state] = useBloc(UserCubit, {
  dependencies: (state) => [state.name, state.email],
});

// Ignore internal tracking data
const [state] = useBloc(AnalyticsCubit, {
  dependencies: (state) => [state.displayMetrics],
});

// Custom re-render logic for complex cases
const [state] = useBloc(AnalyticsCubit, {
  dependencies: (state) => [state.dataPoints.length],
});

// use a getter in the dependencies
const [state] = useBloc(AnalyticsCubit, {
  dependencies: (state, bloc) => [bloc.computedValue],
});
```

## Performance Summary

| Pattern                 | Re-renders When            | Use When                |
| ----------------------- | -------------------------- | ----------------------- |
| Auto-tracking (default) | Accessed properties change | Most cases              |
| `useBlocActions`        | Never                      | Action-only components  |
| Manual `dependencies`   | Dependency array changes   | Known patterns          |
| `autoTrack: false`      | Any state change           | Simple state, debugging |
| Getters                 | Computed value changes     | Derived state           |

## Common Mistakes

| Mistake                         | Impact                    | Fix                 |
| ------------------------------- | ------------------------- | ------------------- |
| Destructuring state             | Tracks all destructured   | Access directly     |
| Spreading props `{...state}`    | Tracks everything         | Pass specific props |
| `.resolve()` in methods         | Memory leaks              | Use `.get()`        |
| Not using `useBlocActions`      | Unnecessary subscriptions | Split components    |
| Single large component          | Over-rendering            | Split into smaller  |
| Array iteration for single item | Tracks whole array        | Use index access    |

## See Also

- [Dependency Tracking](/react/dependency-tracking) - How tracking works
- [useBloc Hook](/react/use-bloc) - Hook options
- [useBlocActions](/react/use-bloc-actions) - Actions-only hook

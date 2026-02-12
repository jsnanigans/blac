---
name: blac-development
description: Develop with BlaC state management library for React. Use when creating Cubits, using the useBloc hook, managing state containers, or implementing inter-bloc communication patterns.
---

# BlaC Development Skill

BlaC is a TypeScript state management library with React integration using proxy-based dependency tracking for optimal re-renders.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Core Concepts

### Cubit - Simple State Container

Use Cubit for direct state mutations without events. Best for most use cases.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }); // initial state (must be an object)
  }

  // IMPORTANT: Always use arrow functions for React compatibility
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };
}
```

**State Update Methods:**
- `emit(newState)` - Emit new state directly
- `update(fn)` - Update with function `(current) => next`
- `patch(partial)` - Shallow merge partial state (object state only)

### Class Configuration with `@blac()` Decorator

```typescript
import { blac, Cubit } from '@blac/core';

// Isolated: Each component gets its own instance
@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {}

// KeepAlive: Never auto-dispose when ref count reaches 0
@blac({ keepAlive: true })
class AuthBloc extends Cubit<AuthState> {}

// Exclude from DevTools (prevents infinite loops)
@blac({ excludeFromDevTools: true })
class InternalBloc extends Cubit<State> {}

// Function syntax (no decorator support)
const MyBloc = blac({ isolated: true })(class extends Cubit<State> {});
```

**Note:** `BlacOptions` is a union type - only ONE option can be specified at a time.

## React Integration

### useBloc Hook - Automatic Dependency Tracking

```typescript
import { useBloc } from '@blac/react';

function Counter() {
  const [state, cubit] = useBloc(CounterCubit);

  // Only re-renders when accessed properties change
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

**Returns:** `[state, blocInstance, componentRef]`

### useBloc Options

```typescript
const [state, bloc] = useBloc(MyBloc, {
  instanceId: 'main',                  // Custom instance ID for shared blocs
  dependencies: (state, bloc) => [state.count], // Manual dependency tracking
  autoTrack: false,                    // Disable automatic tracking
  onMount: (bloc) => bloc.fetchData(), // Lifecycle callbacks
  onUnmount: (bloc) => bloc.cleanup(),
});
```

### Actions-Only Components (No State Subscription)

```typescript
import { useBloc } from '@blac/react';

function ActionsOnly() {
  const [, bloc] = useBloc(CounterBloc);

  // Avoid reading state to keep renders minimal
  return <button onClick={bloc.increment}>+</button>;
}
```

## Instance Management

### Registry Helpers

| Function | Purpose | Ref Count |
|----------|---------|-----------|
| `acquire(BlocClass, instanceKey?)` | Get/create with ownership | Increments |
| `release(BlocClass, instanceKey?)` | Release ownership | Decrements |
| `ensure(BlocClass, instanceKey?)` | Get/create without ownership | No change |
| `borrow(BlocClass, instanceKey?)` | Borrow existing (throws if missing) | No change |
| `borrowSafe(BlocClass, instanceKey?)` | Borrow existing (returns error) | No change |

### Bloc-to-Bloc Communication

**In event handlers or methods (no ownership):**
```typescript
import { ensure } from '@blac/core';

class UserBloc extends Cubit<UserState> {
  loadProfile = () => {
    // No ownership - no cleanup needed
    const analytics = ensure(AnalyticsCubit);
    analytics.trackEvent('profile_loaded');
  };
}
```

**In getters (automatic tracking):**
```typescript
import { ensure } from '@blac/core';

class CartCubit extends Cubit<CartState> {
  get totalWithShipping(): number {
    const shipping = ensure(ShippingCubit); // Auto-tracked!
    return this.itemTotal + shipping.state.cost;
  }
}
```

### System Events

```typescript
class MyBloc extends Cubit<State> {
  constructor() {
    super(initialState);

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      console.log('State changed');
    });

    this.onSystemEvent('dispose', () => {
      console.log('Disposing - cleanup here');
    });
  }
}
```

## Best Practices

### DO:
- Use arrow functions for methods (correct `this` binding in React)
- Keep state immutable (create new objects/arrays)
- Use `patch()` for simple field updates, `update()` for nested changes
- For action-only components, call `useBloc` and avoid reading state
- Use getters for computed values (cached per render cycle)
- Use `ensure()` or `borrow()` for bloc-to-bloc communication

### DON'T:
- Mutate state directly (`this.state.todos.push(...)`)
- Destructure entire state when you only need specific properties
- Use `acquire()` without a matching `release()`
- Use `patch()` for nested object updates (shallow merge only)

## Common Patterns

### Form State (Isolated)
```typescript
@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {
  constructor() {
    super({ values: {}, errors: {}, isSubmitting: false });
  }

  setField = (field: string, value: string) => {
    this.update(state => ({
      ...state,
      values: { ...state.values, [field]: value },
      errors: { ...state.errors, [field]: '' }
    }));
  };
}
```

### Async Data Fetching
```typescript
class UserBloc extends Cubit<DataState<User>> {
  constructor() {
    super({ data: null, isLoading: false, error: null });
  }

  fetchUser = async (id: string) => {
    this.patch({ isLoading: true, error: null });
    try {
      const data = await api.getUser(id);
      this.patch({ data, isLoading: false });
    } catch (error) {
      this.patch({ error: error.message, isLoading: false });
    }
  };
}
```

### Shared Singleton Service
```typescript
@blac({ keepAlive: true })
class AnalyticsService extends Cubit<AnalyticsState> {
  trackEvent = (name: string, data: Record<string, any>) => {
    // Other blocs can safely call: ensure(AnalyticsService).trackEvent(...)
  };
}
```

## Troubleshooting

**Component not re-rendering?**
- Access state properties during render, not before
- Check you're using `useBloc`, not just reading `bloc.state`

**Too many re-renders?**
- Access only the properties you need
- Don't destructure entire state object
- Consider manual `dependencies` or `autoTrack: false` for coarse updates

**Shared state not working?**
- Check if bloc is marked `@blac({ isolated: true })`
- Verify same `instanceId` if using custom IDs

## Performance Optimization

### Optimal Property Access

```typescript
// ✅ OPTIMAL: Access only what you render
function UserCard() {
  const [user] = useBloc(UserBloc);
  return <h2>{user.name}</h2>; // Only tracks 'name'
}

// ❌ AVOID: Destructuring tracks everything
const { name, email, bio } = user; // Re-renders on ANY change
```

### Component Splitting

```typescript
// ✅ Split into granular components
function TodoApp() {
  return (
    <>
      <TodoCount />    {/* Only re-renders on count change */}
      <TodoList />     {/* Only re-renders on todos change */}
      <TodoActions />  {/* Avoids state reads */}
    </>
  );
}

function TodoActions() {
  const [, cubit] = useBloc(TodoCubit); // Avoid reading state
  return <button onClick={cubit.addTodo}>Add</button>;
}
```

### Performance Summary

| Pattern | Re-renders | Use When |
|---------|------------|----------|
| Auto-tracking (default) | On tracked property change | Most cases |
| Action-only (no state reads) | Never | Buttons/handlers |
| Manual `dependencies` | On dependency change | Known fixed dependencies |
| Getters | On computed value change | Derived/computed state |

### Common Mistakes

1. **Destructuring state** - Tracks all destructured properties
2. **Spreading props** - `<Child {...state} />` defeats tracking
3. **Using `acquire()` without `release()`** - Use `ensure()`/`borrow()` for one-off access
4. **Reading extra state** - Avoid unnecessary property access in render

For complete API reference, see [REFERENCE.md](REFERENCE.md).

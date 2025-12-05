---
name: blac-development
description: Develop with BlaC state management library for React. Use when creating Cubits, Vertices, using useBloc/useBlocActions hooks, managing state containers, or implementing inter-bloc communication patterns.
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

### Vertex - Event-Driven State Container

Use Vertex for event-driven architectures with explicit state transitions.

```typescript
import { Vertex } from '@blac/core';

// Define events as discriminated union
type CounterEvent =
  | { type: 'increment'; amount: number }
  | { type: 'decrement' };

class CounterVertex extends Vertex<{ count: number }, CounterEvent> {
  constructor() {
    super({ count: 0 });

    // TypeScript enforces exhaustive handling - all event types must be handled
    this.createHandlers({
      increment: (event, emit) => {
        emit({ count: this.state.count + event.amount });
      },
      decrement: (_, emit) => {
        emit({ count: this.state.count - 1 });
      },
    });
  }

  // Convenience methods
  increment = (amount = 1) => this.add({ type: 'increment', amount });
  decrement = () => this.add({ type: 'decrement' });
}
```

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
  props: { userId: '123' },           // Constructor arguments
  instanceId: 'main',                  // Custom instance ID for shared blocs
  dependencies: (state, bloc) => [state.count], // Manual dependency tracking
  autoTrack: false,                    // Disable automatic tracking
  disableGetterCache: false,           // Disable getter value caching (advanced)
  onMount: (bloc) => bloc.fetchData(), // Lifecycle callbacks
  onUnmount: (bloc) => bloc.cleanup(),
});
```

### useBlocActions Hook - Actions Only (No State Subscription)

```typescript
import { useBlocActions } from '@blac/react';

function ActionsOnly() {
  const bloc = useBlocActions(CounterBloc);

  // Never re-renders due to state changes
  return <button onClick={bloc.increment}>+</button>;
}
```

## Instance Management

### Static Methods

| Method | Purpose | Ref Count |
|--------|---------|-----------|
| `.resolve(id?, ...args)` | Get/create with ownership | Increments |
| `.get(id?)` | Borrow existing (throws if missing) | No change |
| `.getSafe(id?)` | Borrow existing (returns error) | No change |
| `.connect(id?, ...args)` | Get/create for B2B communication | No change |
| `.release(id?, force?)` | Release reference | Decrements |

### Bloc-to-Bloc Communication

**In event handlers or methods (borrowing):**
```typescript
class UserBloc extends Cubit<UserState> {
  loadProfile = () => {
    // Borrow - no memory leak, no cleanup needed
    const analytics = AnalyticsCubit.get();
    analytics.trackEvent('profile_loaded');
  };
}
```

**In getters (automatic tracking):**
```typescript
class CartCubit extends Cubit<CartState> {
  get totalWithShipping(): number {
    const shipping = ShippingCubit.get(); // Auto-tracked!
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

    this.onSystemEvent('propsUpdated', ({ props, previousProps }) => {
      console.log('Props updated');
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
- Use `useBlocActions` when only calling methods (no state reading)
- Use getters for computed values (cached per render cycle)
- Use `.get()` instead of `.resolve()` in bloc-to-bloc communication

### DON'T:
- Mutate state directly (`this.state.todos.push(...)`)
- Destructure entire state when you only need specific properties
- Use `.resolve()` in getters (causes memory leaks)
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
    // Other blocs can safely call: AnalyticsService.get().trackEvent(...)
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
- Consider `useBlocActions` for action-only components

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
      <TodoActions />  {/* Never re-renders (uses useBlocActions) */}
    </>
  );
}

function TodoActions() {
  const cubit = useBlocActions(TodoCubit); // No state subscription
  return <button onClick={cubit.addTodo}>Add</button>;
}
```

### Performance Summary

| Pattern | Re-renders | Use When |
|---------|------------|----------|
| Auto-tracking (default) | On tracked property change | Most cases |
| `useBlocActions` | Never | Action-only components |
| Manual `dependencies` | On dependency change | Known fixed dependencies |
| Getters | On computed value change | Derived/computed state |

### Common Mistakes

1. **Destructuring state** - Tracks all destructured properties
2. **Spreading props** - `<Child {...state} />` defeats tracking
3. **Using `.resolve()` in methods** - Use `.get()` for bloc-to-bloc calls
4. **Not using `useBlocActions`** - Creates unnecessary subscriptions

For complete API reference, see [REFERENCE.md](REFERENCE.md).

# Instance Management

BlaC provides standalone functions for managing instances. Import them from `@blac/core`:

```typescript
import {
  acquire,
  borrow,
  borrowSafe,
  ensure,
  release,
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  clear,
  clearAll,
  getStats,
} from '@blac/core';
```

## Instance Access Functions

### `acquire(Class, id?, options?)` - Ownership

Get or create an instance. Increments reference count.

```typescript
// Get or create default instance
const counter = acquire(CounterCubit);

// Named instance
const mainCounter = acquire(CounterCubit, 'main');

// With constructor arguments
const user = acquire(UserCubit, 'user-123', { props: { userId: '123' } });

// Must release when done
release(CounterCubit);
release(CounterCubit, 'main');
```

**Use when:**

- React components need instances (handled internally by `useBloc`)
- You want the instance to stay alive during usage
- You need ownership semantics

### `borrow(Class, id?)` - Borrowing (Strict)

Get existing instance. Does NOT increment ref count. Throws if not found.

```typescript
// Borrow existing instance
const counter = borrow(CounterCubit);
counter.increment();
// No release needed - we're borrowing

// Throws if instance doesn't exist
const missing = borrow(MissingCubit); // Error!
```

**Use when:**

- Bloc-to-bloc communication
- You know the instance exists
- You don't want to affect lifecycle

### `borrowSafe(Class, id?)` - Borrowing (Safe)

Get existing instance. Returns result object instead of throwing.

```typescript
const result = borrowSafe(NotificationCubit, 'user-123');

if (result.error) {
  console.log('Not found:', result.error.message);
  return;
}

// TypeScript knows instance exists after check
result.instance.markAsRead();
```

**Use when:**

- Instance might not exist
- You want type-safe error handling
- Conditional access patterns

### `ensure(Class, id?)` - Get or Create (B2B)

Get existing OR create new instance. Does NOT increment ref count.

```typescript
class StatsCubit extends Cubit<StatsState> {
  get totalWithBonus() {
    // Ensures AnalyticsCubit exists, doesn't own it
    const analytics = ensure(AnalyticsCubit);
    return this.state.total + analytics.state.bonus;
  }
}
```

**Use when:**

- B2B communication where instance might not exist
- Lazily creating shared instances
- You need instance but don't want ownership

**Cannot use with isolated blocs** - throws error.

### `release(Class, id?, force?)` - Release Ownership

Release a reference. Disposes when ref count reaches 0.

```typescript
// Release default instance
release(CounterCubit);

// Release named instance
release(CounterCubit, 'main');

// Force dispose (ignores ref count and keepAlive)
release(CounterCubit, 'main', true);
```

## Comparison Table

| Function       | Creates? | Ref Count | On Missing    |
| -------------- | -------- | --------- | ------------- |
| `acquire()`    | Yes      | +1        | Creates       |
| `borrow()`     | No       | No change | Throws        |
| `borrowSafe()` | No       | No change | Returns error |
| `ensure()`     | Yes      | No change | Creates       |
| `release()`    | No       | -1        | No-op         |

## Utility Functions

```typescript
// Check if instance exists
const exists = hasInstance(CounterCubit, 'main');

// Get reference count
const refCount = getRefCount(CounterCubit, 'main');

// Get all instances (returns array)
const allCounters = getAll(CounterCubit);

// Iterate safely (disposal-safe, memory-efficient)
forEach(CounterCubit, (instance) => {
  console.log(instance.state);
});

// Clear all instances of a type
clear(CounterCubit);

// Clear everything (mainly for testing)
clearAll();

// Get registry statistics
const stats = getStats();
// { registeredTypes: 5, totalInstances: 12, typeBreakdown: { ... } }
```

### `getAll()` vs `forEach()`

**`getAll()`** - Returns array, good for small sets:

```typescript
const sessions = getAll(UserSessionCubit);
const active = sessions.filter((s) => s.state.isActive);
```

**`forEach()`** - Callback, good for large sets or disposal during iteration:

```typescript
// Memory efficient, safe to dispose during iteration
forEach(UserSessionCubit, (session) => {
  if (session.state.isStale) {
    release(UserSessionCubit, session.instanceId);
  }
});
```

## Common Patterns

### Bloc-to-Bloc Communication

```typescript
class UserCubit extends Cubit<UserState> {
  loadProfile = async () => {
    const data = await api.getProfile();
    this.patch({ profile: data });

    // Borrow analytics - no memory leak
    const analytics = borrow(AnalyticsCubit);
    analytics.trackEvent('profile_loaded');
  };
}
```

### Getter with Cross-Bloc Dependency

```typescript
class CartCubit extends Cubit<CartState> {
  get totalWithShipping() {
    const shipping = borrow(ShippingCubit); // Auto-tracked in React
    return this.itemTotal + shipping.state.cost;
  }
}
```

### Cleanup on Dispose

```typescript
class AppCubit extends Cubit<AppState> {
  // Own a dependency
  notificationCubit = acquire(NotificationCubit);

  constructor() {
    super(initialState);

    // Release on dispose
    this.onSystemEvent('dispose', () => {
      release(NotificationCubit);
    });
  }
}
```

## See Also

- [Configuration](/core/configuration) - `@blac()` decorator options
- [Bloc Communication](/react/bloc-communication) - Communication patterns
- [System Events](/core/system-events) - Lifecycle events

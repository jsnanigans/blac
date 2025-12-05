# Instance Management

All state containers have static methods for managing instances.

## Instance Access Methods

### `.resolve(id?, ...args)` - Ownership

Get or create an instance. Increments reference count.

```typescript
// Get or create default instance
const counter = CounterCubit.resolve();

// Named instance
const mainCounter = CounterCubit.resolve('main');

// With constructor arguments
const user = UserCubit.resolve('user-123', { userId: '123' });

// Must release when done
CounterCubit.release();
CounterCubit.release('main');
```

**Use when:**
- React components need instances (handled internally by `useBloc`)
- You want the instance to stay alive during usage
- You need ownership semantics

### `.get(id?)` - Borrowing (Strict)

Get existing instance. Does NOT increment ref count. Throws if not found.

```typescript
// Borrow existing instance
const counter = CounterCubit.get();
counter.increment();
// No release needed - we're borrowing

// Throws if instance doesn't exist
const missing = MissingCubit.get(); // Error!
```

**Use when:**
- Bloc-to-bloc communication
- You know the instance exists
- You don't want to affect lifecycle

### `.getSafe(id?)` - Borrowing (Safe)

Get existing instance. Returns result object instead of throwing.

```typescript
const result = NotificationCubit.getSafe('user-123');

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

### `.connect(id?, ...args)` - Get or Create (B2B)

Get existing OR create new instance. Does NOT increment ref count.

```typescript
class StatsCubit extends Cubit<StatsState> {
  get totalWithBonus() {
    // Ensures AnalyticsCubit exists, doesn't own it
    const analytics = AnalyticsCubit.connect();
    return this.state.total + analytics.state.bonus;
  }
}
```

**Use when:**
- B2B communication where instance might not exist
- Lazily creating shared instances
- You need instance but don't want ownership

**Cannot use with isolated blocs** - throws error.

### `.release(id?, force?)` - Release Ownership

Release a reference. Disposes when ref count reaches 0.

```typescript
// Release default instance
CounterCubit.release();

// Release named instance
CounterCubit.release('main');

// Force dispose (ignores ref count and keepAlive)
CounterCubit.release('main', true);
```

## Comparison Table

| Method | Creates? | Ref Count | On Missing |
|--------|----------|-----------|------------|
| `.resolve()` | Yes | +1 | Creates |
| `.get()` | No | No change | Throws |
| `.getSafe()` | No | No change | Returns error |
| `.connect()` | Yes | No change | Creates |
| `.release()` | No | -1 | No-op |

## Utility Methods

```typescript
// Check if instance exists
const exists = CounterCubit.hasInstance('main');

// Get reference count
const refCount = CounterCubit.getRefCount('main');

// Get all instances (returns array)
const allCounters = CounterCubit.getAll();

// Iterate safely (disposal-safe, memory-efficient)
CounterCubit.forEach((instance) => {
  console.log(instance.state);
});

// Clear all instances of a type
CounterCubit.clear();

// Clear everything (mainly for testing)
StateContainer.clearAllInstances();

// Get registry statistics
const stats = StateContainer.getStats();
// { registeredTypes: 5, totalInstances: 12, typeBreakdown: { ... } }
```

### `.getAll()` vs `.forEach()`

**`.getAll()`** - Returns array, good for small sets:
```typescript
const sessions = UserSessionCubit.getAll();
const active = sessions.filter(s => s.state.isActive);
```

**`.forEach()`** - Callback, good for large sets or disposal during iteration:
```typescript
// Memory efficient, safe to dispose during iteration
UserSessionCubit.forEach((session) => {
  if (session.state.isStale) {
    UserSessionCubit.release(session.instanceId);
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
    const analytics = AnalyticsCubit.get();
    analytics.trackEvent('profile_loaded');
  };
}
```

### Getter with Cross-Bloc Dependency

```typescript
class CartCubit extends Cubit<CartState> {
  get totalWithShipping() {
    const shipping = ShippingCubit.get(); // Auto-tracked in React
    return this.itemTotal + shipping.state.cost;
  }
}
```

### Cleanup on Dispose

```typescript
class AppCubit extends Cubit<AppState> {
  // Own a dependency
  notificationCubit = NotificationCubit.resolve();

  constructor() {
    super(initialState);

    // Release on dispose
    this.onSystemEvent('dispose', () => {
      NotificationCubit.release();
    });
  }
}
```

## See Also

- [Configuration](/core/configuration) - `@blac()` decorator options
- [Bloc Communication](/react/bloc-communication) - Communication patterns
- [System Events](/core/system-events) - Lifecycle events

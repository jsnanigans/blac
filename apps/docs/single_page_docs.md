# BlaC Documentation

TypeScript state management library with React integration. Uses proxy-based dependency tracking for optimal re-renders.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Core Package (@blac/core)

### StateContainer - Base State Management Class

The foundation for all state containers in BlaC. Provides state storage, subscriptions, and lifecycle management.

**Purpose**: Used internally as a base class for the [[Cubit]].

**Note:** Its not recommended to use the StateContainer directly; use a [[Cubit]], which extends the [[StateContainer]]

```typescript
import { StateContainer } from '@blac/core';

class CounterContainer extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 }); // initial state (must be an object)
  }

  // Methods use protected emit/update
  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}
```

**Core Properties:**

- `state` - Get current state (readonly)
- `isDisposed` - Check if disposed
- `name` - Debug name
- `debug` - Debug mode flag
- `instanceId` - Unique instance identifier
- `createdAt` - Timestamp when instance was created
- `lastUpdateTimestamp` - Timestamp of last state update

**Core Methods:**

- `subscribe(callback)` - Subscribe to state changes, returns unsubscribe function
- `dispose()` - Clean up the container

**Protected Methods** (for subclasses):

- `emit(newState)` - Emit new state directly (with change detection via `===`)
- `update(fn)` - Update state with function `(current) => next`
- `onSystemEvent(event, handler)` - Subscribe to system lifecycle events

**Configuration:**

Configuration is applied via `initConfig()` which is called automatically by the registry:

```typescript
interface StateContainerConfig {
  name?: string; // Debug name
  debug?: boolean; // Enable debug logging
  instanceId?: string; // Custom instance ID
}
```

**Class Configuration with `@blac()` Decorator:**

```typescript
import { blac, StateContainer } from '@blac/core';

// Isolated: Each component gets its own instance
@blac({ isolated: true })
class MyBloc extends StateContainer<State> {}

// KeepAlive: Never auto-dispose when ref count reaches 0
@blac({ keepAlive: true })
class MyBloc extends StateContainer<State> {}

// Exclude from DevTools (prevents infinite loops in DevTools UI)
@blac({ excludeFromDevTools: true })
class InternalBloc extends StateContainer<State> {}
```

**⚠️ Important:** `BlacOptions` is a **union type** - you can only specify ONE option at a time:

```typescript
// ✅ Valid - one option
@blac({ isolated: true })
@blac({ keepAlive: true })
@blac({ excludeFromDevTools: true })

// ❌ Invalid - cannot combine options
@blac({ isolated: true, keepAlive: true }) // TypeScript error!
```

**Function syntax** (for projects without decorator support):

```typescript
const MyBloc = blac({ isolated: true })(class extends StateContainer<State> {});
```

**System Events:**

StateContainer provides system events for lifecycle management. Use `onSystemEvent` to subscribe:

```typescript
class MyBloc extends StateContainer<State> {
  constructor() {
    super(initialState);

    // Subscribe to state changes
    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      console.log('State changed from', previousState, 'to', state);
    });

    // Subscribe to disposal
    this.onSystemEvent('dispose', () => {
      console.log('Bloc is being disposed');
    });
  }
}
```

Available system events:

- `stateChanged` - Fired after state changes, payload: `{ state, previousState }`
- `dispose` - Fired when dispose() is called, payload: `void`

---

### Cubit - Simple State Container

Extends `StateContainer` with **public** state mutation methods for direct state management.

**Purpose**: Use Cubit when you want simple, direct state mutations without events. The [[Cubit]] fits most use cases.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 }); // initial state (must be an object)
  }

  // ✅ IMPORTANT: Always use arrow functions for React compatibility
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };
}
```

**Public Methods:**

- `emit(newState)` - Emit new state directly
- `update(fn)` - Update with function `(current) => next`
- `patch(partial)` - Shallow merge partial state (object state only)
- All methods from StateContainer

**Using patch() for Object State:**

The `patch()` method provides convenient partial updates for object state:

```typescript
interface UserState {
  name: string;
  age: number;
  email: string;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ name: '', age: 0, email: '' });
  }

  // ✅ DO: Use patch for single field updates
  setName = (name: string) => {
    this.patch({ name });
  };

  // ✅ DO: Use patch for multiple field updates
  updateProfile = (name: string, age: number) => {
    this.patch({ name, age });
  };
}
```

**⚠️ IMPORTANT**: `patch()` performs **shallow merge only**:

```typescript
interface AppState {
  user: { name: string; email: string };
  settings: { theme: string; language: string };
}

class AppCubit extends Cubit<AppState> {
  updateTheme = (theme: string) => {
    // ✅ DO: Use update for nested changes
    this.update((state) => ({
      ...state,
      settings: { ...state.settings, theme },
    }));

    // ❌ DON'T: This replaces entire settings object
    // this.patch({ settings: { theme } });
  };
}
```

**Computed Properties (Getters):**

Cubits can have getter methods that are automatically tracked by React hooks:

```typescript
class TodoCubit extends Cubit<TodoState> {
  // Computed getter - automatically tracked by useBloc
  get visibleTodos() {
    return this.state.filter === 'active'
      ? this.state.todos.filter((t) => !t.done)
      : this.state.todos;
  }

  get activeTodoCount() {
    return this.state.todos.filter((t) => !t.done).length;
  }

  get fullInventory(): boolean {
    return this.state.length > 50;
  }
}
```

---

### Instance Management Functions

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
} from '@blac/core';
```

#### `acquire()` - Ownership Semantics (Instance Resolution)

Get or create an instance with ref counting. Used when you "own" the instance lifetime.

```typescript
// Get or create shared instance (increments ref count)
const counter = acquire(CounterCubit);
const named = acquire(CounterCubit, 'main');

// Release reference (disposes when ref count reaches zero)
release(CounterCubit);
release(CounterCubit, 'main');

// Force dispose (ignores ref count and keepAlive)
release(CounterCubit, 'main', true);
```

**Use `acquire()` when:**

- React components need to manage instance lifetime (used internally by `useBloc`)
- You want to ensure the instance stays alive during usage
- You need ownership semantics with automatic cleanup

#### `borrow()` - Borrowing Semantics (Strict)

Get an existing instance WITHOUT incrementing ref count. Throws if instance doesn't exist.

```typescript
// Borrow existing instance (no ref count change)
const counter = borrow(CounterCubit, 'main');
counter.increment();
// No release() needed - we're just borrowing!

// Throws error if instance doesn't exist:
// [BlaC] CounterCubit instance "main" not found.
// Use acquire() to create and claim ownership, or borrowSafe() for conditional access.
```

**Use `borrow()` when:**

- Bloc-to-bloc communication (calling methods on other blocs)
- Event handlers where component already owns the instance via `acquire()`
- Accessing keepAlive singleton instances
- You know the instance exists and is being managed elsewhere

**Common pattern - Prevents memory leaks:**

```typescript
class UserBloc extends Cubit<UserState> {
  loadProfile = () => {
    // ✅ Just borrow - no memory leak!
    const analytics = borrow(AnalyticsCubit, 'main');
    analytics.trackEvent('profile_loaded');
    // No release() needed
  };
}
```

#### `borrowSafe()` - Borrowing Semantics (Safe)

Get an existing instance WITHOUT incrementing ref count. Returns discriminated union instead of throwing.

```typescript
// Safe borrowing with error handling
const result = borrowSafe(NotificationCubit, 'user-123');

if (result.error) {
  console.log('Instance not found:', result.error.message);
  return null;
}

// TypeScript knows instance is non-null after check
result.instance.markAsRead();
```

**Use `borrowSafe()` when:**

- Instance existence is conditional/uncertain
- You want type-safe error handling without try/catch
- Checking if another component has created an instance
- **Note:** Like `borrow()`, this function tracks cross-bloc dependencies when used in getters

#### `ensure()` - Get or Create (B2B Communication)

Get existing instance OR create it if it doesn't exist, without incrementing ref count. Ideal for bloc-to-bloc communication when you need to ensure an instance exists.

```typescript
class StatsCubit extends Cubit<StatsState> {
  get totalWithAnalytics() {
    // ✅ Ensures AnalyticsCubit exists, doesn't increment ref count
    const analytics = ensure(AnalyticsCubit);
    return this.state.total + analytics.state.bonus;
  }
}

// In another bloc, access the auto-created instance
class DashboardCubit extends Cubit<DashboardState> {
  loadData = () => {
    // AnalyticsCubit already exists from ensure() call
    const analytics = borrow(AnalyticsCubit);
    analytics.trackEvent('dashboard_loaded');
  };
}
```

**Use `ensure()` when:**

- B2B communication where the instance might not exist yet
- You want to lazily create shared instances on first access
- You need to ensure an instance exists without claiming ownership
- Accessing services/utilities that should exist but aren't tied to specific components
- **Note:** Always tracks cross-bloc dependencies when used in getters

**⚠️ Important:** Cannot use `ensure()` with isolated blocs (throws error).

**Comparison:**

- **`borrow()`**: Borrow existing (throws if missing) - use when you know it exists
- **`borrowSafe()`**: Borrow existing (returns error) - use for conditional access
- **`ensure()`**: Get or create (no ref count change) - use to ensure existence
- **`acquire()`**: Get or create (increments ref count) - use in components for ownership

#### Other Instance Functions

```typescript
// Check if instance exists
const exists = hasInstance(CounterCubit, 'main');

// Get reference count
const refCount = getRefCount(CounterCubit, 'main');

// Get all instances of a type (returns array)
const allCounters = getAll(CounterCubit);

// Iterate over all instances safely (disposal-safe, memory-efficient)
forEach(CounterCubit, (instance) => {
  console.log(instance.state);
});

// Clear all instances of a type
clear(CounterCubit);

// Clear all instances from all types (mainly for testing)
clearAll();
```

**`getAll()` vs `forEach()`:**

Both functions let you access all instances of a type, but with different trade-offs:

**`getAll()`** - Returns an array of all instances

```typescript
const allSessions = getAll(UserSessionBloc);
const activeSessions = allSessions.filter((s) => s.state.isActive);
```

**Use `getAll()` when:**

- You need array operations (filter, map, reduce)
- Working with small numbers of instances (<100)
- You need to iterate multiple times

**`forEach(callback)`** - Iterates with a callback function

```typescript
// Broadcast to all sessions
forEach(UserSessionBloc, (session) => {
  session.notify('Server maintenance in 5 minutes');
});

// Cleanup stale sessions (disposal-safe!)
forEach(UserSessionBloc, (session) => {
  if (session.state.lastActivity < threshold) {
    release(UserSessionBloc, session.instanceId); // Safe during iteration
  }
});
```

**Use `forEach()` when:**

- Working with large numbers of instances (100+) - more memory efficient
- You might dispose instances during iteration (automatically skips disposed)
- You only need to iterate once
- You want built-in error handling (catches callback errors without stopping)

---

## React Package (@blac/react)

### useBloc Hook - Automatic Dependency Tracking

React hook with **automatic proxy-based dependency tracking** for optimal re-renders.

**Basic Usage:**

```typescript
import { useBloc } from '@blac/react';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);

  // Only re-renders when 'count' changes
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

**Returns:** `[state, blocInstance, componentRef]`

- `state` - Current state (may be a Proxy for tracking)
- `blocInstance` - The bloc instance with all methods (may be a Proxy for getter tracking)
- `componentRef` - Internal reference (rarely needed)

---

### Automatic Dependency Tracking

useBloc uses **Proxy** to track which properties you access during render:

#### State Property Tracking

```typescript
interface UserState {
  name: string;
  email: string;
  avatar: string;
}

function UserCard() {
  const [user, bloc] = useBloc(UserBloc);

  // ✅ Component only re-renders when name or avatar change
  // Changes to email or bio won't trigger re-render
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
}
```

#### Getter Tracking

useBloc also tracks **getters** (computed properties) automatically:

```typescript
class TodoCubit extends Cubit<TodoState> {
  // Computed getter
  get visibleTodos() {
    return this.state.filter === 'active'
      ? this.state.todos.filter(t => !t.done)
      : this.state.todos;
  }

  get activeTodoCount() {
    return this.state.todos.filter(t => !t.done).length;
  }

  get fullInventory(): boolean {
    return this.state.length > 50;
  }
}

function TodoList() {
  const [, cubit] = useBloc(TodoCubit);

  // ✅ Re-renders when visibleTodos changes (computed value)
  // Getter is computed once per render cycle (cached)
  return (
    <ul>
      {cubit.visibleTodos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

**Note:** Ensure that your getters are **Pure Functions** to avoid unexpected behavior, as BlaC caches getter values per render cycle.

**Cross-Bloc Dependencies:**

Getters can access other blocs, and BlaC will **automatically track those dependencies** when using `borrow()`, `borrowSafe()`, or `ensure()`:

```typescript
import { borrow, borrowSafe, ensure } from '@blac/core';

class StatsCubit extends Cubit<StatsState> {
  get totalWithBonus() {
    // ✅ All three functions automatically track CounterBloc changes!
    const counter = borrow(CounterBloc);        // Borrow (throws if missing)
    // const counter = borrowSafe(CounterBloc); // Borrow (returns error)
    // const counter = ensure(CounterBloc);     // Get or create
    return this.state.total + counter.state;
  }
}

function StatsDisplay() {
  const [, cubit] = useBloc(StatsCubit);
  // Re-renders when EITHER StatsCubit OR CounterBloc changes
  return <div>Total: {cubit.totalWithBonus}</div>;
}
```

**Important:** Only `borrow()`, `borrowSafe()`, and `ensure()` enable automatic tracking. Do NOT use `acquire()` in getters as it increments ref count and causes memory leaks.

**How Cross-Bloc Tracking Works:**

When you access a getter that uses `borrow()`, `borrowSafe()`, or `ensure()` to access another bloc:

1. **During render**: BlaC records which external blocs are accessed
2. **Subscription setup**: BlaC automatically subscribes to all accessed blocs
3. **Change detection**: When any accessed bloc's state changes, BlaC re-evaluates the getter
4. **Comparison**: If the getter's return value changed, component re-renders
5. **Cleanup**: Subscriptions are automatically cleaned up when component unmounts

**Real-World Example - Notification System:**

```typescript
import { borrow } from '@blac/core';

// Lightweight notification tracker (always alive)
@blac({ keepAlive: true })
class NotificationCubit extends Cubit<NotificationState> {

  constructor() {
    super({ unreadCounts: new Map() });
  }

  incrementUnread = (channelId: string) => {
    const newCounts = new Map(this.state.unreadCounts);
    newCounts.set(channelId, (newCounts.get(channelId) || 0) + 1);
    this.patch({ unreadCounts: newCounts });
  };

  clearUnread = (channelId: string) => {
    const newCounts = new Map(this.state.unreadCounts);
    newCounts.set(channelId, 0);
    this.patch({ unreadCounts: newCounts });
  };
}

// Heavy channel state (created on-demand)
class ChannelCubit extends Cubit<ChannelState> {
  constructor() {
    super({ messages: [], channelId: '', typingUsers: new Set() });
  }

  receiveMessage = (message: Message) => {
    this.update((state) => ({
      ...state,
      messages: [...state.messages, message],
    }));

    // Update notification count (borrowing, not owning)
    const notifications = borrow(NotificationCubit);
    notifications.incrementUnread(this.state.channelId);
  };

  // Computed getter - tracks message state
  get unreadCount(): number {
    const notifications = borrow(NotificationCubit);
    return notifications.state.unreadCounts.get(this.state.channelId) || 0;
  }
}

// Sidebar shows unread counts WITHOUT creating ChannelBloc instances
function ChannelListItem({ channelId }: Props) {
  const [notifications] = useBloc(NotificationCubit);
  const unreadCount = notifications.unreadCounts.get(channelId) || 0;

  return (
    <div>
      Channel #{channelId}
      {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
    </div>
  );
}
```

**Benefits:**

- ✅ Sidebar can show unread counts without loading heavy ChannelBloc instances
- ✅ Automatic re-rendering when notification state changes
- ✅ No manual subscription management needed
- ✅ Memory efficient - only active channels load full state

**How Getter Tracking Works:**

1. During render, accessing a getter (e.g., `cubit.visibleTodos`) is recorded
2. After render, tracked getters are committed
3. On state change, all tracked getters are re-computed and compared
4. If any getter value changed (via `Object.is`), component re-renders
5. Getter values are cached per render cycle for performance - the getter will only execute once per render cycle even if used multiple times
6. Cross-bloc dependencies are automatically tracked and subscribed to (when using `borrow()`, `borrowSafe()`, or `ensure()`)

---

### useBloc Options

```typescript
const [state, bloc] = useBloc(MyBloc, {
  // Custom instance ID for shared blocs
  instanceId: 'main',

  // Manual dependency tracking (overrides automatic)
  dependencies: (state, bloc) => [state.count, state.name],

  // Disable automatic tracking (all changes trigger re-render)
  autoTrack: false,

  // Disable caching for getter tracking (advanced)
  disableGetterCache: false,

  // Lifecycle callbacks
  onMount: (bloc) => bloc.fetchData(),
  onUnmount: (bloc) => bloc.cleanup(),
});
```

**Options Details:**

**`instanceId`**: Custom instance ID for shared blocs

```typescript
// Both components share same bloc instance
function ComponentA() {
  const [state] = useBloc(CounterBloc, { instanceId: 'shared' });
  return <div>{state}</div>;
}

function ComponentB() {
  const [state] = useBloc(CounterBloc, { instanceId: 'shared' });
  return <div>{state}</div>; // Same state as ComponentA
}
```

This enables shared state across specific components with their own instance of the Bloc. Useful when you need multiple instances or the same Components or Component-Trees at the same time, each with their own state.

**`dependencies`**: Manual dependency tracking

```typescript
// Only re-renders when count or name change
const [state, bloc] = useBloc(UserBloc, {
  dependencies: (state, bloc) => [state.count, state.name],
});
```

Use this to overwrite the automatic dependency tracking or to fine tune to avoid unwanted re-renders that the automatic tracking cannot detect.

**`autoTrack`**: Control automatic tracking

```typescript
// Disable automatic tracking - all state changes trigger re-render
const [state, bloc] = useBloc(UserBloc, {
  autoTrack: false,
});
```

When the `dependencies` option is defined, automatic tracking is also disabled.

**`onMount` / `onUnmount`**: Lifecycle callbacks

```typescript
const [state, bloc] = useBloc(UserBloc, {
  onMount: (bloc) => {
    console.log('Component mounted with bloc:', bloc);
    bloc.fetchData();
  },
  onUnmount: (bloc) => {
    console.log('Component unmounting');
    bloc.cleanup();
  },
});
```

---

## Instance Management Patterns

### Isolated vs Shared Instances

**Isolated Instances** - Each component gets its own instance:

```typescript
@blac({ isolated: true })
class LocalCounter extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
}

// ComponentA and ComponentB have SEPARATE instances
function ComponentA() {
  const [state] = useBloc(LocalCounter);
  return <div>A: {state.count}</div>; // Independent count
}

function ComponentB() {
  const [state] = useBloc(LocalCounter);
  return <div>B: {state.count}</div>; // Different count
}
```

The Bloc is tightly coupled 1:1 with the component.

**Shared Instances** (Default) - Components share the same instance:

```typescript
class SharedCounter extends Cubit<{ count: number }> {
  constructor() { super({ count: 0 }); }
  increment = () => this.emit({ count: this.state.count + 1 });
}

// Both components share the SAME instance
function ComponentA() {
  const [state, bloc] = useBloc(SharedCounter);
  return <div onClick={bloc.increment}>A: {state.count}</div>;
}

function ComponentB() {
  const [state] = useBloc(SharedCounter);
  return <div>B: {state.count}</div>; // Same count as A
}
```

**When to Use Each:**

✅ **Use Isolated** for:

- Form state (each form instance independent)
- Local UI state (modals, dropdowns)
- Component-specific state

✅ **Use Shared** (default) for:

- Global state (user auth, theme)
- Cross-component communication
- Singleton services

---

### Keep Alive

Persist instances even without active consumers:

```typescript
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super(initialState);
  }
}

// Instance persists even after all components unmount
function Login() {
  const [auth, bloc] = useBloc(AuthCubit);
  return <div>{auth.isAuthenticated ? 'Logged in' : 'Not logged in'}</div>;
}
```

**Default Behavior (keepAlive = false):**

- Reference counting: each `useBloc` increments ref count
- When ref count reaches 0, instance is disposed
- Next `useBloc` creates fresh instance

**With keepAlive = true:**

- Instance persists regardless of ref count
- Useful for global singletons
- Must manually dispose or use `release(key, true)`

---

## Inter-Bloc Communication Patterns

BlaC supports multiple patterns for blocs to communicate with each other. Choose the pattern that best fits your use case.

### Pattern 1: Constructor-Based Dependencies

Resolve dependencies when the bloc is created. Use this for essential dependencies that the bloc needs throughout its lifetime.

```typescript
import { acquire, release } from '@blac/core';

class AppCubit extends Cubit<AppState> {
  // Resolve dependencies in constructor - increments ref count
  notificationCubit = acquire(NotificationCubit);

  constructor() {
    super({ isReady: false });
    this.setupApp();

    // Must clean up owned references using system events
    this.onSystemEvent('dispose', () => {
      release(NotificationCubit);
    });
  }

  private setupApp() {
    // Can safely use resolved dependencies
    this.notificationCubit.clearAll();
  }
}
```

**When to use:**

- ✅ Bloc needs dependency throughout its lifetime
- ✅ You want to ensure dependency stays alive
- ✅ You'll clean up via `onSystemEvent('dispose', ...)`

**⚠️ Warning:** Must call `release()` on dispose to prevent memory leaks.

---

### Pattern 2: Method-Based Communication

Access other blocs in methods using `borrow()` or `borrowSafe()`. This is the most common pattern for bloc-to-bloc communication.

```typescript
import { borrow, borrowSafe } from '@blac/core';

class ChannelCubit extends Cubit<ChannelState> {
  constructor() {
    super({ messages: [], channelId: '' });
  }

  receiveMessage = (message: Message) => {
    // Add message to state
    this.update((state) => ({
      ...state,
      messages: [...state.messages, message],
    }));

    // ✅ Borrow NotificationCubit to update unread count
    const notifications = borrowSafe(NotificationCubit);
    if (!notifications.error) {
      notifications.instance.incrementUnread(this.state.channelId);
    }
  };

  markAsRead = () => {
    // ✅ Use borrow() when you know instance exists
    const notifications = borrow(NotificationCubit);
    notifications.clearUnread(this.state.channelId);
  };
}
```

**When to use:**

- ✅ One-off interactions between blocs
- ✅ Method calls that trigger side effects
- ✅ You don't want to create ownership (no ref count increment)

**Benefits:**

- No memory leaks (borrowing, not owning)
- No cleanup needed
- Clear, explicit dependencies

---

### Pattern 3: Getter-Based Dependencies (with Automatic Tracking)

Access other blocs in **getters** for computed values that depend on multiple blocs. BlaC automatically tracks and subscribes to these dependencies.

```typescript
import { borrow } from '@blac/core';

class CartCubit extends Cubit<CartState> {
  constructor() {
    super({ items: [] });
  }

  // ✅ Computed getter with cross-bloc dependency
  get totalWithShipping(): number {
    const itemTotal = this.state.items.reduce((sum, item) => sum + item.price, 0);

    // Automatic tracking - component re-renders when ShippingCubit changes!
    const shipping = borrow(ShippingCubit);
    return itemTotal + shipping.state.cost;
  }

  // ✅ Multi-bloc dependencies automatically tracked
  get orderSummary(): string {
    const shipping = borrow(ShippingCubit);
    const tax = borrow(TaxCubit);

    return `Items: ${this.state.items.length}, Shipping: $${shipping.state.cost}, Tax: $${tax.state.amount}`;
  }
}

function CheckoutSummary() {
  const [, cart] = useBloc(CartCubit);

  // Component re-renders when CartCubit OR ShippingCubit OR TaxCubit changes
  return (
    <div>
      <p>Total: ${cart.totalWithShipping}</p>
      <p>{cart.orderSummary}</p>
    </div>
  );
}
```

**When to use:**

- ✅ Computed values that depend on multiple blocs
- ✅ You want automatic re-rendering when dependencies change
- ✅ Creating derived/aggregate state

**How it works:**

1. Component accesses getter during render
2. BlaC records all `borrow()`, `borrowSafe()`, and `ensure()` calls
3. Automatically subscribes to all accessed blocs
4. Re-evaluates getter when any dependency changes
5. Triggers component re-render if getter value changed

**⚠️ Important:**

- Only use `borrow()`, `borrowSafe()`, or `ensure()` in getters
- Never use `acquire()` in getters (causes memory leaks)
- Keep getters pure (no side effects)

---

### Pattern 4: Lazy/On-Demand Dependencies

Create dependencies only when needed using `ensure()` or conditional `borrowSafe()` checks.

```typescript
import { ensure, borrowSafe } from '@blac/core';

class UserProfileCubit extends Cubit<UserProfileState> {
  constructor() {
    super({ userId: '', profile: null });
  }

  loadProfile = async () => {
    const profile = await api.getProfile(this.state.userId);
    this.patch({ profile });

    // ✅ Create analytics bloc only when profile is loaded
    const analytics = ensure(AnalyticsCubit);
    analytics.trackEvent('profile_loaded', { userId: this.state.userId });
  };

  get premiumFeatures(): string[] {
    // ✅ Check if feature flag bloc exists
    const featureFlags = borrowSafe(FeatureFlagCubit);

    if (featureFlags.error) {
      return []; // Feature flags not available
    }

    return featureFlags.instance.state.premiumFeatures;
  }
}
```

**When to use:**

- ✅ Optional dependencies (may or may not exist)
- ✅ Conditional logic based on other bloc existence
- ✅ Creating dependencies on-demand

---

### Pattern 5: Shared Service Blocs

Use `keepAlive` singletons for shared services accessed by many blocs.

```typescript
import { borrow } from '@blac/core';

// Global service - always alive
@blac({ keepAlive: true })
class AnalyticsService extends Cubit<AnalyticsState> {
  constructor() {
    super({ events: [] });
  }

  trackEvent = (name: string, data: Record<string, any>) => {
    this.emit({
      ...this.state,
      events: [...this.state.events, { name, data, timestamp: Date.now() }],
    });
  };
}

// Other blocs can safely access analytics
class TodoCubit extends Cubit<TodoState> {
  addTodo = (text: string) => {
    this.emit({
      ...this.state,
      todos: [...this.state.todos, { text, done: false }],
    });

    // ✅ Borrow service (no cleanup needed)
    const analytics = borrow(AnalyticsService);
    analytics.trackEvent('todo_added', { text });
  };
}

class UserCubit extends Cubit<UserState> {
  login = async (email: string, password: string) => {
    const user = await api.login(email, password);
    this.patch({ user });

    // ✅ All blocs can access same analytics instance
    const analytics = borrow(AnalyticsService);
    analytics.trackEvent('user_login', { email });
  };
}
```

**When to use:**

- ✅ Logging, analytics, monitoring services
- ✅ Feature flags, configuration
- ✅ Shared utilities accessed by many blocs

**Benefits:**

- Single source of truth
- No ownership complexity
- Always available (keepAlive)
- No cleanup needed

---

### Choosing the Right Pattern

| Pattern            | Use When                          | Ownership          | Memory     |
| ------------------ | --------------------------------- | ------------------ | ---------- |
| **Constructor**    | Essential lifetime dependency     | Yes (must release) | High       |
| **Method-Based**   | Event-driven side effects         | No (borrowing)     | Low        |
| **Getter**         | Computed multi-bloc values        | No (auto-tracked)  | Low        |
| **Lazy/On-Demand** | Optional/conditional dependencies | No                 | Very Low   |
| **Service**        | Shared utilities/services         | No (keepAlive)     | Persistent |

---

### Real-World Example: Messenger App

Here's how a real messenger app coordinates multiple blocs:

```typescript
import { acquire, release, borrow } from '@blac/core';

// === Shared Singletons ===

@blac({ keepAlive: true })
class NotificationCubit extends Cubit<NotificationState> {
  // Tracks unread counts (lightweight)
}

@blac({ keepAlive: true })
class ContactsCubit extends Cubit<ContactsState> {
  // List of channels and users
}

// === Per-Entity Instances ===

class ChannelCubit extends Cubit<ChannelState> {
  // One instance per channel (created on-demand)
  constructor() {
    super({ messages: [], channelId: '' });
  }

  receiveMessage = (message: Message) => {
    // Pattern 2: Method-based communication
    const notifications = borrow(NotificationCubit);
    notifications.incrementUnread(this.state.channelId);

    this.update((state) => ({
      ...state,
      messages: [...state.messages, message],
    }));
  };

  markAsRead = () => {
    const notifications = borrow(NotificationCubit);
    notifications.clearUnread(this.state.channelId);
  };

  // Pattern 3: Getter-based (automatic tracking)
  get unreadCount(): number {
    const notifications = borrow(NotificationCubit);
    return notifications.state.unreadCounts.get(this.state.channelId) || 0;
  }
}

class UserCubit extends Cubit<User> {
  // One instance per user (created on-demand)
}

// === App Coordinator ===

class AppCubit extends Cubit<AppState> {
  // Pattern 1: Constructor-based (owns dependency)
  notificationCubit = acquire(NotificationCubit);

  constructor() {
    super({ userId: '', activeChannelId: null });

    this.onSystemEvent('dispose', () => {
      release(NotificationCubit);
    });
  }

  setActiveChannel = (channelId: string) => {
    // Pattern 2: Borrow to coordinate
    const notifications = borrow(NotificationCubit);
    notifications.clearUnread(channelId);

    this.patch({ activeChannelId: channelId });
  };
}

// === Components ===

// Sidebar: Shows unread counts without creating heavy ChannelBloc instances
function ChannelListItem({ channelId }: Props) {
  const [notifications] = useBloc(NotificationCubit);
  const unreadCount = notifications.unreadCounts.get(channelId) || 0;

  return <div>#{channelId} {unreadCount > 0 && <Badge>{unreadCount}</Badge>}</div>;
}

// Channel view: Accesses full channel state
function ChannelView({ channelId }: Props) {
  const [channel, cubit] = useBloc(ChannelCubit, {
    instanceId: channelId,
  });

  // Pattern 3: Getter automatically tracks NotificationCubit
  return (
    <div>
      <h2>Messages</h2>
      {channel.messages.map(msg => <Message key={msg.id} {...msg} />)}
      {cubit.unreadCount > 0 && <div>{cubit.unreadCount} unread</div>}
    </div>
  );
}
```

**Architecture Benefits:**

- ✅ Lightweight NotificationCubit is always alive (small memory footprint)
- ✅ Heavy ChannelCubit instances created only when viewing channels
- ✅ Sidebar shows unread counts without loading all channels
- ✅ Automatic cross-bloc re-rendering via getters
- ✅ Clear ownership and lifecycle management

---

## DevTools Integration

### Excluding Blocs from DevTools

To prevent internal blocs (like DevTools UI state) from appearing in DevTools panels, use the `excludeFromDevTools` option:

```typescript
@blac({ excludeFromDevTools: true })
class InternalBloc extends Cubit<InternalState> {
  constructor() {
    super(initialState);
  }
}
```

**Use cases:**

- Internal DevTools state management
- Meta-level application state
- Debug utilities
- Preventing infinite loops (DevTools tracking itself)

---

## Plugin System (Lifecycle Listeners)

Listen to lifecycle events across all state containers:

```typescript
import { globalRegistry } from '@blac/core';

// Listen to container creation
const unsubscribe = globalRegistry.on('created', (container) => {
  console.log('Container created:', container.name);
});

// Listen to state changes
globalRegistry.on(
  'stateChanged',
  (container, prevState, newState, callstack) => {
    console.log('State changed:', container.name, prevState, newState);
    if (callstack) console.log('Callstack:', callstack);
  },
);

// Listen to disposal
globalRegistry.on('disposed', (container) => {
  console.log('Container disposed:', container.name);
});

// Unsubscribe when done
unsubscribe();
```

**Available Lifecycle Events:**

- `'created'` - Container instantiated
- `'stateChanged'` - State updated (after emit), includes optional callstack
- `'disposed'` - Container disposed

### BlacPlugin Interface

For more structured plugin development:

```typescript
import type { BlacPlugin, PluginContext } from '@blac/core';

const myPlugin: BlacPlugin = {
  name: 'my-plugin',
  version: '1.0.0',

  onInstall(context: PluginContext) {
    console.log('Plugin installed');
  },

  onInstanceCreated(instance, context) {
    console.log('Instance created:', context.getInstanceMetadata(instance));
  },

  onStateChanged(instance, previousState, currentState, callstack, context) {
    console.log('State changed');
  },

  onInstanceDisposed(instance, context) {
    console.log('Instance disposed');
  },

  onUninstall() {
    console.log('Plugin uninstalled');
  },
};
```

**PluginContext Methods:**

- `getInstanceMetadata(instance)` - Get metadata about an instance
- `getState(instance)` - Get current state
- `queryInstances(TypeClass)` - Get all instances of a type
- `getAllTypes()` - Get all registered type constructors
- `getStats()` - Get registry statistics

**Use Cases:**

- DevTools integration
- Performance monitoring
- State persistence
- Debug logging
- Analytics

---

## Reactive Utilities

### watch - Reactive Watching

Watch blocs for state changes outside of React. Automatically tracks state and getter accesses.

**Single Bloc:**

```typescript
import { watch } from '@blac/core';

const unwatch = watch(UserBloc, (userBloc) => {
  console.log(userBloc.state.name);
  console.log(userBloc.fullName); // getters tracked too
});

unwatch(); // Stop watching
```

**Multiple Blocs:**

```typescript
const unwatch = watch(
  [UserBloc, SettingsBloc] as const,
  ([userBloc, settingsBloc]) => {
    console.log(userBloc.state.name, settingsBloc.state.theme);
  },
);
```

**Specific Instance:**

```typescript
import { watch, instance } from '@blac/core';

const unwatch = watch(instance(UserBloc, 'user-123'), (userBloc) =>
  console.log(userBloc.state.name),
);
```

**Stop from Callback:**

```typescript
const unwatch = watch(UserBloc, (userBloc) => {
  if (userBloc.state.status === 'complete') {
    return watch.STOP; // Stop watching
  }
});
```

---

### tracked - Manual Dependency Tracking

Low-level utilities for manual dependency tracking. Useful for custom integrations. Import from `@blac/core/watch`:

**tracked() Function:**

```typescript
import { tracked, ensure } from '@blac/core/watch';

const { result, dependencies } = tracked(() => {
  const user = ensure(UserBloc);
  return user.fullName; // getter may access other blocs
});
// result: return value
// dependencies: Set of all blocs accessed
```

**TrackedContext Class:**

```typescript
import { createTrackedContext, ensure } from '@blac/core/watch';

const ctx = createTrackedContext();
const userBloc = ensure(UserBloc);
const proxiedUser = ctx.proxy(userBloc);

ctx.start();
const value = proxiedUser.state.name;
const externalDeps = ctx.stop();
```

**TrackedContext Methods:**

- `proxy(bloc)` - Create tracking proxy
- `start()` - Start tracking
- `stop()` - Stop and return external dependencies
- `changed()` - Check if tracked values changed
- `reset()` - Reset for reuse

---

## Best Practices

### ✅ DO: Use Arrow Functions

Always use arrow functions for methods in Cubit classes:

```typescript
// ✅ DO: Arrow functions for correct 'this' binding
class CounterCubit extends Cubit<{ count: number }> {
  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

// ❌ DON'T: Regular methods lose 'this' context in React
class BadCubit extends Cubit<{ count: number }> {
  increment() {
    // Will break when passed to onClick
    this.emit({ count: this.state.count + 1 });
  }
}
```

### ✅ DO: Keep State Immutable

Always create new objects/arrays when updating:

```typescript
// ✅ DO: Create new array
addTodo = (text: string) => {
  this.update((state) => ({
    ...state,
    todos: [...state.todos, newTodo],
  }));
};

// ❌ DON'T: Mutate existing array
addTodo = (text: string) => {
  this.state.todos.push(newTodo); // Won't trigger re-render
  this.emit(this.state);
};
```

### ✅ DO: Use patch() for Simple Updates

```typescript
// ✅ DO: Use patch for simple field updates
setName = (name: string) => {
  this.patch({ name });
};

// ❌ DON'T: Use update for simple field updates
setName = (name: string) => {
  this.update((state) => ({ ...state, name })); // Verbose
};
```

### ✅ DO: Use update() for Complex Updates

```typescript
// ✅ DO: Use update for nested changes
updateTheme = (theme: string) => {
  this.update((state) => ({
    ...state,
    settings: { ...state.settings, theme },
  }));
};

// ❌ DON'T: Use patch for nested changes
updateTheme = (theme: string) => {
  this.patch({ settings: { theme } }); // Replaces entire settings!
};
```

### ✅ DO: Choose Correct Instance Mode

```typescript
// ✅ DO: Use isolated for component-specific state
@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {}

// ✅ DO: Use shared (default) for global state
@blac({ keepAlive: true })
class AuthBloc extends Cubit<AuthState> {}
```

### ✅ DO: Let Automatic Tracking Work

```typescript
// ✅ DO: Let proxy tracking determine dependencies
function UserCard() {
  const [user] = useBloc(UserBloc);
  return <div>{user.name}</div>; // Only tracks 'name'
}

// ❌ DON'T: Use manual dependencies unless needed
function UserCard() {
  const [user] = useBloc(UserBloc, {
    dependencies: (s) => [s.name] // Unnecessary
  });
  return <div>{user.name}</div>;
}
```

### ✅ DO: Access Only What You Need

```typescript
// ✅ DO: Access only needed properties
function UserName() {
  const [user] = useBloc(UserBloc);
  return <div>{user.name}</div>; // Only re-renders when name changes
}

// ❌ DON'T: Destructure unnecessarily
function UserName() {
  const [user] = useBloc(UserBloc);
  const { name, email, age, address } = user; // Tracks everything!
  return <div>{name}</div>;
}
```

### ✅ DO: Use Getters for Computed Values

```typescript
// ✅ DO: Use getters for computed values
class TodoBloc extends Cubit<TodoState> {
  get activeTodos() {
    return this.state.todos.filter(t => !t.done);
  }
}

// ❌ DON'T: Compute in render
function TodoList() {
  const [state] = useBloc(TodoBloc);
  const activeTodos = state.todos.filter(t => !t.done); // Recomputes every render
  return <div>{activeTodos.length}</div>;
}
```

---

## Common Patterns

### Form State Management

```typescript
interface FormState {
  values: { email: string; password: string };
  errors: Record<string, string>;
  isSubmitting: boolean;
}

@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {
  constructor() {
    super({
      values: { email: '', password: '' },
      errors: {},
      isSubmitting: false
    });
  }

  setField = (field: keyof FormState['values'], value: string) => {
    this.update(state => ({
      ...state,
      values: { ...state.values, [field]: value },
      errors: { ...state.errors, [field]: '' } // Clear error
    }));
  };

  submit = async () => {
    this.patch({ isSubmitting: true });

    try {
      // Submit logic
      await api.submit(this.state.values);
    } catch (error) {
      this.patch({ errors: { form: 'Submit failed' } });
    } finally {
      this.patch({ isSubmitting: false });
    }
  };
}

function LoginForm() {
  const [form, bloc] = useBloc(FormBloc);

  return (
    <form onSubmit={e => { e.preventDefault(); bloc.submit(); }}>
      <input
        value={form.values.email}
        onChange={e => bloc.setField('email', e.target.value)}
      />
      {form.errors.email && <span>{form.errors.email}</span>}
      <button disabled={form.isSubmitting}>Submit</button>
    </form>
  );
}
```

### Async Data Fetching

```typescript
interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

@blac({ keepAlive: true })
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
      this.patch({
        error: error.message,
        isLoading: false
      });
    }
  };
}

function UserProfile({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(UserBloc, {
    onMount: (bloc) => bloc.fetchUser(userId)
  });

  if (state.isLoading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error}</div>;
  if (!state.data) return <div>No data</div>;

  return <div>{state.data.name}</div>;
}
```

---

## TypeScript Support

BlaC is fully typed with TypeScript. State types are inferred automatically:

```typescript
// State type must be an object
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
}

// Complex types work seamlessly
interface AppState {
  user: User | null;
  settings: Settings;
  todos: Todo[];
}

class AppCubit extends Cubit<AppState> {
  constructor() {
    super({
      user: null,
      settings: defaultSettings,
      todos: [],
    });
  }
}

// In React components - types are fully inferred
function App() {
  const [state, cubit] = useBloc(AppCubit);
  // state is typed as AppState
  // cubit is typed as AppCubit

  state.user?.name; // ✅ Type-safe
  cubit.addTodo('text'); // ✅ Method signatures preserved
}
```

**Generic Type Utilities:**

```typescript
import type { ExtractState, StateContainerConstructor } from '@blac/core';

// Extract state type from a bloc
type CounterState = ExtractState<CounterCubit>; // { count: number }

// StateContainerConstructor type for generic constraints
function createBloc<TBloc extends StateContainer<any>>(
  Class: StateContainerConstructor<TBloc>,
): TBloc {
  return acquire(Class);
}
```

---

## Quick Reference

### Core Methods

**StateContainer:**

- `state` - Current state (readonly)
- `subscribe(callback)` - Subscribe to changes
- `dispose()` - Clean up
- `isDisposed` - Check disposal status
- `createdAt` - Creation timestamp
- `lastUpdateTimestamp` - Last state update timestamp
- `emit(state)` - Emit new state (protected)
- `update(fn)` - Update with function (protected)
- `onSystemEvent(event, handler)` - Subscribe to system events (protected)

**Cubit:**

- All StateContainer methods
- `emit(state)` - Emit new state (public)
- `update(fn)` - Update with function (public)
- `patch(partial)` - Shallow merge (public, object state only)

### Instance Management Functions

**Instance Access (import from `@blac/core`):**

- `acquire(Class, id?)` - Get/create instance with ownership (increments ref count)
- `borrow(Class, id?)` - Get existing instance without ownership (throws if not found)
- `borrowSafe(Class, id?)` - Get existing instance without ownership (returns discriminated union)
- `ensure(Class, id?)` - Get/create instance for B2B (no ref count change, tracks dependencies)
- `release(Class, id?, force?)` - Release reference

**Instance Info (import from `@blac/core`):**

- `hasInstance(Class, id?)` - Check existence
- `getRefCount(Class, id?)` - Get reference count
- `getAll(Class)` - Get all instances (returns array)
- `forEach(Class, callback)` - Iterate over instances safely (disposal-safe, memory-efficient)
- `clear(Class)` - Clear all instances of type
- `clearAll()` - Clear everything

**Debug utilities (import from `@blac/core/debug`):**

- `getStats()` - Get registry statistics
- `globalRegistry` - Direct registry access

### useBloc Options

```typescript
{
  instanceId?: string | number;   // Custom instance ID
  dependencies?: (state, bloc) => any[]; // Manual tracking
  autoTrack?: boolean;            // Enable/disable auto tracking (default: true)
  disableGetterCache?: boolean;   // Disable getter value caching (default: false)
  onMount?: (bloc) => void;       // Mount callback
  onUnmount?: (bloc) => void;     // Unmount callback
}
```

### Class Configuration Decorator

```typescript
import { blac } from '@blac/core';

@blac({ isolated: true }) // Each instance unique per component
class MyBloc extends Cubit<State> {}

@blac({ keepAlive: true }) // Persist without consumers
class MyBloc extends Cubit<State> {}

@blac({ excludeFromDevTools: true }) // Hide from DevTools panels
class InternalBloc extends Cubit<State> {}

// Function syntax (no decorator support needed)
const MyBloc = blac({ isolated: true })(class extends Cubit<State> {});
```

**⚠️ Note:** `BlacOptions` is a union type - only ONE option can be specified at a time.

### System Events

```typescript
type SystemEvent = 'stateChanged' | 'dispose';

// Payloads
interface SystemEventPayloads<S> {
  stateChanged: { state: S; previousState: S };
  dispose: void;
}
```

### Lifecycle Events (Registry)

```typescript
type LifecycleEvent = 'created' | 'stateChanged' | 'disposed';
```

### Reactive Utilities

**watch:**

```typescript
// Single bloc
const unwatch = watch(UserBloc, (bloc) => console.log(bloc.state));

// Multiple blocs
const unwatch = watch([A, B] as const, ([a, b]) =>
  console.log(a.state, b.state),
);

// Specific instance
const unwatch = watch(instance(Bloc, 'id'), (bloc) => {});

// Stop from callback
watch(Bloc, (bloc) => (bloc.done ? watch.STOP : undefined));
```

**tracked (from @blac/core/watch):**

```typescript
// Track dependencies
const { result, dependencies } = tracked(() => someBloc.computedValue);

// TrackedContext for manual control
const ctx = createTrackedContext();
ctx.start();
// ... access proxied blocs
const deps = ctx.stop();
```

---

## Troubleshooting

### Component Not Re-rendering

**Problem**: Component doesn't re-render when state changes.

**Solution**: Ensure you're accessing state properties during render:

```typescript
// ❌ DON'T: Store in variable before render
function Bad() {
  const [_, bloc] = useBloc(CounterBloc);
  const count = bloc.state; // Not tracked
  return <div>{count}</div>;
}

// ✅ DO: Access during render
function Good() {
  const [count] = useBloc(CounterBloc);
  return <div>{count}</div>; // Tracked
}
```

### Too Many Re-renders

**Problem**: Component re-renders too often.

**Solution**: Access only needed properties:

```typescript
// ❌ DON'T: Destructure unnecessarily
function Bad() {
  const [user] = useBloc(UserBloc);
  const { ...everything } = user; // Tracks all properties
  return <div>{everything.name}</div>;
}

// ✅ DO: Access only what's needed
function Good() {
  const [user] = useBloc(UserBloc);
  return <div>{user.name}</div>; // Only tracks 'name'
}
```

### Shared State Not Working

**Problem**: Components don't share state.

**Solution**: Check if bloc is marked as `isolated`:

```typescript
// ❌ Wrong: Isolated blocs don't share
@blac({ isolated: true })
class MyBloc extends Cubit<State> {} // Each component gets own instance

// ✅ Correct: Remove decorator for sharing
class MyBloc extends Cubit<State> {
  // Default: shared across components
}
```

### Instance Not Persisting

**Problem**: Instance gets disposed when component unmounts.

**Solution**: Use `keepAlive`:

```typescript
@blac({ keepAlive: true })
class MyBloc extends Cubit<State> {} // Persists after unmount
```

### Cannot Use ensure() with Isolated Blocs

**Problem**: Error when calling `ensure()` on isolated bloc.

**Solution**: Isolated blocs are component-scoped. Use `acquire()` in components:

```typescript
import { ensure, acquire } from '@blac/core';

// ❌ DON'T: ensure() with isolated
@blac({ isolated: true })
class FormBloc extends Cubit<FormState> {}
ensure(FormBloc); // Throws error!

// ✅ DO: Use acquire() for isolated blocs
const form = acquire(FormBloc);
```

---

## Migration Guide

### From direct StateContainer to Cubit

```typescript
// Before
class Counter extends StateContainer<{ count: number }> {
  increment = () => {
    this.emit({ count: this.state.count + 1 }); // Error: emit is protected
  };
}

// After
class Counter extends Cubit<{ count: number }> {
  increment = () => {
    this.emit({ count: this.state.count + 1 }); // ✅ Works: emit is public
  };
}
```

### From manual dependencies to auto-tracking

```typescript
// Before
const [state, bloc] = useBloc(UserBloc, {
  dependencies: (s) => [s.name, s.email],
});

// After (simpler, automatic)
const [state, bloc] = useBloc(UserBloc);
// Automatically tracks accessed properties
```

### From static methods to standalone functions

The instance management API has been redesigned to use standalone functions instead of static class methods:

```typescript
import { acquire, borrow, borrowSafe, release } from '@blac/core';

// Before: Static methods on class
const counter = CounterCubit.resolve('main');
const analytics = AnalyticsCubit.get('main');
CounterCubit.release('main');

// After: Standalone functions
const counter = acquire(CounterCubit, 'main');
const analytics = borrow(AnalyticsCubit, 'main');
release(CounterCubit, 'main');

// Choose based on ownership needs:

// 1. Ownership (for components that manage instance lifetime)
const counter = acquire(CounterCubit, 'main');

// 2. Borrowing - strict (for bloc-to-bloc communication)
const analytics = borrow(AnalyticsCubit, 'main');

// 3. Borrowing - safe (for conditional access)
const result = borrowSafe(NotificationCubit, 'user-123');
if (!result.error) {
  result.instance.markAsRead();
}
```

**Why the change:**

- Standalone functions are tree-shakeable
- Cleaner imports and better IDE autocomplete
- `borrow()` prevents memory leaks in bloc-to-bloc communication
- `borrowSafe()` provides type-safe conditional access

**Migration tips:**

- React components: Use `acquire()` (handled automatically by `useBloc`)
- Bloc methods calling other blocs: Use `borrow()` (prevents memory leaks)
- Conditional instance access: Use `borrowSafe()` (type-safe error handling)

### From onDispose to onSystemEvent

```typescript
// Before (if you had a custom onDispose hook)
class MyBloc extends Cubit<State> {
  protected onDispose() {
    // cleanup
  }
}

// After (use system events)
class MyBloc extends Cubit<State> {
  constructor() {
    super(initialState);
    this.onSystemEvent('dispose', () => {
      // cleanup
    });
  }
}
```

---

## React Performance Optimization

BlaC's proxy-based dependency tracking is designed for optimal React performance. Follow these patterns to maximize efficiency.

### Key Principles

1. **Only access what you render** - Proxy tracking records property access during render
2. **Prefer getters for computed values** - Cached per render cycle
3. **Split large state objects** - Smaller granular blocs re-render fewer components

### Optimal Property Access

```typescript
// ✅ OPTIMAL: Access only properties used in render
function UserCard() {
  const [user] = useBloc(UserBloc);
  return (
    <div>
      <h2>{user.name}</h2>        {/* Only tracks 'name' */}
      <img src={user.avatar} />   {/* Only tracks 'avatar' */}
    </div>
  );
  // Changes to user.email, user.bio won't trigger re-render
}

// ❌ AVOID: Accessing entire state defeats tracking
function UserCard() {
  const [user] = useBloc(UserBloc);
  const { name, email, avatar, bio, settings } = user; // Tracks everything!
  return <h2>{name}</h2>; // Still re-renders on ANY change
}

// ❌ AVOID: Spreading state
function UserCard() {
  const [user] = useBloc(UserBloc);
  return <UserProfile {...user} />; // Tracks everything!
}
```

### Computed Values with Getters

```typescript
class TodoCubit extends Cubit<TodoState> {
  // ✅ Getter is computed once per render cycle (cached)
  get visibleTodos() {
    return this.state.filter === 'active'
      ? this.state.todos.filter(t => !t.done)
      : this.state.todos;
  }

  // ✅ Accessing same getter multiple times = one computation
  get stats() {
    return {
      total: this.visibleTodos.length,      // Same computation
      hasItems: this.visibleTodos.length > 0 // Reuses cached result
    };
  }
}

function TodoList() {
  const [, cubit] = useBloc(TodoCubit);

  // Getter value tracked, re-renders only when result changes
  return (
    <ul>
      {cubit.visibleTodos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### Component Splitting Pattern

```typescript
// ✅ OPTIMAL: Split into granular components
function TodoApp() {
  return (
    <div>
      <TodoCount />      {/* Only re-renders on count change */}
      <TodoList />       {/* Only re-renders on todos change */}
      <TodoActions />    {/* Never re-renders */}
    </div>
  );
}

function TodoCount() {
  const [state] = useBloc(TodoCubit);
  return <span>{state.todos.length} items</span>; // Tracks todos.length
}

function TodoList() {
  const [, cubit] = useBloc(TodoCubit);
  return <ul>{cubit.visibleTodos.map(...)}</ul>; // Tracks getter result
}

function TodoActions() {
  const [, cubit] = useBloc(TodoCubit);
  return <button onClick={cubit.addTodo}>Add</button>;
}

// ❌ AVOID: One big component that accesses everything
function TodoApp() {
  const [state, cubit] = useBloc(TodoCubit);
  return (
    <div>
      <span>{state.todos.length}</span>
      <ul>{cubit.visibleTodos.map(...)}</ul>
      <button onClick={cubit.addTodo}>Add</button>
    </div>
  );
  // Entire component re-renders on ANY state change
}
```

### Avoiding Unnecessary Re-renders

```typescript
// ✅ Access nested properties directly
function UserAvatar() {
  const [user] = useBloc(UserBloc);
  return <img src={user.profile.avatar} />; // Tracks profile.avatar
}

// ✅ Conditional access is fine
function UserStatus() {
  const [user] = useBloc(UserBloc);
  return user.isOnline ? <span>Online</span> : null;
  // Tracks only 'isOnline'
}

// ✅ Array element access tracks the specific index
function FirstTodo() {
  const [state] = useBloc(TodoCubit);
  return <div>{state.todos[0]?.text}</div>;
  // Re-renders only when todos[0] changes
}

// ❌ Array iteration tracks the entire array
function AllTodos() {
  const [state] = useBloc(TodoCubit);
  return <div>{state.todos.map(t => t.text).join(', ')}</div>;
  // Re-renders on ANY change to todos array
}
```

### Manual Dependencies (Advanced)

Use when you know exactly what to track:

```typescript
// For predictable, known dependencies
const [state] = useBloc(UserBloc, {
  dependencies: (state) => [state.name, state.email],
});

// For derived values that shouldn't trigger re-render
const [state] = useBloc(AnalyticsBloc, {
  dependencies: (state) => [state.displayMetrics],
  // Ignores internal tracking data changes
});
```

### Memory-Efficient Patterns

```typescript
import { borrow, forEach, release, getAll } from '@blac/core';

// ✅ Use borrow() in bloc-to-bloc communication (no ref count)
class UserBloc extends Cubit<UserState> {
  loadProfile = () => {
    const analytics = borrow(AnalyticsCubit); // Borrow, don't own
    analytics.trackEvent('profile_loaded');
    // No cleanup needed - not incrementing ref count
  };
}

// ✅ Use forEach() for large instance sets
function cleanupStaleSessions() {
  // Memory efficient - doesn't create array copy
  forEach(UserSessionBloc, (session) => {
    if (session.state.isStale) {
      release(UserSessionBloc, session.instanceId);
    }
  });
}

// ❌ Avoid getAll() for large sets
const allSessions = getAll(UserSessionBloc); // Creates array copy
```

### Performance Summary

| Pattern                 | Re-renders                 | Use When                 |
| ----------------------- | -------------------------- | ------------------------ |
| Auto-tracking (default) | On tracked property change | Most cases               |
| Manual `dependencies`   | On dependency change       | Known fixed dependencies |
| `autoTrack: false`      | On any state change        | Simple state, debugging  |
| Getters                 | On computed value change   | Derived/computed state   |

### Common Performance Mistakes

1. **Destructuring state** - `const { a, b, c } = state` tracks all properties
2. **Spreading props** - `<Child {...state} />` defeats tracking
3. **Using `acquire()` in methods** - Causes ref count leaks
4. **Large monolithic components** - Split into smaller, focused components
5. **Iterating arrays when accessing single element** - Use index access instead

---

## License

MIT

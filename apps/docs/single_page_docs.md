# BlaC Documentation

TypeScript state management library with React integration. Uses proxy-based dependency tracking for optimal re-renders.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Core Package (@blac/core)

### StateContainer - Base State Management Class

The foundation for all state containers in BlaC. Provides state storage, subscriptions, and lifecycle management.

**Purpose**: Used internally as a base class for the [[Cubit]] and [[Vertex]].

**Note:** Its not recommended to use the StateContainer directly; use a [[Cubit]] or a [[Vertex]], they both extend the [[StateContainer]]

```typescript
import { StateContainer } from '@blac/core';

class CounterContainer extends StateContainer<number> {
  constructor() {
    super(0, { name: 'Counter' }); // initial state + config
  }

  // Methods use protected emit/update
  increment = () => {
    this.update(state => state + 1);
  };
}
```

**Core Properties:**
- `state` - Get current state (readonly)
- `isDisposed` - Check if disposed
- `name` - Debug name
- `debug` - Debug mode flag
- `instanceId` - Unique instance identifier

**Core Methods:**
- `subscribe(callback)` - Subscribe to state changes, returns unsubscribe function
- `dispose()` - Clean up the container

**Protected Methods** (for subclasses):
- `emit(newState)` - Emit new state directly (with change detection via `Object.is`)
- `update(fn)` - Update state with function `(current) => next`

**Configuration Options:**
```typescript
interface StateContainerConfig {
  name?: string;        // Debug name
  debug?: boolean;      // Enable debug logging
  instanceId?: string;  // Custom instance ID
}
```

**Static Class Properties:**
```typescript
class MyBloc extends StateContainer<State> {
  static isolated = true;   // Each instance unique (default: false)
  static keepAlive = true;  // Never auto-dispose (default: false)
}
```

**Optional Lifecycle Hooks:**
```typescript
class MyBloc extends StateContainer<State> {
  // Called when dispose() is invoked
  protected onDispose?(): void {
    // Cleanup logic
  }

  // Called after state changes
  protected onStateChange?(newState: State, previousState: State): void {
    // React to state changes
  }
}
```

---

### Cubit - Simple State Container

Extends `StateContainer` with **public** state mutation methods for direct state management.

**Purpose**: Use Cubit when you want simple, direct state mutations without events. The [[Cubit]] fits most use cases.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // initial state
  }

  // ✅ IMPORTANT: Always use arrow functions for React compatibility
  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
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
    this.update(state => ({
      ...state,
      settings: { ...state.settings, theme }
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
      ? this.state.todos.filter(t => !t.done)
      : this.state.todos;
  }

  get activeTodoCount() {
    return this.state.todos.filter(t => !t.done).length;
  }
}
```

---

### Vertex - Event-Driven State Container (Bloc Pattern)

For event-driven architectures with explicit state transitions.

**Purpose**: Use Vertex when you want event-driven state management with explicit event handling.

```typescript
import { Vertex, BaseEvent } from '@blac/core';

// Define events
class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent implements BaseEvent {
  readonly type = 'decrement';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

// Create Vertex with event handlers
class CounterVertex extends Vertex<number> {
  constructor() {
    super(0);

    // Register event handlers in constructor
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });

    this.on(DecrementEvent, (event, emit) => {
      emit(this.state - event.amount);
    });
  }

  // ✅ IMPORTANT: Use arrow functions for React compatibility
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };
}
```

**Methods:**
- `add(event)` - Add event to be processed (public)
- `on(EventClass, handler)` - Register event handler (protected)

**Event Processing:**
- Events are processed **synchronously**
- If an event is added while processing, it's queued
- Queued events are processed in order
- Error handling via `onEventError` hook

**Error Handling:**
```typescript
class MyVertex extends Vertex<State> {
  protected onEventError(event: BaseEvent, error: Error): void {
    // Handle event processing errors
    console.error('Event error:', event, error);
  }
}
```

---

### Static Instance Management

All state containers (StateContainer, Cubit, Vertex) support static instance management with three access patterns:

#### `.resolve()` - Ownership Semantics (Instance Resolution)

Get or create an instance with ref counting. Used when you "own" the instance lifetime.

```typescript
// Get or create shared instance (increments ref count)
const counter = CounterCubit.resolve();
const named = CounterCubit.resolve('main');

// With constructor arguments
const user = UserCubit.resolve('user-123', { userId: '123' });

// Release reference (disposes when ref count reaches zero)
CounterCubit.release();
CounterCubit.release('main');

// Force dispose (ignores ref count and keepAlive)
CounterCubit.release('main', true);
```

**Use `.resolve()` when:**
- React components need to manage instance lifetime (used internally by `useBloc`/`useBlocActions`)
- You want to ensure the instance stays alive during usage
- You need ownership semantics with automatic cleanup

#### `.get()` - Borrowing Semantics (Strict)

Get an existing instance WITHOUT incrementing ref count. Throws if instance doesn't exist.

```typescript
// Borrow existing instance (no ref count change)
const counter = CounterCubit.get('main');
counter.increment();
// No .release() needed - we're just borrowing!

// Throws error if instance doesn't exist:
// CounterCubit instance "main" not found.
// Use .resolve() to create and claim ownership, or .getSafe() for conditional access.
```

**Use `.get()` when:**
- Bloc-to-bloc communication (calling methods on other blocs)
- Event handlers where component already owns the instance via `.resolve()`
- Accessing keepAlive singleton instances
- You know the instance exists and is being managed elsewhere

**Common pattern - Prevents memory leaks:**
```typescript
class UserBloc extends Cubit<UserState> {
  loadProfile = () => {
    // ✅ Just borrow - no memory leak!
    const analytics = AnalyticsCubit.get('main');
    analytics.trackEvent('profile_loaded');
    // No .release() needed
  };
}
```

#### `.getSafe()` - Borrowing Semantics (Safe)

Get an existing instance WITHOUT incrementing ref count. Returns discriminated union instead of throwing.

```typescript
// Safe borrowing with error handling
const result = NotificationCubit.getSafe('user-123');

if (result.error) {
  console.log('Instance not found:', result.error.message);
  return null;
}

// TypeScript knows instance is non-null after check
result.instance.markAsRead();
```

**Use `.getSafe()` when:**
- Instance existence is conditional/uncertain
- You want type-safe error handling without try/catch
- Checking if another component has created an instance
- **Note:** Like `.get()`, this method tracks cross-bloc dependencies when used in getters

#### `.connect()` - Get or Create (B2B Communication)

Get existing instance OR create it if it doesn't exist, without incrementing ref count. Ideal for bloc-to-bloc communication when you need to ensure an instance exists.

```typescript
class StatsCubit extends Cubit<StatsState> {
  get totalWithAnalytics() {
    // ✅ Ensures AnalyticsCubit exists, doesn't increment ref count
    const analytics = AnalyticsCubit.connect();
    return this.state.total + analytics.state.bonus;
  }
}

// In another bloc, access the auto-created instance
class DashboardCubit extends Cubit<DashboardState> {
  loadData = () => {
    // AnalyticsCubit already exists from StatsCubit.connect()
    const analytics = AnalyticsCubit.get();
    analytics.trackEvent('dashboard_loaded');
  };
}
```

**Use `.connect()` when:**
- B2B communication where the instance might not exist yet
- You want to lazily create shared instances on first access
- You need to ensure an instance exists without claiming ownership
- Accessing services/utilities that should exist but aren't tied to specific components
- **Note:** Always tracks cross-bloc dependencies when used in getters

**Comparison:**
- **`.get()`**: Borrow existing (throws if missing) - use when you know it exists
- **`.getSafe()`**: Borrow existing (returns error) - use for conditional access
- **`.connect()`**: Get or create (no ref count change) - use to ensure existence
- **`.resolve()`**: Get or create (increments ref count) - use in components for ownership

#### Other Static Methods

```typescript
// Check if instance exists
const exists = CounterCubit.hasInstance('main');

// Get reference count
const refCount = CounterCubit.getRefCount('main');

// Get all instances of a type (returns array)
const allCounters = CounterCubit.getAll();

// Iterate over all instances safely (disposal-safe, memory-efficient)
CounterCubit.forEach((instance) => {
  console.log(instance.state);
});

// Clear all instances of a type
CounterCubit.clear();

// Clear all instances from all types (mainly for testing)
StateContainer.clearAllInstances();

// Get registry statistics
const stats = StateContainer.getStats();
// { registeredTypes: 5, totalInstances: 12, typeBreakdown: { ... } }
```

**`.getAll()` vs `.forEach()`:**

Both methods let you access all instances of a type, but with different trade-offs:

**`.getAll()`** - Returns an array of all instances
```typescript
const allSessions = UserSessionBloc.getAll();
const activeSessions = allSessions.filter(s => s.state.isActive);
```

**Use `.getAll()` when:**
- You need array operations (filter, map, reduce)
- Working with small numbers of instances (<100)
- You need to iterate multiple times

**`.forEach(callback)`** - Iterates with a callback function
```typescript
// Broadcast to all sessions
UserSessionBloc.forEach((session) => {
  session.notify('Server maintenance in 5 minutes');
});

// Cleanup stale sessions (disposal-safe!)
UserSessionBloc.forEach((session) => {
  if (session.state.lastActivity < threshold) {
    UserSessionBloc.release(session.instanceId); // Safe during iteration
  }
});
```

**Use `.forEach()` when:**
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

Getters can access other blocs, and BlaC will automatically track those dependencies when using `.get()`, `.getSafe()`, or `.connect()`:

```typescript
class StatsCubit extends Cubit<StatsState> {
  get totalWithBonus() {
    // ✅ All three methods automatically track CounterBloc changes!
    const counter = CounterBloc.get();        // Borrow (throws if missing)
    // const counter = CounterBloc.getSafe(); // Borrow (returns error)
    // const counter = CounterBloc.connect(); // Get or create
    return this.state.total + counter.state;
  }
}

function StatsDisplay() {
  const [, cubit] = useBloc(StatsCubit);
  // Re-renders when EITHER StatsCubit OR CounterBloc changes
  return <div>Total: {cubit.totalWithBonus}</div>;
}
```

**Important:** Only `.get()`, `.getSafe()`, and `.connect()` enable automatic tracking. Do NOT use `.resolve()` in getters as it increments ref count and causes memory leaks.

**How Getter Tracking Works:**

1. During render, accessing a getter (e.g., `cubit.visibleTodos`) is recorded
2. After render, tracked getters are committed
3. On state change, all tracked getters are re-computed and compared
4. If any getter value changed (via `Object.is`), component re-renders
5. Getter values are cached per render cycle for performance - the getter will only execute once per render cycle even if used multiple times
6. Cross-bloc dependencies are automatically tracked and subscribed to

---

### useBloc Options

```typescript
const [state, bloc] = useBloc(MyBloc, {
  // Pass constructor arguments
  staticProps: { userId: '123' },

  // Custom instance ID for shared blocs
  instanceId: 'main',

  // Manual dependency tracking (overrides automatic)
  dependencies: (state, bloc) => [state.count, state.name],

  // Disable automatic tracking (all changes trigger re-render)
  autoTrack: false,

  // Lifecycle callbacks
  onMount: (bloc) => bloc.fetchData(),
  onUnmount: (bloc) => bloc.cleanup(),
});
```

**Options Details:**

**`staticProps`**: Constructor arguments
```typescript
class UserBloc extends StateContainer<State> {
  constructor(props?: { userId: string }) {
    super(initialState);
  }
}

// Pass props
const [state, bloc] = useBloc(UserBloc, {
  staticProps: { userId: '123' }
});
```
Always make constructor parameters optional to avoid runtime errors, the type of the constructor props is not enforced.

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
  dependencies: (state, bloc) => [state.count, state.name]
});
```
Use this to overwrite the automatic dependency tracking or to fine tune to avoid unwanted re-renders that the automatic tracking cannot detect.

**`autoTrack`**: Control automatic tracking
```typescript
// Disable automatic tracking - all state changes trigger re-render
const [state, bloc] = useBloc(UserBloc, {
  autoTrack: false
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
  }
});
```

---

### useBlocActions Hook - Actions Only

Use when you only need to call methods **without subscribing to state**.

```typescript
import { useBlocActions } from '@blac/react';

function ActionsOnly() {
  const bloc = useBlocActions(CounterBloc);

  // Never re-renders due to state changes
  return (
    <div>
      <button onClick={bloc.increment}>+</button>
      <button onClick={bloc.decrement}>-</button>
      <button onClick={bloc.reset}>Reset</button>
    </div>
  );
}
```

**Benefits:**
- No state subscription overhead
- No proxy tracking
- Never re-renders from bloc state changes
- Lighter weight for action-only components

**Options:**
```typescript
const bloc = useBlocActions(CounterBloc, {
  staticProps: { initialValue: 0 },
  instanceId: 'shared',
  onMount: (bloc) => console.log('Mounted'),
  onUnmount: (bloc) => console.log('Unmounting')
});
```

---

## Instance Management Patterns

### Isolated vs Shared Instances

**Isolated Instances** - Each component gets its own instance:

```typescript
class LocalCounter extends Cubit<number> {
  static isolated = true; // Mark as isolated

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
}

// ComponentA and ComponentB have SEPARATE instances
function ComponentA() {
  const [count] = useBloc(LocalCounter);
  return <div>A: {count}</div>; // Independent count
}

function ComponentB() {
  const [count] = useBloc(LocalCounter);
  return <div>B: {count}</div>; // Different count
}
```
The Bloc is tightly coupled 1:1 with the component.

// TODO: add example for isolated instances that shows advanced apis and patterns. for example api access and tracking each component through Blac without custom ref management

**Shared Instances** (Default) - Components share the same instance:

```typescript
class SharedCounter extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
}

// Both components share the SAME instance
function ComponentA() {
  const [count, bloc] = useBloc(SharedCounter);
  return <div onClick={bloc.increment}>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(SharedCounter);
  return <div>B: {count}</div>; // Same count as A
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
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true;  // Won't be disposed when no components use it

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

## DevTools Integration

### Excluding Blocs from DevTools

To prevent internal blocs (like DevTools UI state) from appearing in DevTools panels, mark them with the static `__excludeFromDevTools` property:

```typescript
class InternalBloc extends Cubit<InternalState> {
  static __excludeFromDevTools = true;  // Won't appear in DevTools

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

## Logging and Debugging

### Configure Global Logger

```typescript
import { configureLogger, LogLevel } from '@blac/core';

configureLogger({
  enabled: true,
  level: LogLevel.DEBUG, // ERROR, WARN, INFO, DEBUG
  output: (entry) => console.log(JSON.stringify(entry)),
});
```

### Create Custom Logger

```typescript
import { createLogger, LogLevel } from '@blac/core';

const logger = createLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(entry)
});

logger.debug('MyComponent', 'Rendering', { props });
logger.info('MyBloc', 'State updated', { newState });
logger.warn('MyService', 'Slow operation', { duration: 1000 });
logger.error('MyBloc', 'Failed to fetch', { error });
```

### Use Individual Log Functions

```typescript
import { debug, info, warn, error } from '@blac/core';

debug('Context', 'Debug message', { data });
info('Context', 'Info message', { data });
warn('Context', 'Warning message', { data });
error('Context', 'Error message', { data });
```

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
globalRegistry.on('stateChanged', (container, prevState, newState) => {
  console.log('State changed:', container.name, prevState, newState);
});

// Listen to events (Vertex only)
globalRegistry.on('eventAdded', (vertex, event) => {
  console.log('Event added:', event);
});

// Listen to disposal
globalRegistry.on('disposed', (container) => {
  console.log('Container disposed:', container.name);
});

// Unsubscribe when done
unsubscribe();
```

**Available Lifecycle Events:**
- `'created'` - Container instantiated
- `'stateChanged'` - State updated (after emit)
- `'eventAdded'` - Event added to Vertex (before processing)
- `'disposed'` - Container disposed

**Use Cases:**
- DevTools integration
- Performance monitoring
- State persistence
- Debug logging
- Analytics

---

## Best Practices

### ✅ DO: Use Arrow Functions

Always use arrow functions for methods in Cubit/Vertex classes:

```typescript
// ✅ DO: Arrow functions for correct 'this' binding
class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
}

// ❌ DON'T: Regular methods lose 'this' context in React
class BadCubit extends Cubit<number> {
  increment() { // Will break when passed to onClick
    this.emit(this.state + 1);
  }
}
```

### ✅ DO: Keep State Immutable

Always create new objects/arrays when updating:

```typescript
// ✅ DO: Create new array
addTodo = (text: string) => {
  this.update(state => ({
    ...state,
    todos: [...state.todos, newTodo]
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
  this.update(state => ({ ...state, name })); // Verbose
};
```

### ✅ DO: Use update() for Complex Updates

```typescript
// ✅ DO: Use update for nested changes
updateTheme = (theme: string) => {
  this.update(state => ({
    ...state,
    settings: { ...state.settings, theme }
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
class FormBloc extends Cubit<FormState> {
  static isolated = true; // Each form gets its own state
}

// ✅ DO: Use shared (default) for global state
class AuthBloc extends Cubit<AuthState> {
  static keepAlive = true; // Persist across app
}
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

### ✅ DO: Use useBlocActions for Action-Only Components

```typescript
// ✅ DO: Use useBlocActions when not reading state
function Actions() {
  const bloc = useBlocActions(CounterBloc);
  return <button onClick={bloc.increment}>+</button>;
}

// ❌ DON'T: Use useBloc when not accessing state
function Actions() {
  const [_, bloc] = useBloc(CounterBloc); // Unnecessary subscription
  return <button onClick={bloc.increment}>+</button>;
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

class FormBloc extends Cubit<FormState> {
  static isolated = true; // Each form gets its own instance

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

class UserBloc extends Cubit<DataState<User>> {
  static keepAlive = true; // Persist data

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

### Event-Driven Authentication

```typescript
// Events
class LoginEvent implements BaseEvent {
  readonly type = 'login';
  readonly timestamp = Date.now();
  constructor(
    public readonly email: string,
    public readonly password: string
  ) {}
}

class LogoutEvent implements BaseEvent {
  readonly type = 'logout';
  readonly timestamp = Date.now();
}

// State
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Vertex
class AuthVertex extends Vertex<AuthState> {
  static keepAlive = true;

  constructor() {
    super({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });

    this.on(LoginEvent, async (event, emit) => {
      emit({ ...this.state, isLoading: true, error: null });

      try {
        const user = await auth.login(event.email, event.password);
        emit({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error) {
        emit({
          ...this.state,
          isLoading: false,
          error: error.message
        });
      }
    });

    this.on(LogoutEvent, (_, emit) => {
      emit({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    });
  }

  login = (email: string, password: string) => {
    this.add(new LoginEvent(email, password));
  };

  logout = () => {
    this.add(new LogoutEvent());
  };
}
```

---

## TypeScript Support

BlaC is fully typed with TypeScript. State types are inferred automatically:

```typescript
// State type is inferred as number
class CounterCubit extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
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
      todos: []
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
import type { ExtractState, AnyObject } from '@blac/core';

// Extract state type from a bloc
type CounterState = ExtractState<CounterCubit>; // number

// AnyObject type for generic constraints
interface UseBlocOptions<TBloc extends StateContainer<AnyObject>> {
  // ...options
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
- `emit(state)` - Emit new state (protected)
- `update(fn)` - Update with function (protected)

**Cubit:**
- All StateContainer methods
- `emit(state)` - Emit new state (public)
- `update(fn)` - Update with function (public)
- `patch(partial)` - Shallow merge (public, object state only)

**Vertex:**
- All StateContainer methods
- `add(event)` - Add event (public)
- `on(EventClass, handler)` - Register handler (protected)

### Static Container Methods

**Instance Access:**
- `Class.resolve(id?, ...args)` - Get/create instance with ownership (increments ref count)
- `Class.get(id?)` - Get existing instance without ownership (throws if not found)
- `Class.getSafe(id?)` - Get existing instance without ownership (returns discriminated union)
- `Class.connect(id?, ...args)` - Get/create instance for B2B (no ref count change, tracks dependencies)
- `Class.release(id?, force?)` - Release reference

**Instance Info:**
- `Class.hasInstance(id?)` - Check existence
- `Class.getRefCount(id?)` - Get reference count
- `Class.getAll()` - Get all instances (returns array)
- `Class.forEach(callback)` - Iterate over instances safely (disposal-safe, memory-efficient)
- `Class.clear()` - Clear all instances of type
- `StateContainer.clearAllInstances()` - Clear everything
- `StateContainer.getStats()` - Get registry statistics

### useBloc Options

```typescript
{
  staticProps?: any;                    // Constructor arguments
  instanceId?: string;                  // Custom instance ID
  dependencies?: (state, bloc) => any[]; // Manual tracking
  autoTrack?: boolean;                  // Enable/disable auto tracking
  onMount?: (bloc) => void;            // Mount callback
  onUnmount?: (bloc) => void;          // Unmount callback
}
```

### Static Properties

```typescript
static isolated = true;             // Each instance unique per component
static keepAlive = true;            // Persist without consumers
static __excludeFromDevTools = true; // Hide from DevTools panels
```

### Log Levels

```typescript
LogLevel.ERROR = 0
LogLevel.WARN = 1
LogLevel.INFO = 2
LogLevel.DEBUG = 3
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
class MyBloc extends Cubit<State> {
  static isolated = true; // Each component gets own instance
}

// ✅ Correct: Remove isolated for sharing
class MyBloc extends Cubit<State> {
  // Default: shared across components
}
```

### Instance Not Persisting

**Problem**: Instance gets disposed when component unmounts.

**Solution**: Use `keepAlive`:

```typescript
class MyBloc extends Cubit<State> {
  static keepAlive = true; // Persists after unmount
}
```

---

## Migration Guide

### From direct StateContainer to Cubit

```typescript
// Before
class Counter extends StateContainer<number> {
  increment = () => {
    this.emit(this.state + 1); // Error: emit is protected
  };
}

// After
class Counter extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1); // ✅ Works: emit is public
  };
}
```

### From manual dependencies to auto-tracking

```typescript
// Before
const [state, bloc] = useBloc(UserBloc, {
  dependencies: (s) => [s.name, s.email]
});

// After (simpler, automatic)
const [state, bloc] = useBloc(UserBloc);
// Automatically tracks accessed properties
```

### From getOrCreate to resolve/get/getSafe

The instance management API has been redesigned to make ownership semantics explicit:

```typescript
// Before: .getOrCreate() (always incremented ref count)
const counter = CounterCubit.getOrCreate('main', 0);

// After: Choose based on ownership needs

// 1. Ownership (replaces most .getOrCreate() usage)
const counter = CounterCubit.resolve('main', 0);

// 2. Borrowing - strict (for bloc-to-bloc communication)
const analytics = AnalyticsCubit.get('main');

// 3. Borrowing - safe (for conditional access)
const result = NotificationCubit.getSafe('user-123');
if (!result.error) {
  result.instance.markAsRead();
}
```

**Why the change:**
- `.resolve()` is familiar from DI containers and clearly indicates instance resolution
- `.get()` prevents memory leaks in bloc-to-bloc communication
- `.getSafe()` provides type-safe conditional access
- Avoids React linter issues (methods starting with "use" are flagged as hooks)

**Migration tips:**
- React components: Use `.resolve()` (handled automatically by `useBloc`/`useBlocActions`)
- Bloc methods calling other blocs: Use `.get()` (prevents memory leaks)
- Conditional instance access: Use `.getSafe()` (type-safe error handling)

---

## Performance Tips

1. **Use useBlocActions** for components that only dispatch actions
2. **Access only needed properties** in render to minimize tracking
3. **Use getters** for computed values - they're cached per render cycle
4. **Use patch()** instead of update() for simple field updates
5. **Mark isolated** blocs that don't need to be shared
6. **Use keepAlive** for expensive-to-recreate singletons
7. **Use `.get()` instead of `.resolve()`** in bloc-to-bloc communication to prevent memory leaks
8. **Use `.forEach()` instead of `.getAll()`** when working with 100+ instances
9. **Disable autoTrack** only if you have specific performance needs

---

## License

MIT


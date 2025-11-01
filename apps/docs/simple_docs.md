# BlaC Simple Documentation

TypeScript state management library with React integration. Uses proxy-based dependency tracking for optimal re-renders.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Core Package (@blac/core)

### StateContainer - Base State Management Class

The foundation for all state containers in BlaC. Provides state storage, subscriptions, and lifecycle management.

```typescript
import { StateContainer } from '@blac/core';

class CounterContainer extends StateContainer<number> {
  constructor() {
    super(0, { name: 'Counter' }); // initial state + config
  }

  // Protected methods for state updates
  increment = () => {
    this.update(state => state + 1);
  };
}
```

**Core Methods:**
- `state` - Get current state (readonly)
- `subscribe(callback)` - Subscribe to state changes, returns unsubscribe function
- `dispose()` - Clean up the container
- `isDisposed` - Check if disposed

**Protected Methods (for subclasses):**
- `emit(newState)` - Emit new state directly
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
class MyBloc extends Cubit<State> {
  static isolated = true;   // Each instance unique (default: false)
  static keepAlive = true;  // Never auto-dispose (default: false)
}
```

### Cubit - Simple State Container

Extends `StateContainer` with public state mutation methods for direct state management.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  // Use arrow functions for correct 'this' binding in React
  decrement = () => {
    this.emit(this.state - 1);
  };
}
```

**Public Methods:**
- `emit(newState)` - Emit new state directly
- `update(fn)` - Update with function `(current) => next`
- `patch(partial)` - Shallow merge partial state (object state only)
- `state` - Get current state (readonly)
- `subscribe(callback)` - Subscribe to changes
- `dispose()` - Clean up

### Using patch() for Object State

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

  // Using patch - concise for single/multiple fields
  setName = (name: string) => {
    this.patch({ name });
  };

  updateProfile = (name: string, age: number) => {
    this.patch({ name, age });
  };
}
```

**Important:** `patch()` performs **shallow merge only**. For nested updates, use `update()`:

```typescript
interface AppState {
  user: { name: string; email: string };
  settings: { theme: string; language: string };
}

class AppCubit extends Cubit<AppState> {
  updateTheme = (theme: string) => {
    // ✅ Correct: Use update for nested changes
    this.update(state => ({
      ...state,
      settings: { ...state.settings, theme }
    }));

    // ❌ Wrong: This replaces entire settings object
    // this.patch({ settings: { theme } });
  };
}
```

### Vertex - Event-Driven State Container (Bloc Pattern)

For event-driven architectures with explicit state transitions:

```typescript
import { Vertex, BaseEvent } from '@blac/core';

// Define events
class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

// Create Vertex with event handlers
class CounterVertex extends Vertex<number> {
  constructor() {
    super(0);

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit(this.state + event.amount);
    });
  }

  // Convenience methods
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}
```

**Methods:**
- `add(event)` - Add event to be processed
- `on(EventClass, handler)` - Register event handler (protected)

### Static Instance Management

All state containers support static instance management:

```typescript
// Get or create shared instance
const counter = CounterCubit.getOrCreate();
const named = CounterCubit.getOrCreate('main');

// With constructor arguments
const user = UserCubit.getOrCreate('user-123', { userId: '123' });

// Release reference (disposes when ref count reaches zero)
CounterCubit.release();
CounterCubit.release('main');

// Check if instance exists
const exists = CounterCubit.hasInstance('main');

// Get reference count
const refCount = CounterCubit.getRefCount('main');

// Get all instances of a type
const allCounters = CounterCubit.getAll();

// Clear all instances (mainly for testing)
StateContainer.clearAllInstances();
```

## React Package (@blac/react)

### useBloc Hook - Automatic Dependency Tracking

React hook with automatic proxy-based dependency tracking for optimal re-renders.

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
- `blocInstance` - The bloc instance with all methods
- `componentRef` - Internal reference (rarely needed)

### Automatic Dependency Tracking

useBloc uses Proxy to track which properties you access during render:

```typescript
interface UserState {
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

function UserCard() {
  const [user, bloc] = useBloc(UserBloc);

  // Component only re-renders when name or avatar change
  // Changes to email or bio won't trigger re-render
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
}
```

### Getter Tracking

useBloc also tracks getters automatically:

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
}

function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);

  // Re-renders when visibleTodos changes (computed value)
  return (
    <ul>
      {cubit.visibleTodos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

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

### useBlocActions Hook - Actions Only

Use when you only need to call methods without subscribing to state:

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

Benefits:
- No state subscription overhead
- No proxy tracking
- Never re-renders from bloc state changes
- Lighter weight for action-only components

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

// ComponentA and ComponentB have separate instances
function ComponentA() {
  const [count] = useBloc(LocalCounter);
  return <div>A: {count}</div>; // Independent count
}

function ComponentB() {
  const [count] = useBloc(LocalCounter);
  return <div>B: {count}</div>; // Different count
}
```

**Shared Instances** (Default) - Components share the same instance:

```typescript
class SharedCounter extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
}

// Both components share state
function ComponentA() {
  const [count] = useBloc(SharedCounter);
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(SharedCounter);
  return <div>B: {count}</div>; // Same count as A
}
```

### Keep Alive

Persist instances even without active consumers:

```typescript
class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true;  // Won't be disposed when no components use it

  constructor() {
    super(initialState);
  }
}
```

## Logging

Configure logging for debugging:

```typescript
import { configureLogger, LogLevel } from '@blac/core';

configureLogger({
  enabled: true,
  level: LogLevel.DEBUG, // ERROR, WARN, INFO, DEBUG
  output: (entry) => console.log(entry), // Custom output
});
```

Using logger in your code:

```typescript
import { createLogger, LogLevel } from '@blac/core';

const logger = createLogger({
  enabled: true,
  level: LogLevel.DEBUG,
  output: (entry) => console.log(JSON.stringify(entry))
});

logger.debug('MyComponent', 'Rendering', { props });
logger.info('MyBloc', 'State updated', { newState });
```

## Best Practices

1. **Always use arrow functions** for methods in Cubit/Vertex classes (ensures correct `this` binding in React)
2. **Keep state immutable** - always create new objects/arrays when updating
3. **Use `patch()`** for simple field updates on object state
4. **Use `update()`** for complex updates, array operations, or nested changes
5. **Use `static isolated = true`** for component-specific state (forms, local UI state)
6. **Use `static keepAlive = true`** for global persistent state (auth, app settings)
7. **Let automatic tracking work** - avoid manual `dependencies` unless needed for optimization
8. **Access only what you need** in components for optimal re-renders
9. **Use `useBlocActions`** when you only need to trigger actions without reading state

## Quick Reference

### Cubit/Vertex Methods
- `emit(state)` - Set new state directly
- `update(fn)` - Update with function
- `patch(partial)` - Shallow merge (object state only)
- `state` - Current state (readonly)
- `subscribe(callback)` - Subscribe to changes
- `dispose()` - Clean up
- `add(event)` - Add event (Vertex only)

### Static Container Methods
- `Class.getOrCreate(id?, ...args)` - Get/create instance
- `Class.release(id?)` - Release reference
- `Class.hasInstance(id?)` - Check existence
- `Class.getRefCount(id?)` - Get reference count
- `Class.getAll()` - Get all instances

### useBloc Options
- `staticProps` - Constructor arguments
- `instanceId` - Custom instance ID
- `dependencies` - Manual dependency tracking
- `autoTrack` - Enable/disable auto tracking
- `onMount` - Mount callback
- `onUnmount` - Unmount callback

### Configuration Options
- `name` - Debug name
- `debug` - Enable debug logging
- `instanceId` - Custom instance identifier

### Static Properties
- `static isolated = true` - Each instance unique per component
- `static keepAlive = true` - Persist without consumers

## TypeScript Support

BlaC is fully typed with TypeScript. State types are inferred automatically:

```typescript
// State type is inferred as number
class CounterCubit extends Cubit<number> {
  constructor() { super(0); }
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

// In React components
function App() {
  // Types are fully inferred
  const [state, cubit] = useBloc(AppCubit);
  // state is typed as AppState
  // cubit is typed as AppCubit
}
```
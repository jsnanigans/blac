# BlaC Simple Documentation

TypeScript state management library with React integration. Uses proxy-based dependency tracking for optimal re-renders.

## Installation

```bash
pnpm add @blac/core @blac/react
```

## Core Package (@blac/core)

### Cubit - Simple State Container

Extend `Cubit<S>` for direct state management.

```typescript
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
```

**Methods:**
- `emit(newState)` - Emit new state directly
- `update(fn)` - Update with function `(current) => next`
- `patch(partial)` - Shallow merge partial state (object state only)
- `state` - Get current state (readonly)
- `subscribe(callback)` - Subscribe to changes

**Configuration:**
```typescript
constructor() {
  super(initialState, {
    name: 'MyBloc',      // for debugging
    keepAlive: false,    // persist without consumers
    isolated: false,     // unique per component
    debug: false,        // enable logging
  });
}
```

### Complex State Example

```typescript
interface TodoState {
  items: Todo[];
  filter: 'all' | 'active' | 'done';
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({ items: [], filter: 'all' });
  }

  addTodo = (text: string) => {
    this.update(state => ({
      ...state,
      items: [...state.items, { id: Date.now(), text, done: false }]
    }));
  };

  toggleTodo = (id: number) => {
    this.update(state => ({
      ...state,
      items: state.items.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    }));
  };

  // Using patch() for simple field updates
  setFilter = (filter: 'all' | 'active' | 'done') => {
    this.patch({ filter });
  };
}
```

### Using patch() for Simple Updates

The `patch()` method provides a convenient way to update object state fields:

```typescript
interface UserState {
  name: string;
  age: number;
  email: string;
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({ name: 'John', age: 30, email: 'john@example.com' });
  }

  // Using patch - concise
  setName = (name: string) => {
    this.patch({ name });
  };

  // Equivalent using update
  setNameAlt = (name: string) => {
    this.update(state => ({ ...state, name }));
  };

  // Update multiple fields at once
  updateProfile = (name: string, age: number) => {
    this.patch({ name, age });
  };
}
```

**Important:** `patch()` performs **shallow merge only**. Nested objects are replaced, not merged:

```typescript
interface AppState {
  user: { name: string; email: string };
  settings: { theme: string; language: string };
}

class AppCubit extends Cubit<AppState> {
  updateTheme = (theme: string) => {
    // ❌ This replaces entire settings object
    this.patch({ settings: { theme } });
    // Result: settings.language is lost!

    // ✅ Use update for nested updates
    this.update(state => ({
      ...state,
      settings: { ...state.settings, theme }
    }));
  };
}
```

### Lifecycle Hooks

```typescript
class DataCubit extends Cubit<Data> {
  protected onMount() {
    // Called when first consumer subscribes
    this.fetchData();
  }

  protected onUnmount() {
    // Called when last consumer unsubscribes
    this.cleanup();
  }

  protected onDispose() {
    // Called when disposed
  }
}
```

### Static Instance Methods

```typescript
// Get or create shared instance
const counter = CounterCubit.getOrCreate();
const named = CounterCubit.getOrCreate('main');

// With constructor args
const user = UserCubit.getOrCreate('user-123', { userId: '123' });

// Release reference (disposes when ref count hits zero)
CounterCubit.release();
CounterCubit.release('main');

// Check if instance exists
const exists = CounterCubit.hasInstance('main');

// Get reference count
const count = CounterCubit.getRefCount('main');
```

## React Package (@blac/react)

### useBloc Hook

```typescript
import { useBloc } from '@blac/react';

function Counter() {
  const [count, cubit] = useBloc(CounterCubit);
  // Only re-renders when accessed properties change (automatic tracking)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>+</button>
    </div>
  );
}
```

**Returns:** `[state, blocInstance, componentRef]`

### Automatic Dependency Tracking

useBloc uses Proxy-based tracking. Only re-renders when accessed properties change.

```typescript
function UserCard() {
  const [user, bloc] = useBloc(UserBloc);

  // Only re-renders when user.name or user.avatar change
  return (
    <div>
      <img src={user.avatar} />
      <h2>{user.name}</h2>
      {/* user.email is NOT accessed, so changes to it won't cause re-render */}
    </div>
  );
}
```

### Options

```typescript
const [state, bloc] = useBloc(MyBloc, {
  // Pass constructor arguments
  staticProps: { userId: '123' },

  // Custom instance ID for shared blocs
  instanceId: 'main',

  // Manual dependency tracking (overrides automatic)
  dependencies: (state, bloc) => [state.count, state.name],

  // Lifecycle callbacks
  onMount: (bloc) => bloc.fetchData(),
  onUnmount: (bloc) => bloc.cleanup(),
});
```

### Isolated Instances

Each component gets its own instance.

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
  return <div>A: {count}</div>;
}

function ComponentB() {
  const [count] = useBloc(LocalCounter);
  return <div>B: {count}</div>; // Different count
}
```

### Shared State (Default)

```typescript
class SharedCounter extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
}

// Both components share the same instance
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

Persist instance even without consumers.

```typescript
class AuthBloc extends Cubit<AuthState> {
  constructor() {
    super(initialState, { keepAlive: true });
  }
}
```

## Logging

```typescript
import { BlacLogger, LogLevel } from '@blac/core';

BlacLogger.configure({
  enabled: true,
  level: LogLevel.DEBUG, // ERROR, WARN, INFO, DEBUG
});
```

## Best Practices

1. **Always use arrow functions** for methods in Cubit classes (for correct `this` binding)
2. **Keep state immutable** - always create new objects when updating
3. **Use `patch()`** for simple field updates on object state
4. **Use `update()`** for complex updates or nested state changes
5. **Enable `isolated: true`** for component-specific state
6. **Use `keepAlive: true`** for global state that should persist
7. **Let automatic tracking work** - avoid manual `dependencies` unless needed
8. **Access only what you need** in components for optimal re-renders

## Quick Reference

### Cubit Methods
- `emit(state)` - Emit new state directly
- `update(fn)` - Update with function `(current) => next`
- `patch(partial)` - Shallow merge partial state (object only)
- `state` - Current state (readonly)
- `subscribe(callback)` - Subscribe to changes
- `dispose()` - Clean up

### Static Methods
- `Class.getOrCreate(id?, ...args)` - Get/create instance
- `Class.release(id?)` - Release reference
- `Class.hasInstance(id?)` - Check existence
- `Class.getRefCount(id?)` - Get ref count

### useBloc Options
- `staticProps` - Constructor args
- `instanceId` - Custom instance ID
- `dependencies` - Manual tracking
- `onMount` - Mount callback
- `onUnmount` - Unmount callback

### Configuration
- `name` - Debug name
- `keepAlive` - Persist without consumers
- `isolated` - Unique per component
- `debug` - Enable logging

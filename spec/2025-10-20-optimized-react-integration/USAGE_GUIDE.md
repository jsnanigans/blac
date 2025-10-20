# useBlocAdapter Usage Guide

## Overview

`useBlocAdapter` is the next-generation React hook for BlaC state management. It provides a clean, performant, and React 18-compatible way to integrate Blocs with your React components.

## Key Benefits

1. **Selector-based optimization** - Only re-render when specific data changes
2. **Version-based change detection** - Eliminates expensive deep equality checks
3. **React 18 compatible** - Full support for Strict Mode, Suspense, and concurrent features
4. **Type-safe** - Full TypeScript support with inference
5. **Memory-safe** - Automatic cleanup with reference counting

## Basic Usage

### Simple Counter Example

```typescript
import { Cubit } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}

function Counter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}
```

## Advanced Usage

### Using Selectors for Optimization

Selectors allow you to subscribe to only the parts of state you need:

```typescript
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
  user: { name: string; email: string };
}

class TodoCubit extends Cubit<TodoState> {
  // ... implementation
}

// Only re-renders when todos.length changes
function TodoCount() {
  const [count] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.length,
  });

  return <div>Total: {count}</div>;
}

// Only re-renders when active count changes
function ActiveTodoCount() {
  const [count] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.filter(t => !t.completed).length,
  });

  return <div>Active: {count}</div>;
}

// Only re-renders when user.name changes
function UserGreeting() {
  const [userName] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.user.name,
  });

  return <h1>Hello, {userName}!</h1>;
}
```

###Custom Comparison Functions

By default, selectors use shallow equality. You can provide a custom comparison function:

```typescript
import { useBlocAdapter } from '@blac/react';

// Deep equality for complex objects
function deepEqual<R>(prev: R | undefined, next: R): boolean {
  return JSON.stringify(prev) === JSON.stringify(next);
}

function UserProfile() {
  const [user] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.user,
    compare: deepEqual, // Use deep comparison
  });

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}

// Always trigger re-render (never equal)
function AlwaysUpdate() {
  const [data] = useBlocAdapter(DataCubit, {
    selector: (state) => state.data,
    compare: () => false, // Always different
  });

  return <div>{data}</div>;
}
```

### Lifecycle Callbacks

Handle component mount and unmount:

```typescript
function DataLoader() {
  const [data, cubit] = useBlocAdapter(DataCubit, {
    onMount: (cubit) => {
      console.log('Component mounted, loading data...');
      cubit.loadData();
    },
    onUnmount: (cubit) => {
      console.log('Component unmounting, cleaning up...');
      cubit.cleanup();
    },
  });

  return <div>{data}</div>;
}
```

### Suspense Integration

Use Suspense for async data loading:

```typescript
class AsyncDataCubit extends Cubit<{ data: string | null; loading: boolean }> {
  loadingPromise: Promise<void> | null = null;

  constructor() {
    super({ data: null, loading: false });
  }

  loadData = async () => {
    if (this.loadingPromise) return this.loadingPromise;

    this.emit({ ...this.state, loading: true });

    this.loadingPromise = fetch('/api/data')
      .then(res => res.text())
      .then(data => {
        this.emit({ data, loading: false });
        this.loadingPromise = null;
      });

    return this.loadingPromise;
  };
}

function AsyncComponent() {
  const [state] = useBlocAdapter(AsyncDataCubit, {
    suspense: true,
    loadAsync: (cubit) => cubit.loadData(),
    isLoading: (cubit) => cubit.state.loading,
    getLoadingPromise: (cubit) => cubit.loadingPromise,
  });

  return <div>Data: {state.data}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncComponent />
    </Suspense>
  );
}
```

### Isolated Blocs

Create component-specific bloc instances:

```typescript
class FormCubit extends Cubit<FormState> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super({ name: '', email: '' });
  }

  // ... form methods
}

function UserForm() {
  // This component gets its own FormCubit instance
  const [formState, cubit] = useBlocAdapter(FormCubit);

  return (
    <form>
      <input
        value={formState.name}
        onChange={(e) => cubit.updateName(e.target.value)}
      />
    </form>
  );
}

// Each UserForm in the app will have independent state
function App() {
  return (
    <div>
      <UserForm /> {/* Independent instance #1 */}
      <UserForm /> {/* Independent instance #2 */}
    </div>
  );
}
```

### Custom Instance IDs

Share specific instances across components:

```typescript
function ChatMessages({ channelId }: { channelId: string }) {
  // Use channel ID as instance ID - all components with same channelId share the bloc
  const [messages, cubit] = useBlocAdapter(MessagesCubit, {
    staticProps: { channelId },
    instanceId: `messages-${channelId}`,
  });

  return (
    <div>
      {messages.map(msg => <Message key={msg.id} {...msg} />)}
    </div>
  );
}
```

## API Reference

### Hook Signature

```typescript
function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>>(
  BlocClass: B,
  options?: UseBlocAdapterOptions<InstanceType<B>>
): [BlocState<B>, InstanceType<B>];

function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>, R>(
  BlocClass: B,
  options: UseBlocAdapterOptions<InstanceType<B>, R> & {
    selector: Selector<BlocState<InstanceType<B>>, R>;
  }
): [R, InstanceType<B>];
```

### Options

```typescript
interface UseBlocAdapterOptions<B, R = any> {
  // Bloc configuration
  staticProps?: ConstructorParameters<BlocConstructor<B>>[0];
  instanceId?: string;

  // Selector options
  selector?: (state: BlocState<B>) => R;
  compare?: (prev: R | undefined, next: R) => boolean;

  // Suspense options
  suspense?: boolean;
  loadAsync?: (bloc: B) => Promise<void>;
  isLoading?: (bloc: B) => boolean;
  getLoadingPromise?: (bloc: B) => Promise<void> | null;

  // Lifecycle callbacks
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}
```

## Comparison with useBloc

| Feature | `useBloc` | `useBlocAdapter` |
|---------|-----------|------------------|
| Dependency Tracking | Proxy-based (automatic) | Selector-based (explicit) |
| Change Detection | Value comparison | Version + selector comparison |
| Re-render Optimization | Deep proxy tracking | Shallow selector comparison |
| Performance | Good for complex state access patterns | Excellent for focused state access |
| Type Inference | Good | Excellent |
| API Simplicity | Simple (no selectors needed) | Requires selectors for optimization |
| Memory Overhead | Higher (proxies) | Lower (version tracking) |

## When to Use Which Hook

### Use `useBloc` when:
- You access multiple unrelated parts of state
- You want automatic dependency tracking
- You prefer simpler API without selectors
- Your state access patterns are complex/dynamic

### Use `useBlocAdapter` when:
- You only need specific parts of state
- You want explicit control over re-renders
- You need maximum performance
- You have clear, focused state requirements

## Migration Guide

### From `useBloc` to `useBlocAdapter`

#### Before:
```typescript
function TodoList() {
  const [state, cubit] = useBloc(TodoCubit);
  const activeTodos = state.todos.filter(t => !t.completed);

  return (
    <div>
      {activeTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </div>
  );
}
```

#### After:
```typescript
function TodoList() {
  const [activeTodos, cubit] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.filter(t => !t.completed),
  });

  return (
    <div>
      {activeTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </div>
  );
}
```

## Best Practices

1. **Keep selectors pure and simple**
   ```typescript
   // ✅ Good
   selector: (state) => state.user.name

   // ❌ Avoid side effects
   selector: (state) => {
     console.log('selecting...'); // Side effect!
     return state.user.name;
   }
   ```

2. **Memoize complex selector computations in your Cubit**
   ```typescript
   class TodoCubit extends Cubit<TodoState> {
     get activeTodos() {
       return this.state.todos.filter(t => !t.completed);
     }
   }

   // Then use simple selector
   const [activeTodos] = useBlocAdapter(TodoCubit, {
     selector: (state, cubit) => cubit.activeTodos,
   });
   ```

3. **Use custom comparison wisely**
   ```typescript
   // Only use custom comparison when needed
   // Default shallow equality works for primitives and simple objects
   const [user] = useBlocAdapter(UserCubit, {
     selector: (state) => state.user,
     // Only add compare if default doesn't work
   });
   ```

4. **Colocate selectors for reuse**
   ```typescript
   // selectors.ts
   export const todoSelectors = {
     activeTodos: (state: TodoState) =>
       state.todos.filter(t => !t.completed),
     completedTodos: (state: TodoState) =>
       state.todos.filter(t => t.completed),
     todoCount: (state: TodoState) =>
       state.todos.length,
   };

   // Use in components
   function ActiveCount() {
     const [count] = useBlocAdapter(TodoCubit, {
       selector: todoSelectors.todoCount,
     });
     return <div>{count}</div>;
   }
   ```

## Debugging

### Debug Info

Get adapter debug information:

```typescript
import { getOrCreateAdapter } from '@blac/react';

const cubit = Blac.getBloc(MyCubit);
const adapter = getOrCreateAdapter(cubit);
const debugInfo = adapter.getDebugInfo();

console.log(debugInfo);
// {
//   blocUid: "...",
//   blocName: "MyCubit",
//   version: 5,
//   subscriberCount: 2,
//   generation: 0,
//   subscriptions: [...]
// }
```

### Cache Statistics

Monitor adapter cache:

```typescript
import { getAdapterCacheStats } from '@blac/react';

const stats = getAdapterCacheStats();
console.log(stats);
// {
//   totalCreated: 10,
//   lastCreated: 1634567890123,
//   lastCacheHit: 1634567891234
// }
```

## Troubleshooting

### Component not re-rendering

**Problem**: Component doesn't update when state changes

**Solution**: Check your selector - it might be returning the same reference

```typescript
// ❌ Problem: returns new array every time (always different reference)
selector: (state) => state.todos.map(t => t.id)

// ✅ Solution: use custom comparison or return stable reference
selector: (state) => state.todos,
compare: (prev, next) =>
  prev?.length === next?.length &&
  prev?.every((id, i) => id === next[i])
```

### Too many re-renders

**Problem**: Component re-renders more than expected

**Solution**: Selector returns new object/array on every call

```typescript
// ❌ Problem: creates new object every time
selector: (state) => ({ name: state.user.name })

// ✅ Solution: return primitive or use memoization in Cubit
selector: (state) => state.user.name
```

### Memory leaks

**Problem**: Memory grows over time

**Solution**: Ensure components unmount properly and check for circular references

```typescript
// Make sure cleanup happens
onUnmount: (cubit) => {
  cubit.dispose(); // If using isolated blocs
}
```

## Performance Tips

1. **Use selectors** - Only subscribe to what you need
2. **Avoid creating objects in selectors** - Return primitives or stable references
3. **Use memo in Cubits** - Cache expensive computations
4. **Leverage React.memo** - Prevent unnecessary child re-renders
5. **Monitor with DevTools** - Check re-render frequency

## Examples Repository

Check out the `/apps/playground` for interactive examples and more patterns!

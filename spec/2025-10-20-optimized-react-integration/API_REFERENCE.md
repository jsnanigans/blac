# API Reference: React Adapter Pattern

**Version**: 2.0.0
**Last Updated**: 2025-10-21
**Status**: Production Ready

---

## Table of Contents

- [Core Hooks](#core-hooks)
  - [useBlocAdapter](#useblocadapter)
  - [useBloc (Legacy)](#usebloc-legacy)
- [Adapter Pattern](#adapter-pattern)
  - [ReactBlocAdapter](#reactblocadapter)
  - [AdapterCache](#adaptercache)
- [Types](#types)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Core Hooks

### useBlocAdapter

The primary hook for integrating BlaC state management with React components using the modern adapter pattern.

#### Signature

```typescript
function useBlocAdapter<B extends BlocConstructor<BlocBase<any>>>(
  BlocClass: B,
  options?: UseBlocAdapterOptions<InstanceType<B>>
): [BlocState<InstanceType<B>>, InstanceType<B>];

function useBlocAdapter<
  B extends BlocConstructor<BlocBase<any>>,
  R = any
>(
  BlocClass: B,
  options: UseBlocAdapterOptions<InstanceType<B>, R> & {
    selector: Selector<BlocState<InstanceType<B>>, R>;
  }
): [R, InstanceType<B>];
```

#### Parameters

##### `BlocClass` (required)

The Bloc or Cubit class to instantiate or retrieve from the registry.

```typescript
class CounterBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

// Usage
const [count, bloc] = useBlocAdapter(CounterBloc);
```

##### `options` (optional)

Configuration object for customizing the adapter behavior.

**Type**: `UseBlocAdapterOptions<B, R>`

---

#### Options

##### `selector`

Fine-grained state subscription using a selector function.

**Type**: `(state: State) => Result`
**Default**: `undefined` (subscribes to full state)

```typescript
// Subscribe to specific part of state
const [count, bloc] = useBlocAdapter(TodoBloc, {
  selector: (state) => state.todos.length,
});
```

**Performance Note**: When selector result doesn't change (using `Object.is` comparison), the component won't re-render even if the overall state changes.

##### `compare`

Custom equality function for comparing selector results.

**Type**: `(prev: R, next: R) => boolean`
**Default**: `Object.is`

```typescript
const [todos, bloc] = useBlocAdapter(TodoBloc, {
  selector: (state) => state.todos,
  compare: (prev, next) => {
    // Deep comparison for array contents
    return prev.length === next.length &&
           prev.every((item, i) => item.id === next[i].id);
  },
});
```

##### `staticProps`

Props to pass to the Bloc constructor.

**Type**: `ConstructorParameters<BlocConstructor<B>>[0]`
**Default**: `undefined`

```typescript
class UserBloc extends Vertex<UserState, UserEvents, { userId: string }> {
  constructor(props: { userId: string }) {
    super(initialState);
    this.userId = props.userId;
  }
}

// Usage
const [user, bloc] = useBlocAdapter(UserBloc, {
  staticProps: { userId: '123' },
});
```

##### `instanceId`

Custom instance identifier for shared blocs.

**Type**: `string`
**Default**: Auto-generated for isolated blocs, `undefined` for shared

```typescript
// Shared instance across components
const [state, bloc] = useBlocAdapter(UserBloc, {
  instanceId: 'current-user',
});
```

##### `suspense`

Enable React Suspense integration for async operations.

**Type**: `boolean`
**Default**: `false`

**Note**: Currently requires manual implementation. See [Suspense Patterns](#suspense-patterns) for details.

```typescript
const [data, bloc] = useBlocAdapter(AsyncDataBloc, {
  suspense: true,
  loadAsync: (bloc) => bloc.loadData(),
  isLoading: (bloc) => bloc.state.loading,
  getLoadingPromise: (bloc) => bloc.loadingPromise,
});
```

##### `loadAsync`

Async initialization function for Suspense.

**Type**: `(bloc: B) => Promise<void>`
**Default**: `undefined`

Used with `suspense: true` to initiate async loading.

##### `isLoading`

Function to check if bloc is currently loading.

**Type**: `(bloc: B) => boolean`
**Default**: `undefined`

##### `getLoadingPromise`

Function to retrieve the loading promise for Suspense.

**Type**: `(bloc: B) => Promise<void> | null`
**Default**: `undefined`

##### `onMount`

Callback when component mounts.

**Type**: `(bloc: B) => void`
**Default**: `undefined`

```typescript
const [state, bloc] = useBlocAdapter(CounterBloc, {
  onMount: (bloc) => {
    console.log('Component mounted with bloc:', bloc);
    // Initialize if needed
  },
});
```

##### `onUnmount`

Callback when component unmounts.

**Type**: `(bloc: B) => void`
**Default**: `undefined`

```typescript
const [state, bloc] = useBlocAdapter(CounterBloc, {
  onUnmount: (bloc) => {
    console.log('Component unmounting');
    // Cleanup if needed
  },
});
```

---

#### Return Value

Returns a tuple with:

1. **State or Selector Result**: The current state (or selector result if provided)
2. **Bloc Instance**: The bloc instance for dispatching actions

**Type**: `[State | R, B]`

```typescript
const [count, counterBloc] = useBlocAdapter(CounterBloc);
//     ^state    ^bloc instance

// With selector
const [todoCount, todoBloc] = useBlocAdapter(TodoBloc, {
  selector: (state) => state.todos.length,
});
//     ^selector result  ^bloc instance
```

---

### Examples

#### Basic Usage

```typescript
import { useBlocAdapter } from '@blac/react';
import { CounterCubit } from './CounterCubit';

function Counter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={cubit.increment}>Increment</button>
      <button onClick={cubit.decrement}>Decrement</button>
    </div>
  );
}
```

#### With Selector

```typescript
import { useBlocAdapter } from '@blac/react';
import { TodoBloc } from './TodoBloc';

function TodoCount() {
  // Only re-renders when todo count changes
  const [count, bloc] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos.length,
  });

  return <div>Total Todos: {count}</div>;
}
```

#### With Props

```typescript
import { useBlocAdapter } from '@blac/react';
import { UserBloc } from './UserBloc';

function UserProfile({ userId }: { userId: string }) {
  const [user, bloc] = useBlocAdapter(UserBloc, {
    staticProps: { userId },
  });

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

#### With Lifecycle Callbacks

```typescript
import { useBlocAdapter } from '@blac/react';
import { AnalyticsBloc } from './AnalyticsBloc';

function Dashboard() {
  const [state, bloc] = useBlocAdapter(AnalyticsBloc, {
    onMount: (bloc) => {
      // Track page view
      bloc.trackPageView('dashboard');
    },
    onUnmount: (bloc) => {
      // Track time on page
      bloc.trackTimeOnPage('dashboard');
    },
  });

  return <div>Dashboard content...</div>;
}
```

#### With Manual Suspense

```typescript
import { Suspense } from 'react';
import { useBlocAdapter } from '@blac/react';
import { AsyncDataBloc } from './AsyncDataBloc';

function AsyncComponent() {
  const [state, bloc] = useBlocAdapter(AsyncDataBloc);

  // Manual Suspense pattern
  if (!state.data && bloc.loadingPromise) {
    throw bloc.loadingPromise;
  }

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

#### With Complex Selector

```typescript
import { useBlocAdapter } from '@blac/react';
import { ShoppingCartBloc } from './ShoppingCartBloc';

function CartSummary() {
  const [summary, bloc] = useBlocAdapter(ShoppingCartBloc, {
    selector: (state) => ({
      itemCount: state.items.length,
      total: state.items.reduce((sum, item) => sum + item.price * item.qty, 0),
      hasDiscount: state.discountCode !== null,
    }),
    // Custom comparison to avoid unnecessary re-renders
    compare: (prev, next) =>
      prev.itemCount === next.itemCount &&
      prev.total === next.total &&
      prev.hasDiscount === next.hasDiscount,
  });

  return (
    <div>
      <p>Items: {summary.itemCount}</p>
      <p>Total: ${summary.total.toFixed(2)}</p>
      {summary.hasDiscount && <p>Discount applied!</p>}
    </div>
  );
}
```

---

## useBloc (Legacy)

The legacy hook for BlaC integration. **Deprecated** in favor of `useBlocAdapter`.

```typescript
// ❌ Old pattern (still works, but not recommended)
const [state, bloc] = useBloc(CounterBloc);

// ✅ New pattern (recommended)
const [state, bloc] = useBlocAdapter(CounterBloc);
```

See [Migration Guide](#migration-guide) for details on migrating from `useBloc` to `useBlocAdapter`.

---

## Adapter Pattern

### ReactBlocAdapter

Internal adapter class that bridges BlaC state management with React's subscription model.

**Usage**: You typically won't interact with this class directly. It's created automatically by `useBlocAdapter`.

#### Key Features

- **Version-based change detection**: O(1) performance using integer version counter
- **Selector support**: Fine-grained subscriptions with automatic result caching
- **Reference counting**: Automatic lifecycle management
- **SSR compatibility**: Server snapshot support via `getServerSnapshot`

#### Methods

##### `subscribe(selector?, onStoreChange, compare?)`

Subscribe to state changes.

**Parameters**:
- `selector`: Optional selector function
- `onStoreChange`: Callback when state changes
- `compare`: Optional custom equality function

**Returns**: Unsubscribe function

##### `getSnapshot(selector?)`

Get current state snapshot.

**Parameters**:
- `selector`: Optional selector function

**Returns**: Current state or selector result

##### `getServerSnapshot(selector?)`

Get initial state for SSR.

**Parameters**:
- `selector`: Optional selector function

**Returns**: Initial state or selector result

##### `dispose()`

Dispose of the adapter and clean up resources.

---

### AdapterCache

Global WeakMap-based cache for adapters. Ensures one adapter per bloc instance.

**Usage**: Automatically managed by `getOrCreateAdapter()`. No direct interaction needed.

---

## Types

### `UseBlocAdapterOptions<B, R>`

Configuration options for `useBlocAdapter`.

```typescript
interface UseBlocAdapterOptions<B extends BlocBase<any>, R = any> {
  staticProps?: ConstructorParameters<BlocConstructor<B>>[0];
  instanceId?: string;
  selector?: Selector<BlocState<B>, R>;
  compare?: CompareFn<R>;
  suspense?: boolean;
  loadAsync?: (bloc: B) => Promise<void>;
  isLoading?: (bloc: B) => boolean;
  getLoadingPromise?: (bloc: B) => Promise<void> | null;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}
```

### `Selector<State, Result>`

Function that derives a value from state.

```typescript
type Selector<State, Result> = (state: State) => Result;
```

### `CompareFn<T>`

Function that compares two values for equality.

```typescript
type CompareFn<T> = (prev: T, next: T) => boolean;
```

---

## Best Practices

### 1. Use Selectors for Fine-Grained Subscriptions

```typescript
// ✅ Good: Only re-renders when count changes
const [count, bloc] = useBlocAdapter(TodoBloc, {
  selector: (state) => state.todos.length,
});

// ❌ Avoid: Re-renders on ANY state change
const [state, bloc] = useBlocAdapter(TodoBloc);
const count = state.todos.length;
```

### 2. Memoize Complex Selectors

```typescript
const filterSelector = useCallback(
  (state: TodoState) => state.todos.filter(t => !t.completed),
  [] // No dependencies - stable across renders
);

const [activeTodos, bloc] = useBlocAdapter(TodoBloc, {
  selector: filterSelector,
});
```

### 3. Use Custom Compare for Complex Results

```typescript
// For arrays or objects, provide custom comparison
const [items, bloc] = useBlocAdapter(ListBloc, {
  selector: (state) => state.items,
  compare: (prev, next) => {
    return prev.length === next.length &&
           prev.every((item, i) => item.id === next[i].id);
  },
});
```

### 4. Leverage onMount/onUnmount for Side Effects

```typescript
const [state, bloc] = useBlocAdapter(AnalyticsBloc, {
  onMount: (bloc) => {
    // Initialize analytics
    bloc.startTracking();
  },
  onUnmount: (bloc) => {
    // Cleanup
    bloc.stopTracking();
  },
});
```

### 5. Share Blocs Across Components

```typescript
// Both components share the same instance
function ComponentA() {
  const [state] = useBlocAdapter(SharedBloc, {
    instanceId: 'shared-instance',
  });
  // ...
}

function ComponentB() {
  const [state] = useBlocAdapter(SharedBloc, {
    instanceId: 'shared-instance',
  });
  // ...
}
```

---

## Migration Guide

### From `useBloc` to `useBlocAdapter`

The migration is straightforward - `useBlocAdapter` has the same API for basic usage:

```typescript
// Before
import { useBloc } from '@blac/react';
const [state, bloc] = useBloc(CounterBloc);

// After
import { useBlocAdapter } from '@blac/react';
const [state, bloc] = useBlocAdapter(CounterBloc);
```

**Benefits of Migration**:

1. **Better React 18 Compatibility**: Full support for Strict Mode, Suspense, concurrent rendering
2. **Performance**: Version-based change detection (O(1) vs O(n) deep comparison)
3. **Memory Management**: Improved lifecycle handling with reference counting
4. **Selector Support**: Built-in fine-grained subscriptions

### Breaking Changes

None. The adapter pattern is fully backward compatible with existing `useBloc` usage.

---

## TypeScript Support

All hooks and types are fully typed with TypeScript for excellent IDE support.

### Type Inference

```typescript
class CounterCubit extends Cubit<number> {
  constructor() { super(0); }
  increment = () => this.emit(this.state + 1);
}

// Type inference works automatically
const [count, cubit] = useBlocAdapter(CounterCubit);
//     ^number       ^CounterCubit

// Selector result type is inferred
const [doubled, cubit] = useBlocAdapter(CounterCubit, {
  selector: (state) => state * 2,
});
//     ^number (inferred from selector)
```

### Generic Constraints

```typescript
// Custom selector with explicit type
const [items, bloc] = useBlocAdapter(TodoBloc, {
  selector: (state): Todo[] => state.todos.filter(t => !t.completed),
});
```

---

## Performance Characteristics

Based on benchmark results (see [PERFORMANCE_REPORT.md](/spec/2025-10-20-optimized-react-integration/PERFORMANCE_REPORT.md)):

- **Adapter creation**: ~2.6ms for 1000 adapters
- **Cache hit (reuse)**: ~0.046ms (55x faster than creation)
- **State change notification**: ~0.28ms for 1000 rapid changes
- **Selector evaluation**: ~0.31ms (simple), ~0.26ms (complex with filtering)
- **Subscribe/unsubscribe**: ~0.40ms per cycle
- **Version increment**: O(1) constant time

**Key Takeaway**: The adapter pattern is highly performant and scales well to thousands of components and state changes.

---

## React 18 Features

### Automatic Batching

React 18 automatically batches all state updates, including those in `setTimeout` and promises.

```typescript
function Counter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  const handleClick = () => {
    setTimeout(() => {
      cubit.increment(); // \
      cubit.increment(); // |-- Batched into single re-render
      cubit.increment(); // /
    }, 0);
  };

  return <button onClick={handleClick}>Add 3</button>;
}
```

### Concurrent Rendering

Works seamlessly with `useTransition` and `useDeferredValue`.

```typescript
function SearchResults() {
  const [state, bloc] = useBlocAdapter(SearchBloc);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (query: string) => {
    startTransition(() => {
      // Mark as low-priority update
      bloc.search(query);
    });
  };

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <p>Updating...</p>}
      <ResultsList items={state.results} />
    </div>
  );
}
```

### Strict Mode

Fully compatible with React Strict Mode. The adapter pattern handles double mounting/unmounting without issues.

```typescript
<StrictMode>
  <App />
</StrictMode>
```

---

## Troubleshooting

### Component Not Re-Rendering

**Issue**: Component doesn't update when state changes.

**Solution**:
1. Verify selector returns a new value when it should
2. Check custom `compare` function logic
3. Ensure bloc instance isn't being recreated each render

```typescript
// ❌ Problem: Selector always returns same reference
selector: (state) => state.items.filter(() => true) // New array every time!

// ✅ Solution: Provide compare function
selector: (state) => state.items.filter(() => true),
compare: (prev, next) => prev.length === next.length
```

### Memory Leaks

**Issue**: Components continue to receive updates after unmounting.

**Solution**: The adapter automatically cleans up subscriptions. If you see leaks:
1. Check for manual subscriptions without cleanup
2. Verify `onUnmount` callback isn't preventing disposal
3. Use React DevTools Profiler to identify the leak source

### Type Errors

**Issue**: TypeScript errors with selector return types.

**Solution**: Add explicit return type to selector:

```typescript
const [items, bloc] = useBlocAdapter(TodoBloc, {
  selector: (state): Todo[] => state.todos,
});
```

---

## Additional Resources

- [React 18 Patterns Guide](/spec/2025-10-20-optimized-react-integration/REACT18_PATTERNS.md)
- [Performance Report](/spec/2025-10-20-optimized-react-integration/PERFORMANCE_REPORT.md)
- [Usage Guide](/spec/2025-10-20-optimized-react-integration/USAGE_GUIDE.md)
- [Implementation Summary](/spec/2025-10-20-optimized-react-integration/IMPLEMENTATION_SUMMARY.md)

---

**Last Updated**: 2025-10-21
**Status**: Production Ready
**Version**: 2.0.0

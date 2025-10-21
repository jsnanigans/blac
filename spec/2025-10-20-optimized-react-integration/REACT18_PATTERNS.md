# React 18 Patterns with BlaC

**Version**: 2.0.0
**Last Updated**: 2025-10-21
**React Version**: 18.x

---

## Table of Contents

- [Suspense](#suspense)
- [Concurrent Features](#concurrent-features)
- [Automatic Batching](#automatic-batching)
- [Server-Side Rendering](#server-side-rendering)
- [Performance Patterns](#performance-patterns)
- [Best Practices](#best-practices)

---

## Suspense

React Suspense allows components to "wait" for async operations before rendering. BlaC supports Suspense through a **manual pattern** that gives you full control.

### Basic Async Loading

**Pattern**: Throw a promise from your component to trigger Suspense.

```typescript
import { Suspense } from 'react';
import { Cubit } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

// 1. Create async-aware Cubit
class UserDataCubit extends Cubit<{ user: User | null; error: string | null }> {
  private _loadingPromise: Promise<void> | null = null;

  constructor() {
    super({ user: null, error: null });
  }

  get loadingPromise(): Promise<void> | null {
    return this._loadingPromise;
  }

  loadUser = async (userId: string) => {
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(user => {
        this.emit({ user, error: null });
        this._loadingPromise = null;
      })
      .catch(error => {
        this.emit({ user: null, error: error.message });
        this._loadingPromise = null;
      });

    return this._loadingPromise;
  };
}

// 2. Component with manual Suspense
function UserProfile({ userId }: { userId: string }) {
  const [state, cubit] = useBlocAdapter(UserDataCubit);

  // Trigger Suspense if loading
  if (!state.user && !state.error && cubit.loadingPromise) {
    throw cubit.loadingPromise;
  }

  // Error state
  if (state.error) {
    return <div>Error: {state.error}</div>;
  }

  // Success state
  return (
    <div>
      <h1>{state.user?.name}</h1>
      <p>{state.user?.email}</p>
    </div>
  );
}

// 3. Wrap in Suspense boundary
function App() {
  React.useEffect(() => {
    const cubit = Blac.getBloc(UserDataCubit);
    cubit.loadUser('123');
  }, []);

  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

**Why Manual Pattern?**
- You control exactly when to throw the promise
- Clear separation between loading, success, and error states
- Works reliably with React's subscription model
- No architectural conflicts with `useSyncExternalStore`

---

### Error Boundaries

Combine Suspense with Error Boundaries for complete async handling.

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

// 1. Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: (error: Error) => ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

// 2. Cubit that can fail
class AsyncDataCubit extends Cubit<{ data: string | null }> {
  private _promise: Promise<void> | null = null;

  constructor() {
    super({ data: null });
  }

  get promise() {
    return this._promise;
  }

  loadData = async () => {
    if (this._promise) return this._promise;

    this._promise = fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      })
      .then(data => {
        this.emit({ data });
        this._promise = null;
      })
      .catch(error => {
        this._promise = null;
        throw error; // Let Error Boundary catch it
      });

    return this._promise;
  };
}

// 3. Component that throws on error
function DataDisplay() {
  const [state, cubit] = useBlocAdapter(AsyncDataCubit);

  if (!state.data && cubit.promise) {
    throw cubit.promise; // Throws rejected promise if fetch fails
  }

  return <div>Data: {state.data}</div>;
}

// 4. App with both boundaries
function App() {
  return (
    <ErrorBoundary fallback={(error) => <div>Error: {error.message}</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <DataDisplay />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Data Fetching Pattern

**Best Practice**: Initiate loading outside component lifecycle.

```typescript
class PostsCubit extends Cubit<{ posts: Post[]; loading: boolean }> {
  private _loadingPromise: Promise<void> | null = null;

  constructor() {
    super({ posts: [], loading: false });
    // Auto-load on creation
    this.loadPosts();
  }

  get loadingPromise() {
    return this._loadingPromise;
  }

  loadPosts = async () => {
    if (this._loadingPromise) return this._loadingPromise;

    this._loadingPromise = fetch('/api/posts')
      .then(res => res.json())
      .then(posts => {
        this.emit({ posts, loading: false });
        this._loadingPromise = null;
      });

    return this._loadingPromise;
  };

  refreshPosts = () => {
    this._loadingPromise = null; // Reset
    return this.loadPosts();
  };
}

function PostsList() {
  const [state, cubit] = useBlocAdapter(PostsCubit);

  // Throw promise for Suspense
  if (cubit.loadingPromise) {
    throw cubit.loadingPromise;
  }

  return (
    <div>
      <button onClick={cubit.refreshPosts}>Refresh</button>
      {state.posts.map(post => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div>Loading posts...</div>}>
      <PostsList />
    </Suspense>
  );
}
```

---

## Concurrent Features

React 18 introduces concurrent rendering features that work seamlessly with BlaC.

### useTransition

Mark state updates as non-urgent to keep UI responsive.

```typescript
import { useTransition } from 'react';
import { useBlocAdapter } from '@blac/react';

class SearchCubit extends Cubit<{ query: string; results: SearchResult[] }> {
  constructor() {
    super({ query: '', results: [] });
  }

  setQuery = (query: string) => {
    this.emit({ ...this.state, query });
  };

  search = async (query: string) => {
    const results = await fetch(`/api/search?q=${query}`).then(r => r.json());
    this.emit({ ...this.state, results });
  };
}

function SearchBox() {
  const [state, cubit] = useBlocAdapter(SearchCubit);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;

    // Update input immediately (urgent)
    cubit.setQuery(query);

    // Search in background (non-urgent)
    startTransition(() => {
      cubit.search(query);
    });
  };

  return (
    <div>
      <input
        value={state.query}
        onChange={handleChange}
        placeholder="Search..."
      />
      {isPending && <span>Searching...</span>}
      <SearchResults results={state.results} />
    </div>
  );
}
```

**Key Points**:
- Input updates happen immediately (responsive)
- Search happens in background (non-blocking)
- `isPending` shows loading state without blocking UI

---

### useDeferredValue

Defer expensive computations to keep UI responsive.

```typescript
import { useDeferredValue, useMemo } from 'react';
import { useBlocAdapter } from '@blac/react';

class FilterCubit extends Cubit<{ items: Item[]; filter: string }> {
  constructor() {
    super({
      items: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      })),
      filter: '',
    });
  }

  setFilter = (filter: string) => {
    this.emit({ ...this.state, filter });
  };
}

function FilteredList() {
  const [state, cubit] = useBlocAdapter(FilterCubit);

  // Defer the filter value
  const deferredFilter = useDeferredValue(state.filter);

  // Expensive computation uses deferred value
  const filteredItems = useMemo(() => {
    return state.items.filter(item =>
      item.name.toLowerCase().includes(deferredFilter.toLowerCase())
    );
  }, [state.items, deferredFilter]);

  return (
    <div>
      <input
        value={state.filter}
        onChange={(e) => cubit.setFilter(e.target.value)}
        placeholder="Filter items..."
      />
      {state.filter !== deferredFilter && <p>Updating...</p>}
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Benefits**:
- Input remains responsive during filtering
- Expensive computation happens in background
- User sees immediate feedback

---

### Combining useTransition and useDeferredValue

```typescript
class TabsCubit extends Cubit<{ activeTab: string; content: Record<string, string> }> {
  constructor() {
    super({
      activeTab: 'tab1',
      content: {
        tab1: 'Content 1',
        tab2: 'Content 2',
        tab3: 'Content 3',
      },
    });
  }

  setActiveTab = (tab: string) => {
    this.emit({ ...this.state, activeTab: tab });
  };
}

function Tabs() {
  const [state, cubit] = useBlocAdapter(TabsCubit);
  const [isPending, startTransition] = useTransition();
  const deferredTab = useDeferredValue(state.activeTab);

  const handleTabClick = (tab: string) => {
    startTransition(() => {
      cubit.setActiveTab(tab);
    });
  };

  return (
    <div>
      <div className="tabs">
        {Object.keys(state.content).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={state.activeTab === tab ? 'active' : ''}
          >
            {tab}
            {isPending && state.activeTab === tab && ' ⏳'}
          </button>
        ))}
      </div>
      <div className="content">
        <ExpensiveTabContent tab={deferredTab} content={state.content[deferredTab]} />
      </div>
    </div>
  );
}
```

---

## Automatic Batching

React 18 automatically batches all state updates, including those in setTimeout, promises, and native event handlers.

### Event Handler Batching

```typescript
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  add = (amount: number) => {
    this.emit(this.state + amount);
  };
}

function Counter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  const handleClick = () => {
    // All three updates are batched into one re-render
    cubit.increment();
    cubit.increment();
    cubit.increment();
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Add 3</button>
    </div>
  );
}
```

---

### Async Batching (New in React 18)

```typescript
function AsyncCounter() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  const handleAsyncClick = () => {
    setTimeout(() => {
      // React 18 batches even in setTimeout!
      cubit.increment();
      cubit.increment();
      cubit.increment();
    }, 1000);
  };

  const handlePromiseClick = () => {
    Promise.resolve().then(() => {
      // React 18 batches in promises too!
      cubit.increment();
      cubit.increment();
    });
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleAsyncClick}>Add 3 (delayed)</button>
      <button onClick={handlePromiseClick}>Add 2 (promise)</button>
    </div>
  );
}
```

**Note**: In React 17, these would cause separate re-renders. React 18 batches them automatically.

---

### Opting Out of Batching

If you need separate renders (rare), use `flushSync`:

```typescript
import { flushSync } from 'react-dom';

function CounterWithFlush() {
  const [count, cubit] = useBlocAdapter(CounterCubit);

  const handleClick = () => {
    flushSync(() => {
      cubit.increment(); // Render 1
    });
    flushSync(() => {
      cubit.increment(); // Render 2
    });
    cubit.increment(); // Render 3
  };

  return <button onClick={handleClick}>Add 3 (3 renders)</button>;
}
```

**Warning**: `flushSync` should be rare. Batching is better for performance.

---

## Server-Side Rendering

BlaC's adapter pattern supports SSR through `getServerSnapshot`.

### Basic SSR Setup

```typescript
// Server-side rendering
import { renderToString } from 'react-dom/server';
import { Blac } from '@blac/core';

class AppCubit extends Cubit<{ data: string }> {
  constructor() {
    super({ data: 'Server data' });
  }
}

function App() {
  const [state] = useBlocAdapter(AppCubit);
  return <div>{state.data}</div>;
}

// Server
const html = renderToString(<App />);
// <div>Server data</div>
```

---

### Next.js Integration

```typescript
// pages/index.tsx
import { GetServerSideProps } from 'next';
import { Blac } from '@blac/core';
import { useBlocAdapter } from '@blac/react';

class PageDataCubit extends Cubit<{ title: string; content: string }> {
  constructor(data: { title: string; content: string }) {
    super(data);
  }
}

export const getServerSideProps: GetServerSideProps = async () => {
  const data = await fetchPageData();

  return {
    props: { data },
  };
};

export default function Page({ data }: { data: any }) {
  const [state] = useBlocAdapter(PageDataCubit, {
    staticProps: data,
  });

  return (
    <div>
      <h1>{state.title}</h1>
      <p>{state.content}</p>
    </div>
  );
}
```

---

### Hydration Safety

Ensure server and client states match:

```typescript
class HydrationSafeCubit extends Cubit<{ timestamp: number | null }> {
  constructor() {
    // Use null initially to match server
    super({ timestamp: null });
  }

  initializeClientSide = () => {
    // Only set timestamp on client
    if (typeof window !== 'undefined') {
      this.emit({ timestamp: Date.now() });
    }
  };
}

function ClientOnlyData() {
  const [state, cubit] = useBlocAdapter(HydrationSafeCubit, {
    onMount: (cubit) => cubit.initializeClientSide(),
  });

  return <div>Timestamp: {state.timestamp || 'N/A'}</div>;
}
```

---

## Performance Patterns

### Selector Optimization

Use selectors to subscribe to only what you need:

```typescript
class TodoCubit extends Cubit<{ todos: Todo[]; filter: string }> {
  // ... implementation
}

// ❌ Bad: Re-renders on ANY state change
function TodoCount() {
  const [state] = useBlocAdapter(TodoCubit);
  return <div>Count: {state.todos.length}</div>;
}

// ✅ Good: Only re-renders when count changes
function TodoCount() {
  const [count] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.length,
  });
  return <div>Count: {count}</div>;
}
```

---

### Memoization Strategies

Combine selectors with custom comparison:

```typescript
// Complex derived state
function ActiveTodos() {
  const [activeTodos] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.filter(t => !t.completed),
    compare: (prev, next) => {
      // Custom comparison to avoid unnecessary re-renders
      return prev.length === next.length &&
             prev.every((todo, i) => todo.id === next[i].id);
    },
  });

  return (
    <ul>
      {activeTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

---

### Large List Handling

Use virtualization with selectors:

```typescript
import { FixedSizeList } from 'react-window';

class ItemListCubit extends Cubit<{ items: Item[] }> {
  constructor() {
    super({ items: generateLargeList(10000) });
  }
}

function VirtualizedList() {
  // Only subscribe to items array
  const [items] = useBlocAdapter(ItemListCubit, {
    selector: (state) => state.items,
  });

  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Best Practices

### 1. Use Manual Suspense Pattern

```typescript
// ✅ Recommended: Manual Suspense
function DataComponent() {
  const [state, cubit] = useBlocAdapter(DataCubit);

  if (!state.data && cubit.loadingPromise) {
    throw cubit.loadingPromise;
  }

  return <div>{state.data}</div>;
}
```

### 2. Combine Error Boundaries with Suspense

```typescript
// ✅ Always wrap Suspense with Error Boundary
<ErrorBoundary fallback={ErrorFallback}>
  <Suspense fallback={<Loading />}>
    <AsyncComponent />
  </Suspense>
</ErrorBoundary>
```

### 3. Use Selectors for Performance

```typescript
// ✅ Subscribe to only what you need
const [count] = useBlocAdapter(TodoCubit, {
  selector: (state) => state.todos.length,
});
```

### 4. Leverage Automatic Batching

```typescript
// ✅ Multiple updates in same tick are automatically batched
setTimeout(() => {
  cubit.update1();
  cubit.update2();
  cubit.update3();
}, 0);
```

### 5. Keep Cubits Simple

```typescript
// ✅ Single responsibility
class UserCubit extends Cubit<User> {
  loadUser = async (id: string) => { /* ... */ };
  updateUser = (updates: Partial<User>) => { /* ... */ };
}

// ❌ Too many responsibilities
class AppCubit extends Cubit<AppState> {
  loadUser = () => { /* ... */ };
  loadPosts = () => { /* ... */ };
  loadComments = () => { /* ... */ };
  // ... 20 more methods
}
```

---

## Common Pitfalls

### ❌ Don't Use Built-in Suspense Option

```typescript
// ❌ Avoid: Has architectural issues
const [data] = useBlocAdapter(DataCubit, {
  suspense: true,
  loadAsync: (cubit) => cubit.load(),
});

// ✅ Use: Manual pattern instead
const [data, cubit] = useBlocAdapter(DataCubit);
if (!data && cubit.promise) throw cubit.promise;
```

### ❌ Don't Create New Selectors Each Render

```typescript
// ❌ Bad: New function every render
function TodoList() {
  const [filtered] = useBlocAdapter(TodoCubit, {
    selector: (state) => state.todos.filter(t => !t.completed),
  });
}

// ✅ Good: Stable selector with useCallback
function TodoList() {
  const selector = useCallback(
    (state: TodoState) => state.todos.filter(t => !t.completed),
    []
  );

  const [filtered] = useBlocAdapter(TodoCubit, { selector });
}
```

### ❌ Don't Overuse flushSync

```typescript
// ❌ Bad: Fighting React's batching
flushSync(() => cubit.update());

// ✅ Good: Let React batch
cubit.update();
```

---

## Additional Resources

- [API Reference](/spec/2025-10-20-optimized-react-integration/API_REFERENCE.md)
- [Performance Report](/spec/2025-10-20-optimized-react-integration/PERFORMANCE_REPORT.md)
- [React 18 Documentation](https://react.dev/blog/2022/03/29/react-v18)
- [Suspense for Data Fetching](https://react.dev/reference/react/Suspense)

---

**Last Updated**: 2025-10-21
**React Version**: 18.x
**BlaC Version**: 2.0.0

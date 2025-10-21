# Migration Guide: useBloc → useBlocAdapter

**Version**: 2.0.0
**Last Updated**: 2025-10-21
**Migration Type**: Optional (No Breaking Changes)

---

## Table of Contents

- [Should You Migrate?](#should-you-migrate)
- [Quick Start](#quick-start)
- [Step-by-Step Migration](#step-by-step-migration)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [FAQ](#faq)

---

## Should You Migrate?

### TL;DR

**For new code**: Use `useBlocAdapter` with selectors for best performance.
**For existing code**: Migration is optional. Both hooks coexist perfectly.

### Benefits of Migrating

✅ **Better Performance**: Version-based change detection (8.95x faster)
✅ **Fine-Grained Reactivity**: Selector-based subscriptions
✅ **React 18 Features**: Full Suspense and concurrent rendering support
✅ **Memory Efficiency**: Reference counting with automatic cleanup
✅ **Developer Control**: Custom comparison functions
✅ **Future-Proof**: The recommended pattern going forward

### When to Keep `useBloc`

- ✅ Code is working well with no performance issues
- ✅ Tight deadline and migration not a priority
- ✅ Proxy-based dependency tracking meets your needs
- ✅ Team unfamiliar with selector pattern

**Remember**: Both hooks work side-by-side. You can migrate gradually.

---

## Quick Start

### Basic Migration (1:1 Replacement)

```typescript
// Before
import { useBloc } from '@blac/react';

function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{state.count}</div>;
}

// After
import { useBlocAdapter } from '@blac/react';

function Counter() {
  const [state, bloc] = useBlocAdapter(CounterBloc);
  return <div>{state.count}</div>;
}
```

**That's it!** The basic migration is just changing the import.

### Optimized Migration (With Selector)

```typescript
// Before (re-renders on ANY state change)
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{state.count}</div>;
}

// After (re-renders ONLY when count changes)
function Counter() {
  const [count, bloc] = useBlocAdapter(CounterBloc, {
    selector: (state) => state.count,
  });
  return <div>{count}</div>;
}
```

---

## Step-by-Step Migration

### Step 1: Choose Components to Migrate

**Priority candidates**:
- ✅ Components that re-render frequently
- ✅ Components with large state objects
- ✅ Leaf components (fewer dependencies)
- ✅ New features being developed

**Lower priority**:
- Small components with simple state
- Rarely re-rendering components
- Legacy code that works well

### Step 2: Update Imports

```typescript
// Old
import { useBloc } from '@blac/react';

// New
import { useBlocAdapter } from '@blac/react';
```

### Step 3: Basic Replacement

```typescript
// Change hook name, keep everything else
- const [state, bloc] = useBloc(MyBloc);
+ const [state, bloc] = useBlocAdapter(MyBloc);
```

### Step 4: Add Selectors (Optional but Recommended)

```typescript
// Analyze what you actually use from state
function TodoList() {
  const [state, bloc] = useBlocAdapter(TodoBloc);
  // Only using state.todos, not state.filter or state.metadata

  // Optimize with selector
  const [todos, bloc] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos,
  });

  return (
    <ul>
      {todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
    </ul>
  );
}
```

### Step 5: Test Thoroughly

- ✅ Verify component renders correctly
- ✅ Check all user interactions work
- ✅ Test with React DevTools Profiler
- ✅ Confirm no performance regressions

---

## Common Patterns

### Pattern 1: Full State Usage

**When**: You use most/all of the state.

```typescript
// Before
const [state, bloc] = useBloc(UserBloc);

// After (no selector needed)
const [state, bloc] = useBlocAdapter(UserBloc);
```

### Pattern 2: Single Property

**When**: You only need one property from state.

```typescript
// Before
function UserName() {
  const [state] = useBloc(UserBloc);
  return <span>{state.user.name}</span>;
}

// After (with selector)
function UserName() {
  const [name] = useBlocAdapter(UserBloc, {
    selector: (state) => state.user.name,
  });
  return <span>{name}</span>;
}
```

### Pattern 3: Computed Values

**When**: You derive values from state.

```typescript
// Before
function TodoStats() {
  const [state] = useBloc(TodoBloc);
  const completed = state.todos.filter(t => t.completed).length;
  const total = state.todos.length;

  return <div>{completed} / {total}</div>;
}

// After (selector computes once)
function TodoStats() {
  const [stats] = useBlocAdapter(TodoBloc, {
    selector: (state) => ({
      completed: state.todos.filter(t => t.completed).length,
      total: state.todos.length,
    }),
  });

  return <div>{stats.completed} / {stats.total}</div>;
}
```

### Pattern 4: Array/Object Results

**When**: Selector returns array or object that might be recreated.

```typescript
// After (with custom comparison)
function ActiveTodos() {
  const [activeTodos] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos.filter(t => !t.completed),
    compare: (prev, next) => {
      // Avoid re-render if IDs haven't changed
      return prev.length === next.length &&
             prev.every((todo, i) => todo.id === next[i].id);
    },
  });

  return <ul>{activeTodos.map(...)}</ul>;
}
```

### Pattern 5: Props-Based Blocs

**When**: Bloc needs props for initialization.

```typescript
// Before
function UserProfile({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(UserBloc, { userId });
  return <div>{state.name}</div>;
}

// After (same API)
function UserProfile({ userId }: { userId: string }) {
  const [state, bloc] = useBlocAdapter(UserBloc, {
    staticProps: { userId },
  });
  return <div>{state.name}</div>;
}
```

### Pattern 6: Lifecycle Callbacks

**When**: You need to initialize/cleanup on mount/unmount.

```typescript
// Before
function Analytics() {
  const [state, bloc] = useBloc(AnalyticsBloc);

  useEffect(() => {
    bloc.startTracking();
    return () => bloc.stopTracking();
  }, [bloc]);

  return <div>...</div>;
}

// After (built-in callbacks)
function Analytics() {
  const [state, bloc] = useBlocAdapter(AnalyticsBloc, {
    onMount: (bloc) => bloc.startTracking(),
    onUnmount: (bloc) => bloc.stopTracking(),
  });

  return <div>...</div>;
}
```

---

## Troubleshooting

### Issue 1: Component Not Re-Rendering

**Symptom**: Component doesn't update when state changes.

**Diagnosis**:
```typescript
// Check if selector result actually changes
const [value] = useBlocAdapter(MyBloc, {
  selector: (state) => state.data.items.filter(x => x.active),
  // ☝️ This creates NEW array every time
});
```

**Solution**: Add custom comparison
```typescript
const [value] = useBlocAdapter(MyBloc, {
  selector: (state) => state.data.items.filter(x => x.active),
  compare: (prev, next) => {
    if (prev.length !== next.length) return false;
    return prev.every((item, i) => item.id === next[i].id);
  },
});
```

---

### Issue 2: Too Many Re-Renders

**Symptom**: Component re-renders on every state change.

**Diagnosis**:
```typescript
// Not using selector - subscribes to ALL changes
const [state] = useBlocAdapter(MyBloc);
```

**Solution**: Add selector for fine-grained subscription
```typescript
const [value] = useBlocAdapter(MyBloc, {
  selector: (state) => state.specificProperty,
});
```

---

### Issue 3: Selector Recreated Every Render

**Symptom**: Component re-renders even when selector result unchanged.

**Diagnosis**:
```typescript
function MyComponent() {
  // ❌ New function every render!
  const [value] = useBlocAdapter(MyBloc, {
    selector: (state) => state.value * 2,
  });
}
```

**Solution**: Memoize selector
```typescript
function MyComponent() {
  const selector = useCallback(
    (state: MyState) => state.value * 2,
    [] // Stable across renders
  );

  const [value] = useBlocAdapter(MyBloc, { selector });
}
```

---

### Issue 4: TypeScript Type Errors

**Symptom**: TypeScript complains about selector return type.

**Diagnosis**:
```typescript
const [value] = useBlocAdapter(MyBloc, {
  selector: (state) => state.complex.nested.value,
  // TypeScript can't infer type
});
```

**Solution**: Add explicit type annotation
```typescript
const [value] = useBlocAdapter(MyBloc, {
  selector: (state): string => state.complex.nested.value,
});

// Or use type assertion
const [value] = useBlocAdapter(MyBloc, {
  selector: (state) => state.complex.nested.value as string,
});
```

---

### Issue 5: Stale Closure in Selector

**Symptom**: Selector uses outdated props/state.

**Diagnosis**:
```typescript
function FilteredList({ filter }: { filter: string }) {
  // ❌ Selector captures initial filter value
  const [filtered] = useBlocAdapter(ListBloc, {
    selector: (state) => state.items.filter(item =>
      item.name.includes(filter) // ☝️ Stale closure
    ),
  });
}
```

**Solution**: Recreate selector when dependencies change
```typescript
function FilteredList({ filter }: { filter: string }) {
  const selector = useCallback(
    (state: ListState) => state.items.filter(item =>
      item.name.includes(filter)
    ),
    [filter] // Recreate when filter changes
  );

  const [filtered] = useBlocAdapter(ListBloc, { selector });
}
```

---

### Issue 6: Memory Leak in Development

**Symptom**: Warnings about lingering subscriptions in React Strict Mode.

**Diagnosis**:
- React Strict Mode double-mounts components
- Adapter cleanup happens in microtask queue

**Solution**: This is expected behavior. The adapter handles cleanup correctly:
```typescript
// Cleanup is scheduled asynchronously
useEffect(() => {
  return () => {
    // Cleanup happens in microtask
    queueMicrotask(() => cleanup());
  };
}, []);
```

**Verification**:
- Check subscription count after unmount
- Should be 0 after microtask completes
- No action needed if tests pass

---

## Performance Optimization

### Optimization 1: Use Selectors Strategically

```typescript
// ❌ Bad: Subscribes to everything
function TodoCount() {
  const [state] = useBlocAdapter(TodoBloc);
  return <div>{state.todos.length}</div>;
}

// ✅ Good: Subscribes only to count
function TodoCount() {
  const [count] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos.length,
  });
  return <div>{count}</div>;
}
```

**Impact**: Eliminates re-renders when other parts of state change.

---

### Optimization 2: Memoize Complex Selectors

```typescript
// ❌ Bad: Recreates function every render
function FilteredTodos({ filter }: { filter: string }) {
  const [todos] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos.filter(t =>
      t.text.includes(filter)
    ),
  });
}

// ✅ Good: Stable selector with dependencies
function FilteredTodos({ filter }: { filter: string }) {
  const selector = useCallback(
    (state: TodoState) => state.todos.filter(t =>
      t.text.includes(filter)
    ),
    [filter]
  );

  const [todos] = useBlocAdapter(TodoBloc, { selector });
}
```

**Impact**: Avoids unnecessary re-subscriptions.

---

### Optimization 3: Custom Comparison for Objects/Arrays

```typescript
// ✅ Best: Custom comparison prevents unnecessary renders
function TodoList() {
  const [todos] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos,
    compare: (prev, next) => {
      // Only re-render if todo IDs changed
      return prev.length === next.length &&
             prev.every((todo, i) => todo.id === next[i].id);
    },
  });
}
```

**Impact**: Avoids re-renders when array reference changes but content doesn't.

---

### Optimization 4: Split Components by Concern

```typescript
// ❌ Bad: One component subscribes to everything
function TodoApp() {
  const [state, bloc] = useBlocAdapter(TodoBloc);
  return (
    <div>
      <div>Count: {state.todos.length}</div>
      <div>Filter: {state.filter}</div>
      <TodoList todos={state.todos} />
    </div>
  );
}

// ✅ Good: Each component subscribes to what it needs
function TodoCount() {
  const [count] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.todos.length,
  });
  return <div>Count: {count}</div>;
}

function TodoFilter() {
  const [filter] = useBlocAdapter(TodoBloc, {
    selector: (state) => state.filter,
  });
  return <div>Filter: {filter}</div>;
}

function TodoApp() {
  return (
    <div>
      <TodoCount />
      <TodoFilter />
      <TodoList />
    </div>
  );
}
```

**Impact**: Each component only re-renders when its specific data changes.

---

## Performance Comparison

### Before Migration (useBloc)

```typescript
function UserDashboard() {
  const [state] = useBloc(DashboardBloc);

  // Component re-renders on ANY state change:
  // - user data updates
  // - notification count changes
  // - theme preference changes
  // - sidebar collapse state
  // ... everything!

  return <div>{state.user.name}</div>;
}
```

**Re-render count**: ~100 per session

---

### After Migration (useBlocAdapter with selector)

```typescript
function UserDashboard() {
  const [userName] = useBlocAdapter(DashboardBloc, {
    selector: (state) => state.user.name,
  });

  // Component re-renders ONLY when user.name changes

  return <div>{userName}</div>;
}
```

**Re-render count**: ~2 per session (initial + name change)

**Improvement**: 50x fewer re-renders!

---

## FAQ

### Q: Do I have to migrate all components at once?

**A**: No! Both hooks work side-by-side. Migrate gradually component by component.

```typescript
// Parent uses old hook
function App() {
  const [state] = useBloc(AppBloc);
  return <TodoList />;
}

// Child uses new hook
function TodoList() {
  const [todos] = useBlocAdapter(AppBloc, {
    selector: (state) => state.todos,
  });
  return <ul>{todos.map(...)}</ul>;
}
```

---

### Q: Will `useBloc` be deprecated?

**A**: No immediate plans to deprecate. It will continue to work indefinitely. However, `useBlocAdapter` is the recommended pattern for new code.

---

### Q: What about TypeScript support?

**A**: Full TypeScript support with type inference:

```typescript
class CounterBloc extends Cubit<number> { }

// Type inference works automatically
const [count, bloc] = useBlocAdapter(CounterBloc);
//     ^number       ^CounterBloc

// Selector result type is inferred
const [doubled] = useBlocAdapter(CounterBloc, {
  selector: (state) => state * 2,
});
//     ^number (inferred)
```

---

### Q: Can I use both hooks in the same component?

**A**: Yes, but it's unusual. Both hooks share the same Bloc instance:

```typescript
function MyComponent() {
  const [fullState] = useBloc(MyBloc);
  const [specific] = useBlocAdapter(MyBloc, {
    selector: (state) => state.specific,
  });

  // Both get the same bloc instance
}
```

---

### Q: How do I migrate tests?

**A**: Change the hook import, everything else stays the same:

```typescript
// Before
import { useBloc } from '@blac/react';

it('renders count', () => {
  const { result } = renderHook(() => useBloc(CounterBloc));
  expect(result.current[0]).toBe(0);
});

// After
import { useBlocAdapter } from '@blac/react';

it('renders count', () => {
  const { result } = renderHook(() => useBlocAdapter(CounterBloc));
  expect(result.current[0]).toBe(0);
});
```

---

### Q: What about Suspense?

**A**: Use the manual Suspense pattern (recommended):

```typescript
function AsyncComponent() {
  const [state, cubit] = useBlocAdapter(AsyncBloc);

  // Manual Suspense pattern
  if (!state.data && cubit.loadingPromise) {
    throw cubit.loadingPromise;
  }

  return <div>{state.data}</div>;
}

// Wrap in Suspense boundary
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

See [REACT18_PATTERNS.md](/spec/2025-10-20-optimized-react-integration/REACT18_PATTERNS.md) for details.

---

### Q: Any performance gotchas?

**A**: Yes, a few:

1. **Don't recreate selectors every render** - use `useCallback`
2. **Add custom comparison for objects/arrays** - avoid reference inequality issues
3. **Don't over-optimize** - only add selectors where they help

---

## Migration Checklist

Use this checklist when migrating each component:

- [ ] Update import: `useBloc` → `useBlocAdapter`
- [ ] Identify what state is actually used
- [ ] Add selector if only using part of state
- [ ] Add custom comparison if selector returns object/array
- [ ] Memoize selector if it depends on props
- [ ] Test component renders correctly
- [ ] Check React DevTools Profiler for improvements
- [ ] Verify no console warnings in Strict Mode
- [ ] Update tests if needed

---

## Additional Resources

- [API Reference](/spec/2025-10-20-optimized-react-integration/API_REFERENCE.md) - Complete hook documentation
- [React 18 Patterns](/spec/2025-10-20-optimized-react-integration/REACT18_PATTERNS.md) - React 18 features guide
- [Performance Report](/spec/2025-10-20-optimized-react-integration/PERFORMANCE_REPORT.md) - Benchmark results

---

**Last Updated**: 2025-10-21
**Version**: 2.0.0
**Status**: Production Ready

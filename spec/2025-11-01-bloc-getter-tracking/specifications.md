# Bloc Getter Tracking - Specifications

## Feature Overview

Add automatic tracking of getter access on bloc instances in `useBloc` to trigger component re-renders when computed getter values change, similar to how state property access is currently tracked.

## Goals

1. **Automatic Tracking**: Detect when a component accesses bloc getters during render and automatically track those getters
2. **Efficient Re-rendering**: Only re-render components when tracked getter values actually change (not just when state changes)
3. **Zero Configuration**: Work automatically without requiring manual dependencies or configuration
4. **Performance First**: Minimize overhead with fast comparisons and efficient tracking mechanisms

## Current Behavior

### State Tracking (Existing)
```tsx
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update(s => ({ count: s.count + 1 }));
  };
}

function Component() {
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{state.count}</div>; // ✓ Auto-tracked via state proxy
}
```

### Getter Access (Current - NOT Tracked)
```tsx
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  get doubled() {
    return this.state.count * 2;
  }

  increment = () => {
    this.update(s => ({ count: s.count + 1 }));
  };
}

function Component() {
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{bloc.doubled}</div>; // ✗ NOT auto-tracked, re-renders on ANY state change
}
```

### Manual Dependencies (Current Workaround)
```tsx
function Component() {
  const [state, bloc] = useBloc(CounterBloc, {
    dependencies: (state, bloc) => [bloc.doubled] // Manual tracking
  });
  return <div>{bloc.doubled}</div>;
}
```

## Target Behavior

### Automatic Getter Tracking
```tsx
class CounterBloc extends Cubit<{ count: number; other: string }> {
  get doubled() {
    return this.state.count * 2;
  }
}

function Component() {
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{bloc.doubled}</div>; // ✓ Auto-tracked, only re-renders when doubled result changes
}

// Example: If count changes from 5 → 5, doubled stays 10 → 10, NO re-render
// Example: If other changes, doubled stays same, NO re-render
// Example: If count changes from 5 → 6, doubled changes 10 → 12, re-render triggers
```

## Requirements

### Functional Requirements

#### FR1: Automatic Getter Detection
- System must detect when a component accesses a getter on the bloc instance during render
- Detection must work for all getters defined on the bloc class or its prototype chain
- Must distinguish getters from regular methods and properties

#### FR2: Getter Value Tracking
- System must store the computed value of accessed getters
- Must track getter values per component instance
- Must handle multiple components accessing the same bloc with different getters

#### FR3: Change Detection
- When bloc state changes, system must re-compute all tracked getters for that component
- Must compare new getter values with previous values
- Must trigger re-render if any tracked getter value has changed

#### FR4: Comparison Strategy
- **Use reference equality (Object.is) for all comparisons**
- Primitives (number, string, boolean, null, undefined) compare by value
- Objects, arrays, and functions compare by reference
- Must handle special cases: NaN, +0/-0

#### FR5: Integration with Existing Tracking
- Must work alongside existing state proxy tracking
- Component re-renders when EITHER state properties OR tracked getters change
- Must respect existing `autoTrack: false` option (disable both state and getter tracking)

#### FR6: Manual Dependencies Interaction
- If `dependencies` option is provided, **disable automatic getter tracking**
- Manual dependencies take full control (backward compatible)
- User can manually include getters in dependencies if desired

### Non-Functional Requirements

#### NFR1: Performance
- **TOP PRIORITY**: Minimize overhead in hot paths
- Proxy creation must be fast and cached
- Getter detection must be efficient (no repeated prototype chain walks)
- Comparison operations must be O(1) for each tracked getter
- No performance degradation for components that don't use getters

#### NFR2: Memory Efficiency
- Tracked getter values must be garbage collected when component unmounts
- Proxy instances must not create memory leaks
- No memory growth for unused getters

#### NFR3: Backward Compatibility
- Existing code must continue to work without changes
- No breaking changes to `useBloc` API
- All existing tests must pass
- Manual dependencies behavior unchanged

#### NFR4: Developer Experience
- Feature works automatically without configuration
- TypeScript types preserved through proxy
- IDE autocomplete continues to work
- Clear error messages when issues occur

#### NFR5: Reliability
- Must work correctly in React Strict Mode (double-invocation)
- Must handle getter errors gracefully (stop tracking that getter, log warning)
- Must not crash or cause infinite loops
- Must work with isolated and shared blocs

### Constraints

#### C1: Getter Limitations
- Only **parameterless getters** can be auto-tracked
- Methods with parameters are not supported (must use manual dependencies)
- Getters should be pure (no side effects) - this is a best practice, not enforced

#### C2: Comparison Limitations
- Reference equality only - if getter returns new object/array each time, will always trigger re-render
- Users must ensure getters return stable references for complex values
- No deep equality or custom comparison functions

#### C3: Implementation Boundaries
- Changes limited to `packages/blac-react/src/` (no core changes unless absolutely necessary)
- Must use React's existing hooks (useSyncExternalStore, useMemo, useEffect, useRef)
- Cannot modify StateContainer base class

## Success Criteria

### Must Have
1. ✓ Getter access during render is automatically tracked
2. ✓ Components only re-render when tracked getter values change (Object.is comparison)
3. ✓ No configuration required (works by default)
4. ✓ All existing tests pass without modification
5. ✓ Performance overhead < 5% for components using getters
6. ✓ No performance impact for components not using getters
7. ✓ Works correctly in React Strict Mode

### Should Have
1. ✓ Comprehensive test coverage (>90% for new code)
2. ✓ Clear JSDoc comments explaining behavior
3. ✓ Example in documentation showing usage
4. ✓ Performance benchmark comparing before/after
5. ✓ Handles getter errors gracefully (console.warn, stop tracking)

### Nice to Have
1. Dev mode warnings for getters with side effects
2. Debug logging (when debug flag enabled)
3. Performance metrics in development
4. Ability to opt-out specific getters

## Out of Scope

The following are explicitly **NOT** included in this feature:

1. Deep equality comparison for complex values
2. Custom comparison functions
3. Tracking methods with parameters (e.g., `bloc.getItem(id)`)
4. Memoization of expensive getters (user responsibility)
5. Detecting getter purity or side effects
6. Opt-in mode (always enabled by default)
7. Selective getter tracking (all accessed getters are tracked)
8. Changes to core StateContainer or Cubit classes

## Examples

### Example 1: Basic Getter Tracking
```tsx
class TodoBloc extends Cubit<{ todos: Todo[]; filter: string }> {
  get visibleTodos() {
    return this.state.todos.filter(t =>
      filter === 'all' || t.status === filter
    );
  }

  get activeCount() {
    return this.state.todos.filter(t => !t.done).length;
  }
}

function TodoList() {
  const [state, bloc] = useBloc(TodoBloc);
  // Only accesses visibleTodos getter
  return (
    <ul>
      {bloc.visibleTodos.map(todo => <li key={todo.id}>{todo.name}</li>)}
    </ul>
  );
}

function TodoStats() {
  const [state, bloc] = useBloc(TodoBloc);
  // Only accesses activeCount getter
  return <div>Active: {bloc.activeCount}</div>;
}

// Adding a completed todo:
// - TodoList re-renders (visibleTodos changes)
// - TodoStats does NOT re-render (activeCount stays same)

// Changing filter:
// - TodoList re-renders (visibleTodos changes)
// - TodoStats does NOT re-render (activeCount not accessed)
```

### Example 2: Nested Getters
```tsx
class DataBloc extends Cubit<{ value: number }> {
  get doubled() {
    return this.state.value * 2;
  }

  get quadrupled() {
    return this.doubled * 2; // Accesses another getter
  }
}

function Component() {
  const [state, bloc] = useBloc(DataBloc);
  return <div>{bloc.quadrupled}</div>;
}

// Both doubled and quadrupled are tracked
// Component re-renders when quadrupled result changes
```

### Example 3: Complex Return Values
```tsx
class SearchBloc extends Cubit<{ items: Item[]; query: string }> {
  // ⚠️ This getter returns a NEW array each time
  get filteredItems() {
    return this.state.items.filter(i => i.name.includes(this.state.query));
  }
}

function Component() {
  const [state, bloc] = useBloc(SearchBloc);
  return (
    <ul>
      {bloc.filteredItems.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
}

// With reference equality:
// - Every state change causes re-render (filteredItems is new array)
// - User should cache/memoize if this is a problem

// Better approach with caching:
class SearchBloc extends Cubit<{ items: Item[]; query: string }> {
  private _cachedFiltered: { query: string; result: Item[] } | null = null;

  get filteredItems() {
    if (this._cachedFiltered?.query === this.state.query) {
      return this._cachedFiltered.result;
    }
    const result = this.state.items.filter(i => i.name.includes(this.state.query));
    this._cachedFiltered = { query: this.state.query, result };
    return result;
  }
}
```

### Example 4: Getter Error Handling
```tsx
class ErrorBloc extends Cubit<{ value: number }> {
  get willThrow() {
    if (this.state.value < 0) {
      throw new Error('Negative value!');
    }
    return this.state.value * 2;
  }
}

function Component() {
  const [state, bloc] = useBloc(ErrorBloc);
  return <div>{bloc.willThrow}</div>; // May throw during render
}

// Behavior:
// 1. First render with value=5: willThrow returns 10, tracked
// 2. State changes to value=-1: getter throws during comparison
// 3. System logs warning, stops tracking willThrow for this component
// 4. Component falls back to re-rendering on any state change
// 5. Error propagates to React error boundary
```

## Technical Approach (High-Level)

### Architecture Components

1. **Getter Detection**: Use `Object.getOwnPropertyDescriptor` to identify getters
2. **Bloc Proxy**: Wrap bloc instance in Proxy to intercept getter access
3. **Tracking State**: Store accessed getters and their values per component
4. **Render Phase Tracking**: Enable tracking during getSnapshot, disable after
5. **Change Detection**: Re-compute and compare getters in subscribe callback

### Integration Points

1. **HookState Extension**: Add `getterTracker` to existing HookState
2. **Subscribe Enhancement**: Check getter changes in addition to state changes
3. **Snapshot Enhancement**: Enable tracking before returning proxied state
4. **Bloc Proxying**: Return proxied bloc instead of raw instance

### Data Structures

```typescript
interface GetterTrackingState {
  trackedValues: Map<string | symbol, unknown>;
  accessedInRender: Set<string | symbol>;
  isTracking: boolean;
}
```

## Risks and Mitigations

### Risk 1: Performance Overhead
- **Risk**: Proxy interception and getter re-computation adds overhead
- **Mitigation**: Use fast comparisons (Object.is), cache proxy, optimize hot paths
- **Acceptance**: Benchmark and ensure <5% overhead

### Risk 2: Memory Leaks
- **Risk**: Tracked values not garbage collected
- **Mitigation**: Clear tracking state on unmount, use WeakMap where appropriate
- **Acceptance**: Memory profiling in tests

### Risk 3: Complex Getters
- **Risk**: Getters returning new objects always trigger re-renders
- **Mitigation**: Document clearly, provide examples of caching patterns
- **Acceptance**: User responsibility to optimize

### Risk 4: Nested Getter Loops
- **Risk**: Getter A calls B calls A → infinite loop
- **Mitigation**: Track currently-computing getters, detect cycles
- **Acceptance**: Rare in practice, document best practices

### Risk 5: Strict Mode Issues
- **Risk**: Double-invocation causes duplicate tracking or inconsistencies
- **Mitigation**: Ensure idempotent operations, test thoroughly in Strict Mode
- **Acceptance**: All tests run in Strict Mode

## Open Questions

None - all decisions made based on user input:
- ✓ Automatic by default (not opt-in)
- ✓ Reference equality comparison
- ✓ Stop tracking getter on error
- ✓ Performance as top priority
- ✓ Manual dependencies disable auto-tracking

## References

- Existing state tracking implementation in `useBloc.ts`
- Tracker utilities in `@blac/core`: `createTrackerState`, `hasChanges`, etc.
- React's `useSyncExternalStore` documentation
- JavaScript Proxy API documentation
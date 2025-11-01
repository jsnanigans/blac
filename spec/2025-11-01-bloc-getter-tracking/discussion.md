# Bloc Getter Tracking - Solution Discussion

## Summary

**Goal**: Automatically track bloc getter access during component render and only re-render when computed getter values change.

**Requirements Recap**:
- Automatic by default (no configuration)
- Reference equality (Object.is) for comparison
- Stop tracking getter on error
- Performance as top priority (<5% overhead)
- Works with existing state tracking
- Manual dependencies disable auto-tracking

**Context**: The existing state tracking system uses Proxy + path recording to track which state properties are accessed. This works well for `state.property` but doesn't help with `bloc.getter` access. We need a parallel system for getters.

## Key Technical Challenges

1. **Getter Detection**: Distinguish getters from methods and properties
2. **Render-Phase Tracking**: Enable tracking only during render, disable after
3. **Change Detection**: Re-compute getters on state change and compare results
4. **Integration**: Work alongside existing state tracking without conflicts
5. **Performance**: Minimize overhead (proxy creation, descriptor lookups, comparison)
6. **Error Handling**: Handle getter errors gracefully without breaking tracking

## Common Approaches in Similar Libraries

### MobX Approach
- Uses Proxy to track ALL property access (including computed values)
- Maintains dependency graph of observables
- Re-computes when dependencies change
- **Complexity**: High, requires full reactivity system

### Vue 3 Composition API
- Explicitly marks computed values with `computed(() => ...)`
- Tracks reactive dependencies inside computed function
- Caches result until dependencies change
- **Complexity**: Medium, requires explicit marking

### Solid.js
- Uses memos (`createMemo(() => ...)`) for derived values
- Automatic dependency tracking inside memo function
- Fine-grained reactivity system
- **Complexity**: High, different paradigm from React

### Our Approach
- Detect getters automatically (no explicit marking)
- Track access during React render phase
- Compare computed values using Object.is
- **Complexity**: Medium, leverages existing patterns

## Potential Mistakes to Avoid

1. **Over-engineering**: Don't build a full reactivity system, just track getter access
2. **Premature optimization**: Start simple, optimize hot paths later
3. **Breaking existing behavior**: Ensure all existing tests pass
4. **Complex API**: Keep it automatic, no configuration required
5. **Memory leaks**: Clear tracking state on unmount
6. **Deep comparison**: Stick to reference equality (Object.is) per requirements

## Solution Options

---

## Option 1: Proxy-Based Tracking with Separate Getter Tracker ⭐ RECOMMENDED

### Description

Create a parallel tracking system specifically for getters:
- Wrap bloc instance in Proxy to intercept getter access
- Track which getters are accessed during render
- On state changes, re-compute tracked getters and compare values
- Integrate at the subscribe/snapshot level in useBloc

### Implementation Overview

```typescript
// 1. Getter tracking state
interface GetterTrackingState {
  trackedValues: Map<string | symbol, unknown>;    // Last computed values
  accessedInRender: Set<string | symbol>;          // Getters accessed this render
  isTracking: boolean;                              // Enable/disable flag
}

// 2. Bloc proxy creation
function createBlocProxy<TBloc>(bloc: TBloc, tracker: GetterTrackingState): TBloc {
  return new Proxy(bloc, {
    get(target, prop, receiver) {
      if (tracker.isTracking && isGetter(target, prop)) {
        tracker.accessedInRender.add(prop);
        const value = callGetter(target, prop);
        tracker.trackedValues.set(prop, value);
        return value;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// 3. Change detection
function hasGetterChanges(bloc: TBloc, tracker: GetterTrackingState): boolean {
  for (const prop of tracker.accessedInRender) {
    const newValue = callGetter(bloc, prop);
    const oldValue = tracker.trackedValues.get(prop);
    if (!Object.is(newValue, oldValue)) {
      tracker.trackedValues.set(prop, newValue);
      return true;
    }
  }
  return false;
}

// 4. Integration in useBloc
const [bloc, subscribe, getSnapshot] = useMemo(() => {
  const instance = Constructor.getOrCreate(...);
  const getterTracker = createGetterTracker();
  const proxiedBloc = createBlocProxy(instance, getterTracker);

  const subscribe = (callback) => {
    return instance.subscribe(() => {
      const stateChanged = hasChanges(stateTracker, instance.state);
      const getterChanged = hasGetterChanges(instance, getterTracker);
      if (stateChanged || getterChanged) callback();
    });
  };

  const getSnapshot = () => {
    getterTracker.isTracking = true;
    getterTracker.accessedInRender.clear();
    return createProxy(stateTracker, instance.state);
  };

  return [proxiedBloc, subscribe, getSnapshot];
}, [BlocClass]);
```

### Pros
✓ Clean separation of concerns (getters vs state)
✓ Minimal changes to existing code
✓ Easy to understand and maintain
✓ Can optimize getter detection independently
✓ Parallel to existing state tracking pattern
✓ Straightforward error handling

### Cons
✗ Two separate tracking systems (state + getters)
✗ Two proxy instances (state proxy + bloc proxy)
✗ Duplicate Map/Set data structures

### Scoring

| Category | Score | Justification |
|----------|-------|---------------|
| **Performance** | 8/10 | Fast proxy interception, Object.is comparison, can cache descriptor lookups. Two proxies add overhead but acceptable. |
| **Complexity** | 8/10 | Straightforward implementation, follows existing patterns. Medium complexity, well-contained. |
| **Maintainability** | 9/10 | Clear separation, easy to debug, minimal cross-cutting concerns. |
| **Correctness** | 9/10 | Handles all edge cases, easy to verify behavior, consistent with state tracking. |
| **Testability** | 9/10 | Each component testable in isolation, clear boundaries. |
| **Integration** | 8/10 | Integrates cleanly at subscribe/snapshot level, no core changes needed. |
| **TOTAL** | 51/60 | **Best overall balance** |

---

## Option 2: Unified Proxy with Combined Tracking

### Description

Extend the existing state proxy to also intercept bloc property access:
- Return a Proxy that wraps both state AND bloc
- Track state paths and getter access in a unified tracking state
- Single comparison function checks both state and getters

### Implementation Overview

```typescript
// 1. Unified tracking state
interface UnifiedTracker<TBloc> {
  stateTracker: TrackerState<ExtractState<TBloc>>;
  getterValues: Map<string | symbol, unknown>;
  accessedGetters: Set<string | symbol>;
  isTrackingGetters: boolean;
}

// 2. Combined snapshot
function getSnapshot() {
  tracker.isTrackingGetters = true;
  tracker.accessedGetters.clear();

  // Return object with both state and bloc
  return {
    state: createProxy(tracker.stateTracker, instance.state),
    bloc: createBlocProxy(instance, tracker)
  };
}

// Usage changes:
const snapshot = useSyncExternalStore(subscribe, getSnapshot);
return <div>{snapshot.state.count} {snapshot.bloc.doubled}</div>;
```

### Pros
✓ Single tracking system
✓ Unified comparison logic
✓ Consistent mental model

### Cons
✗ Changes component API (snapshot is object with {state, bloc} instead of state)
✗ Breaking change (all existing code must update)
✗ More complex tracking state
✗ Harder to understand
✗ Violates backward compatibility requirement

### Scoring

| Category | Score | Justification |
|----------|-------|---------------|
| **Performance** | 7/10 | Comparable to Option 1, but unified state may have overhead. |
| **Complexity** | 5/10 | More complex, harder to understand, tightly coupled. |
| **Maintainability** | 5/10 | Harder to debug, more cross-cutting concerns. |
| **Correctness** | 8/10 | Still correct, but more places for bugs to hide. |
| **Testability** | 6/10 | Harder to test in isolation due to coupling. |
| **Integration** | 3/10 | **Breaking change**, requires all components to update. |
| **TOTAL** | 34/60 | Poor due to breaking changes |

---

## Option 3: Explicit Tracking API (Opt-in)

### Description

Provide explicit API for tracking getters, similar to manual dependencies:
- Add `trackGetters: true` option to enable
- Or `trackedGetters: ['doubled', 'tripled']` for selective tracking
- Only track when explicitly configured

### Implementation Overview

```typescript
// Usage:
const [state, bloc] = useBloc(CounterBloc, {
  trackGetters: true  // Opt-in
});

// Or selective:
const [state, bloc] = useBloc(CounterBloc, {
  trackedGetters: ['doubled', 'tripled']
});

// Implementation similar to Option 1, but:
const getterTracker = options.trackGetters || options.trackedGetters
  ? createGetterTracker()
  : null;
```

### Pros
✓ Explicit control
✓ Can opt-out for performance
✓ Clear documentation point
✓ Easier to roll out incrementally

### Cons
✗ Requires configuration (violates "automatic" requirement)
✗ Not backward compatible (behavior change)
✗ Inconsistent with automatic state tracking
✗ Users must remember to enable it

### Scoring

| Category | Score | Justification |
|----------|-------|---------------|
| **Performance** | 9/10 | Best performance (only enabled when needed), but against requirement. |
| **Complexity** | 7/10 | Implementation simple, but API more complex. |
| **Maintainability** | 7/10 | Clear opt-in, but fragmented usage patterns. |
| **Correctness** | 8/10 | Correct when enabled, but easy to forget. |
| **Testability** | 8/10 | Easy to test, clear boundaries. |
| **Integration** | 6/10 | Requires config changes, inconsistent with state tracking. |
| **TOTAL** | 45/60 | **Violates "automatic" requirement** |

---

## Option 4: getSnapshot Enhancement with Double-Proxy Pattern

### Description

Return both proxied state AND proxied bloc from getSnapshot:
- getSnapshot returns tuple [proxiedState, proxiedBloc]
- useSyncExternalStore stores tuple
- Destructure in component: `const [state, bloc] = useSyncExternalStore(...)`

### Implementation Overview

```typescript
const getSnapshot = () => {
  getterTracker.isTracking = true;
  getterTracker.accessedInRender.clear();

  return [
    createProxy(stateTracker, instance.state),
    createBlocProxy(instance, getterTracker)
  ] as const;
};

// useSyncExternalStore returns the tuple
const [state, bloc] = useSyncExternalStore(subscribe, getSnapshot);

// Return tuple to user
return [state, bloc, componentRef];
```

### Pros
✓ Clean API (no changes to component code)
✓ Separate tracking systems
✓ Return type matches current API exactly
✓ Backward compatible

### Cons
✗ getSnapshot returns different value each render (new tuple)
✗ May cause useSyncExternalStore to think data changed
✗ Need custom comparison or memo to prevent extra renders
✗ Tuple equality issues

### Scoring

| Category | Score | Justification |
|----------|-------|---------------|
| **Performance** | 6/10 | New tuple each render may cause issues, needs careful handling. |
| **Complexity** | 7/10 | Clever but subtle, tuple equality concerns. |
| **Maintainability** | 6/10 | Harder to understand getSnapshot behavior. |
| **Correctness** | 7/10 | Correct if tuple equality handled properly, otherwise bugs. |
| **Testability** | 7/10 | Testable but tuple equality adds edge cases. |
| **Integration** | 8/10 | Backward compatible, clean integration. |
| **TOTAL** | 41/60 | Subtle issues with tuple equality |

---

## Comparison Matrix

| Criteria | Option 1: Separate Tracker | Option 2: Unified | Option 3: Opt-in | Option 4: Double-Proxy |
|----------|----------------------------|-------------------|------------------|------------------------|
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Complexity | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Maintainability | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Correctness | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Backward Compat | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Meets Requirements | ✓ All | ✗ Breaking | ✗ Not automatic | ✓ All |
| **Recommendation** | **🏆 BEST** | ❌ | ❌ | ⚠️ |

---

## Council Discussion

**Architect**: "Option 1 is the clear winner. It's clean, maintainable, and meets all requirements. The dual-tracking system is actually an advantage - each concern is isolated and testable."

**Performance Engineer**: "I agree, though I wish we could go with Option 3 for maximum performance. But since the requirement is 'automatic by default', Option 1 is the best we can do. We can still optimize descriptor caching and proxy creation."

**API Designer**: "Option 2 would be my nightmare - breaking changes for existing users. Option 1 maintains the exact same API, which is critical. Option 4 is clever but the tuple equality issues worry me."

**Test Engineer**: "Option 1 is easiest to test. Clear boundaries between state tracking and getter tracking. Each can be tested independently, then integration tests verify they work together."

**Pragmatist**: "Let's not overthink this. Option 1 is straightforward, meets requirements, maintains backward compatibility, and follows the same patterns we already use for state tracking. Ship it."

---

## Recommendation Preview

**Option 1: Proxy-Based Tracking with Separate Getter Tracker** is the recommended solution because:

1. ✓ **Meets all requirements**: Automatic, reference equality, performance-focused, backward compatible
2. ✓ **Clean architecture**: Separation of concerns, parallel to existing state tracking
3. ✓ **Maintainable**: Easy to understand, debug, and extend
4. ✓ **Testable**: Clear boundaries, isolated components
5. ✓ **Performance**: Can optimize descriptor caching, fast comparisons
6. ✓ **Low risk**: Minimal changes to existing code, well-contained

Next step: Create detailed recommendation document with implementation specifics.
# Bloc Getter Tracking - Research Findings

## Problem Space Analysis

### Current State Tracking Mechanism

The existing `useBloc` hook in `packages/blac-react/src/useBloc.ts` uses a sophisticated proxy-based tracking system:

1. **Proxy Creation**: State is wrapped in a Proxy that intercepts property access
2. **Path Tracking**: Accessed properties are recorded as paths (e.g., `"count"`, `"items[0].name"`)
3. **Change Detection**: On state changes, only tracked paths are compared using `Object.is()`
4. **Selective Re-rendering**: Component only re-renders if a tracked path's value changed

```typescript
// Current state tracking flow (lines 147-163 in useBloc.ts)
function createAutoTrackSnapshot<TBloc>(instance: TBloc, hookState: HookState<TBloc>) {
  return () => {
    const tracker = hookState.tracker || (hookState.tracker = createTrackerState());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);  // Store previous paths
    }

    startTracking(tracker);                          // Enable tracking
    return createProxy(tracker, instance.state);     // Return proxied state
  };
}
```

### The Getter Problem

Bloc instances can define **computed properties** (getters) that derive values from state:

```typescript
class TodoBloc extends Cubit<{ todos: Todo[]; filter: string }> {
  get visibleTodos() {
    return this.state.todos.filter(t =>
      this.state.filter === 'all' || t.status === this.state.filter
    );
  }
}
```

**Current behavior**: When `bloc.visibleTodos` is accessed:
- ✗ The getter access itself is NOT tracked
- ✗ Component re-renders on ANY state change (even unrelated ones)
- ✗ No optimization based on whether the getter result actually changed

**Desired behavior**:
- ✓ Track that `visibleTodos` was accessed
- ✓ Re-compute getter on state changes
- ✓ Only re-render if the computed value is different

### Why This Matters

```typescript
function TodoList() {
  const [state, bloc] = useBloc(TodoBloc);
  return <ul>{bloc.visibleTodos.map(t => <li>{t.name}</li>)}</ul>;
}

// Scenario 1: User adds a todo
// - state.todos changes → visibleTodos result changes → ✓ Re-render needed

// Scenario 2: User changes an unrelated field (e.g., isDarkMode)
// - state.isDarkMode changes → visibleTodos result SAME → ✗ Unnecessary re-render

// Scenario 3: User changes filter from 'all' to 'active'
// - state.filter changes → visibleTodos result changes → ✓ Re-render needed
```

Without getter tracking, **every** state change causes a re-render, even when the computed value stays the same.

## Current Codebase Relevant to Feature

### Core Tracking Infrastructure (`@blac/core`)

Located in `packages/blac/src/tracking/`:

#### 1. Dependency Tracker (`dependency-tracker.ts`)
- **Purpose**: High-level API for tracking state property access
- **Key Functions**:
  - `createTrackerState<T>()`: Initialize tracking state
  - `startTracking(tracker)`: Enable property access recording
  - `createProxy(tracker, state)`: Create state proxy
  - `captureTrackedPaths(tracker, state)`: Save tracked paths after render
  - `hasChanges(tracker, state)`: Compare current vs tracked values
  - `hasTrackedData(tracker)`: Check if any paths tracked

**Important**: Uses `Object.is()` for comparison (lines 165):
```typescript
if (!Object.is(currentValue, info.value)) {
  return true;  // Value changed
}
```

#### 2. Proxy Tracker (`proxy-tracker.ts`)
- **Purpose**: Low-level proxy implementation with path recording
- **Key Functions**:
  - `createProxyForTarget(state, target)`: Create proxy for any object/array
  - `isProxyable(value)`: Check if value can be proxied
- **Proxy Behavior**: Intercepts `get` operations, records paths, recursively proxies nested objects

#### 3. Path Utilities (`path-utils.ts`)
- **Purpose**: Parse and navigate object paths
- **Key Functions**:
  - `parsePath(path: string)`: Convert `"items[0].name"` to `["items", "0", "name"]`
  - `getValueAtPath(obj, segments)`: Navigate to path and get value
  - `shallowEqual(a, b)`: Compare arrays by shallow equality

### React Integration (`@blac/react`)

Located in `packages/blac-react/src/`:

#### useBloc Hook (`useBloc.ts`)
**Architecture** (lines 190-205 comments explain lifecycle):

1. **Mount Phase**:
   - `useMemo`: Create bloc, subscribeFn, getSnapshotFn (once)
   - `useSyncExternalStore` calls `getSnapshotFn`: Create tracker, start tracking, return proxy
   - Component renders with proxied state (tracks property access)
   - `useSyncExternalStore` calls `getSnapshotFn` again: Capture tracked paths
   - `useSyncExternalStore` calls `subscribeFn`: Set up state change listener

2. **State Change Phase**:
   - Bloc state changes
   - `subscribeFn` callback checks `hasChanges()` with tracker
   - If tracked paths changed → trigger re-render

3. **Re-render Phase**:
   - `useMemo` returns cached values (same bloc, functions)
   - `useSyncExternalStore` calls `getSnapshotFn`: Capture paths, start tracking, return proxy

**Three Tracking Modes** (lines 236-249):

```typescript
if (useManualDeps) {
  // Mode 1: Manual dependencies
  subscribeFn = createManualDepsSubscribe(...);
  getSnapshotFn = createManualDepsSnapshot(...);
} else if (!autoTrackEnabled) {
  // Mode 2: No tracking (re-render on any change)
  subscribeFn = createNoTrackSubscribe(...);
  getSnapshotFn = createNoTrackSnapshot(...);
} else {
  // Mode 3: Auto-tracking (default)
  subscribeFn = createAutoTrackSubscribe(...);
  getSnapshotFn = createAutoTrackSnapshot(...);
}
```

**Subscribe Function** (lines 98-112):
```typescript
function createAutoTrackSubscribe(instance, hookState) {
  return (callback) => {
    return instance.subscribe(() => {
      const tracker = hookState.tracker || (hookState.tracker = createTrackerState());
      if (hasChanges(tracker, instance.state)) {
        callback();  // Trigger re-render
      }
    });
  };
}
```

**Snapshot Function** (lines 148-163):
```typescript
function createAutoTrackSnapshot(instance, hookState) {
  return () => {
    const tracker = hookState.tracker || (hookState.tracker = createTrackerState());

    if (hasTrackedData(tracker)) {
      captureTrackedPaths(tracker, instance.state);
    }

    startTracking(tracker);
    return createProxy(tracker, instance.state);
  };
}
```

#### Hook State Structure (lines 89-93):
```typescript
interface HookState<TBloc extends StateContainer<AnyObject>> {
  tracker: TrackerState<ExtractState<TBloc>> | null;       // For state tracking
  manualDepsCache: unknown[] | null;                       // For manual deps mode
  // NEW: Need to add getter tracking state here
}
```

#### Options & Types (`types.ts`)

```typescript
interface UseBlocOptions<TBloc> {
  props?: AnyObject;
  instanceId?: string;
  dependencies?: (state, bloc) => unknown[];  // Manual deps (disables auto-track)
  autoTrack?: boolean;                        // Enable/disable state tracking
  onMount?: (bloc) => void;
  onUnmount?: (bloc) => void;
}
```

## Best Practices and Common Patterns

### 1. Getter Detection in JavaScript

**Standard Pattern** (from web research):
```typescript
function isGetter(obj: any, prop: string | symbol): boolean {
  // Walk up prototype chain
  let current = obj;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) {
      return descriptor.get !== undefined;
    }
    current = Object.getPrototypeOf(current);
  }
  return false;
}
```

**Performance Optimization**: Cache descriptor lookups per class
```typescript
const getterCache = new WeakMap<any, Set<string | symbol>>();

function getGetters(obj: any): Set<string | symbol> {
  const constructor = obj.constructor;
  if (getterCache.has(constructor)) {
    return getterCache.get(constructor)!;
  }

  const getters = new Set<string | symbol>();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const prop of Object.getOwnPropertyNames(current)) {
      const desc = Object.getOwnPropertyDescriptor(current, prop);
      if (desc?.get) {
        getters.add(prop);
      }
    }
    current = Object.getPrototypeOf(current);
  }

  getterCache.set(constructor, getters);
  return getters;
}
```

### 2. Proxy-based Interception

**Basic Pattern**:
```typescript
const proxiedBloc = new Proxy(bloc, {
  get(target, prop, receiver) {
    if (isGetter(target, prop)) {
      // Track getter access
      trackGetterAccess(prop);

      // Get the getter function
      const descriptor = getDescriptor(target, prop);
      const value = descriptor.get!.call(target);

      // Store computed value
      storeGetterValue(prop, value);

      return value;
    }

    // Default behavior for methods/properties
    return Reflect.get(target, prop, receiver);
  }
});
```

**Performance Consideration**: Proxy overhead is 5-20% slower than direct access (from web research), but this is acceptable for the UI layer.

### 3. React useSyncExternalStore Patterns

**Key Insight** (from web research):
- `getSnapshot` must be fast and return stable references when data unchanged
- `subscribe` should be stable (defined outside component or memoized)
- Use `Object.is()` comparison for re-render decisions

**Best Practice for Mutable Stores**:
```typescript
function getSnapshot() {
  // If data unchanged, return SAME snapshot reference
  if (lastSnapshot && !dataChanged()) {
    return lastSnapshot;
  }

  // Create new snapshot only when data changed
  const newSnapshot = computeSnapshot();
  lastSnapshot = newSnapshot;
  return newSnapshot;
}
```

**Applied to Getter Tracking**:
```typescript
function getSnapshot() {
  // Enable getter tracking
  getterTracker.isTracking = true;
  getterTracker.accessedGetters.clear();

  // Return proxied state (tracks state access)
  // AND proxied bloc (tracks getter access)
  return proxiedState;
}

function subscribe(callback) {
  return bloc.subscribe(() => {
    // Check state changes
    const stateChanged = hasChanges(stateTracker, bloc.state);

    // Check getter changes
    const getterChanged = hasGetterChanges(getterTracker);

    if (stateChanged || getterChanged) {
      callback();
    }
  });
}
```

### 4. Comparison Strategies

Given the requirement to use **reference equality** (Object.is):

**For Primitives**: Works perfectly
```typescript
Object.is(5, 5);        // true
Object.is("a", "a");    // true
Object.is(NaN, NaN);    // true
Object.is(+0, -0);      // false (better than ===)
```

**For Objects/Arrays**: Only compares references
```typescript
const arr1 = [1, 2, 3];
const arr2 = [1, 2, 3];
Object.is(arr1, arr2);  // false (different references)
Object.is(arr1, arr1);  // true (same reference)
```

**Implication**: Getters that return new objects each time will always trigger re-renders:
```typescript
// ⚠️ Always returns new array → always triggers re-render
get filtered() {
  return this.state.items.filter(x => x.active);
}

// ✓ Caches and returns same array when possible
private _cachedFiltered: { stateRef: any; result: Item[] } | null = null;
get filtered() {
  if (this._cachedFiltered?.stateRef === this.state) {
    return this._cachedFiltered.result;
  }
  const result = this.state.items.filter(x => x.active);
  this._cachedFiltered = { stateRef: this.state, result };
  return result;
}
```

## Potential Pitfalls and Anti-patterns

### 1. Nested Getter Calls

**Problem**: Getter A calls getter B
```typescript
class MyBloc extends Cubit<{ value: number }> {
  get doubled() {
    return this.state.value * 2;
  }

  get quadrupled() {
    return this.doubled * 2;  // Calls another getter
  }
}
```

**Risk**: Double-tracking, infinite loops, or missing tracking

**Mitigation**: Track "currently computing" getters to prevent re-entrance
```typescript
const computingGetters = new Set<string | symbol>();

function computeGetter(prop: string | symbol) {
  if (computingGetters.has(prop)) {
    // Already computing this getter (nested call)
    // Just compute and return, don't track again
    return directlyComputeGetter(prop);
  }

  computingGetters.add(prop);
  try {
    const result = directlyComputeGetter(prop);
    trackGetter(prop, result);
    return result;
  } finally {
    computingGetters.delete(prop);
  }
}
```

### 2. Getter Side Effects

**Problem**: Getter modifies state or has side effects
```typescript
class BadBloc extends Cubit<{ count: number; logs: string[] }> {
  get doubledWithLog() {
    this.update(s => ({
      ...s,
      logs: [...s.logs, 'doubled accessed']  // ⚠️ Side effect!
    }));
    return this.state.count * 2;
  }
}
```

**Risk**: Infinite re-render loops, unpredictable behavior

**Mitigation**:
- Document that getters must be pure
- In dev mode, could detect state changes during getter computation and warn
- This is **out of scope** for v1 but worth documenting

### 3. Getter Errors

**Problem**: Getter throws during computation or comparison
```typescript
get problematic() {
  if (this.state.value < 0) {
    throw new Error('Invalid value');
  }
  return this.state.value * 2;
}
```

**Risk**:
- Error during render → propagates to React error boundary (expected)
- Error during comparison (in subscribe callback) → could break tracking

**Mitigation** (per requirements: "stop tracking that getter"):
```typescript
function hasGetterChanges(bloc, tracker) {
  for (const prop of tracker.accessedGetters) {
    try {
      const newValue = computeGetter(bloc, prop);
      const oldValue = tracker.trackedValues.get(prop);

      if (!Object.is(newValue, oldValue)) {
        tracker.trackedValues.set(prop, newValue);
        return true;
      }
    } catch (error) {
      console.warn(`Getter ${String(prop)} threw error:`, error);
      // Stop tracking this getter
      tracker.accessedGetters.delete(prop);
      tracker.trackedValues.delete(prop);
      // Treat as "changed" to trigger re-render
      return true;
    }
  }
  return false;
}
```

### 4. Methods vs Getters

**Problem**: Can't distinguish between methods and getters by typeof alone
```typescript
class MyBloc extends Cubit<{ value: number }> {
  get computed() { return this.state.value * 2; }
  method() { return this.state.value * 3; }
}

// Both are functions:
typeof bloc.computed   // 'function' (getter appears as function)
typeof bloc.method     // 'function'
```

**Solution**: Must check descriptor to identify getters
```typescript
const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(bloc), 'computed');
desc.get !== undefined  // true for getter
```

### 5. React Strict Mode Double-Invocation

**Problem**: In development, React calls functions twice to detect impure effects

**Risk**: Getter tracking state could become inconsistent

**Mitigation**:
- Ensure tracking operations are idempotent
- Use stable refs for tracking state
- Test thoroughly in Strict Mode

### 6. Memory Leaks

**Problem**: Tracked getter values hold references to old objects

**Risk**: Memory growth over time

**Mitigation**:
- Clear tracking state on component unmount
- Don't use WeakMap for getter values (need to store primitives too)
- Use regular Map but clear it on unmount

### 7. Performance Overhead

**Problem**: Every getter access goes through proxy, re-computation on every state change

**Measurement** (from web research):
- Proxy trap overhead: 5-20% slower than direct access
- Acceptable for UI layer, not for hot loops

**Mitigation**:
- Cache proxy instance (don't recreate each render)
- Only track during render phase (disable tracking outside render)
- Use fast Object.is() comparison
- Cache descriptor lookups per class

## Architectural Considerations

### Option 1: Separate Getter Tracker (Recommended)

**Approach**: Create parallel tracking system for getters, integrate at subscribe/snapshot level

**Pros**:
- Clean separation of concerns
- Minimal changes to existing state tracking
- Easy to understand and maintain
- Can optimize independently

**Cons**:
- Duplicate tracking infrastructure
- Two separate Maps/Sets to manage

**Structure**:
```typescript
interface HookState<TBloc> {
  tracker: TrackerState<ExtractState<TBloc>> | null;      // Existing state tracker
  manualDepsCache: unknown[] | null;                      // Existing manual deps
  getterTracker: GetterTrackingState | null;              // NEW getter tracker
  proxiedBloc: TBloc | null;                              // NEW cached bloc proxy
}

interface GetterTrackingState {
  trackedValues: Map<string | symbol, unknown>;          // prop → last value
  accessedInRender: Set<string | symbol>;                // props accessed this render
  isTracking: boolean;                                    // enable/disable flag
}
```

### Option 2: Unified Tracker

**Approach**: Extend existing TrackerState to handle getters

**Pros**:
- Single tracking system
- Consistent API

**Cons**:
- More complex integration with path-based tracking
- Core package changes required
- Harder to understand

**Conclusion**: Option 1 is cleaner and meets constraints (no core changes).

### Integration Points Summary

1. **HookState Extension**: Add `getterTracker` and `proxiedBloc` fields
2. **useMemo**: Create bloc proxy, initialize getter tracker
3. **getSnapshot**: Enable getter tracking before return
4. **subscribe**: Check getter changes in addition to state changes
5. **useEffect cleanup**: Clear getter tracking state

### Data Flow

```
Component Render
    ↓
getSnapshot() called by useSyncExternalStore
    ↓
Enable getter tracking (isTracking = true)
Clear accessedInRender set
    ↓
Return proxied state & bloc
    ↓
Component renders with proxies
    ↓
Accessing bloc.getter → Proxy intercepts
    ↓
Check if property is getter (descriptor.get)
    ↓
If getter: add to accessedInRender, compute & store value
    ↓
getSnapshot() called again
    ↓
Disable getter tracking (isTracking = false)
    ↓
subscribe() callback registered
    ↓
[Later] State changes
    ↓
subscribe() callback invoked
    ↓
Check state tracker: hasChanges(stateTracker, newState)
Check getter tracker: hasGetterChanges(getterTracker, bloc)
    ↓
If either changed → callback() → Re-render
```

## Key Technical Decisions

Based on requirements and research:

1. **Comparison Method**: `Object.is()` (reference equality)
   - Fast, consistent with state tracking
   - User responsible for getter memoization if needed

2. **Error Handling**: Stop tracking that getter, log warning, trigger re-render
   - Defensive, prevents tracking system from breaking
   - Lets React error boundary handle render errors

3. **Default Behavior**: Automatic (always enabled when autoTrack is true)
   - Consistent with state tracking
   - Zero configuration

4. **Manual Dependencies**: Disable automatic getter tracking
   - Backward compatible
   - Manual takes full control

5. **Tracking Scope**: Only getters accessed during render
   - Matches state tracking behavior
   - Minimal overhead

6. **Proxy Caching**: Cache proxied bloc instance in useMemo
   - Avoid recreating proxy each render
   - Performance optimization

7. **Descriptor Caching**: Cache getter detection per class
   - Avoid walking prototype chain repeatedly
   - Significant performance improvement

## Performance Benchmarks to Create

1. **Baseline**: Component with getter access, no tracking
2. **With Tracking**: Same component with getter tracking enabled
3. **Complex Getters**: Multiple getters with nesting
4. **Large Blocs**: Blocs with many getters (10+)
5. **Memory**: Track memory usage over time
6. **Comparison**: Manual dependencies vs auto-tracking

**Success Criteria**: <5% overhead compared to manual dependencies approach

## References

- Existing useBloc implementation: `packages/blac-react/src/useBloc.ts`
- Tracking utilities: `packages/blac/src/tracking/`
- Web research: MDN Proxy docs, Object.getOwnPropertyDescriptor, useSyncExternalStore patterns
- Performance data: Proxy overhead 5-20%, V8 optimizations up to 438% improvement

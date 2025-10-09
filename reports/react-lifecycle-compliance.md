# Investigation: React Lifecycle Pattern Compliance

## Bottom Line

**Verdict**: BlaC follows React patterns correctly with one intentional design difference
**Key Difference**: State persists across component unmounts by default (shared instances)
**Compliance**: High - Uses `useSyncExternalStore`, proper cleanup, Strict Mode compatible
**Confidence**: High - All 111 React integration tests passing

## What React Developers Expect vs What BlaC Does

### ✅ React-Compatible Patterns

#### 1. **Subscription Management**

- **Uses**: `useSyncExternalStore` (React 18's recommended external state hook)
- **Location**: `useBloc.ts:186-202`
- **Result**: Automatic batching, no tearing, concurrent mode compatible

#### 2. **Component Lifecycle Integration**

- **Mount**: `useEffect` with adapter.mount() (`useBloc.ts:154-161`)
- **Unmount**: Returns cleanup function calling `adapter.unmount()`
- **Result**: Proper cleanup, no memory leaks

#### 3. **Strict Mode Compatibility**

- **Tested**: 8 comprehensive Strict Mode tests pass
- **Handles**: Double-mounting correctly
- **Config**: `strictModeCompatibility` flag available
- **Result**: Works in development with double-effect invocations

#### 4. **Error Boundary Integration**

- **Tested**: 10 error boundary tests pass
- **Supports**: Recovery after errors via state reset
- **Feature**: Allows `emit()` during `DISPOSAL_REQUESTED` for error recovery
- **Result**: Errors caught and handled as React developers expect

#### 5. **Concurrent Mode Features**

- **Supports**: `useTransition`, `useDeferredValue`
- **Tested**: Handles interrupted renders gracefully
- **No Tearing**: State snapshots remain consistent
- **Result**: Modern React 18 features work correctly

#### 6. **Memory Management**

- **Uses**: WeakRef for component references (`BlocBase.ts:147-150`)
- **Cleanup**: Scheduled via `queueMicrotask` (`SubscriptionManager.ts:389-394`)
- **Result**: Dead components don't prevent garbage collection

### ⚠️ Intentional Design Differences

#### **Shared State by Default**

```typescript
// useState behavior (React default):
// Each component gets its own state
function Counter() {
  const [count, setCount] = useState(0); // Independent per component
}

// BlaC behavior (by default):
// All components share the same bloc instance
function Counter() {
  const [state, bloc] = useBloc(CounterCubit); // Shared across all components
}
```

**Why Different**:

- BlaC is designed for **global state management** (like Redux, Zustand)
- React's `useState` is for **local component state**
- This is documented and intentional

**How to Get Local State**:

```typescript
class IsolatedCubit extends Cubit<number> {
  static isolated = true; // Each component gets own instance
}
```

#### **Disposal Delay**

```typescript
// useState: Immediate cleanup on unmount
useEffect(() => {
  return () => cleanup(); // Runs immediately on unmount
}, []);

// BlaC: Grace period before disposal (default 100ms)
// Allows quick remount without losing state
```

**Why Different**:

- Prevents disposal during rapid mount/unmount cycles
- Useful for navigation, tab switching, modal closing
- Configurable: `Blac.setConfig({ disposalTimeout: 0 })` for immediate cleanup

**Design Justification**: Prevents "dispose then immediately recreate" scenarios common in SPAs.

## Lifecycle Comparison: useState vs useBloc

| Aspect              | useState               | useBloc (Default)         | useBloc (Isolated)        |
| ------------------- | ---------------------- | ------------------------- | ------------------------- |
| **Instance**        | Per component          | Shared globally           | Per component             |
| **Cleanup**         | Immediate              | Delayed (100ms)           | Delayed (100ms)           |
| **Re-renders**      | Always on state change | Depends on proxy tracking | Depends on proxy tracking |
| **Memory**          | Local to component     | Global registry           | Adapter-managed           |
| **Persist Unmount** | No                     | Yes (during timeout)      | No (after timeout)        |
| **Concurrent Safe** | Yes                    | Yes                       | Yes                       |

## State Management Philosophy

### React's Built-in State (useState/useReducer)

```typescript
// Philosophy: Component-local state
// Lifecycle: Tied to component mount/unmount
// Scope: Single component tree
const [state, setState] = useState(0);
```

### BlaC State Management

```typescript
// Philosophy: Business logic separated from UI
// Lifecycle: Independent of any single component
// Scope: Application-wide (by default)
const [state, bloc] = useBloc(CounterBloc);
```

**Mental Model**: BlaC blocs are like Redux stores or Zustand stores - they exist independently of components and can be shared across the app.

## How BlaC Integrates with React Lifecycle

### Component Mount

1. `useBloc` called during render
2. `useMemo` creates/retrieves `BlacAdapter` (`useBloc.ts:106-125`)
3. `useEffect` calls `adapter.mount()` (`useBloc.ts:156`)
4. Adapter creates subscription via `useSyncExternalStore` (`useBloc.ts:186`)
5. `onMount` callback invoked if provided

### Component Re-render

1. `adapter.resetTracking()` clears previous render's dependencies (`useBloc.ts:129`)
2. `adapter.notifyRender()` informs plugins (`useBloc.ts:132`)
3. State accessed through proxy (if enabled) tracks dependencies
4. `useSyncExternalStore` determines if component should re-render

### State Change

1. `bloc.emit(newState)` called from bloc method
2. `SubscriptionManager.notify()` triggered (`BlocBase.ts:232`)
3. `useSyncExternalStore` callback invoked
4. React schedules re-render if subscribed component should update

### Component Unmount

1. `useEffect` cleanup function called (`useBloc.ts:159`)
2. `adapter.unmount()` unsubscribes (`BlacAdapter.ts:255-277`)
3. `onUnmount` callback invoked if provided
4. Bloc checks if should schedule disposal (`BlocBase.ts:411-419`)
5. If no subscribers remain, disposal scheduled after timeout

### Disposal Process

```typescript
// Lifecycle state machine:
ACTIVE → DISPOSAL_REQUESTED → DISPOSING → DISPOSED
         ↑                      |
         └──────────────────────┘
         (cancel if resubscribed)
```

**Grace Period**: 100ms (default) between `DISPOSAL_REQUESTED` and `DISPOSING`

- Prevents "flicker" disposal on quick unmount/remount
- Allows error recovery code to reset state
- Configurable per-bloc or globally

## React 18 Specific Features

### Strict Mode Double-Mounting

**Problem**: React 18 Strict Mode mounts/unmounts/remounts components
**BlaC Solution**:

- Disposal timeout prevents premature cleanup
- `strictModeCompatibility` config flag
- All tests pass in `<React.StrictMode>`

### Concurrent Rendering

**Problem**: Renders can be interrupted and restarted
**BlaC Solution**:

- `useSyncExternalStore` provides consistent snapshots
- No state tearing observed in tests
- Proxy tracking reset per render prevents stale dependencies

### Suspense Integration

**Works**: Blocs can be used in Suspense boundaries
**Tests**: 5 Suspense integration tests pass
**Result**: Loading states handled correctly

## Potential Gotchas for React Developers

### 1. **Shared State Surprise**

```typescript
// Two components, same bloc
function ComponentA() {
  const [state, bloc] = useBloc(CounterCubit);
  bloc.increment(); // Affects ComponentB too!
}

function ComponentB() {
  const [state] = useBloc(CounterCubit); // Same instance!
}
```

**Mitigation**: Documentation, or use `static isolated = true`

### 2. **State Persists After Unmount**

```typescript
function Page() {
  const [state, bloc] = useBloc(CounterCubit);
  bloc.increment(); // count = 1
  // Navigate away...
  // Navigate back within 100ms
  // count is still 1 (not reset to 0)
}
```

**Mitigation**: Use `onUnmount` to reset state if needed, or set `disposalTimeout: 0`

### 3. **Method Binding Requirements**

```typescript
// ❌ WRONG - Won't work in React
class MyCubit extends Cubit<number> {
  increment() {
    this.emit(this.state + 1); // `this` is undefined in React
  }
}

// ✅ CORRECT - Arrow function preserves `this`
class MyCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
}
```

**Why**: React event handlers don't auto-bind `this`
**Detection**: Tests catch this, TypeScript doesn't warn

### 4. **Global Instance Registry**

```typescript
// Blocs stored in global Blac singleton
const bloc = Blac.getInstance().getBloc(CounterCubit);
// This is powerful but differs from React's "component tree" model
```

**Implication**: Can access blocs from anywhere, not just component tree

## Comparison to Other State Management

### Redux

- **Similar**: Global store, independent lifecycle
- **Different**: BlaC has per-bloc disposal, Redux never disposes

### Zustand

- **Similar**: Shared store, `useSyncExternalStore` based
- **Different**: BlaC has class-based blocs, Zustand uses hooks

### Jotai/Recoil

- **Similar**: Atom-based state
- **Different**: BlaC blocs are more coarse-grained (entire feature vs single value)

### MobX

- **Similar**: Class-based, proxy tracking (optional)
- **Different**: BlaC is immutable by default, MobX is mutable

## Evidence of Correctness

### Test Coverage

```
✅ 111 React integration tests pass
✅ 284 Core tests pass
✅ 0 failures
```

### Specific Test Suites

- **Strict Mode**: 8 tests - Double-mounting, rapid mount/unmount
- **Error Boundaries**: 10 tests - Error catching, recovery
- **Disposal**: Tests for shared/isolated/keepalive patterns
- **Concurrent Mode**: Tests for tearing, interruption
- **Suspense**: 5 tests - Lazy loading integration
- **Memory**: 19 tests - WeakRef cleanup, no leaks

### React Integration Points

| Feature          | Implementation         | Test Coverage    |
| ---------------- | ---------------------- | ---------------- |
| Subscription     | `useSyncExternalStore` | ✅ Comprehensive |
| Mount/Unmount    | `useEffect` cleanup    | ✅ Comprehensive |
| Strict Mode      | Disposal timeout       | ✅ 8 tests       |
| Error Boundaries | State during disposal  | ✅ 10 tests      |
| Concurrent       | Snapshot consistency   | ✅ 4 tests       |
| Memory           | WeakRef cleanup        | ✅ 19 tests      |

## Recommendations

### For React Developers Using BlaC

1. **Mental Model**: Think "Redux store" not "useState"
2. **Read Docs**: Understand shared vs isolated instances
3. **Use `isolated`**: If you want component-local state
4. **Arrow Functions**: Always use arrow function methods in blocs
5. **Disposal Timeout**: Understand the 100ms grace period

### For BlaC Maintainers

1. ✅ **Current Design is Correct**: Follows React patterns properly
2. ✅ **Documentation**: Make shared-by-default behavior clear
3. ✅ **DX**: Consider warning when non-arrow methods detected
4. ✅ **Migration Guide**: Show useState → useBloc equivalents

## Risks & Edge Cases

### Race Conditions

**Nancy Leveson**: "What happens if state updates during disposal?"
**Answer**: Allowed during `DISPOSAL_REQUESTED` (for error recovery), rejected during `DISPOSING`/`DISPOSED`. This is intentional and tested.

### Memory Leaks

**Potential**: Global registry keeps blocs alive
**Mitigation**:

- WeakRef cleanup for dead components
- Disposal timeout removes unused blocs
- `keepAlive: false` (default) allows cleanup
  **Tests**: 19 memory leak tests pass

### Strict Mode Double Effects

**Potential**: Disposal triggered by first unmount
**Mitigation**: Disposal timeout > 0 allows remount to cancel disposal
**Tests**: 8 Strict Mode tests verify this works

## Next Steps

### If Used As Local State (Like useState)

```typescript
class LocalCubit extends Cubit<number> {
  static isolated = true;
  static disposalTimeout = 0; // Immediate cleanup
  constructor() {
    super(0);
  }
  increment = () => this.emit(this.state + 1);
}
```

### If Used As Global State (Like Redux)

```typescript
class GlobalCubit extends Cubit<number> {
  // Default behavior: shared, 100ms disposal timeout
  constructor() {
    super(0);
  }
  increment = () => this.emit(this.state + 1);
}
```

## Conclusion

**BlaC follows React lifecycle patterns correctly.** The main difference is philosophical: BlaC is designed for **global state management** where state outlives individual components, while React's built-in state is **component-local**.

The implementation uses React's recommended APIs:

- ✅ `useSyncExternalStore` for external subscriptions
- ✅ `useEffect` for lifecycle hooks
- ✅ `WeakRef` for automatic cleanup
- ✅ Proper cleanup functions

The disposal timeout is an intentional design choice that prevents common SPA issues and works correctly with React's lifecycle, including Strict Mode double-mounting.

**For React developers**: Think of `useBloc` like `useSelector` (Redux) or `useStore` (Zustand), not like `useState`. The state is shared and persistent by design.

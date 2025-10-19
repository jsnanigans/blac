# Investigation: BlaC Dependency Tracking Architecture Analysis

## Bottom Line

**Root Cause**: Getter cache population happens AFTER it's checked, causing first-render cache misses
**Fix Location**: `SubscriptionManager.ts:383-394` - checkGetterChanged returns false on empty cache
**Confidence**: High

## Executive Summary

The BlaC dependency tracking system has a fundamental timing issue where getter values are cached during render (via `pendingGetterValues`) but only transferred to the subscription's `getterCache` in `commitTracking()` which runs in a `useEffect` AFTER render completes. When `checkGetterChanged` is called during state changes, it finds an empty cache and returns `false` (no change), preventing necessary re-renders when getter dependencies actually change.

## Architecture Overview

### Complete Flow: User Accesses Getter → Re-render Triggered

1. **Render Phase** (synchronous)
   - `useBloc` calls `adapter.resetTracking()` - clears pending dependencies
   - React renders component
   - Component accesses `cubit.fullName` getter via proxy
   - `ProxyFactory.createBlocProxy` detects getter access, calls `trackAccess`
   - `BlacAdapter.trackAccess` stores path in `pendingDependencies` and value in `pendingGetterValues`

2. **Commit Phase** (useEffect - after render)
   - `useBloc` calls `adapter.commitTracking()` in useEffect
   - Transfers `pendingGetterValues` → `subscription.getterCache`
   - Updates subscription dependencies with filtered leaf paths

3. **State Change Phase**
   - `BlocBase.emit()` triggers `SubscriptionManager.notify()`
   - For each subscription, calls `shouldNotifyForPaths()`
   - For getter paths (_class.*), calls `checkGetterChanged()`
   - **BUG**: On first state change, cache is empty, returns false
   - Component doesn't re-render when it should

### Data Flow Diagram

```
Component Render
    ↓
resetTracking() [clears pending]
    ↓
Proxy Access (cubit.getter)
    ↓
trackAccess() [stores in pendingGetterValues]
    ↓
Render Complete
    ↓
useEffect runs
    ↓
commitTracking() [transfers to subscription.getterCache]
    ↓
State Change (later)
    ↓
checkGetterChanged() [checks cache - BUT IT'S EMPTY ON FIRST CHECK!]
```

## Root Cause Analysis

### The Getter Cache Timing Problem

**Evidence from code:**

1. **Cache population timing** (`BlacAdapter.ts:478-494`):
```typescript
// In commitTracking() - runs in useEffect AFTER render
if (this.pendingGetterValues.size > 0) {
  for (const [getterName, value] of this.pendingGetterValues) {
    subscription.getterCache.set(getterPath, {
      value: value,
      error: undefined,
    });
  }
}
```

2. **Cache check timing** (`SubscriptionManager.ts:383-394`):
```typescript
// In checkGetterChanged() - called during state changes
if (!cachedEntry) {
  // First access - cache the result and return false (no change)
  // We return false because we can't determine if it changed without a previous value
  // This prevents unnecessary re-renders when the cache is empty
  subscription.getterCache.set(getterPath, {
    value: newValue,
    error: newError,
  });
  return false; // ← THE PROBLEM!
}
```

**The Issue**: When a state change occurs BEFORE the first `commitTracking()` has run, the cache is empty. The system assumes "no previous value = no change" and returns `false`, preventing the re-render.

### React Strict Mode Amplification

In React Strict Mode:
1. Component renders twice (by design)
2. First render: tracks dependencies, stores in `pendingGetterValues`
3. Second render: CLEARS `pendingGetterValues` in `resetTracking()`
4. Only one `useEffect` runs (React optimization)
5. `commitTracking()` transfers empty `pendingGetterValues` to cache
6. Cache remains empty, getter changes never trigger re-renders

## Architectural Problems

### 1. Two-Phase Dependency Tracking Complexity

The system uses a complex two-phase approach:
- **Phase 1**: Collect dependencies during render (synchronous)
- **Phase 2**: Commit dependencies after render (useEffect)

This creates a timing window where dependencies are known but not yet active.

### 2. Multiple Caching Layers

- `ProxyFactory`: Three-level WeakMap cache (target → consumer → path)
- `BlacAdapter`: `pendingGetterValues` temporary cache
- `SubscriptionManager`: `subscription.getterCache` permanent cache

Data flows through 3 different caches with different lifecycles.

### 3. Unclear State Ownership

- `BlacAdapter` tracks dependencies but doesn't own subscriptions
- `SubscriptionManager` owns subscriptions but relies on adapter for population
- Circular dependency: Adapter needs subscription ID, subscription needs adapter's tracked paths

### 4. Mixed Paradigms

- Manual dependencies mode uses selector-based subscriptions
- Auto-tracking mode uses proxy-based path tracking
- Getter tracking uses value comparison
- State tracking uses path comparison

Different tracking mechanisms with different semantics in the same system.

## Comparison with Industry Patterns

### Zustand (Selector-based)
```javascript
const count = useStore(state => state.count)
```
- Simple: Selector runs on every state change
- No proxy overhead, no complex tracking
- Developer explicitly declares dependencies

### Valtio (Proxy-based)
```javascript
const snap = useSnapshot(state)
```
- Creates snapshot proxy during render
- Tracks access synchronously
- No two-phase commit, no timing issues

### MobX (Computed + Proxy)
```javascript
@computed get fullName() { return `${this.first} ${this.last}` }
```
- Computed values are cached at definition
- Dependencies tracked on first execution
- Cache invalidation is synchronous with state changes

### Jotai (Atom-based)
```javascript
const derivedAtom = atom(get => get(baseAtom) * 2)
```
- Dependencies declared at atom creation
- No runtime tracking needed
- Clear data flow graph

### BlaC's Anti-patterns

1. **Deferred commitment**: Dependencies tracked but not active until after render
2. **Pessimistic caching**: Assumes no change when cache is empty (opposite of most systems)
3. **Complex lifecycle**: Dependencies flow through 3 different caches
4. **Mixed paradigms**: Combines selectors, proxies, and manual tracking

## Specific Code Issues

### Bug #1: Empty Cache False Negative
**Location**: `SubscriptionManager.ts:383-394`
```typescript
if (!cachedEntry) {
  subscription.getterCache.set(getterPath, { value: newValue, error: newError });
  return false; // Should be true on first access!
}
```

### Bug #2: Double Clear in Strict Mode
**Location**: `BlacAdapter.ts:420`
```typescript
resetTracking(): void {
  this.pendingGetterValues.clear(); // Clears values from first render!
}
```

### Bug #3: Race Condition Window
**Location**: Between render and useEffect
- State changes during this window won't trigger re-renders
- No way to detect if cache is "not populated yet" vs "value hasn't changed"

### Complexity Hotspot #1: commitTracking
**Location**: `BlacAdapter.ts:430-536`
- 106 lines of complex logic
- Handles filtering, atomic swaps, cache transfers
- Multiple nested conditions and loops

### Complexity Hotspot #2: shouldNotifyForPaths
**Location**: `SubscriptionManager.ts:465-561`
- 96 lines of path matching logic
- Complex sibling detection algorithm
- Mixed getter and state path handling

## Performance Issues

1. **Proxy Creation Overhead**: New proxies created for every access (even with caching)
2. **Path Filtering**: O(n²) algorithm in `filterLeafPaths` for every commit
3. **Subscription Iteration**: All subscriptions checked on every state change
4. **Getter Re-execution**: Getters run twice (once during render, once during change detection)

## Recommendations

### Immediate Fix
Change `checkGetterChanged` to return `true` when cache is empty:
```typescript
if (!cachedEntry) {
  // First access - can't determine change, assume changed
  subscription.getterCache.set(getterPath, { value: newValue, error: newError });
  return true; // Trigger re-render on first access
}
```

### Short-term Improvements
1. Pre-populate getter cache during subscription creation
2. Track "cache ready" state to distinguish empty vs not-populated
3. Move cache population to synchronous phase (during trackAccess)

### Long-term Architectural Redesign
1. **Simplify to single-phase tracking**: Track and commit synchronously
2. **Unify caching strategy**: One cache, one ownership model
3. **Choose one paradigm**: Either selectors OR proxies, not both
4. **Synchronous computed values**: Like MobX, cache at definition time
5. **Immutable snapshots**: Like Valtio, create snapshot proxies per render

## Conclusion

The BlaC dependency tracking system suffers from a fundamental timing issue where getter values are tracked during render but only become active after render completes. This creates a window where state changes don't trigger necessary re-renders. The architecture's complexity stems from mixing multiple paradigms (selectors, proxies, manual dependencies) and using a two-phase commit pattern that creates timing hazards.

The immediate fix is simple (return `true` for empty cache), but the system would benefit from a broader architectural simplification that chooses one consistent tracking paradigm and eliminates the two-phase dependency commitment.

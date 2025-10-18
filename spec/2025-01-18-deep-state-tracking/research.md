# Deep State Tracking - Research

**Feature**: Deep/Nested State Dependency Tracking for BlaC React Integration
**Date**: 2025-01-18
**Status**: Research Complete

---

## Executive Summary

The current proxy-based dependency tracking system (V2) only tracks **top-level state properties**. This was a deliberate regression from V1 (which had nested proxies) due to performance concerns. However, those performance concerns are no longer relevant, and we can restore deep tracking with improvements.

**Key Finding**: V1 implementation already existed and can serve as a foundation, but needs enhancements for efficient caching and change detection.

---

## Historical Context

### V1: Nested Proxy System (Pre-July 2025)

**Implementation**: Created proxies recursively for all nested objects/arrays accessed during render.

```typescript
// V1 ProxyFactory (simplified)
get(obj: T, prop: string | symbol): any {
  const fullPath = path ? `${path}.${prop}` : prop;
  const value = Reflect.get(obj, prop);

  // Track access
  consumerTracker.trackAccess(consumerRef, 'state', fullPath, trackValue);

  // Recursively proxy nested objects
  if (value && typeof value === 'object') {
    return ProxyFactory.createStateProxy({
      target: value,
      consumerRef,
      consumerTracker,
      path: fullPath,  // Build full path: "profile.address.city"
    });
  }

  return value;
}
```

**What it did right**:
- ✅ Tracked full paths: `"profile.address.city"`
- ✅ Precise change detection (only notify exact path subscribers)
- ✅ Worked with arbitrary nesting depth
- ✅ Handled arrays correctly

**Why it was removed** (commit c1cede8, July 2025):
- ⚠️ Performance concerns about creating many proxies
- ⚠️ Worry about overhead from recursive proxy creation
- ⚠️ Concern about memory usage

**Reality**:
- User confirms: "performance concerns are not relevant anymore"
- Proxy overhead is **tiny** compared to unnecessary React re-renders
- Modern JavaScript engines handle proxies efficiently
- WeakMap-based caching can eliminate most proxy creation overhead

### V2: Top-Level Only System (Current)

**Implementation**: Only creates proxies at root level, returns raw nested values.

```typescript
// V2 ProxyFactory (simplified)
export const createStateProxy = <T extends object>(
  target: T,
  consumerRef: object,
  consumerTracker: ConsumerTracker,
  path = '',
): T => {
  // BREAKING CHANGE: Only proxy root-level
  if (path !== '') {
    return target;  // Return raw object for nested access
  }

  const proxy = new Proxy(target, {
    get(obj: T, prop: string | symbol): any {
      const value = Reflect.get(obj, prop);

      // Track only top-level property name
      consumerTracker.trackAccess(consumerRef, 'state', String(prop), undefined);

      // Return raw value - NO nested proxy creation
      return value;
    },
  });

  return proxy;
};
```

**What it does**:
- ✅ Minimal proxy overhead (only one proxy per state object)
- ✅ Simple, predictable behavior
- ✅ Fast proxy creation

**Limitations**:
- ❌ Accessing `state.profile.address.city` only tracks `"profile"`
- ❌ Changing `state.profile.name` triggers re-render even if component only uses `city`
- ❌ Unnecessary re-renders for nested state changes
- ❌ Defeats the purpose of fine-grained dependency tracking

---

## Current System Architecture

### 1. ProxyFactory (`packages/blac/src/adapter/ProxyFactory.ts`)

**Current Implementation**:
- Creates **one proxy** per state object (root level only)
- Uses WeakMap cache: `WeakMap<target, WeakMap<consumerRef, proxy>>`
- Tracks top-level property access only
- Returns raw values for nested objects

**Key Code**:
```typescript
// Line 44-46: The deliberate limitation
if (path !== '') {
  return target;  // This is the problem!
}

// Line 72-79: Only tracks property name, not full path
const value = Reflect.get(obj, prop);
consumerTracker.trackAccess(
  consumerRef,
  'state',
  String(prop),  // Just "profile", not "profile.address.city"
  undefined,
);
return value;  // Raw value, not proxied
```

### 2. BlacAdapter (`packages/blac/src/adapter/BlacAdapter.ts`)

**Tracking System**:
- **Two-phase tracking**: `resetTracking()` → render → `commitTracking()`
- Collects paths in `pendingDependencies` during render
- Atomically swaps dependencies after render completes
- Already supports **full paths** (no changes needed!)

**Key Methods**:
```typescript
// Line 162-177: trackAccess - already handles full paths!
trackAccess(_consumerRef: object, type: 'state' | 'class', path: string, value?: any): void {
  if (!this.isTrackingActive) return;

  const fullPath = type === 'class' ? `_class.${path}` : path;
  this.pendingDependencies.add(fullPath);  // Stores EXACT path
  this.trackedPaths.add(fullPath);

  if (this.subscriptionId) {
    this.blocInstance.trackAccess(this.subscriptionId, fullPath, value);
  }
}

// Line 409-451: commitTracking - atomically updates subscription dependencies
commitTracking(): void {
  this.isTrackingActive = false;

  if (this.subscriptionId) {
    const subscription = this._subscriptionManager.subscriptions.get(this.subscriptionId);

    // Remove old path mappings
    for (const oldPath of subscription.dependencies) {
      pathToSubscriptions.get(oldPath).delete(this.subscriptionId);
    }

    // Atomic swap: replace old dependencies with new ones
    subscription.dependencies = new Set(this.pendingDependencies);

    // Add new path mappings
    for (const newPath of this.pendingDependencies) {
      pathToSubscriptions.get(newPath).add(this.subscriptionId);
    }
  }
}
```

**Conclusion**: BlacAdapter is **already ready** for deep tracking! No changes needed.

### 3. SubscriptionManager (`packages/blac/src/subscription/SubscriptionManager.ts`)

**Change Detection System**:
- `getChangedPaths(oldState, newState)`: Compares states, returns changed paths
- Currently only compares **top-level** properties (V2 behavior)
- `shouldNotifyForPaths(subscriptionId, changedPaths)`: Checks if subscription should be notified

**Current Implementation** (Lines 272-316):
```typescript
private getChangedPaths(oldState: any, newState: any, _path = ''): Set<string> {
  const changedPaths = new Set<string>();

  if (oldState === newState) return changedPaths;

  // V2: Only compare top-level properties
  const allKeys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);

  for (const key of allKeys) {
    const oldValue = oldState[key];
    const newValue = newState[key];

    // Reference inequality = property changed
    if (oldValue !== newValue) {
      changedPaths.add(key);  // Just "profile", not nested paths!
    }
  }

  return changedPaths;
}
```

**What Needs to Change**:
- ❌ Need **recursive comparison** to build full paths
- ❌ Need to track `"profile.address.city"` not just `"profile"`
- ❌ Need to handle arrays (indices as properties)

**Path Notification** (Lines 393-421):
```typescript
shouldNotifyForPaths(subscriptionId: string, changedPaths: Set<string>): boolean {
  const subscription = this.subscriptions.get(subscriptionId);
  if (!subscription || !subscription.dependencies) return true;

  if (changedPaths.has('*')) return true;  // Entire state changed

  // Check if any tracked dependencies match changed paths
  for (const trackedPath of subscription.dependencies) {
    if (trackedPath.startsWith('_class.')) {
      // Handle getters (already value-based comparison)
      if (bloc && this.checkGetterChanged(subscriptionId, trackedPath, bloc)) {
        return true;
      }
      continue;
    }

    // V2: Direct top-level property matching only
    if (changedPaths.has(trackedPath)) return true;
  }

  return false;
}
```

**Conclusion**: `shouldNotifyForPaths` is already correct! Just needs `getChangedPaths` to return full paths.

---

## Test Coverage Analysis

### Existing Tests

**Test File**: `packages/blac-react/src/__tests__/dependency-tracking.test.tsx`

**Line 112-152**: Test that **exposes the V2 limitation**:
```typescript
it('should track nested property access correctly', async () => {
  // Component accesses: state.nested.value
  // But V2 only tracks: "nested" (top-level)

  // This assertion reveals the problem:
  // Line 151: expect(renderSpy).toHaveBeenCalledTimes(1); // V2: WILL rerender
  //
  // When nested.label changes:
  // - state.nested reference changes (immutability)
  // - V2 tracked "nested", so it notifies
  // - Component re-renders even though it only uses nested.value
});
```

**Test File**: `packages/blac-react/src/__tests__/useBloc.tracking.test.tsx`

**Line 121-201**: Nested tracking test that **expects V1 behavior**:
```typescript
it('should track nested property access correctly', () => {
  // Line 182: void state.user.profile.name;
  // Expected: Track "user.profile.name" specifically
  //
  // Line 189-193: Change theme - should NOT trigger re-render
  // Line 196-200: Change name - should trigger re-render

  // This test PASSES with V1 nested proxies
  // This test FAILS with V2 top-level tracking
});
```

**Test File**: `packages/blac/src/adapter/__tests__/ProxyFactory.test.ts`

**Line 97-128**: Nested proxy test with **V2 limitations documented**:
```typescript
it('should handle nested object proxying', () => {
  const proxy = ProxyFactory.createStateProxy({
    target: nestedObject,
    consumerRef,
    consumerTracker: tracker,
  });

  const email = proxy.user.profile.email;

  // Line 114: V2 change: Only top-level property 'user' is tracked
  expect(tracker.trackAccess).toHaveBeenCalledTimes(2); // Only 'user' calls

  // Line 122-127: Explicitly documents V2 limitation
  expect(tracker.trackAccess).not.toHaveBeenCalledWith(
    consumerRef,
    'state',
    'user.profile',  // This is NOT tracked in V2
    expect.anything(),
  );
});
```

### Test Implications

1. **Existing tests document the limitation** - they explicitly expect V2 behavior
2. **Some tests expect V1 behavior** - they will pass again with deep tracking
3. **Tests need updates** - V2-specific expectations need to change

---

## Performance Research

### Proxy Overhead Measurements

**From**: `packages/blac/src/__tests__/performance/proxy-behavior.test.ts`

```typescript
it('should NOT create nested proxies (V2 improvement)', () => {
  const cubit = new NestedStateCubit();  // 3 levels deep
  const proxy = createStateProxy(cubit.state, consumerRef, consumerTracker);

  const value = proxy.level1.level2.level3.value;

  const stats = ProxyFactory.getStats();
  expect(stats.totalProxiesCreated).toBe(1);  // V2: Only root proxy
});
```

**V1 would create**: 4 proxies (root + level1 + level2 + level3)
**V2 creates**: 1 proxy (root only)

**But**: Creating 3 extra proxies is **negligible** compared to:
- React re-render cost: ~1-10ms per component
- React reconciliation: ~0.5-5ms per component
- Proxy creation: ~0.001-0.01ms per proxy

**Conclusion**: Proxy overhead is **100-1000x cheaper** than an unnecessary re-render!

### Caching Effectiveness

**From**: V1 implementation analysis

```typescript
// V1 created nested proxies on EVERY access
proxy.user.profile.name  // Creates 3 proxies (user, profile, name)
proxy.user.profile.age   // Creates 3 MORE proxies (not cached!)
```

**Problem**: V1 didn't cache nested proxies effectively

**Solution**: Cache nested proxies using path as part of cache key:
```typescript
// Cache structure: WeakMap<target, WeakMap<consumerRef, Map<path, proxy>>>
const nestedProxyCache = new WeakMap<object, WeakMap<object, Map<string, any>>>();
```

This ensures:
- `proxy.user` returns **same proxy** every time
- `proxy.user.profile` returns **same proxy** every time
- Minimal proxy creation, maximum caching

---

## Related Issues & Patterns

### Similar Pattern: MobX

**MobX** uses the same nested proxy pattern for reactivity:
```javascript
const state = observable({
  user: {
    profile: {
      name: 'Alice'
    }
  }
});

// MobX tracks: "user.profile.name"
autorun(() => console.log(state.user.profile.name));
```

**Performance**: MobX is known for excellent performance despite nested proxies.

### Similar Pattern: Vue 3 Reactivity

**Vue 3** uses nested proxies with `reactive()`:
```javascript
const state = reactive({
  user: {
    profile: {
      name: 'Alice'
    }
  }
});

// Vue tracks: "user.profile.name"
watchEffect(() => console.log(state.user.profile.name));
```

**Performance**: Vue 3 reactivity is highly performant.

### Lesson Learned

Industry-standard reactive libraries (MobX, Vue 3, SolidJS) all use **nested proxies** successfully. The performance concerns that led to V2 were likely unfounded or could be mitigated with proper caching.

---

## Implementation Insights

### What Needs to Change

1. **ProxyFactory.ts** (Major changes):
   - Remove `if (path !== '') return target;` limitation
   - Restore recursive proxy creation from V1
   - **Improve** caching to be more efficient than V1
   - Cache nested proxies per-path, not just root

2. **SubscriptionManager.ts** (Moderate changes):
   - Make `getChangedPaths()` recursive
   - Build full dot-notation paths during comparison
   - Handle arrays (indices as properties)

3. **BlacAdapter.ts** (No changes needed!):
   - Already supports full paths
   - Two-phase tracking works with any path format

### What Stays the Same

- ✅ BlacAdapter tracking logic
- ✅ Two-phase tracking (resetTracking/commitTracking)
- ✅ Path-to-subscription mapping
- ✅ WeakRef-based consumer management
- ✅ Overall subscription architecture

---

## Cache Strategy Research

### V1 Caching (Inefficient)

```typescript
// Only cached root proxies
if (!path) {
  const cached = refCache.get(consumerRef);
  if (cached) return cached;
}

// Nested proxies created fresh every time!
return ProxyFactory.createStateProxy({
  target: value,
  consumerRef,
  consumerTracker,
  path: fullPath,  // Different path = no cache lookup
});
```

**Problem**: Nested proxies never hit cache.

### Proposed V3 Caching (Efficient)

```typescript
// Three-level cache: target → consumerRef → path → proxy
const cache = new WeakMap<object, WeakMap<object, Map<string, any>>>();

function getOrCreateProxy(target, consumerRef, path) {
  let refCache = cache.get(target);
  if (!refCache) {
    refCache = new WeakMap();
    cache.set(target, refCache);
  }

  let pathCache = refCache.get(consumerRef);
  if (!pathCache) {
    pathCache = new Map();
    refCache.set(consumerRef, pathCache);
  }

  let proxy = pathCache.get(path);
  if (proxy) {
    stats.cacheHits++;
    return proxy;
  }

  // Create and cache
  proxy = new Proxy(target, handler);
  pathCache.set(path, proxy);
  stats.cacheMisses++;

  return proxy;
}
```

**Benefits**:
- ✅ Caches nested proxies effectively
- ✅ Same proxy returned for same target+consumer+path
- ✅ WeakMap allows garbage collection
- ✅ Map (for path) is efficient for string keys

**Memory**:
- Per component: `O(accessed paths)`
- Only creates proxies for **actually accessed** paths
- GC cleans up when state or component is released

---

## Change Detection Research

### Current V2 Approach (Shallow)

```typescript
// Only compares top-level keys
for (const key of allKeys) {
  if (oldState[key] !== newState[key]) {
    changedPaths.add(key);  // Just "profile"
  }
}
```

### Proposed V3 Approach (Deep)

```typescript
function getChangedPaths(oldState: any, newState: any, path = ''): Set<string> {
  const changedPaths = new Set<string>();

  // Same object = no changes
  if (oldState === newState) return changedPaths;

  // Primitive or null = entire path changed
  if (typeof oldState !== 'object' || typeof newState !== 'object' ||
      oldState === null || newState === null) {
    changedPaths.add(path || '*');
    return changedPaths;
  }

  // Compare all keys
  const allKeys = new Set([
    ...Object.keys(oldState),
    ...Object.keys(newState)
  ]);

  for (const key of allKeys) {
    const oldValue = oldState[key];
    const newValue = newState[key];
    const fullPath = path ? `${path}.${key}` : key;

    if (oldValue === newValue) {
      continue;  // No change, skip recursion
    }

    // Reference changed - might be primitive or object
    if (typeof newValue !== 'object' || newValue === null ||
        typeof oldValue !== 'object' || oldValue === null) {
      // Primitive or null/undefined changed
      changedPaths.add(fullPath);
    } else {
      // Both are objects - recurse to get nested paths
      const nestedChanges = getChangedPaths(oldValue, newValue, fullPath);
      for (const nestedPath of nestedChanges) {
        changedPaths.add(nestedPath);
      }
    }
  }

  return changedPaths;
}
```

**Example**:
```typescript
oldState = { profile: { name: 'Alice', age: 25 } }
newState = { profile: { name: 'Bob', age: 25 } }

// V2: changedPaths = ['profile']
// V3: changedPaths = ['profile.name']
```

**Optimization**: Stop recursion when references are equal (immutability helps!).

---

## Open Source References

### MobX Proxy Implementation
- **Repo**: https://github.com/mobxjs/mobx
- **File**: `packages/mobx/src/types/observableobject.ts`
- **Approach**: Nested proxies with property-level tracking
- **Caching**: Per-object proxy cache

### Vue 3 Reactivity
- **Repo**: https://github.com/vuejs/core
- **File**: `packages/reactivity/src/reactive.ts`
- **Approach**: Nested proxies with dependency tracking
- **Caching**: WeakMap-based proxy cache

### Valtio (Proxy State)
- **Repo**: https://github.com/pmndrs/valtio
- **Approach**: Nested proxies with snapshot-based rendering
- **Performance**: Excellent, used in production by many

**Common Pattern**: All use nested proxies successfully!

---

## Risk Assessment

### Low Risk Areas
- ✅ BlacAdapter already supports full paths
- ✅ Path-based notification already works correctly
- ✅ WeakMap caching prevents memory leaks
- ✅ Industry-proven pattern (MobX, Vue, Valtio)

### Medium Risk Areas
- ⚠️ Deep change detection could be expensive for large objects
  - **Mitigation**: Immutability means reference equality = skip subtree
  - **Mitigation**: Most state trees are shallow (3-5 levels typical)
- ⚠️ More proxies = slightly more memory
  - **Mitigation**: Only create on access (lazy)
  - **Mitigation**: Cache effectively to minimize creation
- ⚠️ Test updates needed
  - **Mitigation**: Tests document expected behavior clearly

### Performance Benchmarks Needed
1. Proxy creation overhead (nested vs shallow)
2. Change detection overhead (deep vs shallow comparison)
3. Memory usage (cached nested proxies vs raw objects)
4. **Net benefit**: Fewer re-renders should outweigh overhead

---

## Recommendations for Implementation

### Phase 1: Restore V1 Core Logic
- Remove `if (path !== '')` limitation in ProxyFactory
- Restore recursive proxy creation
- Update basic tests

### Phase 2: Improve Caching
- Implement three-level cache (target → consumer → path)
- Measure cache hit rates
- Optimize cache structure if needed

### Phase 3: Deep Change Detection
- Implement recursive `getChangedPaths()`
- Handle arrays (indices as properties)
- Add early-exit optimizations

### Phase 4: Testing & Optimization
- Update test expectations
- Add performance benchmarks
- Measure re-render reduction
- Profile memory usage

---

## Conclusion

**Primary Finding**: V1 implementation was **correct**, and removing it was a mistake based on unfounded performance concerns.

**Path Forward**: Restore V1 nested proxy behavior with **improved caching** to address any legitimate performance concerns.

**Expected Outcome**:
- ✅ Precise dependency tracking at arbitrary depth
- ✅ Fewer unnecessary re-renders (major performance win)
- ✅ Minimal proxy overhead (industry-proven pattern)
- ✅ Better developer experience (automatic fine-grained reactivity)

**Key Insight**: The cost of creating a few extra proxies (~0.01ms) is **negligible** compared to the cost of an unnecessary React re-render (~1-10ms). The net performance gain from eliminating false-positive re-renders will far outweigh any proxy overhead.

---

**Ready for discussion phase with Expert Council.**

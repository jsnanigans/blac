# BlaC Dependency Tracking System - Deep Dive Analysis

## Executive Summary

The BlaC library implements a sophisticated dependency tracking system with two distinct modes:

1. **Manual Dependencies Mode**: Controlled via the `dependencies` option in `useBloc()`
2. **Proxy-based Automatic Tracking**: Default behavior when `Blac.config.proxyDependencyTracking = true` and no `dependencies` option is provided

This document explores how dependencies are tracked, stored, compared, and used to optimize React re-renders.

---

## 1. How the `dependencies` Option Works in useBloc

### 1.1 API Definition

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac-react/src/useBloc.ts` (lines 27-38)

The hook accepts a `dependencies` function:

```typescript
dependencies?: (
  bloc: InstanceType<B>,
) => unknown[] | Generator<unknown, void, unknown>;
```

### 1.2 Execution Flow in Hook

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac-react/src/useBloc.ts` (lines 84-136)

- Line 85: `resetTracking()` - Prepare for new render tracking
- Line 87: `notifyRender()` - Calls dependencies function and stores result
- Line 135-136: `commitTracking()` in useEffect - Atomic update after render

### 1.3 Practical Example

```typescript
const [state] = useBloc(AppCubit, {
  dependencies: (bloc) => {
    const user = bloc.state.users.find((u) => u.id === userId);
    return [user?.name, user?.age];  // Only re-render if these change
  },
});
```

This example shows:
- Component only re-renders when user.name or user.age changes
- Other state changes won't trigger re-render
- Enables fine-grained control over which state changes matter

---

## 2. Dependency Value Storage and Comparison

### 2.1 Storage in BlacAdapter

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 103-127)

```typescript
// Dependency tracking
private dependencyValues?: unknown[];           // Last returned values
private isUsingDependencies: boolean = false;   // Flag if deps mode
private trackedPaths = new Set<string>();      // Paths accessed (proxy mode)
private pendingTrackedPaths = new Set<string>();

// State snapshot for dependencies mode
private stateSnapshot?: BlocState<InstanceType<B>>;  // Frozen state

// V2: Two-phase tracking
private pendingDependencies = new Set<string>();
private isTrackingActive = false;
```

### 2.2 Initialization

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 149-155)

```typescript
if (this.isUsingDependencies && options?.dependencies) {
  const result = options.dependencies(this.blocInstance);
  this.dependencyValues = normalizeDependencies(result);
  // Take initial snapshot of state
  this.stateSnapshot = this.blocInstance.state;
}
```

---

## 3. Dependency Comparison Mechanism

### 3.1 The Core Comparison Function

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 40-84)

```typescript
function compareDependencies(
  oldValues: unknown[] | undefined,
  newResult: unknown[] | Generator<unknown, void, unknown>,
): boolean {
  // If no old values, it's a change
  if (!oldValues) return true;

  // For generators: compare item-by-item with early exit
  if (isGenerator(newResult)) {
    let index = 0;
    for (const newValue of newResult) {
      if (index >= oldValues.length) return true;
      if (!Object.is(oldValues[index], newValue)) return true;
      index++;
    }
    if (index < oldValues.length) return true;
    return false;  // All items matched
  }

  // Array comparison
  const newValues = newResult as unknown[];
  if (oldValues.length !== newValues.length) return true;

  for (let i = 0; i < oldValues.length; i++) {
    if (!Object.is(oldValues[i], newValues[i])) {
      return true;
    }
  }

  return false;
}
```

**Key Comparison Features:**

1. **Uses `Object.is()` for strict comparison**
   - Distinguishes between NaN values
   - Maintains separate identity for +0 and -0
   - More strict than === for edge cases

2. **Early Exit Optimization**
   - For generators, stops on first difference
   - Critical for large dependency sets

3. **Length Validation**
   - Dependency count changes trigger re-render
   - Handles both growth and shrinkage

### 3.2 Comparison at Subscription Time

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 212-245)

When dependencies are provided, a **selector-based subscription** is created:

```typescript
const result = this.blocInstance.subscribeWithSelector(
  (_state) => {
    // Call the dependencies function
    const depResult = this.options!.dependencies!(this.blocInstance);

    // Compare: did values change?
    if (compareDependencies(this.dependencyValues, depResult)) {
      // YES: normalize and cache new values
      const normalized = normalizeDependencies(depResult);
      this.dependencyValues = normalized;
      this.stateSnapshot = this.blocInstance.state;
      return normalized;
    }

    // NO: return cached values (same object reference)
    return this.dependencyValues!;
  },
  (newValues) => {
    // Only called if selector returned different value
    options.onChange();
  },
  // Custom equality: check object identity
  (oldValues, newValues) => {
    return oldValues === newValues;  // Same reference = no change
  },
);
```

---

## 4. The Actual Re-render Mechanism

### 4.1 Complete Flow Diagram

```
State Change
    ↓
SubscriptionManager.notify(newState, oldState)
    ↓
For each subscription with selector:
    ├─ oldValue = subscription.lastValue
    ├─ newValue = selector(newState)
    ├─ shouldNotify = !equalityFn(oldValue, newValue)
    └─ If shouldNotify: call notify()

Re-render Decision:
    ├─ React calls getSnapshot()
    ├─ For dependencies mode: returns stateSnapshot (frozen state)
    ├─ For proxy mode: returns current state
    └─ If snapshot changed: re-render
```

### 4.2 State Snapshot - The Critical Piece

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 517-533)

```typescript
getSnapshot = (): BlocState<InstanceType<B>> => {
  if (this.options?.dependencies) {
    return this.stateSnapshot ?? this.blocInstance.state;
  }
  return this.blocInstance.state;
};
```

**Critical Insight:**
- When using dependencies, `getSnapshot()` returns the **frozen state** captured when dependencies last changed
- Other state changes are invisible to the component
- This is what allows selective re-renders based on dependencies

---

## 5. Interaction with Proxy-Based Tracking

### 5.1 Mutual Exclusivity

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 299-331)

```typescript
getStateProxy = (): BlocState<InstanceType<B>> => {
  // If using manual dependencies or proxy tracking is disabled,
  // return raw state (no proxy)
  if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
    return this.blocInstance.state;
  }

  // Otherwise, create and cache proxy
  this.lastProxiedState = currentState;
  this.cachedStateProxy = this.createStateProxy({ target: currentState });
  return this.cachedStateProxy!;
};
```

**Design Pattern:**
- Manual dependencies: EXPLICIT control, DISABLE proxy overhead
- Proxy tracking: AUTOMATIC tracking, only when dependencies not provided
- Never both: wastes resources

### 5.2 How Proxy Tracking Works (For Comparison)

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/ProxyFactory.ts` (lines 63-88)

```typescript
const proxy = new Proxy(target, {
  get(obj: T, prop: string | symbol): any {
    if (typeof prop === 'symbol' || prop === 'constructor') {
      return Reflect.get(obj, prop);
    }

    const value = Reflect.get(obj, prop);

    // Track top-level property access
    consumerTracker.trackAccess(
      consumerRef,
      'state',
      String(prop),  // Just property name
      undefined,
    );

    return value;  // Return raw value (no nested proxy)
  },
});
```

**Proxy Mode Flow:**
1. Component accesses state.count during render
2. Proxy intercepts → recordsaccess to "count"
3. State changes → SubscriptionManager checks if "count" is in tracked paths
4. If match → component re-renders

**vs Manual Dependencies:**
- Automatic but more overhead (proxy creation, path tracking)
- Manual is explicit, smaller overhead

---

## 6. Detailed Storage and Update Cycle

### 6.1 Dependency Value Lifecycle

**Phase 1: Construction**
```typescript
dependencyValues = normalizeDependencies(dependencies(bloc))
stateSnapshot = bloc.state
```

**Phase 2: Each Render**
```
resetTracking() - clear pending deps, enable tracking
notifyRender() - call dependencies function
commitTracking() - atomically update subscription deps
```

**Phase 3: State Change**
```
Bloc emits new state
  ↓
SubscriptionManager.notify() called
  ↓
Selector function runs:
  - dependencies(bloc) returns array/generator
  - compareDependencies() checks vs oldValues
  - If changed: update dependencyValues, stateSnapshot, return new array
  - If unchanged: return cached array (same object)
  ↓
Equality function: oldArray === newArray
  - When dependencies unchanged: TRUE (same cached object)
  - When dependencies changed: FALSE (new array object)
  ↓
If FALSE: notify() callback fires
  ↓
React calls getSnapshot()
  - For deps mode: returns stateSnapshot
  - Re-render if snapshot changed
```

### 6.2 Two-Phase Tracking for Atomicity

**Location**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 396-452)

```typescript
// Phase 1: During render
resetTracking(): void {
  this.pendingDependencies.clear();
  this.isTrackingActive = true;
}

trackAccess(...): void {
  if (!this.isTrackingActive) return;  // Only collect during render
  this.pendingDependencies.add(fullPath);
}

// Phase 2: After render (in useEffect)
commitTracking(): void {
  this.isTrackingActive = false;
  
  // Atomic swap
  if (this.subscriptionId) {
    const subscription = /*...*/;
    
    // Remove old mappings
    if (subscription.dependencies) {
      for (const oldPath of subscription.dependencies) {
        /*...*/
      }
    }
    
    // Atomic swap
    subscription.dependencies = new Set(this.pendingDependencies);
    
    // Add new mappings
    for (const newPath of this.pendingDependencies) {
      /*...*/
    }
  }
}
```

**Purpose:**
- Ensures dependencies updated atomically after full render
- Prevents race conditions
- Aligns with React 18+ render/commit phases

---

## 7. Real-World Example Walkthrough

From test: `packages/blac-react/src/__tests__/useBloc.dependencies.test.tsx` (lines 52-109)

### Scenario: Watching specific user properties

```typescript
const [state] = useBloc(AppCubit, {
  dependencies: (bloc) => {
    const user = bloc.state.users.find((u) => u.id === userId);
    return [user?.name, user?.age];
  },
});
```

### Execution Timeline:

**Initial Render:**
```
dependencies(bloc) → ['Alice', 25]
dependencyValues = ['Alice', 25]
stateSnapshot = {users: [...], selectedId: null, count: 0}
Component renders
```

**Update User 2's name:**
```
State: {users: [...with Bob updated...], ...}
selector runs: dependencies(bloc) → ['Alice', 25] (UNCHANGED!)
compareDependencies(['Alice', 25], ['Alice', 25]) → false (no change)
selector returns cached ['Alice', 25] (same object)
Equality: oldArray === newArray → true
notify() NOT called
Component does NOT re-render ✓
```

**Increment count:**
```
State: {users: [...], count: 1}
selector runs: dependencies(bloc) → ['Alice', 25] (UNCHANGED!)
Same as above
Component does NOT re-render ✓
```

**Update User 1's name:**
```
State: {users: [{id:1, name:'Alicia',...},...], ...}
selector runs: dependencies(bloc) → ['Alicia', 25] (CHANGED!)
compareDependencies(['Alice', 25], ['Alicia', 25]) → true (changed!)
dependencyValues = ['Alicia', 25]
stateSnapshot = newState
selector returns NEW array ['Alicia', 25]
Equality: oldArray === newArray → false
notify() IS called
React re-renders component ✓
```

---

## 8. Memory and Performance Implications

### 8.1 Storage Overhead

| Component | Complexity | Notes |
|-----------|-----------|-------|
| dependencyValues | O(n) | n = dependency count |
| stateSnapshot | O(1) | Reference only, not copied |
| trackedPaths (proxy mode) | O(m) | m = tracked properties |
| pendingDependencies | O(k) | k = properties accessed this render |

**Manual dependencies:** Minimal overhead (just arrays)
**Proxy mode:** Larger overhead (path tracking for every subscription)

### 8.2 Comparison Performance

```
compareDependencies(old, new):
- Best case: O(1)    - first value differs
- Average: O(n)      - n = dependency count
- Worst: O(n)        - all match
- Generators: early exit on first diff
```

**Optimization:**
```typescript
// Good: minimal dependencies
dependencies: (bloc) => [bloc.state.userId, bloc.state.status]

// Bad: large objects
dependencies: (bloc) => [bloc.state]  // Defeats purpose

// Good: generators for many deps
dependencies: function*(bloc) {
  yield bloc.state.a;
  yield bloc.state.b;
  yield bloc.state.c;
}
```

---

## 9. Common Patterns

### Good Patterns

**Specific values:**
```typescript
dependencies: (bloc) => [
  bloc.state.currentUserId,
  bloc.state.loadingStatus
]
```

**Derived computations:**
```typescript
dependencies: (bloc) => {
  const user = bloc.state.users.find(u => u.id === userId);
  return user ? [user.name, user.role] : [];
}
```

**Generator for lazy evaluation:**
```typescript
dependencies: function*(bloc) {
  yield bloc.state.isLoading;
  yield bloc.state.error;
  if (bloc.state.data) yield bloc.state.data.id;
}
```

### Antipatterns to Avoid

**New objects every render:**
```typescript
// Bad - defeats purpose
dependencies: (bloc) => [bloc.state]
dependencies: (bloc) => ({user: bloc.state.user})
```

**Functions as dependencies:**
```typescript
// Bad - functions never === previous
dependencies: (bloc) => [bloc.increment, bloc.decrement]
```

---

## 10. Configuration Points

### Global Setting

```typescript
Blac.setConfig({
  proxyDependencyTracking: true,  // Enable automatic tracking
});
```

### Per-Component

```typescript
useBloc(MyCubit, {
  dependencies: (bloc) => [/* */],  // Manual deps
  onMount: (bloc) => {},
  onUnmount: (bloc) => {},
});
```

---

## 11. Summary Table

| Aspect | Manual Dependencies | Proxy Tracking |
|--------|-------------------|-----------------|
| **Mode** | Explicit | Automatic |
| **Control** | Full | Implicit |
| **Overhead** | Minimal | Higher |
| **Disabled when** | N/A | Dependencies provided |
| **Comparison** | Object.is() | Path matching |
| **State snapshot** | Yes, frozen | No |
| **Ideal for** | Complex state, selective updates | Simple apps, auto-tracking |

---

## Related Code Locations

| Concept | File | Lines |
|---------|------|-------|
| useBloc Hook | `packages/blac-react/src/useBloc.ts` | 27-142 |
| BlacAdapter | `packages/blac/src/adapter/BlacAdapter.ts` | 90-534 |
| Dependencies Compare | `packages/blac/src/adapter/BlacAdapter.ts` | 40-84 |
| Subscription Creation | `packages/blac/src/adapter/BlacAdapter.ts` | 212-281 |
| getSnapshot | `packages/blac/src/adapter/BlacAdapter.ts` | 517-533 |
| SubscriptionManager | `packages/blac/src/subscription/SubscriptionManager.ts` | 1-503 |
| ProxyFactory | `packages/blac/src/adapter/ProxyFactory.ts` | 1-244 |
| subscribeWithSelector | `packages/blac/src/BlocBase.ts` | 178-189 |
| Test Examples | `packages/blac-react/src/__tests__/useBloc.dependencies.test.tsx` | 46-268 |


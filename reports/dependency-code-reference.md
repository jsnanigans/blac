# BlaC Dependency Tracking - Code Reference Guide

## Quick Reference: Key Code Snippets

### 1. Hook Integration

**File**: `/Users/brendanmullins/Projects/blac/packages/blac-react/src/useBloc.ts`

```typescript
// Full useBloc signature
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    staticProps?: ConstructorParameters<B>[0];
    instanceId?: string;
    dependencies?: (
      bloc: InstanceType<B>,
    ) => unknown[] | Generator<unknown, void, unknown>;
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  },
): HookTypes<B>
```

**Key Lines:**
- Line 32-34: `dependencies` option definition
- Line 45-53: Instance key generation from props/instanceId
- Line 65-82: Adapter creation and memoization
- Line 85: `resetTracking()` - prepare tracking
- Line 87: `notifyRender()` - call dependencies function
- Line 90-103: Update adapter options when dependencies change
- Line 116: `getSubscribe()` - integration with useSyncExternalStore
- Line 120-124: State subscription setup
- Line 126-129: Proxy creation for final state
- Line 134-136: `commitTracking()` in useEffect

---

### 2. Adapter Creation and Initialization

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts`

```typescript
constructor(
  instanceProps: { componentRef: { current: object & { __blocInstanceId?: string } }; blocConstructor: B },
  options?: AdapterOptions<InstanceType<B>>,
) {
  this.options = options;
  this.blocConstructor = instanceProps.blocConstructor;
  this.componentRef = instanceProps.componentRef;
  
  // KEY: Set flag if using manual dependencies
  this.isUsingDependencies = !!options?.dependencies;

  // ... adapter setup ...

  // Initialize dependency values if using dependencies
  if (this.isUsingDependencies && options?.dependencies) {
    const result = options.dependencies(this.blocInstance);
    this.dependencyValues = normalizeDependencies(result);
    // Take initial snapshot of state
    this.stateSnapshot = this.blocInstance.state;
  }

  // Notify plugins
  const metadata = this.getAdapterMetadata();
  Blac.getInstance().plugins.notifyAdapterCreated(this, metadata);
}
```

**Key Points:**
- Line 140: `isUsingDependencies` flag controls entire behavior
- Line 151-155: Initialize dependency values and snapshot
- Line 152: `normalizeDependencies()` converts generator to array if needed

---

### 3. Dependency Comparison Logic

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 40-84)

```typescript
/**
 * Efficiently compare dependencies with early exit for generators
 * Returns true if values have changed, false if they're the same
 */
function compareDependencies(
  oldValues: unknown[] | undefined,
  newResult: unknown[] | Generator<unknown, void, unknown>,
): boolean {
  // If no old values, it's a change
  if (!oldValues) return true;

  // If new result is a generator, compare item-by-item with early exit
  if (isGenerator(newResult)) {
    let index = 0;
    for (const newValue of newResult) {
      // If we've exhausted old values but generator has more, it's a change
      if (index >= oldValues.length) {
        return true;
      }

      // If values don't match, it's a change (early exit!)
      if (!Object.is(oldValues[index], newValue)) {
        return true;
      }

      index++;
    }

    // If old values had more items than generator, it's a change
    if (index < oldValues.length) {
      return true;
    }

    // All items matched
    return false;
  }

  // Array comparison (existing logic)
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

**Key Concepts:**
- Uses `Object.is()` for comparison (not `===`)
- Early exit on first difference
- Handles generators specially for lazy evaluation
- Returns `true` = change detected, `false` = no change

---

### 4. Generator Detection

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 19-24)

```typescript
/**
 * Helper function to check if a value is a generator
 */
function isGenerator(value: unknown): value is Generator<unknown, void, unknown> {
  return value != null &&
         typeof value === 'object' &&
         Symbol.iterator in value &&
         typeof (value as any).next === 'function';
}
```

**Detection Strategy:**
1. Check if value exists (not null/undefined)
2. Check if it's an object
3. Check if it implements Symbol.iterator
4. Check if it has `next` function

---

### 5. Dependency Normalization

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 28-34)

```typescript
/**
 * Helper function to normalize dependencies (convert generators to arrays)
 */
function normalizeDependencies(result: unknown[] | Generator<unknown, void, unknown>): unknown[] {
  if (isGenerator(result)) {
    return Array.from(result);
  }
  return result as unknown[];
}
```

**Purpose:**
- Standardize both generators and arrays to arrays
- Allows rest of code to work with arrays consistently

---

### 6. Subscription with Selector

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 212-245)

```typescript
createSubscription = (options: { onChange: () => void }) => {
  // If using manual dependencies, create a selector-based subscription
  if (this.isUsingDependencies && this.options?.dependencies) {
    const result = this.blocInstance.subscribeWithSelector(
      (_state) => {
        // Call the dependencies function - returns generator or array
        const depResult = this.options!.dependencies!(this.blocInstance);

        // Use early-exit comparison for generators
        if (compareDependencies(this.dependencyValues, depResult)) {
          // Changed - normalize and cache
          const normalized = normalizeDependencies(depResult);
          this.dependencyValues = normalized;
          // Update state snapshot when dependencies change
          this.stateSnapshot = this.blocInstance.state;
          return normalized;
        }

        // No change - return cached values (state snapshot stays the same)
        return this.dependencyValues!;
      },
      (newValues) => {
        // Only called if selector returned different value
        options.onChange();
      },
      // Use custom equality function - check object identity first (fast path)
      (oldValues, newValues) => {
        // If they're the same object reference, they're equal (no change)
        return oldValues === newValues;
      },
    );
    this.unsubscribe = result.unsubscribe;
  } else {
    // Create a component subscription with weak reference
    const weakRef = new WeakRef(this.componentRef.current);
    const result = this.blocInstance.subscribeComponent(
      weakRef,
      options.onChange,
    );

    this.unsubscribe = result.unsubscribe;
    this.subscriptionId = result.id;

    // V2: Enable tracking when subscription is created
    this.isTrackingActive = true;

    // Apply any pending tracked paths
    if (this.subscriptionId && this.pendingTrackedPaths.size > 0) {
      for (const path of this.pendingTrackedPaths) {
        this.blocInstance.trackAccess(this.subscriptionId, path);
      }
      this.pendingTrackedPaths.clear();
    }
  }

  return () => {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
      this.subscriptionId = undefined;
    }
  };
};
```

**Key Flow:**
1. If dependencies mode: create selector-based subscription
2. Selector runs dependencies function
3. Compare results with compareDependencies()
4. If changed: update dependencyValues and stateSnapshot, return new array
5. If unchanged: return cached array (same object reference)
6. Custom equality: checks object identity
7. If false (different objects): call onChange() → re-render

---

### 7. Getting the State Snapshot

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 517-533)

```typescript
/**
 * Returns the current state snapshot for useSyncExternalStore
 * When using dependencies, returns the cached snapshot that only updates when dependencies change
 * Otherwise, returns the current state directly
 */
getSnapshot = (): BlocState<InstanceType<B>> => {
  if (this.options?.dependencies) {
    return this.stateSnapshot ?? this.blocInstance.state;
  }
  return this.blocInstance.state;
};

/**
 * Returns the server-side rendering snapshot for useSyncExternalStore
 * Same behavior as getSnapshot for consistency
 */
getServerSnapshot = (): BlocState<InstanceType<B>> => {
  if (this.options?.dependencies) {
    return this.stateSnapshot ?? this.blocInstance.state;
  }
  return this.blocInstance.state;
};
```

**Critical Insight:**
- For dependencies mode: returns frozen `stateSnapshot`
- For proxy mode: returns current `state`
- This is what prevents re-renders when dependencies unchanged

---

### 8. State Proxy Control

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 299-331)

```typescript
getStateProxy = (): BlocState<InstanceType<B>> => {
  // If using manual dependencies or proxy tracking is disabled,
  // return raw state (no proxy)
  if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
    return this.blocInstance.state;
  }

  // Return cached proxy if state hasn't changed
  const currentState = this.blocInstance.state;
  if (this.cachedStateProxy && this.lastProxiedState === currentState) {
    return this.cachedStateProxy;
  }

  // Create new proxy for new state
  this.lastProxiedState = currentState;
  this.cachedStateProxy = this.createStateProxy({ target: currentState });
  return this.cachedStateProxy!;
};

getBlocProxy = (): InstanceType<B> => {
  // If using manual dependencies or proxy tracking is disabled,
  // return raw bloc
  if (this.isUsingDependencies || !Blac.config.proxyDependencyTracking) {
    return this.blocInstance;
  }

  // Return cached proxy if bloc instance hasn't changed
  if (this.cachedBlocProxy) {
    return this.cachedBlocProxy;
  }

  // Create and cache proxy
  this.cachedBlocProxy = this.createClassProxy({ target: this.blocInstance });
  return this.cachedBlocProxy;
};
```

**Decision Logic:**
- If `isUsingDependencies = true`: disable proxy (return raw objects)
- If `proxyDependencyTracking = false`: disable proxy (return raw objects)
- Otherwise: create and cache proxies for tracking

---

### 9. Two-Phase Tracking: Reset

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 396-407)

```typescript
// Reset tracking for next render
// V2: Two-phase tracking - start collecting new dependencies without clearing active ones
resetTracking(): void {
  // Clear pending dependencies to start fresh for this render
  this.pendingDependencies.clear();
  this.trackedPaths.clear();

  // Enable tracking for this render
  this.isTrackingActive = true;

  // Note: We do NOT clear subscription dependencies here
  // They will be atomically replaced in commitTracking()
}
```

**Called From**: `useBloc.ts` line 85 (before each render)

---

### 10. Two-Phase Tracking: Commit

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 410-452)

```typescript
// V2: Commit tracked dependencies after render completes
commitTracking(): void {
  // Disable tracking until next render
  this.isTrackingActive = false;

  // Atomically swap pending dependencies into subscription
  if (this.subscriptionId) {
    const subscription = (
      this.blocInstance._subscriptionManager as any
    ).subscriptions.get(this.subscriptionId);

    if (subscription) {
      // Remove old path-to-subscription mappings
      if (subscription.dependencies) {
        for (const oldPath of subscription.dependencies) {
          const subs = (this.blocInstance._subscriptionManager as any)
            .pathToSubscriptions.get(oldPath);
          if (subs) {
            subs.delete(this.subscriptionId);
            if (subs.size === 0) {
              (this.blocInstance._subscriptionManager as any)
                .pathToSubscriptions.delete(oldPath);
            }
          }
        }
      }

      // Atomic swap: replace old dependencies with new ones
      subscription.dependencies = new Set(this.pendingDependencies);

      // Add new path-to-subscription mappings
      for (const newPath of this.pendingDependencies) {
        let subs = (this.blocInstance._subscriptionManager as any)
          .pathToSubscriptions.get(newPath);
        if (!subs) {
          subs = new Set();
          (this.blocInstance._subscriptionManager as any)
            .pathToSubscriptions.set(newPath, subs);
        }
        subs.add(this.subscriptionId);
      }
    }
  }
}
```

**Called From**: `useBloc.ts` line 135 (in useEffect after render)

**Process:**
1. Disable tracking
2. Get subscription from manager
3. Remove old path mappings
4. Atomic swap of dependencies set
5. Add new path mappings

---

### 11. Notify on Render

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/adapter/BlacAdapter.ts` (lines 460-472)

```typescript
// Notify plugins about render
notifyRender(): void {
  this.renderCount++;

  // Update dependency values if using manual tracking
  if (this.isUsingDependencies && this.options?.dependencies) {
    this.lastDependencyValues = this.dependencyValues;
    const result = this.options.dependencies(this.blocInstance);
    this.dependencyValues = normalizeDependencies(result);
  }

  const metadata = this.getAdapterMetadata();
  Blac.getInstance().plugins.notifyAdapterRender(this, metadata);
}
```

**Called From**: `useBloc.ts` line 87 (during render)

**For Dependencies Mode:**
- Updates `lastDependencyValues`
- Calls dependencies function
- Normalizes result
- Stores in `dependencyValues`

---

### 12. Subscription Method in BlocBase

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/BlocBase.ts` (lines 178-189)

```typescript
/**
 * Subscribe with a selector for optimized updates
 * @returns Object containing subscription ID and unsubscribe function
 */
subscribeWithSelector<T>(
  selector: (state: S) => T,
  callback: (value: T) => void,
  equalityFn?: (a: T, b: T) => boolean,
): SubscriptionResult {
  return this._subscriptionManager.subscribe({
    type: 'consumer',
    selector: selector as any,
    equalityFn: equalityFn as any,
    notify: (value) => callback(value as T),
  });
}
```

**Used By**: BlacAdapter when creating selector-based subscriptions

---

### 13. SubscriptionManager Notify

**File**: `/Users/brendanmullins/Projects/blac/packages/blac/src/subscription/SubscriptionManager.ts` (lines 137-238)

```typescript
/**
 * Notify all subscriptions of state change
 */
notify(newState: S, oldState: S, action?: unknown): void {
  // Hybrid optimization - fast path or cached sorted array
  let subscriptions: Iterable<Subscription<S>>;

  if (!this.hasNonZeroPriorities) {
    // Fast path: No priorities, iterate Map directly (O(1))
    subscriptions = this.subscriptions.values();
  } else {
    // Slow path: Use cached sorted array (O(1) amortized)
    if (!this.cachedSortedSubscriptions) {
      this.cachedSortedSubscriptions = Array.from(
        this.subscriptions.values(),
      ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
    subscriptions = this.cachedSortedSubscriptions;
  }

  for (const subscription of subscriptions) {
    // Check if WeakRef is still alive
    if (subscription.weakRef && !subscription.weakRef.deref()) {
      this.scheduleWeakRefCleanup();
      continue;
    }

    let shouldNotify = false;
    let newValue: unknown;
    let oldValue: unknown;

    if (subscription.selector) {
      // Use selector to determine if notification is needed
      try {
        newValue = subscription.selector(newState, this.bloc);
        oldValue = subscription.lastValue;

        const equalityFn = subscription.equalityFn || Object.is;
        shouldNotify = !equalityFn(oldValue, newValue);

        if (shouldNotify) {
          subscription.lastValue = newValue;
        }
      } catch (error) {
        Blac.error(
          `SubscriptionManager: Error in selector for ${subscription.id}:`,
          error,
        );
        continue;
      }
    } else {
      // No selector - check if tracked dependencies changed
      if (subscription.dependencies && subscription.dependencies.size > 0) {
        const changedPaths = this.getChangedPaths(oldState, newState);
        shouldNotify = this.shouldNotifyForPaths(
          subscription.id,
          changedPaths,
          this.bloc,
        );
      } else {
        // No tracked dependencies
        if (subscription.type === 'observer') {
          shouldNotify = true;
        } else {
          shouldNotify = !Blac.config.proxyDependencyTracking;
        }
      }
      newValue = newState;
      oldValue = oldState;
    }

    if (shouldNotify) {
      try {
        subscription.notify(newValue, oldValue, action);
        this.totalNotifications++;

        if (subscription.metadata) {
          subscription.metadata.lastNotified = Date.now();
          subscription.metadata.hasRendered = true;
        }
      } catch (error) {
        Blac.error(
          `SubscriptionManager: Error in notify for ${subscription.id}:`,
          error,
        );
      }
    }
  }
}
```

**Key Path for Dependencies:**
1. Gets subscription with selector
2. Calls selector function
3. Compares result with equality function
4. If false (different): call notify()

---

## Quick Implementation Checklist

### To Use Manual Dependencies:

```typescript
const [state, bloc] = useBloc(MyBloc, {
  dependencies: (bloc) => {
    // Return array or generator of values to watch
    return [bloc.state.userId, bloc.state.isLoading];
  },
});
```

**What Happens:**
- ✓ `isUsingDependencies = true`
- ✓ `proxyDependencyTracking` disabled
- ✓ `dependencyValues` initialized
- ✓ `stateSnapshot` created
- ✓ Selector-based subscription created
- ✓ Component re-renders only when return values change

### To Use Proxy Tracking (Default):

```typescript
const [state, bloc] = useBloc(MyBloc);
// No dependencies option
```

**What Happens:**
- ✓ `isUsingDependencies = false`
- ✓ `proxyDependencyTracking` enabled (if config allows)
- ✓ Proxy created for state and bloc
- ✓ Accesses tracked during render
- ✓ Component subscription created
- ✓ Component re-renders when accessed properties change

---

## Type Definitions Reference

**AdapterOptions**:
```typescript
interface AdapterOptions<B extends BlocBase<any>> {
  instanceId?: string;
  dependencies?: (bloc: B) => unknown[] | Generator<unknown, void, unknown>;
  staticProps?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}
```

**SubscriptionResult**:
```typescript
interface SubscriptionResult {
  id: string;
  unsubscribe: () => void;
}
```

**Subscription**:
```typescript
interface Subscription<S = unknown> {
  id: string;
  type: 'consumer' | 'observer';
  selector?: (state: S, bloc?: BlocBase<S>) => unknown;
  equalityFn?: (prev: unknown, next: unknown) => boolean;
  notify: (value: unknown, oldValue?: unknown, action?: unknown) => void;
  priority?: number;
  weakRef?: WeakRef<object>;
  lastValue?: unknown;
  dependencies?: Set<string>;
  getterCache?: Map<string, GetterCacheEntry>;
  metadata?: SubscriptionMetadata;
}
```


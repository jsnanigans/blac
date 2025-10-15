# Research: Subscription ID Race Condition Solutions

**Issue:** Critical-Stability-002
**Date:** 2025-10-16
**Status:** Solution Research

---

## Problem Recap

BlacAdapter needs the subscription ID to track dependencies, but currently guesses it using `Array.from(subscriptions.keys()).pop()`, which is race-prone.

**Core Challenge:** How to reliably communicate the subscription ID from `SubscriptionManager.subscribe()` to `BlacAdapter` without breaking existing APIs?

---

## Solution Approaches

### Option A: Return Object with ID and Unsubscribe ⭐ RECOMMENDED

**Description:** Change `subscribe()` to return `{ unsubscribe: () => void; id: string }` instead of just the unsubscribe function.

**Implementation:**

```typescript
// SubscriptionManager.subscribe()
subscribe(options: SubscriptionOptions<S>): { unsubscribe: () => void; id: string } {
  const id = `${options.type}-${generateUUID()}`;

  const subscription: Subscription<S> = {
    id,
    type: options.type,
    // ...
  };

  this.subscriptions.set(id, subscription);

  return {
    id,
    unsubscribe: () => this.unsubscribe(id)
  };
}

// BlocBase.subscribeComponent()
subscribeComponent(
  componentRef: WeakRef<object>,
  callback: () => void,
): { unsubscribe: () => void; id: string } {
  return this._subscriptionManager.subscribe({
    type: 'consumer',
    weakRef: componentRef,
    notify: callback,
  });
}

// BlacAdapter.createSubscription()
createSubscription = (options: { onChange: () => void }) => {
  if (this.isUsingDependencies && this.options?.dependencies) {
    // Manual dependencies - no ID needed
    this.unsubscribe = this.blocInstance.subscribeWithSelector(
      (_state) => this.options!.dependencies!(this.blocInstance),
      (newValues) => {
        // ...
      },
    ).unsubscribe;
  } else {
    // Component subscription - get ID
    const weakRef = new WeakRef(this.componentRef.current);
    const result = this.blocInstance.subscribeComponent(weakRef, options.onChange);

    this.unsubscribe = result.unsubscribe;
    this.subscriptionId = result.id; // ← SAFE! Direct from source

    // ...
  }
}
```

**Pros:**
- ✅ **Eliminates race condition completely** - ID comes directly from source
- ✅ **Type-safe** - No `as any` casts needed
- ✅ **Clear API** - Return object is self-documenting
- ✅ **Zero overhead** - Just returning existing values
- ✅ **Backwards compatible** - Can add `.unsubscribe()` property, old code can call result as function

**Cons:**
- ⚠️ **Breaking change** - Return type changes from `() => void` to object
- ⚠️ **Migration needed** - Existing code calling result as function will break

**Compatibility Strategy:**
```typescript
// For backwards compatibility, return a function with properties
const unsubscribe = () => this.unsubscribe(id);
Object.assign(unsubscribe, { id, unsubscribe });
return unsubscribe as (() => void) & { id: string; unsubscribe: () => void };

// Usage:
const cleanup = bloc.subscribe(callback);
cleanup(); // Still works!
cleanup.unsubscribe(); // Also works!
cleanup.id; // Access ID
```

**Assessment:**
- Correctness: **10/10** - Completely race-free
- Performance: **10/10** - Zero overhead
- API Cleanliness: **9/10** - Clean object return
- Type Safety: **10/10** - Fully typed
- Backwards Compatibility: **6/10** - Requires migration or clever compatibility hack
- Complexity: **9/10** - Simple implementation

**Score: 9.0/10**

---

### Option B: Add ID Property to Unsubscribe Function

**Description:** Add the ID as a property on the unsubscribe function object itself.

**Implementation:**

```typescript
// SubscriptionManager.subscribe()
subscribe(options: SubscriptionOptions<S>): (() => void) & { id: string } {
  const id = `${options.type}-${generateUUID()}`;

  const subscription: Subscription<S> = {
    id,
    type: options.type,
    // ...
  };

  this.subscriptions.set(id, subscription);

  const unsubscribe = () => this.unsubscribe(id);
  (unsubscribe as any).id = id;

  return unsubscribe as (() => void) & { id: string };
}

// BlacAdapter.createSubscription()
createSubscription = (options: { onChange: () => void }) => {
  // ...
  const weakRef = new WeakRef(this.componentRef.current);
  this.unsubscribe = this.blocInstance.subscribeComponent(weakRef, options.onChange);

  // Access ID from function property
  this.subscriptionId = (this.unsubscribe as any).id;
}
```

**Pros:**
- ✅ **Backwards compatible** - Function can still be called as before
- ✅ **Eliminates race condition** - ID comes from source
- ✅ **Minimal API change** - Return type is still a function
- ✅ **Zero overhead** - Just adding property to function object

**Cons:**
- ⚠️ **Awkward TypeScript** - Intersection type `(() => void) & { id: string }` is unusual
- ⚠️ **Still uses type assertion** - Need `as any` to attach property
- ⚠️ **Unconventional** - Functions with properties are less common in TypeScript
- ⚠️ **IDE support** - May not show `id` property in autocomplete without proper types

**Assessment:**
- Correctness: **10/10** - Completely race-free
- Performance: **10/10** - Zero overhead
- API Cleanliness: **6/10** - Function with property is awkward
- Type Safety: **7/10** - Need type assertions
- Backwards Compatibility: **10/10** - Fully compatible
- Complexity: **8/10** - Simple but unconventional

**Score: 8.5/10**

---

### Option C: Add getLastSubscriptionId() Method

**Description:** Add a method to SubscriptionManager that returns the most recently created subscription ID for a given type.

**Implementation:**

```typescript
// SubscriptionManager
class SubscriptionManager<S> {
  private lastSubscriptionId?: string;

  subscribe(options: SubscriptionOptions<S>): () => void {
    const id = `${options.type}-${generateUUID()}`;

    this.subscriptions.set(id, subscription);
    this.lastSubscriptionId = id; // ← Track last ID

    return () => this.unsubscribe(id);
  }

  getLastSubscriptionId(): string | undefined {
    return this.lastSubscriptionId;
  }
}

// BlacAdapter.createSubscription()
createSubscription = (options: { onChange: () => void }) => {
  // ...
  const weakRef = new WeakRef(this.componentRef.current);
  this.unsubscribe = this.blocInstance.subscribeComponent(weakRef, options.onChange);

  // Get last subscription ID
  this.subscriptionId = (this.blocInstance._subscriptionManager as any)
    .getLastSubscriptionId();
}
```

**Pros:**
- ✅ **Backwards compatible** - No changes to existing API
- ✅ **Simple to implement** - Just track last ID
- ✅ **Zero overhead** - Just one field assignment

**Cons:**
- ❌ **STILL HAS RACE CONDITION!** - Between subscribe() and getLastSubscriptionId(), another subscription can be created
- ❌ **Doesn't solve the problem** - Same race window as current implementation
- ⚠️ **Still uses type assertion** - Need `as any` to access private manager
- ⚠️ **Fragile** - Relies on no interleaving

**Assessment:**
- Correctness: **2/10** - Still has race condition
- Performance: **10/10** - Zero overhead
- API Cleanliness: **7/10** - Clean method addition
- Type Safety: **5/10** - Still needs type assertions
- Backwards Compatibility: **10/10** - No breaking changes
- Complexity: **9/10** - Simple implementation

**Score: 7.2/10** ⚠️ Does not solve the problem!

---

### Option D: Pass ID via Callback Parameter

**Description:** Pass the subscription ID as a parameter to the notification callback.

**Implementation:**

```typescript
// Subscription callback signature changes
type SubscriptionCallback<T> = (
  value: T,
  oldValue?: T,
  action?: unknown,
  subscriptionId?: string  // ← Add subscription ID
) => void;

// SubscriptionManager.subscribe()
subscribe(options: SubscriptionOptions<S>): () => void {
  const id = `${options.type}-${generateUUID()}`;

  const subscription: Subscription<S> = {
    id,
    notify: (value, oldValue, action) => {
      options.notify(value, oldValue, action, id); // ← Pass ID
    },
    // ...
  };

  this.subscriptions.set(id, subscription);

  return () => this.unsubscribe(id);
}

// BlacAdapter.createSubscription()
createSubscription = (options: { onChange: () => void }) => {
  const weakRef = new WeakRef(this.componentRef.current);

  this.unsubscribe = this.blocInstance.subscribeComponent(
    weakRef,
    (value, oldValue, action, subscriptionId) => {
      this.subscriptionId = subscriptionId; // ← Get ID from callback
      options.onChange();
    },
  );
}
```

**Pros:**
- ✅ **Race-free** - ID passed directly during notification
- ✅ **Backwards compatible** - Optional parameter
- ✅ **No type assertions** - Clean types throughout

**Cons:**
- ❌ **ID arrives too late** - Not available until first notification
- ❌ **Wrong solution** - BlacAdapter needs ID immediately, not on first render
- ⚠️ **API pollution** - Adds parameter most users won't need
- ⚠️ **Callback signature change** - Breaking change for typed callbacks

**Assessment:**
- Correctness: **3/10** - ID not available when needed
- Performance: **9/10** - Minimal overhead (one parameter)
- API Cleanliness: **5/10** - Adds unwanted parameter
- Type Safety: **8/10** - Clean types
- Backwards Compatibility: **7/10** - Optional parameter somewhat compatible
- Complexity: **7/10** - Moderate implementation

**Score: 6.5/10** ⚠️ ID arrives too late!

---

### Option E: Component-to-Subscription WeakMap

**Description:** Maintain a WeakMap from component refs to subscription IDs in SubscriptionManager.

**Implementation:**

```typescript
// SubscriptionManager
class SubscriptionManager<S> {
  private componentToSubscription = new WeakMap<object, string>();

  subscribe(options: SubscriptionOptions<S>): () => void {
    const id = `${options.type}-${generateUUID()}`;

    const subscription: Subscription<S> = {
      id,
      // ...
    };

    this.subscriptions.set(id, subscription);

    // If component subscription, map component ref to ID
    if (options.weakRef) {
      const component = options.weakRef.deref();
      if (component) {
        this.componentToSubscription.set(component, id);
      }
    }

    return () => this.unsubscribe(id);
  }

  getSubscriptionIdForComponent(component: object): string | undefined {
    return this.componentToSubscription.get(component);
  }
}

// BlacAdapter.createSubscription()
createSubscription = (options: { onChange: () => void }) => {
  const weakRef = new WeakRef(this.componentRef.current);
  this.unsubscribe = this.blocInstance.subscribeComponent(weakRef, options.onChange);

  // Look up ID by component ref
  this.subscriptionId = (this.blocInstance._subscriptionManager as any)
    .getSubscriptionIdForComponent(this.componentRef.current);
}
```

**Pros:**
- ✅ **Backwards compatible** - No changes to return types
- ✅ **Race-free** - ID retrieved after subscription creation
- ✅ **WeakMap** - Automatic cleanup when component GC'd

**Cons:**
- ⚠️ **Complex** - Adds another tracking mechanism
- ⚠️ **Multiple subscriptions** - If component has multiple subscriptions to same bloc, map overwrites
- ⚠️ **WeakMap overhead** - Additional memory and lookup cost
- ⚠️ **Still uses type assertion** - Need `as any` for private method
- ⚠️ **Only works for component subscriptions** - Doesn't help for observer subscriptions

**Assessment:**
- Correctness: **7/10** - Works but can have collisions
- Performance: **8/10** - WeakMap lookup overhead
- API Cleanliness: **6/10** - Adds complexity
- Type Safety: **6/10** - Still needs type assertions
- Backwards Compatibility: **10/10** - No breaking changes
- Complexity: **5/10** - Adds significant complexity

**Score: 7.0/10** ⚠️ Collision risk with multiple subscriptions

---

### Option F: Return ID Separately (Internal API Only)

**Description:** Create internal-only versions of subscription methods that return the ID, keeping public API unchanged.

**Implementation:**

```typescript
// SubscriptionManager
class SubscriptionManager<S> {
  // Public API - backwards compatible
  subscribe(options: SubscriptionOptions<S>): () => void {
    const result = this.subscribeInternal(options);
    return result.unsubscribe;
  }

  // Internal API - returns ID
  subscribeInternal(options: SubscriptionOptions<S>): {
    unsubscribe: () => void;
    id: string;
  } {
    const id = `${options.type}-${generateUUID()}`;

    const subscription: Subscription<S> = {
      id,
      // ...
    };

    this.subscriptions.set(id, subscription);

    return {
      id,
      unsubscribe: () => this.unsubscribe(id)
    };
  }
}

// BlocBase - internal method for BlacAdapter
_subscribeComponentInternal(
  componentRef: WeakRef<object>,
  callback: () => void,
): { unsubscribe: () => void; id: string } {
  return this._subscriptionManager.subscribeInternal({
    type: 'consumer',
    weakRef: componentRef,
    notify: callback,
  });
}

// BlacAdapter
createSubscription = (options: { onChange: () => void }) => {
  const weakRef = new WeakRef(this.componentRef.current);

  // Use internal method
  const result = this.blocInstance._subscribeComponentInternal(weakRef, options.onChange);

  this.unsubscribe = result.unsubscribe;
  this.subscriptionId = result.id; // ← Direct, type-safe access
}
```

**Pros:**
- ✅ **Race-free** - ID comes directly from source
- ✅ **Type-safe** - No `as any` casts
- ✅ **Backwards compatible** - Public API unchanged
- ✅ **Clear separation** - Internal vs. public API
- ✅ **Zero overhead** - Just returning values

**Cons:**
- ⚠️ **API duplication** - Two methods doing similar things
- ⚠️ **Maintenance burden** - Keep both methods in sync
- ⚠️ **Public internal method** - `_subscribeComponentInternal` visible but shouldn't be used externally

**Assessment:**
- Correctness: **10/10** - Completely race-free
- Performance: **10/10** - Zero overhead
- API Cleanliness: **7/10** - Duplication but clear purpose
- Type Safety: **10/10** - Fully typed
- Backwards Compatibility: **10/10** - Public API unchanged
- Complexity: **7/10** - Moderate (duplication)

**Score: 9.0/10**

---

## Comparison Matrix

| Solution | Correctness | Performance | API Cleanliness | Type Safety | Compatibility | Complexity | **Total** |
|----------|-------------|-------------|-----------------|-------------|---------------|------------|-----------|
| **A: Return Object** | 10/10 | 10/10 | 9/10 | 10/10 | 6/10 | 9/10 | **9.0/10** |
| **B: Function Property** | 10/10 | 10/10 | 6/10 | 7/10 | 10/10 | 8/10 | **8.5/10** |
| **C: getLastId()** | 2/10 | 10/10 | 7/10 | 5/10 | 10/10 | 9/10 | **7.2/10** ⚠️ |
| **D: Callback Parameter** | 3/10 | 9/10 | 5/10 | 8/10 | 7/10 | 7/10 | **6.5/10** ⚠️ |
| **E: WeakMap** | 7/10 | 8/10 | 6/10 | 6/10 | 10/10 | 5/10 | **7.0/10** ⚠️ |
| **F: Internal API** | 10/10 | 10/10 | 7/10 | 10/10 | 10/10 | 7/10 | **9.0/10** |

---

## Detailed Analysis

### Why Option A (Return Object) Scores Highest (tied)

**Strengths:**
- **Eliminates the race condition completely** - ID is returned synchronously
- **Type-safe** - No type assertions needed
- **Clean API design** - Returning `{ id, unsubscribe }` is self-documenting
- **Zero performance overhead** - Just returning existing values

**Main Weakness:**
- **Breaking change** - Requires migration of existing code

**Mitigation for Breaking Change:**
The user specified "backwards compatibility is not a concern", so this is acceptable. We can refactor all internal usages without deprecation.

---

### Why Option F (Internal API) Scores Highest (tied)

**Strengths:**
- **Eliminates the race condition completely** - ID is returned synchronously
- **Type-safe** - No type assertions needed
- **Backwards compatible** - Public API unchanged
- **Clear intent** - Internal method clearly marked with `_` prefix

**Main Weakness:**
- **API duplication** - Must maintain two similar methods

**Why This Is Acceptable:**
- User said "no backwards compatibility concerns", so Option A is viable
- Option F is good if we want to preserve public API for external users
- Duplication is manageable (small methods)

---

### Why Other Options Are Weaker

**Option C (getLastId):**
- ❌ **Doesn't solve the race condition** - Still has timing window
- Rejected

**Option D (Callback Parameter):**
- ❌ **ID arrives too late** - Not available when needed
- Wrong approach for this problem
- Rejected

**Option E (WeakMap):**
- ❌ **Collision risk** - Multiple subscriptions from same component
- ❌ **Adds complexity** - Another tracking mechanism
- Suboptimal

**Option B (Function Property):**
- ⚠️ **Awkward API** - Functions with properties are unconventional in TypeScript
- ⚠️ **Type assertions needed** - Still uses `as any` to attach property
- Workable but not ideal

---

## Recommendation

**Primary Recommendation: Option A (Return Object)**

Since user specified "backwards compatibility is not a concern", we should choose the cleanest, most type-safe solution:

```typescript
// Return object with ID and unsubscribe
return {
  id: string;
  unsubscribe: () => void;
}
```

**Benefits:**
1. Completely eliminates race condition
2. Type-safe throughout (no `as any`)
3. Self-documenting API
4. Zero performance overhead
5. Enables future enhancements (e.g., subscription metadata)

**Migration Strategy:**
1. Change return type of `subscribe()`
2. Update `subscribeComponent()` to pass through
3. Update all internal callers (BlacAdapter, tests, etc.)
4. No public deprecation needed (user doesn't care about compatibility)

**Alternative: Option F (Internal API)** if we decide to preserve public API for some reason, but Option A is cleaner given the requirements.

---

**Next Step:** Create discussion.md with Council analysis of Option A vs. Option F.

# Research: Local Instance Management Refactor

**Date:** 2025-11-04

## Problem Space Analysis

### Current Architecture Issues

The current architecture has a centralized `StateContainerRegistry` that:

1. **Stores ALL instances** in a single flat Map with string keys like `"CounterBloc:default"`
2. **Uses string prefix matching** for type-specific queries:
   ```typescript
   getAll(CounterBloc) → iterate ALL instances, filter by "CounterBloc:" prefix
   // O(total_instances) instead of O(CounterBloc_instances)
   ```

3. **Tight coupling**: Instance management + lifecycle hooks in same class
4. **Unintuitive**: `CounterBloc.resolve()` → delegates to global registry → string manipulation

### Performance Analysis

**Current (Centralized Registry):**
```
Total instances: 1000 (10 types × 100 instances each)
CounterBloc.getAll():
  - Iterate: 1000 entries
  - String compare: 1000 × "CounterBloc:".startsWith()
  - Result: 100 instances
  - Complexity: O(total_instances)
```

**Proposed (Local Storage):**
```
CounterBloc has its own Map with 100 entries
CounterBloc.getAll():
  - Iterate: 100 entries (direct access to CounterBloc.instances)
  - No string operations
  - Result: 100 instances
  - Complexity: O(CounterBloc_instances)
```

For 10 types with 100 instances each:
- Current: 1000 iterations per getAll()
- Proposed: 100 iterations per getAll()
- **10x improvement**

### Lifecycle Event System (Plugin API)

The registry provides lifecycle hooks used by DevTools plugin:

```typescript
// In ReduxDevToolsAdapter.ts:290-308
globalRegistry.on('created', (container) => { ... });
globalRegistry.on('stateChanged', (container, prev, curr) => { ... });
globalRegistry.on('eventAdded', (vertex, event) => { ... });
globalRegistry.on('disposed', (container) => { ... });
```

**Critical Constraint:** This API must be preserved for DevTools integration.

## Current Codebase Analysis

### Key Components

#### 1. StateContainerRegistry
**Location:** `packages/blac/src/core/StateContainerRegistry.ts`

**Current Responsibilities:**
- Instance storage (primary): `Map<string, InstanceEntry>`
- Type configuration: `Map<string, TypeConfig>`
- Lifecycle events: `Map<LifecycleEvent, Set<Function>>`
- All CRUD operations on instances

**Methods:**
```typescript
register(constructor, isolated)
getOrCreate(constructor, key, ...args)  // "resolve" delegates here
release(constructor, key, forceDispose)
getInstance(constructor, key)           // "get" delegates here
getAll(constructor)                     // String prefix iteration
forEach(constructor, callback)          // String prefix iteration
clear(constructor)                      // String prefix deletion
clearAll()                              // Clear everything
hasInstance(constructor, key)
getRefCount(constructor, key)
on(event, listener)                     // Lifecycle hooks
emit(event, ...args)                    // Notify listeners
```

#### 2. StateContainer Base Class
**Location:** `packages/blac/src/core/StateContainer.ts`

**Current Role:** Thin wrapper around registry
```typescript
static resolve<T>(key?, ...args) {
  return StateContainer._registry.resolve(this, key, ...args);
}
static get<T>(key?) {
  return StateContainer._registry.getInstance(this, key);
}
// ... all methods delegate to registry
```

**Instance State:**
- `_state: S` - Current state
- `listeners: Set<StateListener<S>>` - State change subscribers
- `_disposed: boolean` - Disposal flag
- `instanceId: string` - Unique instance ID

#### 3. Subclasses (Cubit, Vertex)
**Locations:**
- `packages/blac/src/core/Cubit.ts`
- `packages/blac/src/core/Vertex.ts`

**Patterns:**
```typescript
export class Cubit<S> extends StateContainer<S> { ... }
export class Vertex<S, E> extends StateContainer<S> { ... }

// Example implementations
export class CounterCubit extends Cubit<number> {
  static keepAlive = true;  // Static config
  increment = () => this.emit(this.state + 1);
}

export class TodoCubit extends Cubit<TodoState> {
  static keepAlive = true;
  addTodo = (text: string) => { ... }
}
```

#### 4. Test Infrastructure
**Locations:**
- `packages/blac/src/core/StateContainer.registry.test.ts` (38 tests)
- `packages/blac/src/core/StateContainerRegistry.lifecycle.test.ts` (33 tests)

**Test Pattern:**
```typescript
beforeEach(() => {
  StateContainer.clearAllInstances(); // or
  registry = new StateContainerRegistry();
  StateContainer.setRegistry(registry);
});
```

#### 5. DevTools Integration
**Location:** `packages/devtools-connect/src/integrations/ReduxDevToolsAdapter.ts`

**Usage:**
```typescript
import { globalRegistry } from '@blac/core';

connect() {
  this.unsubscribers.push(
    globalRegistry.on('created', (container) => { ... }),
    globalRegistry.on('stateChanged', (container, prev, curr) => { ... }),
    globalRegistry.on('eventAdded', (vertex, event) => { ... }),
    globalRegistry.on('disposed', (container) => { ... })
  );
}
```

## TypeScript Static Property Inheritance

### Key Insight: Each Subclass Gets Own Static Storage

```typescript
abstract class Base {
  static instances = new Map<string, any>();

  static resolve(key: string) {
    // 'this' refers to the calling subclass
    this.instances.set(key, new this());
  }
}

class Counter extends Base {}
class User extends Base {}

Counter.resolve('c1');
User.resolve('u1');

// Counter.instances !== User.instances ✅
// Each subclass has its own Map!
```

**Why This Works:**
- Static properties are **not inherited** in JavaScript
- Each class gets its own static storage
- `this` in static methods refers to the calling class
- Perfect for our use case!

### Polymorphic Static Methods

```typescript
abstract class StateContainer<S> {
  private static instances = new Map<string, InstanceEntry>();

  static resolve<T extends StateContainer<any>>(
    this: new (...args: any[]) => T,
    key?: string,
    ...args: any[]
  ): T {
    // 'this' is the constructor (CounterBloc, UserBloc, etc.)
    // Each has its own 'instances' Map
    const instanceKey = key || 'default';
    let entry = this.instances.get(instanceKey);

    if (!entry) {
      const instance = new this(...args);
      entry = { instance, refCount: 1 };
      this.instances.set(instanceKey, entry);
    } else {
      entry.refCount++;
    }

    return entry.instance as T;
  }
}
```

## Best Practices & Patterns

### 1. Separation of Concerns
✅ **Do:** Separate instance management from lifecycle hooks
```typescript
// StateContainer: Owns instances
static instances = new Map<string, InstanceEntry>();

// Registry: Coordinates lifecycle
static _registry = globalRegistry;
```

❌ **Don't:** Mix instance storage with event system

### 2. Type Safety
✅ **Do:** Use generic constraints for type inference
```typescript
static resolve<T extends StateContainer<any>>(
  this: new (...args: any[]) => T,
  key?: string,
  ...args: any[]
): T
```

❌ **Don't:** Lose type information through registry

### 3. Memory Management
✅ **Do:** Use WeakSet for type tracking (allows GC)
```typescript
class Registry {
  private types = new WeakSet<typeof StateContainer>();
}
```

❌ **Don't:** Use Set (prevents GC of unused classes)

### 4. Test Isolation
✅ **Do:** Provide global cleanup utility
```typescript
static clearAllInstances() {
  // Iterate all registered types
  // Call clear() on each
}
```

❌ **Don't:** Require manual per-type cleanup in tests

## Common Patterns from Similar Libraries

### Redux Toolkit
**Pattern:** Factory functions create slices with local state
```typescript
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: { ... }
});
```

**Relevance:** Local state management per slice

### MobX
**Pattern:** Each observable class manages its own instances
```typescript
class Store {
  @observable value = 0;
}

const store1 = new Store();
const store2 = new Store();
// No global registry
```

**Relevance:** Per-class instance management

### Zustand
**Pattern:** Factory function creates store with local state
```typescript
const useStore = create((set) => ({ ... }));
```

**Relevance:** Store owns its state and subscribers

## Potential Pitfalls & Anti-Patterns

### Pitfall 1: Forgetting to Notify Registry
❌ **Problem:**
```typescript
static resolve(key, ...args) {
  const instance = new this(...args);
  this.instances.set(key, { instance, refCount: 1 });
  // FORGOT: StateContainer._registry.registerType(this);
  // FORGOT: StateContainer._registry.emit('created', instance);
}
```

✅ **Solution:** Centralize notification in constructor and lifecycle methods

### Pitfall 2: Incorrect WeakSet Usage
❌ **Problem:**
```typescript
private types = new WeakSet<Function>(); // Wrong type
```

✅ **Solution:**
```typescript
private types = new WeakSet<typeof StateContainer>();
```

### Pitfall 3: Shared State Across Subclasses
❌ **Problem:**
```typescript
abstract class StateContainer {
  static instances = new Map(); // Shared!
}
```

✅ **Solution:** JavaScript creates separate static property per subclass automatically

### Pitfall 4: Lifecycle Hook Ordering
❌ **Problem:**
```typescript
constructor(state) {
  this._state = state;
  StateContainer._registry.emit('created', this); // Too early!
  this.onInit(); // Subclass setup
}
```

✅ **Solution:** Emit after construction complete
```typescript
constructor(state) {
  this._state = state;
  // Let subclass constructor finish first
}

// Then in resolve():
const instance = new this(...args);
StateContainer._registry.emit('created', instance); // After construction
```

### Pitfall 5: Test Isolation with Static Maps
❌ **Problem:**
```typescript
beforeEach(() => {
  // How to clear all instances when they're on each class?
});
```

✅ **Solution:** Registry tracks all types, provides clearAll()
```typescript
beforeEach(() => {
  StateContainer.clearAllInstances(); // Uses registry to find all types
});
```

## Architectural Decision: Registry Role

### Option A: Registry as Pure Event Bus (Rejected)
```typescript
class Registry {
  on(event, listener) { ... }
  emit(event, ...args) { ... }
}
// No instance tracking at all
```

**Problem:** Can't implement `clearAllInstances()` or `getStats()`

### Option B: Registry Tracks Types Only (Selected)
```typescript
class Registry {
  private types = new WeakSet<typeof StateContainer>();

  registerType(constructor) { ... }
  clearAllInstances() { ... }  // Iterate types, call .clear()
  getStats() { ... }           // Aggregate from all types

  on(event, listener) { ... }
  emit(event, ...args) { ... }
}
```

**Benefits:**
- Global operations still possible
- WeakSet allows GC
- Minimal memory overhead

## Migration Strategy for Plugins

### Current Plugin Code
```typescript
import { globalRegistry } from '@blac/core';

globalRegistry.on('created', (container) => { ... });
```

### After Refactor (No Changes Needed!)
```typescript
import { globalRegistry } from '@blac/core';

globalRegistry.on('created', (container) => { ... });
// Same API, works identically
```

**Why It Works:**
- Lifecycle events still emitted to registry
- Plugin API unchanged
- Only internal implementation changes

## Performance Expectations

### Benchmark Scenarios

**Scenario 1: 10 types, 10 instances each (100 total)**
- Current `CounterBloc.getAll()`: 100 iterations + string matching
- New `CounterBloc.getAll()`: 10 iterations (direct Map access)
- **10x faster**

**Scenario 2: 5 types, 100 instances each (500 total)**
- Current `CounterBloc.getAll()`: 500 iterations + string matching
- New `CounterBloc.getAll()`: 100 iterations (direct Map access)
- **5x faster**

**Memory Overhead:**
- Current: 1 Map (500 entries)
- New: 5 Maps (100 entries each)
- **Same total entries, slightly more Map overhead (~100 bytes per Map)**

### Real-World Impact

For typical workloads (< 100 instances per type):
- `getAll()`: Negligible (0.01ms → 0.001ms)
- `forEach()`: Negligible (0.1ms → 0.01ms)
- Memory: Negligible (5 Maps × 100 bytes = 500 bytes)

**Conclusion:** Performance improvement is real but not critical. Main benefit is architectural clarity.

## Technical Considerations

### 1. Constructor Timing
- Instance created: `new this(...args)`
- Lifecycle hook: Must notify registry AFTER construction complete
- Solution: Notify in `resolve()` after `new this()` returns

### 2. Disposal Cascade
- When ref count reaches 0: dispose instance
- Disposal: Clear listeners, call `onDispose()`, emit 'disposed' event
- Must also remove from local Map

### 3. Isolated Instance Lifecycle
- Isolated instances tracked in local Map (new behavior)
- Support ref counting (can have multiple owners)
- Participate in `getAll()`/`forEach()` (new behavior)

### 4. keepAlive Handling
- Check `static keepAlive` property on constructor
- If true, never auto-dispose (even when ref count = 0)
- Must still track in local Map

### 5. Type Registry Bookkeeping
- Registry maintains `WeakSet<typeof StateContainer>`
- Auto-register on first instance creation
- Used for `clearAllInstances()` and `getStats()`

## Conclusion

The refactor is architecturally sound and well-supported by TypeScript's static property semantics. The main challenges are:

1. Ensuring lifecycle events are emitted correctly
2. Maintaining test isolation with new architecture
3. Careful migration of ref counting and disposal logic

The benefits are:
1. Cleaner separation of concerns
2. Better performance for type-specific queries
3. More intuitive mental model (classes own their instances)
4. Simpler codebase (less string manipulation)

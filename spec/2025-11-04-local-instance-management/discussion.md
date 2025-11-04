# Discussion: Local Instance Management Implementation Approaches

**Date:** 2025-11-04

## Summary

We need to refactor StateContainer instance management from a centralized registry to local per-class storage. The key goals are:

1. Move instance storage to each StateContainer subclass
2. Maintain lifecycle event system for plugins (DevTools)
3. Preserve public API (no breaking changes for users)
4. Improve performance of `getAll()`/`forEach()` operations
5. Support both shared and isolated instances with ref counting

## Important Context

### TypeScript Static Property Inheritance
Each subclass automatically gets its own static properties:
```typescript
class Counter extends StateContainer {} // Counter.instances is separate
class User extends StateContainer {}     // User.instances is separate
```

This is **perfect** for our use case - no special handling needed!

### Critical Constraint: Plugin API
DevTools integration depends on lifecycle events:
```typescript
globalRegistry.on('created', (container) => { ... });
globalRegistry.on('stateChanged', (container, prev, curr) => { ... });
```

This API must remain **unchanged**.

### Current Performance Issue
```typescript
// Current: O(total_instances) - iterate ALL instances
CounterBloc.getAll() // 1000 iterations for 10 types × 100 instances

// Desired: O(CounterBloc_instances) - iterate only CounterBloc
CounterBloc.getAll() // 100 iterations (direct Map access)
```

## Solution Options

### Option 1: Full Local Management with Type Registry

**Architecture:**
```typescript
abstract class StateContainer<S> {
  // Each subclass gets its own Map
  private static instances = new Map<string, InstanceEntry>();

  static resolve<T>(key?, ...args): T {
    // Directly access this.instances (no registry delegation)
    const entry = this.instances.get(key || 'default');
    if (entry) {
      entry.refCount++;
      return entry.instance;
    }

    const instance = new this(...args);
    this.instances.set(key, { instance, refCount: 1 });

    // Notify registry for lifecycle hooks
    StateContainer._registry.registerType(this);
    StateContainer._registry.emit('created', instance);

    return instance;
  }

  static getAll<T>(): T[] {
    // Direct iteration - no string matching
    return Array.from(this.instances.values()).map(e => e.instance);
  }
}

class StateContainerRegistry {
  // Lightweight type tracking
  private types = new WeakSet<typeof StateContainer>();
  private listeners = new Map<LifecycleEvent, Set<Function>>();

  registerType(constructor) {
    this.types.add(constructor);
  }

  clearAllInstances() {
    // Iterate all registered types, call .clear() on each
    for (const Type of this.types) {
      Type.clear();
    }
  }

  on(event, listener) { ... }  // Event system
  emit(event, ...args) { ... }
}
```

**Pros:**
- ✅ Maximum performance (O(1) type lookup, O(n) iteration)
- ✅ Clean separation: instances on class, events in registry
- ✅ Intuitive: `CounterBloc.instances` makes conceptual sense
- ✅ No string manipulation overhead
- ✅ Memory efficient (WeakSet allows GC)

**Cons:**
- ⚠️ More complex migration (move all logic from registry to StateContainer)
- ⚠️ WeakSet iteration not directly supported (need workaround for clearAll)
- ⚠️ Each class has static Map (minimal overhead: ~100 bytes per class)

**Scoring:**
- **Complexity:** 6/10 (moderate migration effort)
- **Performance:** 10/10 (optimal)
- **Maintainability:** 9/10 (clear separation of concerns)
- **Migration Risk:** 7/10 (need careful lifecycle event handling)
- **Memory:** 9/10 (WeakSet + per-class Map)

---

### Option 2: Hybrid with Registry Helper Methods

**Architecture:**
```typescript
abstract class StateContainer<S> {
  private static instances = new Map<string, InstanceEntry>();

  static resolve<T>(key?, ...args): T {
    // Local instance management
    const instance = this._localResolve(key, ...args);

    // Registry handles side effects
    StateContainer._registry.onInstanceCreated(this, instance);

    return instance;
  }

  private static _localResolve<T>(key?, ...args): T {
    // Pure instance management logic
    const entry = this.instances.get(key || 'default');
    if (entry) {
      entry.refCount++;
      return entry.instance;
    }

    const instance = new this(...args);
    this.instances.set(key, { instance, refCount: 1 });
    return instance;
  }
}

class StateContainerRegistry {
  private types = new Set<typeof StateContainer>(); // Strong refs

  onInstanceCreated(constructor, instance) {
    this.types.add(constructor);
    this.emit('created', instance);
  }

  clearAllInstances() {
    for (const Type of this.types) {
      Type.clear();
    }
  }
}
```

**Pros:**
- ✅ Clearer separation between instance logic and side effects
- ✅ Easier to test (can mock registry methods)
- ✅ Strong Set (direct iteration for clearAll)
- ✅ Same performance as Option 1

**Cons:**
- ⚠️ Helper methods add API surface (`onInstanceCreated`, etc.)
- ⚠️ Strong Set prevents GC of unused classes (keeps classes alive)
- ⚠️ More indirection (harder to follow control flow)

**Scoring:**
- **Complexity:** 5/10 (cleaner separation, easier to reason about)
- **Performance:** 10/10 (same as Option 1)
- **Maintainability:** 8/10 (more methods to maintain)
- **Migration Risk:** 6/10 (clearer migration path)
- **Memory:** 7/10 (Strong Set keeps classes alive)

---

### Option 3: Minimal Refactor with Nested Map

**Architecture:**
```typescript
class StateContainerRegistry {
  // Nested Map instead of flat Map with string keys
  private instances = new Map<Function, Map<string, InstanceEntry>>();
  private types = new Map<Function, TypeConfig>();
  private listeners = new Map<LifecycleEvent, Set<Function>>();

  resolve<T>(constructor, key?, ...args): T {
    // Get or create type-specific Map
    let typeInstances = this.instances.get(constructor);
    if (!typeInstances) {
      typeInstances = new Map();
      this.instances.set(constructor, typeInstances);
    }

    // Instance management in type-specific Map
    const instanceKey = key || 'default';
    let entry = typeInstances.get(instanceKey);
    if (entry) {
      entry.refCount++;
      return entry.instance;
    }

    const instance = new constructor(...args);
    entry = { instance, refCount: 1 };
    typeInstances.set(instanceKey, entry);

    this.emit('created', instance);
    return instance;
  }

  getAll<T>(constructor): T[] {
    // Direct O(1) lookup, no string matching
    const typeInstances = this.instances.get(constructor) || new Map();
    return Array.from(typeInstances.values()).map(e => e.instance);
  }
}

abstract class StateContainer<S> {
  static resolve<T>(key?, ...args): T {
    // Still delegate to registry (less change)
    return StateContainer._registry.resolve(this, key, ...args);
  }
}
```

**Pros:**
- ✅ Minimal code changes (mostly in registry only)
- ✅ Performance improvement achieved (nested Map)
- ✅ Existing tests mostly unchanged
- ✅ Lower migration risk
- ✅ No static property concerns

**Cons:**
- ❌ Doesn't achieve architectural goal (still centralized)
- ❌ Registry remains heavyweight (instance management + events)
- ❌ Less intuitive (`CounterBloc.instances` doesn't exist)
- ❌ Doesn't fix coupling between instance management and lifecycle

**Scoring:**
- **Complexity:** 3/10 (very simple migration)
- **Performance:** 9/10 (nearly same as Option 1)
- **Maintainability:** 5/10 (doesn't improve architecture)
- **Migration Risk:** 3/10 (minimal changes)
- **Memory:** 8/10 (nested Maps, slightly more overhead)

---

### Option 4: Local Management with Strong Type Set

**Architecture:**
```typescript
abstract class StateContainer<S> {
  private static instances = new Map<string, InstanceEntry>();

  static resolve<T>(key?, ...args): T {
    const entry = this.instances.get(key || 'default');
    if (entry) {
      entry.refCount++;
      return entry.instance;
    }

    const instance = new this(...args);
    this.instances.set(key, { instance, refCount: 1 });

    // Register type and notify
    StateContainer._registry.registerType(this);
    StateContainer._registry.emit('created', instance);

    return instance;
  }
}

class StateContainerRegistry {
  // Strong Set with manual tracking
  private types = new Set<typeof StateContainer>();

  registerType(constructor) {
    this.types.add(constructor);
  }

  clearAllInstances() {
    // Direct iteration (no WeakSet issues)
    for (const Type of this.types) {
      Type.clear();
    }
    this.types.clear(); // Cleanup after clearing
  }
}
```

**Pros:**
- ✅ Same performance as Option 1
- ✅ Simple iteration for clearAll (no WeakSet complexity)
- ✅ Clean architecture (local management)
- ✅ Intuitive API

**Cons:**
- ⚠️ Strong Set keeps class constructors alive (prevents GC)
- ⚠️ Need manual cleanup: call `types.clear()` after clearing instances
- ⚠️ In practice, classes rarely get GC'd anyway (loaded once)

**Scoring:**
- **Complexity:** 6/10 (moderate migration)
- **Performance:** 10/10 (optimal)
- **Maintainability:** 9/10 (clean separation)
- **Migration Risk:** 7/10 (careful lifecycle handling)
- **Memory:** 8/10 (Strong Set, but classes rarely GC'd)

---

## Comparison Matrix

| Criterion | Option 1 (WeakSet) | Option 2 (Hybrid) | Option 3 (Nested Map) | Option 4 (Strong Set) |
|-----------|-------------------|-------------------|----------------------|----------------------|
| **Complexity** | 6/10 | 5/10 | 3/10 | 6/10 |
| **Performance** | 10/10 | 10/10 | 9/10 | 10/10 |
| **Maintainability** | 9/10 | 8/10 | 5/10 | 9/10 |
| **Migration Risk** | 7/10 | 6/10 | 3/10 | 7/10 |
| **Memory** | 9/10 | 7/10 | 8/10 | 8/10 |
| **Architecture** | ✅ Achieves goal | ✅ Achieves goal | ❌ Still centralized | ✅ Achieves goal |
| **TOTAL** | 41/50 | 36/50 | 28/50 | 42/50 |

## Council Discussion

**Alex (Pragmatist):** "Option 3 is tempting because it's low-risk. We get the performance win without the architectural overhaul. Why fix what isn't broken?"

**Jordan (Architect):** "Because the original goal isn't just performance - it's fixing the architectural smell. The registry is doing too much. Option 3 doesn't solve that. We should go with Option 4 - it's the cleanest and most maintainable long-term."

**Sam (Performance Engineer):** "From a pure performance standpoint, Options 1, 2, and 4 are identical. Option 3 is 90% there. But the nested Map in Option 3 adds cognitive overhead - you need to think about two levels of Maps."

**Taylor (Tester):** "Test isolation is critical here. Option 4's `clearAllInstances()` is straightforward - iterate types, clear each, then clear the type set. Option 1's WeakSet makes this harder. I vote Option 4."

**Morgan (Library Maintainer):** "Let's think about the typical use case: classes are loaded once at startup and never GC'd. The WeakSet benefit in Option 1 is theoretical. Option 4's Strong Set is simpler to implement and has no practical downside. Plus, manual cleanup in `clearAllInstances()` is actually safer - we can ensure proper disposal order."

**Alex:** "Okay, I'm convinced. Option 4 gives us the architectural win, full performance, and is actually simpler than Option 1 due to direct Set iteration. Option 3 is abandoned architecture."

**Consensus:** Option 4 (Local Management with Strong Type Set) is the best choice.

---

## Recommendation

**Selected: Option 4 - Local Management with Strong Type Set**

### Why Option 4?

1. **Achieves architectural goal:** Clean separation of concerns
2. **Optimal performance:** Direct Map access, no string operations
3. **Simpler than Option 1:** Strong Set is easier to work with than WeakSet
4. **Practical memory:** Classes rarely GC'd in practice, Strong Set is fine
5. **Better testing:** Direct Set iteration for `clearAllInstances()`
6. **Clear migration:** Move instance logic to StateContainer, keep events in Registry

### Why Not Others?

- **Option 1:** WeakSet adds complexity for no practical benefit
- **Option 2:** Unnecessary helper methods, doesn't improve over Option 4
- **Option 3:** Doesn't achieve the architectural goal, still centralized

### Implementation Strategy

1. Add `private static instances` Map to StateContainer
2. Move instance management logic from Registry to StateContainer static methods
3. Registry becomes lightweight: Strong Set + lifecycle events
4. Emit lifecycle events at key points (create, dispose, state change)
5. Update tests to use new `clearAllInstances()` pattern

### Risk Mitigation

- Comprehensive test coverage (358 existing tests)
- Careful lifecycle event emission (ensure plugins work)
- DevTools integration testing
- Performance validation with realistic workloads

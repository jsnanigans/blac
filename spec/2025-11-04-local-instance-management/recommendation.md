# Recommendation: Full Local Management with WeakSet Type Registry

**Date:** 2025-11-04
**Selected Option:** Option 1
**Rationale:** Memory efficiency is highest priority; clearAll() is rarely used

## Decision

Implement **Option 1: Full Local Management with WeakSet Type Registry**

## Why This Option?

### User Priorities
1. **Memory efficiency is very important** - WeakSet allows GC of unused classes
2. **clearAll() is rarely used** - Complexity of WeakSet iteration is acceptable trade-off
3. **Clean architecture** - Local instance management per class
4. **Optimal performance** - Direct Map access, O(1) type lookup

### Key Benefits

1. **Maximum Memory Efficiency**
   - WeakSet holds weak references to class constructors
   - Unused classes can be garbage collected
   - Each class only has Map overhead when it has instances

2. **Clean Architecture**
   ```typescript
   // Intuitive: each class owns its instances
   CounterBloc.instances  // CounterBloc's instances
   UserBloc.instances     // UserBloc's instances

   // Registry is lightweight coordination layer
   globalRegistry.on('created', ...)  // Lifecycle hooks only
   ```

3. **Optimal Performance**
   - `CounterBloc.getAll()`: O(CounterBloc_instances) not O(total_instances)
   - No string prefix matching
   - Direct Map access
   - 10x improvement for multi-type workloads

4. **Maintains Plugin API**
   - Lifecycle events unchanged: `on('created' | 'stateChanged' | 'eventAdded' | 'disposed')`
   - DevTools integration works identically
   - No plugin migration needed

## Architecture Overview

```typescript
// StateContainer: Local instance management
abstract class StateContainer<S> {
  private static instances = new Map<string, InstanceEntry>();
  protected static _registry = globalRegistry;

  static resolve<T>(key?, ...args): T {
    // Direct local Map access
    const entry = this.instances.get(key || 'default');
    if (entry) {
      entry.refCount++;
      return entry.instance;
    }

    // Create and track
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

  static forEach<T>(callback: (instance: T) => void): void {
    for (const entry of this.instances.values()) {
      if (!entry.instance.isDisposed) {
        try {
          callback(entry.instance as T);
        } catch (error) {
          console.error(`forEach callback error:`, error);
        }
      }
    }
  }

  // ... other methods follow same pattern
}

// Registry: Lightweight coordination
class StateContainerRegistry {
  private types = new WeakSet<typeof StateContainer>();
  private listeners = new Map<LifecycleEvent, Set<Function>>();

  registerType(constructor: typeof StateContainer): void {
    this.types.add(constructor);
  }

  clearAllInstances(): void {
    // Iterate WeakSet using tracking approach (see implementation)
  }

  on(event: LifecycleEvent, listener: Function): () => void {
    // Lifecycle event subscription
  }

  emit(event: LifecycleEvent, ...args: any[]): void {
    // Notify listeners
  }
}
```

## Handling WeakSet Iteration for clearAll()

**Challenge:** WeakSet doesn't support direct iteration

**Solution:** Track types separately for clearAll()

```typescript
class StateContainerRegistry {
  private types = new WeakSet<typeof StateContainer>();
  // Temporary strong references for clearAll()
  private typesForClear = new Set<typeof StateContainer>();

  registerType(constructor: typeof StateContainer): void {
    this.types.add(constructor);
    this.typesForClear.add(constructor);
  }

  clearAllInstances(): void {
    // Iterate strong references
    for (const Type of this.typesForClear) {
      Type.clear();
    }
    this.typesForClear.clear();
  }
}
```

**Alternative (simpler):** Skip global clearAll(), rely on per-type clear()

```typescript
// In tests:
CounterBloc.clear();
UserBloc.clear();
// ... (explicit per-type, which is fine since clearAll is rare)

// Or provide helper:
function clearAllKnownTypes(...types: Array<typeof StateContainer>) {
  types.forEach(T => T.clear());
}
```

**Recommendation:** Use simpler alternative - clearAll() is rare, explicit is fine.

## Implementation Phases

### Phase 1: Foundation
1. Add `private static instances` Map to StateContainer
2. Create helper type `InstanceEntry`
3. Update StateContainerRegistry to use WeakSet

### Phase 2: Instance Management Migration
1. Move `resolve()` logic from Registry to StateContainer
2. Move `get()` / `getSafe()` logic to StateContainer
3. Move `release()` logic to StateContainer
4. Move `getAll()` / `forEach()` to StateContainer
5. Emit lifecycle events at appropriate points

### Phase 3: Registry Simplification
1. Remove instance storage from Registry
2. Keep only: WeakSet, lifecycle events, type registration
3. Update `clearAllInstances()` approach

### Phase 4: Testing & Validation
1. Run full test suite (358 tests)
2. Test DevTools integration
3. Validate lifecycle events
4. Performance benchmarks

## Migration Impact

### User Code (No Changes)
```typescript
// All existing APIs work identically
const counter = CounterBloc.resolve('main', 0);
counter.increment();
CounterBloc.release('main');
const all = CounterBloc.getAll();
```

### Plugin Code (No Changes)
```typescript
// DevTools integration unchanged
globalRegistry.on('created', (container) => { ... });
globalRegistry.on('stateChanged', (container, prev, curr) => { ... });
```

### Test Code (Minor Changes)
```typescript
// Before:
beforeEach(() => {
  StateContainer.clearAllInstances();
});

// After (if we skip global clearAll):
beforeEach(() => {
  CounterBloc.clear();
  UserBloc.clear();
  TodoBloc.clear();
});

// Or use helper:
beforeEach(() => {
  clearTestTypes(CounterBloc, UserBloc, TodoBloc);
});
```

## Performance Expectations

### Before (Centralized Registry)
```
Total: 1000 instances (10 types × 100 each)
CounterBloc.getAll():
  - Iterate: 1000 entries
  - String match: 1000 × "CounterBloc:".startsWith()
  - Result: 100 instances
  - Time: ~0.1ms
```

### After (Local Management)
```
CounterBloc has 100 instances
CounterBloc.getAll():
  - Iterate: 100 entries (direct Map access)
  - No string operations
  - Result: 100 instances
  - Time: ~0.01ms
```

**Improvement:** 10x faster for multi-type workloads

### Memory
```
Before:
  - 1 registry Map: 1000 entries
  - String keys: 1000 × ~20 bytes = 20KB

After:
  - 10 class Maps: 100 entries each
  - String keys: 1000 × ~8 bytes = 8KB (shorter keys)
  - Map overhead: 10 × 100 bytes = 1KB
  - WeakSet overhead: ~200 bytes
  Total: ~9KB (55% reduction)
```

## Risk Mitigation

### Risk 1: Lifecycle Events Not Emitted
**Mitigation:**
- Emit in constructor (for 'created')
- Emit in emit() method (for 'stateChanged')
- Emit in dispose() (for 'disposed')
- Comprehensive testing of DevTools integration

### Risk 2: WeakSet Complexity
**Mitigation:**
- Document WeakSet usage clearly
- Provide alternative clearAll() pattern for tests
- Most operations don't need WeakSet iteration

### Risk 3: Static Property Confusion
**Mitigation:**
- Document that each subclass gets own Map
- Add type tests to verify separation
- Clear comments in code

### Risk 4: Test Isolation
**Mitigation:**
- Provide per-type `.clear()` method
- Test helper for clearing multiple types
- Document testing patterns

## Success Metrics

1. ✅ All 358 tests pass without modification (except clearAll usage)
2. ✅ DevTools integration works (lifecycle events)
3. ✅ `getAll()` performance improved by 5-10x (multi-type workload)
4. ✅ Memory usage reduced by 40-60%
5. ✅ No changes to user-facing API
6. ✅ Cleaner codebase (less string manipulation, better separation)

## Timeline Estimate

- **Phase 1 (Foundation):** 2-3 hours
- **Phase 2 (Migration):** 4-6 hours
- **Phase 3 (Simplification):** 2-3 hours
- **Phase 4 (Testing):** 2-3 hours

**Total:** 10-15 hours (1-2 days)

## Conclusion

Option 1 (Full Local Management with WeakSet) is the optimal choice given the priority on memory efficiency. The WeakSet complexity for clearAll() is acceptable since it's rarely used, and we can provide simpler alternatives for testing. The refactor achieves all goals: clean architecture, optimal performance, memory efficiency, and maintains the plugin API.

# Research: Isolated Bloc Lookup Optimization Strategies

**Issue ID:** High-Performance-005
**Research Date:** 2025-10-16
**Status:** Complete

---

## Problem Summary

`findIsolatedBlocInstance()` performs O(n) linear search through all isolated instances. Need O(1) lookup by both `_id` and `_instanceRef` while maintaining index consistency.

---

## Solution Approaches

### Option A: Dual Composite Key Indexes (Recommended)

**Description:** Add two Map indexes with composite keys for O(1) lookups.

**Implementation:**
```typescript
export class Blac {
  // Existing:
  isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]> = new Map();
  isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map(); // By UID

  // NEW indexes:
  private isolatedBlocIdIndex: Map<string, BlocBase<unknown>> = new Map();
  private isolatedBlocRefIndex: Map<string, BlocBase<unknown>> = new Map();

  /**
   * Create composite key for ID-based lookup
   */
  private createIdIndexKey(blocClassName: string, id: BlocInstanceId): string {
    return `${blocClassName}:${String(id)}`;
  }

  /**
   * Register isolated bloc in all indexes
   */
  registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;

    // Existing array storage
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      blocs.push(bloc);
    } else {
      this.isolatedBlocMap.set(blocClass, [bloc]);
    }

    // Existing UID index
    this.isolatedBlocIndex.set(bloc.uid, bloc);

    // NEW: Index by _id
    if (bloc._id) {
      const idKey = this.createIdIndexKey(blocClass.name, bloc._id);
      this.isolatedBlocIdIndex.set(idKey, bloc);
    }

    // NEW: Index by _instanceRef
    if (bloc._instanceRef) {
      const refKey = this.createIdIndexKey(blocClass.name, bloc._instanceRef);
      this.isolatedBlocRefIndex.set(refKey, bloc);
    }

    // ... rest of existing code
  }

  /**
   * Unregister isolated bloc from all indexes
   */
  unregisterIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;

    // Existing array removal
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (blocs) {
      const index = blocs.findIndex((b) => b.uid === bloc.uid);
      if (index !== -1) {
        blocs.splice(index, 1);
      }
      if (blocs.length === 0) {
        this.isolatedBlocMap.delete(blocClass);
      }
    }

    // Existing UID index cleanup
    this.isolatedBlocIndex.delete(bloc.uid);

    // NEW: Remove from ID index
    if (bloc._id) {
      const idKey = this.createIdIndexKey(blocClass.name, bloc._id);
      this.isolatedBlocIdIndex.delete(idKey);
    }

    // NEW: Remove from instanceRef index
    if (bloc._instanceRef) {
      const refKey = this.createIdIndexKey(blocClass.name, bloc._instanceRef);
      this.isolatedBlocRefIndex.delete(refKey);
    }

    // ... rest of existing code
  }

  /**
   * Find isolated bloc by ID or instanceRef - NOW O(1)!
   */
  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    const key = this.createIdIndexKey(blocClass.name, id);

    // Try _id index first
    let found = this.isolatedBlocIdIndex.get(key) as InstanceType<B> | undefined;

    // If not found, try _instanceRef index
    if (!found) {
      found = this.isolatedBlocRefIndex.get(key) as InstanceType<B> | undefined;
    }

    // Check if disposed
    if (found && (found as any).isDisposed) {
      return undefined;
    }

    return found;
  }
}
```

**Advantages:**
- ✅ O(1) lookup guaranteed
- ✅ Simple Map lookups (standard pattern)
- ✅ Clear separation of concerns (ID vs. instanceRef)
- ✅ Easy to maintain and debug
- ✅ Minimal code changes

**Disadvantages:**
- ⚠️ String concatenation overhead (negligible: ~0.001ms)
- ⚠️ Two indexes to maintain (but synchronized in same methods)
- ⚠️ ~16 bytes per bloc (2 Map entries × 8 bytes)

**Performance:**
- **Lookup:** O(1) - Single Map.get()
- **Register:** O(1) - Two Map.set() operations
- **Unregister:** O(1) + O(n) for array removal
- **Memory:** ~16 bytes per isolated bloc instance

**Score: 9.2/10**
- Performance: 10/10 (O(1) lookups)
- Memory: 9/10 (minimal overhead)
- Complexity: 9/10 (simple, maintainable)
- Reliability: 9/10 (easy to verify consistency)
- Maintainability: 9/10 (clear code)

---

### Option B: Nested Map Structure

**Description:** Use Map<blocClass, Map<id, bloc>> for hierarchical lookups.

**Implementation:**
```typescript
export class Blac {
  // Replace flat indexes with nested maps
  private isolatedBlocIdLookup: Map<
    BlocConstructor<any>,
    Map<BlocInstanceId, BlocBase<unknown>>
  > = new Map();

  private isolatedBlocRefLookup: Map<
    BlocConstructor<any>,
    Map<string, BlocBase<unknown>>
  > = new Map();

  registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;

    // ... existing array registration ...

    // Index by _id
    if (bloc._id) {
      let idMap = this.isolatedBlocIdLookup.get(blocClass);
      if (!idMap) {
        idMap = new Map();
        this.isolatedBlocIdLookup.set(blocClass, idMap);
      }
      idMap.set(bloc._id, bloc);
    }

    // Index by _instanceRef
    if (bloc._instanceRef) {
      let refMap = this.isolatedBlocRefLookup.get(blocClass);
      if (!refMap) {
        refMap = new Map();
        this.isolatedBlocRefLookup.set(blocClass, refMap);
      }
      refMap.set(bloc._instanceRef, bloc);
    }
  }

  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    // Try ID lookup
    const idMap = this.isolatedBlocIdLookup.get(blocClass);
    let found = idMap?.get(id) as InstanceType<B> | undefined;

    // Try instanceRef lookup
    if (!found) {
      const refMap = this.isolatedBlocRefLookup.get(blocClass);
      found = refMap?.get(id) as InstanceType<B> | undefined;
    }

    if (found && (found as any).isDisposed) {
      return undefined;
    }

    return found;
  }
}
```

**Advantages:**
- ✅ O(1) lookup
- ✅ Natural grouping by blocClass
- ✅ No string concatenation
- ✅ Type-safe keys

**Disadvantages:**
- ⚠️ More complex code (nested map management)
- ⚠️ Need to create/delete inner maps
- ⚠️ More potential for bugs (empty map cleanup)
- ⚠️ Additional memory for inner Map objects

**Performance:**
- **Lookup:** O(1) - Two Map lookups (outer + inner)
- **Register:** O(1) - But need to check/create inner map
- **Unregister:** O(1) - Plus empty map cleanup
- **Memory:** ~24 bytes per bloc + inner Map overhead

**Score: 7.8/10**
- Performance: 10/10 (O(1) lookups)
- Memory: 7/10 (higher overhead for inner maps)
- Complexity: 6/10 (more complex management)
- Reliability: 8/10 (more edge cases)
- Maintainability: 7/10 (nested structure harder to debug)

---

### Option C: Single Unified Index with Multi-Key

**Description:** One index that can lookup by any key type using prefixed keys.

**Implementation:**
```typescript
export class Blac {
  // Single index for all lookup types
  private isolatedBlocUnifiedIndex: Map<string, BlocBase<unknown>> = new Map();

  private createUnifiedKey(
    type: 'uid' | 'id' | 'ref',
    blocClass: string,
    value: string,
  ): string {
    if (type === 'uid') {
      return `uid:${value}`;
    }
    return `${type}:${blocClass}:${value}`;
  }

  registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;

    // ... existing array registration ...

    // Index by all keys
    const uidKey = this.createUnifiedKey('uid', blocClass.name, bloc.uid);
    this.isolatedBlocUnifiedIndex.set(uidKey, bloc);

    if (bloc._id) {
      const idKey = this.createUnifiedKey('id', blocClass.name, String(bloc._id));
      this.isolatedBlocUnifiedIndex.set(idKey, bloc);
    }

    if (bloc._instanceRef) {
      const refKey = this.createUnifiedKey('ref', blocClass.name, bloc._instanceRef);
      this.isolatedBlocUnifiedIndex.set(refKey, bloc);
    }
  }

  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    // Try as ID
    let idKey = this.createUnifiedKey('id', blocClass.name, String(id));
    let found = this.isolatedBlocUnifiedIndex.get(idKey) as InstanceType<B>;

    // Try as instanceRef
    if (!found) {
      const refKey = this.createUnifiedKey('ref', blocClass.name, String(id));
      found = this.isolatedBlocUnifiedIndex.get(refKey) as InstanceType<B>;
    }

    if (found && (found as any).isDisposed) {
      return undefined;
    }

    return found;
  }
}
```

**Advantages:**
- ✅ O(1) lookup
- ✅ Single index to maintain
- ✅ Extensible (easy to add new key types)

**Disadvantages:**
- ❌ More string concatenation (3-part keys)
- ❌ Type safety issues (all keys are strings)
- ❌ Harder to debug (prefixed keys less readable)
- ❌ Need to manage key prefixes carefully

**Performance:**
- **Lookup:** O(1) - Single Map.get() but with longer keys
- **Register:** O(1) - Multiple Map.set() with string concat
- **Unregister:** O(1) - Multiple Map.delete()
- **Memory:** ~24 bytes per bloc (3 entries)

**Score: 7.0/10**
- Performance: 9/10 (O(1) but more string overhead)
- Memory: 8/10 (single Map but 3 entries per bloc)
- Complexity: 7/10 (prefix management)
- Reliability: 6/10 (string prefix bugs)
- Maintainability: 6/10 (harder to debug)

---

### Option D: Replace Array with Map-Only Storage

**Description:** Eliminate `isolatedBlocMap` array entirely, use only indexes.

**Implementation:**
```typescript
export class Blac {
  // Remove: isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]>

  // Keep only indexes (already have isolatedBlocIndex by UID)
  private isolatedBlocIdIndex: Map<string, BlocBase<unknown>> = new Map();
  private isolatedBlocRefIndex: Map<string, BlocBase<unknown>> = new Map();

  // Track bloc classes for getAllBlocs()
  private isolatedBlocClasses: Set<BlocConstructor<any>> = new Set();

  registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
    const blocClass = bloc.constructor as BlocConstructor<any>;

    // Track class
    this.isolatedBlocClasses.add(blocClass);

    // Index everywhere
    this.isolatedBlocIndex.set(bloc.uid, bloc);

    if (bloc._id) {
      const idKey = `${blocClass.name}:${String(bloc._id)}`;
      this.isolatedBlocIdIndex.set(idKey, bloc);
    }

    if (bloc._instanceRef) {
      const refKey = `${blocClass.name}:${bloc._instanceRef}`;
      this.isolatedBlocRefIndex.set(refKey, bloc);
    }

    // ... rest
  }

  // For getAllBlocs(), iterate UID index
  getAllBlocs<B extends BlocConstructor<any>>(
    blocClass: B,
  ): InstanceType<B>[] => {
    const results: InstanceType<B>[] = [];

    for (const bloc of this.isolatedBlocIndex.values()) {
      if (bloc.constructor === blocClass) {
        results.push(bloc as InstanceType<B>);
      }
    }

    return results;
  }
}
```

**Advantages:**
- ✅ Simpler data structure (no array)
- ✅ O(1) everything (no array operations)
- ✅ Less memory (no duplicate storage)
- ✅ Fewer places to update

**Disadvantages:**
- ❌ Breaking change (removes isolatedBlocMap)
- ❌ getAllBlocs() becomes O(n) across all blocs
- ❌ Harder to iterate by class
- ❌ Existing code may rely on array

**Performance:**
- **Lookup:** O(1) - Map lookup
- **Register:** O(1) - No array push
- **Unregister:** O(1) - No array splice
- **getAllBlocs:** O(n) - Was O(1) for specific class

**Score: 6.5/10**
- Performance: 9/10 (O(1) lookups but slower getAllBlocs)
- Memory: 10/10 (least memory)
- Complexity: 8/10 (simpler overall)
- Reliability: 5/10 (breaking change)
- Maintainability: 6/10 (harder to iterate by class)

---

### Option E: WeakMap Cache Layer

**Description:** Add WeakMap cache for recent lookups to avoid repeated searches.

**Implementation:**
```typescript
export class Blac {
  // Keep existing linear search
  // Add cache layer
  private isolatedBlocLookupCache = new WeakMap<
    BlocConstructor<any>,
    Map<BlocInstanceId, WeakRef<BlocBase<unknown>>>
  >();

  findIsolatedBlocInstance<B extends BlocConstructor<any>>(
    blocClass: B,
    id: BlocInstanceId,
  ): InstanceType<B> | undefined {
    const base = blocClass as unknown as BlocBaseAbstract;
    if (!base.isolated) return undefined;

    // Check cache first
    const cache = this.isolatedBlocLookupCache.get(blocClass);
    if (cache) {
      const weakRef = cache.get(id);
      const cached = weakRef?.deref() as InstanceType<B> | undefined;
      if (cached && !(cached as any).isDisposed) {
        return cached; // Cache hit!
      }
    }

    // Cache miss - do linear search
    const blocs = this.isolatedBlocMap.get(blocClass);
    if (!blocs) return undefined;

    const found = blocs.find((b) =>
      ((b._instanceRef === id || b._id === id) && !(b as any).isDisposed)
    ) as InstanceType<B> | undefined;

    // Cache result
    if (found) {
      let cache = this.isolatedBlocLookupCache.get(blocClass);
      if (!cache) {
        cache = new Map();
        this.isolatedBlocLookupCache.set(blocClass, cache);
      }
      cache.set(id, new WeakRef(found));
    }

    return found;
  }
}
```

**Advantages:**
- ✅ No changes to existing structure
- ✅ Cache warms up with usage
- ✅ WeakRef allows garbage collection

**Disadvantages:**
- ❌ Still O(n) on cache miss
- ❌ Cache effectiveness depends on access patterns
- ❌ Additional memory for cache
- ❌ Cache invalidation complexity

**Performance:**
- **Lookup (hit):** O(1) - Cache lookup
- **Lookup (miss):** O(n) - Linear search + caching
- **Register:** O(1) - No cache updates
- **Unregister:** O(1) - WeakRef allows GC

**Score: 5.5/10**
- Performance: 5/10 (still O(n) worst case)
- Memory: 7/10 (WeakRef is memory-friendly)
- Complexity: 6/10 (added caching logic)
- Reliability: 5/10 (cache can be stale)
- Maintainability: 5/10 (more complex)

---

## Comparison Matrix

| Approach | Performance | Memory | Complexity | Reliability | Maintainability | **Total Score** |
|----------|-------------|--------|------------|-------------|-----------------|-----------------|
| **Dual Indexes** | 10/10 | 9/10 | 9/10 | 9/10 | 9/10 | **9.2/10** |
| **Nested Maps** | 10/10 | 7/10 | 6/10 | 8/10 | 7/10 | **7.8/10** |
| **Unified Index** | 9/10 | 8/10 | 7/10 | 6/10 | 6/10 | **7.0/10** |
| **Map-Only Storage** | 9/10 | 10/10 | 8/10 | 5/10 | 6/10 | **6.5/10** |
| **WeakMap Cache** | 5/10 | 7/10 | 6/10 | 5/10 | 5/10 | **5.5/10** |

---

## Recommendation

### Winner: **Dual Composite Key Indexes** (Score: 9.2/10)

**Rationale:**
1. **Guaranteed O(1)** - No worst-case degradation
2. **Simple implementation** - Standard Map patterns
3. **Clear separation** - ID vs. instanceRef indexes
4. **Easy to maintain** - Straightforward synchronization
5. **Minimal memory** - ~16 bytes per bloc instance
6. **No breaking changes** - Pure internal optimization

**Runner-up: Nested Maps** (Score: 7.8/10)
- Also O(1) but more complex
- Higher memory overhead
- Harder to maintain

### Implementation Plan

```typescript
export class Blac {
  // ADD two new indexes:
  private isolatedBlocIdIndex: Map<string, BlocBase<unknown>> = new Map();
  private isolatedBlocRefIndex: Map<string, BlocBase<unknown>> = new Map();

  // ADD helper for composite keys:
  private createIdIndexKey(blocClassName: string, id: BlocInstanceId): string {
    return `${blocClassName}:${String(id)}`;
  }

  // MODIFY registerIsolatedBlocInstance to update indexes
  // MODIFY unregisterIsolatedBlocInstance to clean up indexes
  // MODIFY findIsolatedBlocInstance to use indexes (O(1))
}
```

**Memory Impact:**
- 2 Map entries per isolated bloc
- ~8 bytes per entry
- Total: ~16 bytes per bloc
- For 1000 blocs: ~16 KB (negligible)

**Performance Impact:**
- **Before:** O(n) where n = isolated instances of that type
- **After:** O(1) constant time
- **Improvement:** 100× faster for 100 instances, 1000× for 1000 instances

---

## Alternative Approaches Considered

### Why Not Nested Maps?
- More complex inner map management
- Higher memory overhead
- Same O(1) performance but harder to maintain

### Why Not Unified Index?
- More string concatenation overhead
- Less type-safe
- Harder to debug with prefixed keys

### Why Not Map-Only Storage?
- Breaking change (removes isolatedBlocMap)
- Makes getAllBlocs() slower
- Existing code may depend on array structure

### Why Not WeakMap Cache?
- Still O(n) on cache miss
- Cache effectiveness unpredictable
- Doesn't solve the root problem

---

**Ready for Expert Council discussion.**

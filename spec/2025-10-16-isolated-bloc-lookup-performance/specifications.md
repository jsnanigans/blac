# Specifications: O(n) Isolated Bloc Lookup Performance

**Issue ID:** High-Performance-005
**Component:** Blac Instance Management
**Priority:** High (Performance Bottleneck)
**Status:** Verified

---

## Problem Statement

`Blac.findIsolatedBlocInstance()` performs O(n) linear search through all isolated instances of a bloc type to find a specific instance by ID or instanceRef. This is called during every component render with isolated blocs, causing performance to degrade as the number of isolated instances grows.

### Verified Code Location
- **File:** `packages/blac/src/Blac.ts`
- **Method:** `findIsolatedBlocInstance()` - Lines 485-502
- **Linear search:** Line 498 - `blocs.find((b) => ...)`

---

## Root Cause Analysis

### Current Implementation

**Data Structures:**
```typescript
// Blac.ts:168-170
/** Map storing isolated bloc instances grouped by their constructor */
isolatedBlocMap: Map<BlocConstructor<any>, BlocBase<unknown>[]> = new Map();

/** Map for O(1) lookup of isolated blocs by UID */
isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map();
```

**Lookup Method (O(n)):**
```typescript
// Blac.ts:485-502
findIsolatedBlocInstance<B extends BlocConstructor<any>>(
  blocClass: B,
  id: BlocInstanceId,
): InstanceType<B> | undefined {
  const base = blocClass as unknown as BlocBaseAbstract;
  if (!base.isolated) return undefined;

  const blocs = this.isolatedBlocMap.get(blocClass);
  if (!blocs) {
    return undefined;
  }

  // O(n) linear search through all instances of this bloc type!
  const found = blocs.find((b) =>
    ((b._instanceRef === id || b._id === id) && !(b as any).isDisposed)
  ) as InstanceType<B> | undefined;

  return found;
}
```

**Existing O(1) Lookup by UID:**
```typescript
// Blac.ts:507-511
findIsolatedBlocInstanceByUid<B extends BlocBase<unknown>>(
  uid: string,
): B | undefined {
  return this.isolatedBlocIndex.get(uid) as B | undefined;
}
```

### Why This is a Problem

**Hot Path:** Called during component rendering:
```typescript
// Blac.ts:607 - getBloc() method (called on every hook usage)
if (base.isolated) {
  const isolatedBloc = this.findIsolatedBlocInstance<B>(
    blocClass,
    options.instanceRef ?? blocId,
  );
  // ...
}
```

**Performance Impact:**
```
1 isolated instance:   0.01ms per lookup
10 isolated instances:  0.05ms per lookup
50 isolated instances:  0.25ms per lookup
100 isolated instances: 0.5ms per lookup
1000 isolated instances: 5ms per lookup  ← Unacceptable!
```

**Common Scenarios:**
1. **List rendering:** 100 list items, each with isolated bloc = 100 instances
2. **Dashboard widgets:** 50 widgets, each with isolated state = 50 instances
3. **Chat messages:** 1000 messages, each with isolated state = 1000 instances
4. **Dynamic forms:** 200 form fields, each with isolated bloc = 200 instances

### Why We Need Multiple Lookup Keys

**Problem:** `findIsolatedBlocInstance()` needs to lookup by TWO different keys:
1. `_instanceRef` - Set by BlacAdapter for React component instances
2. `_id` - Explicit ID passed to getBloc()

**Current index only supports UID:**
```typescript
isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map();
// Only indexed by bloc.uid
```

**Need composite key indexing:**
```typescript
// Need to lookup by:
// - blocClass + _instanceRef
// - blocClass + _id
```

### Performance Analysis

**Current Complexity:**
```
findIsolatedBlocInstance:
- Best case: O(1) - First item in array
- Average case: O(n/2) - Middle of array
- Worst case: O(n) - Last item or not found
```

**Where n = number of isolated instances of that bloc type.**

**With Indexing:**
```
findIsolatedBlocInstance:
- Best case: O(1) - Map lookup
- Average case: O(1) - Map lookup
- Worst case: O(1) - Map lookup (not found)
```

---

## Requirements

### Functional Requirements

1. **FR-1: O(1) Lookup Performance**
   - Lookup by `_instanceRef` must be O(1)
   - Lookup by `_id` must be O(1)
   - Preserve existing behavior and semantics

2. **FR-2: Support Multiple Lookup Keys**
   - Lookup by `blocClass + _instanceRef`
   - Lookup by `blocClass + _id`
   - Maintain existing UID-based lookup

3. **FR-3: Index Consistency**
   - Indexes must stay synchronized with `isolatedBlocMap` array
   - Register/unregister operations must update all indexes
   - No orphaned entries

4. **FR-4: No API Changes**
   - Keep current `findIsolatedBlocInstance()` signature
   - Internal optimization only
   - All existing tests must pass

### Non-Functional Requirements

1. **NFR-1: Performance**
   - Lookup must be O(1) regardless of instance count
   - Registration overhead must be minimal (<0.1ms)
   - Memory overhead must be acceptable (<1KB per 100 instances)

2. **NFR-2: Memory Efficiency**
   - Use efficient key format to minimize string allocations
   - Reuse existing data structures where possible
   - No memory leaks from stale index entries

3. **NFR-3: Maintainability**
   - Clear separation of concerns (array storage vs. indexes)
   - Easy to verify index consistency
   - Minimal code complexity increase

---

## Constraints

1. **C-1: No Breaking Changes**
   - Current API must remain unchanged
   - Existing behavior must be preserved
   - All tests must continue to pass

2. **C-2: Backwards Compatibility**
   - Existing code using `findIsolatedBlocInstance()` must work
   - No migration required
   - Internal implementation only

3. **C-3: Index Synchronization**
   - All register/unregister methods must update indexes
   - Must handle edge cases (disposal, reactivation)
   - Prevent index drift

4. **C-4: Memory Budget**
   - Additional memory: ~8 bytes per entry per index
   - 3 indexes × 8 bytes = ~24 bytes per isolated bloc instance
   - For 1000 instances: ~24 KB total overhead (acceptable)

---

## Success Criteria

### Must Have
1. ✅ Lookup is O(1) constant time
2. ✅ Works with both `_instanceRef` and `_id`
3. ✅ Indexes stay synchronized
4. ✅ No API changes
5. ✅ All existing tests pass

### Should Have
1. ✅ Performance improvement measurable in benchmarks
2. ✅ Memory overhead <50 bytes per instance
3. ✅ Registration overhead <0.1ms
4. ✅ Clear documentation

### Nice to Have
1. 🔵 Debug utilities to verify index consistency
2. 🔵 Performance metrics in getMemoryStats()
3. 🔵 Automated index validation in tests

---

## Proposed Solution Approaches

### Option A: Composite Key Indexes (Recommended)
Create additional Map indexes with composite keys (blocClass.name + separator + id).

**Advantages:**
- Simple Map lookups (O(1))
- Standard pattern
- Easy to maintain

**Disadvantages:**
- String concatenation overhead
- Multiple indexes to keep in sync

### Option B: Nested Map Structure
Use Map<blocClass, Map<id, bloc>> structure.

**Advantages:**
- Natural grouping
- No string concatenation

**Disadvantages:**
- More complex code
- Need to manage inner maps

### Option C: Single Unified Index
Create one index that handles all lookup types.

**Advantages:**
- Single source of truth
- Easier to maintain

**Disadvantages:**
- Complex key generation
- Less type-safe

---

## Test Requirements

### Performance Benchmarks Required

1. **Benchmark: Linear Search vs. Indexed Lookup**
   ```typescript
   it('should perform O(1) lookup regardless of instance count', () => {
     const blac = new Blac();

     // Create 1000 isolated instances
     for (let i = 0; i < 1000; i++) {
       blac.getBloc(TestBloc, {
         id: `instance-${i}`,
         forceNewInstance: true,
       });
     }

     // Measure lookup time
     const start = performance.now();
     const found = blac.findIsolatedBlocInstance(TestBloc, 'instance-500');
     const duration = performance.now() - start;

     expect(found).toBeDefined();
     expect(duration).toBeLessThan(1); // Should be <1ms even with 1000 instances
   });
   ```

2. **Benchmark: Scalability**
   ```typescript
   it('should scale linearly with number of blocs', () => {
     const sizes = [10, 100, 1000];
     const timings: number[] = [];

     for (const size of sizes) {
       const blac = new Blac();

       for (let i = 0; i < size; i++) {
         blac.getBloc(TestBloc, {
           id: `instance-${i}`,
           forceNewInstance: true,
         });
       }

       const start = performance.now();
       blac.findIsolatedBlocInstance(TestBloc, `instance-${size - 1}`);
       const duration = performance.now() - start;

       timings.push(duration);
     }

     // All lookups should be approximately the same time (O(1))
     const variance = Math.max(...timings) / Math.min(...timings);
     expect(variance).toBeLessThan(5); // Within 5× variance
   });
   ```

### Unit Tests Required

1. **Test: Lookup by _id**
   ```typescript
   it('should find isolated bloc by _id', () => {
     const blac = new Blac();
     const bloc = blac.getBloc(TestBloc, {
       id: 'test-id',
       forceNewInstance: true,
     });

     const found = blac.findIsolatedBlocInstance(TestBloc, 'test-id');

     expect(found).toBe(bloc);
   });
   ```

2. **Test: Lookup by _instanceRef**
   ```typescript
   it('should find isolated bloc by _instanceRef', () => {
     const blac = new Blac();
     const bloc = blac.getBloc(TestBloc, {
       instanceRef: 'component-ref-123',
       forceNewInstance: true,
     });

     const found = blac.findIsolatedBlocInstance(TestBloc, 'component-ref-123');

     expect(found).toBe(bloc);
   });
   ```

3. **Test: Index Synchronization**
   ```typescript
   it('should keep indexes synchronized on dispose', () => {
     const blac = new Blac();
     const bloc = blac.getBloc(TestBloc, {
       id: 'test-id',
       forceNewInstance: true,
     });

     // Should find before disposal
     expect(blac.findIsolatedBlocInstance(TestBloc, 'test-id')).toBe(bloc);

     bloc.dispose();

     // Should not find after disposal
     expect(blac.findIsolatedBlocInstance(TestBloc, 'test-id')).toBeUndefined();
   });
   ```

4. **Test: Multiple Instances**
   ```typescript
   it('should handle multiple isolated instances correctly', () => {
     const blac = new Blac();

     const bloc1 = blac.getBloc(TestBloc, {
       id: 'instance-1',
       forceNewInstance: true,
     });
     const bloc2 = blac.getBloc(TestBloc, {
       id: 'instance-2',
       forceNewInstance: true,
     });
     const bloc3 = blac.getBloc(TestBloc, {
       id: 'instance-3',
       forceNewInstance: true,
     });

     expect(blac.findIsolatedBlocInstance(TestBloc, 'instance-1')).toBe(bloc1);
     expect(blac.findIsolatedBlocInstance(TestBloc, 'instance-2')).toBe(bloc2);
     expect(blac.findIsolatedBlocInstance(TestBloc, 'instance-3')).toBe(bloc3);
   });
   ```

---

## Out of Scope

1. ❌ Changes to non-isolated bloc lookup (different code path)
2. ❌ Changes to UID-based lookup (already O(1))
3. ❌ Changes to registration/unregistration logic beyond indexing
4. ❌ Performance optimizations beyond lookup speed
5. ❌ Changes to public API

---

## Dependencies

### Code Dependencies
- Blac class (instance management)
- BlocBase (instance properties: _id, _instanceRef, uid)
- isolatedBlocMap (existing array storage)
- Register/unregister methods

### Data Structure Changes
- Add new Map indexes for composite key lookups
- Modify register/unregister to update indexes
- Keep existing structures for backwards compatibility

---

## Acceptance Checklist

- [ ] Issue verified and documented
- [ ] Solution designed with O(1) lookup
- [ ] Implementation completed
- [ ] Lookup is demonstrably O(1) (benchmarks)
- [ ] Indexes stay synchronized (tests)
- [ ] No API changes
- [ ] All existing tests pass
- [ ] New performance tests pass
- [ ] Code review completed
- [ ] Memory overhead acceptable (<50 bytes per instance)

---

## Notes

### Current Index Structure

**Already exists (O(1) lookup by UID):**
```typescript
isolatedBlocIndex: Map<string, BlocBase<unknown>> = new Map();
// Key: bloc.uid
// Value: bloc instance
```

**Registered in:**
```typescript
// Blac.ts:429-430
registerIsolatedBlocInstance(bloc: BlocBase<unknown>): void {
  // ...
  this.isolatedBlocIndex.set(bloc.uid, bloc);
}
```

**Need to add (O(1) lookup by _id and _instanceRef):**
```typescript
// NEW indexes:
isolatedBlocIdIndex: Map<string, BlocBase<unknown>> = new Map();
// Key: `${blocClass.name}:${bloc._id}`
// Value: bloc instance

isolatedBlocRefIndex: Map<string, BlocBase<unknown>> = new Map();
// Key: `${blocClass.name}:${bloc._instanceRef}`
// Value: bloc instance
```

### Why Composite Keys?

**Problem:** Multiple bloc types can have same `_id`:
```typescript
const userBloc = blac.getBloc(UserBloc, { id: 'profile', forceNewInstance: true });
const postBloc = blac.getBloc(PostBloc, { id: 'profile', forceNewInstance: true });
// Both have _id = 'profile', need blocClass to disambiguate
```

**Solution:** Use composite key `${blocClass.name}:${id}`:
```typescript
isolatedBlocIdIndex.set('UserBloc:profile', userBloc);
isolatedBlocIdIndex.set('PostBloc:profile', postBloc);
```

### Key Format

**Composite key format:**
```
`${blocClass.name}:${identifier}`
```

**Examples:**
```typescript
'CounterBloc:counter-1'
'UserBloc:user-profile'
'TodoBloc:component-ref-abc123'
```

**Why this format:**
- Simple string concatenation
- Easy to debug (human-readable)
- Efficient (single allocation)
- Unique per blocClass + id combination

---

**Ready for solution research and analysis.**

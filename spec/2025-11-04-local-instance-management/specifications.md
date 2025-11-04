# Specifications: Local Instance Management Refactor

**Feature:** Refactor StateContainer instance management from centralized registry to local per-class storage
**Date:** 2025-11-04
**Status:** Planning

## Overview

Refactor the BlaC StateContainer instance management architecture to move instance storage from the centralized `StateContainerRegistry` to local static storage on each StateContainer subclass. The registry becomes a lightweight coordination layer for cross-cutting concerns (lifecycle hooks, global operations) rather than the primary instance manager.

## Goals

1. **Simplify Architecture**: Each Bloc class naturally owns and manages its instances
2. **Improve Performance**: Direct Map access without string prefix matching (O(1) vs O(n))
3. **Reduce Coupling**: Cleaner separation between instance management and lifecycle hooks
4. **Maintain Plugin API**: Keep lifecycle event system for devtools integration
5. **Memory Optimization**: Optimize for typical workloads (< 100 instances per type)

## Requirements

### Functional Requirements

#### FR-1: Local Instance Storage
- Each StateContainer subclass maintains its own static `instances` Map
- Map structure: `Map<string, InstanceEntry>` where key is the instance key
- InstanceEntry contains: `{ instance: T, refCount: number }`
- Both shared and isolated instances are tracked in the local Map

#### FR-2: Instance Lifecycle APIs
All existing instance management APIs must work identically:
- `.resolve(key?, ...args)` - Get/create with ownership (increments ref count)
- `.get(key?)` - Borrow existing instance (throws if not found)
- `.getSafe(key?)` - Borrow existing instance (returns discriminated union)
- `.release(key?, forceDispose?)` - Release reference
- `.getAll()` - Return all instances as array
- `.forEach(callback)` - Iterate over all instances with disposal safety
- `.clear()` - Clear all instances of this type
- `.hasInstance(key?)` - Check instance existence
- `.getRefCount(key?)` - Get reference count

#### FR-3: Isolated Instance Handling
- Isolated instances (marked with `static isolated = true`) are tracked locally
- Isolated instances support ref counting (can have multiple owners)
- Isolated instances can have multiple subscribers (manual via low-level APIs)
- Isolated instances participate in `getAll()` and `forEach()` operations
- When ref count reaches 0, isolated instances are disposed and removed

#### FR-4: Global Registry as Coordination Layer
The registry maintains:
- **Type Registry**: WeakSet or Set of all StateContainer subclasses that exist
- **Lifecycle Event System**: `on(event, listener)` for plugin hooks
- **Global Operations**: `clearAllInstances()` to clear all Blocs

#### FR-5: Lifecycle Event Notifications
ALL instances (shared and isolated) must emit lifecycle events:
- `created` - When instance is constructed
- `stateChanged` - When state changes
- `eventAdded` - When event is added (Vertex only)
- `disposed` - When instance is disposed

These events are emitted to the global registry for plugin consumption.

#### FR-6: Clear Operations
- `CounterBloc.clear()` - Clears all instances of CounterBloc (including isolated)
- `StateContainer.clearAllInstances()` - Clears all instances across all types (including isolated)
- Both operations dispose instances and clear from Maps

#### FR-7: Type Registration
- Auto-registration when first instance is created
- Registry tracks which types exist via WeakSet/Set
- Static `isolated` property checked on constructor

### Non-Functional Requirements

#### NFR-1: Performance
- Instance lookup: O(1) - direct Map access by key
- `getAll()`: O(n) where n = instances of that type (not total instances)
- `forEach()`: O(n) where n = instances of that type
- Memory overhead: One Map per StateContainer subclass that has instances

#### NFR-2: Memory Optimization
- Optimize for typical workload: < 100 instances per type
- No premature optimization for thousands of instances
- WeakSet for type tracking to allow GC of unused classes

#### NFR-3: Test Isolation
- Global `clearAllInstances()` for test cleanup
- Each class can be cleared independently
- Registry can be replaced for test isolation (if needed)

### Edge Cases & Constraints

#### EC-1: Inheritance Handling
- Each subclass gets its own static `instances` Map
- `CounterBloc extends StateContainer` has separate Map from `UserBloc extends StateContainer`
- Base class methods work polymorphically on subclass Maps

#### EC-2: Concurrent Disposal During Iteration
- `forEach()` must skip instances that become disposed during iteration
- Check `instance.isDisposed` before each callback invocation

#### EC-3: keepAlive Instances
- Instances with `static keepAlive = true` are never auto-disposed
- Ref count can go to 0, but instance persists until manual disposal

#### EC-4: Duplicate Registration
- Attempting to register same type twice should throw (existing behavior)
- Auto-registration on first instance creation (existing behavior)

## Success Criteria

1. ✅ All 358 existing tests pass
2. ✅ DevTools integration continues to work (lifecycle events)
3. ✅ Performance improvement measurable in `getAll()`/`forEach()` operations
4. ✅ No regression in memory usage for typical workloads
5. ✅ Public API remains unchanged (no breaking changes to user code)
6. ✅ Migration path clear for plugins using registry

## Out of Scope

- Changing the public API surface of StateContainer
- Adding new instance management features
- Performance optimization for 1000+ instances (not typical)
- Distributed or multi-threaded instance management

## Assumptions

1. Typical workload: < 100 instances per Bloc type
2. `getAll()`/`forEach()` are not hot paths (infrequent operations)
3. Plugin system (DevTools) is critical and must be preserved
4. Test suite coverage is comprehensive and will catch regressions
5. No external consumers depend on StateContainerRegistry internals

## Dependencies

- No new external dependencies
- Requires updating internal imports and structure
- DevTools plugin must be tested after refactor

## Risks

1. **Risk**: Subtle bugs in ref counting or disposal logic
   - **Mitigation**: Comprehensive test coverage, careful code review

2. **Risk**: Plugin API changes break devtools integration
   - **Mitigation**: Keep lifecycle event API identical, test integration

3. **Risk**: Static Map per class causes memory issues
   - **Mitigation**: Profile memory usage, optimize if needed

4. **Risk**: Test isolation breaks with new architecture
   - **Mitigation**: Provide robust `clearAllInstances()` utility

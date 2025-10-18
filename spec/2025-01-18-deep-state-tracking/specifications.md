# Deep State Tracking - Specifications

**Feature**: Deep/Nested State Dependency Tracking for BlaC React Integration
**Date**: 2025-01-18
**Status**: Specification Phase

## Problem Statement

The current proxy-based dependency tracking system (V2) only tracks **top-level state properties**. This leads to unnecessary re-renders when nested state changes.

### Current Limitation Example

```typescript
interface State {
  profile: {
    name: string;
    address: {
      city: string;
      country: string;
    }
  }
}

function Component() {
  const [state] = useBloc(UserBloc);
  return <div>{state.profile.address.city}</div>; // Only accesses city
}
```

**Current Behavior (V2)**:
- Accessing `state.profile.address.city` tracks only `"profile"` (top-level)
- When `state.profile.name` changes, component re-renders unnecessarily
- The entire `profile` object reference changes due to immutability

**Desired Behavior**:
- Accessing `state.profile.address.city` tracks `"profile.address.city"`
- Only re-render when `city` changes, not when `name` or `country` changes

## Goals

1. **Precision**: Track property access at arbitrary nesting depths
2. **Performance**: Eliminate unnecessary re-renders from unrelated nested property changes
3. **Transparency**: No API changes for end users
4. **Efficiency**: Minimize proxy overhead through smart caching

## Requirements

### 1. Path Tracking

**REQ-1.1**: Full Path Storage
- Store complete dot-notation paths: `"profile.address.city"`
- Not just top-level: `"profile"`
- Not partial paths: `"address.city"`

**REQ-1.2**: Path Format
- Object properties: `"user.profile.name"`
- Array indices: `"items.0.title"`, `"items.1.title"`
- Nested arrays: `"matrix.0.1"` (first row, second column)
- Mixed: `"users.0.address.city"`

**REQ-1.3**: Unlimited Depth
- No artificial depth limits
- Support arbitrary nesting levels
- Performance is prioritized over memory (proxy overhead is minimal vs re-render cost)

### 2. Proxy Creation Strategy

**REQ-2.1**: On-Demand Creation
- Create nested proxies **lazily** when properties are accessed
- Don't pre-create proxies for all nested objects upfront
- Only create proxies when code actually accesses nested properties

**REQ-2.2**: Caching with WeakMap
- Cache created proxies to avoid recreating them
- Use **WeakMap** for automatic garbage collection
- Key structure: `WeakMap<target object, WeakMap<consumerRef, Proxy>>`
- Cache survives across renders for same state object reference

**REQ-2.3**: Cache Invalidation
- When state object reference changes, cache naturally invalidates (new WeakMap key)
- No manual cache clearing needed (immutability ensures correctness)

### 3. Change Detection

**REQ-3.1**: Precise Path Matching
- Only notify subscriptions tracking the **exact changed path**
- `"profile.address.city"` change → notify subscribers of `"profile.address.city"`
- Do NOT notify subscribers of `"profile.address.country"`
- Do NOT notify subscribers of just `"profile"` (unless they accessed only that)

**REQ-3.2**: Deep Path Comparison
- Compare paths at all nesting levels
- Use immutability for efficient change detection
- If `oldState.profile.address !== newState.profile.address`, check which properties inside changed

**REQ-3.3**: Array Handling
- Treat array indices as regular properties
- `items[0]` → path `"items.0"`
- Track individual array element access
- Array method calls (map, filter, etc.) track the array itself, not indices

### 4. Integration Points

**REQ-4.1**: ProxyFactory Changes
- Modify `createStateProxy` to return nested proxies on property access
- Maintain proxy cache per target+consumer combination
- Track the current path during nested proxy creation

**REQ-4.2**: BlacAdapter Changes
- `trackAccess` must accept and store full paths
- Path tracking remains the same (already supports arbitrary paths)
- No changes to two-phase tracking (resetTracking/commitTracking)

**REQ-4.3**: SubscriptionManager Changes
- `getChangedPaths` must perform deep comparison, not just top-level
- Build full path strings during recursive comparison
- `shouldNotifyForPaths` uses exact path matching (already does this)

### 5. Edge Cases

**REQ-5.1**: Primitive Values
- Accessing `state.count` (number) tracks `"count"`, returns the value
- No proxy creation for primitives (numbers, strings, booleans, null, undefined)

**REQ-5.2**: Non-Object Values
- `state.user.name` where `name` is a string → track `"user.name"`, return string
- `state.items.length` where `length` is a number → track `"items.length"`, return number

**REQ-5.3**: Symbols
- Symbols are not tracked (consistent with current behavior)
- `constructor` and other special properties return raw values

**REQ-5.4**: Functions/Methods
- Functions in state are not proxied
- Accessing `state.user.getName` tracks `"user.getName"`, returns function

**REQ-5.5**: Null/Undefined
- `state.user` is null → track `"user"`, return null (no nested proxy)
- `state.user.profile` when `user` is null → JavaScript error (expected behavior)

**REQ-5.6**: Circular References
- Not expected in immutable state patterns
- If present, WeakMap naturally handles them (same object → same proxy)

### 6. Memory Management

**REQ-6.1**: WeakMap for Automatic GC
- Use WeakMap to hold proxy cache
- When state object is garbage collected, proxies are too
- When component unmounts, consumer ref allows GC of cached proxies

**REQ-6.2**: No Memory Leaks
- Proxies don't prevent GC of state objects
- Cache structure allows GC when either state or consumer is released

**REQ-6.3**: Performance Characteristics
- Proxy creation: O(1) per access (amortized with caching)
- Cache lookup: O(1) via WeakMap
- Memory: O(accessed paths × consumers) - only created on demand

### 7. Backward Compatibility

**REQ-7.1**: No Compatibility Requirement
- This is a breaking change from V2 (acceptable per user requirements)
- Replaces current top-level-only tracking
- API surface remains identical (implementation change only)

**REQ-7.2**: Configuration
- Works with existing `Blac.config.proxyDependencyTracking` flag
- When `true`: use deep tracking (new behavior)
- When `false`: no proxies at all (existing behavior)

### 8. Testing Requirements

**REQ-8.1**: Unit Tests
- Nested object access tracking
- Array index tracking
- Mixed nested arrays and objects
- Path change detection accuracy
- Cache effectiveness
- Memory leak prevention

**REQ-8.2**: Integration Tests
- React component re-render precision
- Multiple nesting levels (3+)
- Dynamic dependency changes
- StrictMode compatibility
- Concurrent mode compatibility

## Success Criteria

1. ✅ Component accessing `state.profile.address.city` only re-renders when `city` changes
2. ✅ Component accessing `state.items[0].name` only re-renders when that specific item's name changes
3. ✅ No re-renders when unrelated nested properties change
4. ✅ Existing tests pass (or updated to reflect new precise behavior)
5. ✅ No memory leaks in long-running applications
6. ✅ Performance improvement: fewer re-renders > proxy overhead cost

## Non-Goals

- Backward compatibility with V2 top-level tracking
- Support for non-immutable state patterns
- Tracking mutations (not applicable to immutable state)
- Optimization for mutable state changes

## Constraints

- Must work with React 18+ and useSyncExternalStore
- Must maintain immutability requirement (state changes create new objects)
- Must work with React StrictMode (double render) and Concurrent Mode
- Must integrate with existing two-phase tracking system (resetTracking/commitTracking)

## Dependencies

- Existing: `ProxyFactory.ts` - needs modification for nested proxy creation
- Existing: `BlacAdapter.ts` - path tracking already supports full paths
- Existing: `SubscriptionManager.ts` - needs deep path comparison in `getChangedPaths`
- Existing: WeakMap support (available in all modern browsers/Node.js)

## Open Questions

None - all clarifications received from user.

## Assumptions

1. State follows immutable patterns (new objects on change)
2. State is serializable object structures (no classes, functions as data)
3. Proxy support is available (target environment)
4. React 18+ with useSyncExternalStore
5. Components access state in a consistent pattern during render

## Risk Assessment

**Low Risk**:
- Proxy API is well-supported and performant
- WeakMap provides automatic memory management
- On-demand creation limits proxy count

**Medium Risk**:
- Deep object comparison in `getChangedPaths` could be expensive for large states
- Mitigation: Immutability means reference equality checks are fast

**Mitigation Strategies**:
- Benchmark against current V2 to ensure net performance gain
- Profile memory usage with realistic state trees
- Add performance tests for deep nesting scenarios

# Getter Cache Warming - Specifications

**Date:** 2025-10-18
**Feature:** Eliminate unnecessary re-renders by warming getter cache during initial tracking

---

## Problem Statement

Currently, class getters in BlaC cause **one unnecessary re-render** after the initial render when using automatic proxy-based dependency tracking. This occurs because:

1. **Initial render**: Getter is accessed and tracked as a dependency, but its value is NOT cached yet
2. **First state change** (any state change): `checkGetterChanged()` has no cached entry → treats it as "first access" → returns `true` → unnecessary re-render
3. **Subsequent changes**: Cache exists → value-based comparison works correctly

### Example Scenario

```typescript
class TestCubit extends Cubit<{count: number, name: string}> {
  get doubleCount(): number {
    return this.state.count * 2;  // Only depends on 'count'
  }
}

function Component() {
  const [state, cubit] = useBloc(TestCubit);
  return <div>{cubit.doubleCount}</div>;  // Renders: 0
}

// Later...
cubit.updateName('Alice');  // Changes 'name', NOT 'count'
// Expected: No re-render (doubleCount value unchanged: 0 → 0)
// Actual: Re-renders once (cache miss treated as "first access")
// Future: No re-render (cache now populated, value comparison works)
```

---

## Requirements

### Functional Requirements

**FR1**: Getter values must be cached during the initial tracking phase (during `useBloc` render)

**FR2**: Cache warming must apply to **all getter values** (primitives, objects, arrays, etc.)

**FR3**: If a getter throws an error during render, allow it to propagate (current behavior) - do NOT cache errors during tracking

**FR4**: Cache warming must ONLY apply when using **automatic proxy-based dependency tracking** (`isUsingDependencies === false`)

**FR5**: Cache warming must NOT apply when using **manual dependency arrays** (`isUsingDependencies === true`)

**FR6**: The implementation must preserve existing fallback behavior if cache warming fails

### Non-Functional Requirements

**NFR1**: **Performance** - Optimize to avoid unnecessary operations:
- Only store getter values that are actually tracked as dependencies
- Check if cache already exists before populating
- Reuse values already captured during proxy access

**NFR2**: **Correctness** - Cache must accurately reflect the value that was rendered

**NFR3**: **Safety** - System must degrade gracefully if cache transfer fails (fall back to current "cache on first check" behavior)

**NFR4**: **Simplicity** - Implementation should be straightforward and maintainable

---

## Constraints

### Technical Constraints

**TC1**: Must work within existing React render lifecycle and hooks (`useBloc`, `useEffect`)

**TC2**: Must integrate with existing `BlacAdapter` tracking system (`resetTracking()`, `commitTracking()`)

**TC3**: Must work with existing `SubscriptionManager` getter cache structure

**TC4**: Getters are evaluated during render via `ProxyFactory.createBlocProxy()` - values already available

**TC5**: All operations must be synchronous (no async/await in tracking/commit phase)

### Behavioral Constraints

**BC1**: Must NOT change behavior for manual dependency arrays mode

**BC2**: Must NOT cache getter errors during tracking (errors should propagate during render)

**BC3**: Must NOT break existing tests that rely on getter behavior

**BC4**: Must maintain backward compatibility with existing `checkGetterChanged()` logic

---

## Success Criteria

### Primary Success Criteria

**SC1**: All 7 failing tests in `blac-react` must pass after implementation

**SC2**: Zero unnecessary re-renders when unrelated state properties change

**SC3**: Getter cache must be populated after first render, before first state change

### Secondary Success Criteria

**SC4**: No performance regression in existing tests

**SC5**: Code remains maintainable and well-documented

**SC6**: Implementation adds minimal complexity to existing architecture

---

## Out of Scope

The following are explicitly OUT OF SCOPE for this feature:

1. **Transitive dependency tracking** - Not attempting to track which state properties getters depend on
2. **Getter dependency optimization** - Getters will still be checked on every state change (known limitation)
3. **Error caching during tracking** - Errors throw during render, only cached during `checkGetterChanged`
4. **Manual dependencies mode** - Cache warming only applies to proxy-based tracking
5. **Backward compatibility** - Not concerned with older versions or breaking changes

---

## Key Implementation Points

Based on analysis and user requirements:

1. **Where to capture**: Already happens in `ProxyFactory.createBlocProxy` - getter is evaluated and value available
2. **Where to store temporarily**: `BlacAdapter` instance (has temporary storage for `pendingDependencies`)
3. **When to transfer**: During `commitTracking()` after dependencies are committed
4. **What to cache**: All getter values (not just primitives)
5. **When to clear**: During `resetTracking()` at start of each render
6. **Optimization checks**:
   - Only cache if getter is actually in the committed dependencies
   - Only cache if not already in subscription's getter cache
   - Skip entire mechanism if using manual dependencies

---

## References

- **Issue**: 7 failing tests in `blac-react` due to getter cache invalidation
- **Root cause**: `invalidateGetterCache()` was clearing caches (now fixed to be no-op)
- **Remaining issue**: Cache miss on first check after initial render
- **Related files**:
  - `/packages/blac/src/adapter/BlacAdapter.ts` - Tracking coordination
  - `/packages/blac/src/adapter/ProxyFactory.ts` - Getter evaluation
  - `/packages/blac/src/subscription/SubscriptionManager.ts` - Cache management
  - `/packages/blac/src/subscription/types.ts` - Type definitions

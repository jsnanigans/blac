# Dependency Tracking v2 - Specifications

**Feature:** New dependency tracking system for BlaC state management
**Version:** 2.0
**Date:** 2025-10-10
**Status:** Draft - Awaiting User Confirmation

---

## Executive Summary

Design and implement a new dependency tracking system that automatically detects which state properties and class getters a React component uses, ensuring components only rerender when their actual dependencies change. The system must be robust, extremely fast, and handle complex scenarios like nested properties and computed getters.

---

## Goals

### Primary Goals

1. **Precision:** Components rerender **only** when accessed properties/getters actually change
2. **Performance:** Minimal overhead - make it as fast as technically feasible
3. **Robustness:** Handle edge cases gracefully without silent failures
4. **Developer Experience:** Automatic tracking with minimal developer intervention

### Success Criteria

- ✅ Component accessing `state.count` does NOT rerender when `state.name` changes
- ✅ Component accessing `cubit.doubleCount` (getter using `state.count`) does NOT rerender when `state.name` changes
- ✅ Component accessing `state.user` (or `state.user.name`) DOES rerender when any property of `state.user` changes (top-level tracking)
- ✅ Component accessing `state.items` (or `state.items[0]`) DOES rerender when array changes (top-level tracking)
- ✅ Dependencies are fully dynamic - cleared and re-tracked on every render
- ✅ Tracking overhead is sub-millisecond per component per render
- ✅ Handles 100+ concurrent subscriptions efficiently
- ✅ Works with React 18 concurrent features and Strict Mode

---

## Requirements

### Functional Requirements

#### FR-1: State Property Tracking
**Priority:** P0 (Critical)

- **Description:** Track which state properties a component accesses during render
- **Behavior:** Use Proxy-based approach (current) or alternative (e.g., getter modification)
- **Examples:**
  ```typescript
  const [state] = useBloc(MyCubit);
  return <div>{state.count}</div>; // Tracks: state.count
  ```

#### FR-2: Top-Level Property Tracking Only
**Priority:** P0 (Critical)

- **Description:** Track only top-level state properties (shallow tracking)
- **Behavior:** Track the root property accessed, not nested paths
- **Examples:**
  ```typescript
  const [state] = useBloc(MyCubit);
  return <div>{state.user.name}</div>; // Tracks: state.user (NOT state.user.name)
  return <div>{state.items[0]}</div>; // Tracks: state.items (NOT state.items[0])
  return <div>{state.items.length}</div>; // Tracks: state.items (NOT state.items.length)
  ```
- **Rationale:** Simplifies implementation, reduces overhead, sufficient for most use cases

#### FR-3: Class Getter Dependency Tracking (Top-Level Only)
**Priority:** P0 (Critical)

- **Description:** Track which top-level state properties a class getter depends on
- **Behavior:** **Option D** - Detect that if `getter` uses `state.count`, track `count` as dependency (top-level only)
- **Implementation Approach:** Proxy or alternative method to capture state access within getter execution
- **Examples:**
  ```typescript
  class MyCubit extends Cubit<{count: number, name: string}> {
    get doubleCount() {
      return this.state.count * 2; // Internally accesses state.count
    }

    get userName() {
      return this.state.user.name; // Internally accesses state.user (track 'user', not 'user.name')
    }
  }

  // In component:
  const [state, cubit] = useBloc(MyCubit);
  return <div>{cubit.doubleCount}</div>; // Should track: state.count

  // When state.name changes -> NO rerender ✓
  // When state.count changes -> YES rerender ✓

  // When accessing nested through getter:
  return <div>{cubit.userName}</div>; // Tracks: state.user (top-level)
  // When state.user.email changes -> YES rerender (entire user object changed reference)
  ```

#### FR-4: Manual Dependencies Override
**Priority:** P1 (High)

- **Description:** Allow manual dependency specification that overrides automatic tracking
- **Behavior:** `useBloc(Cubit, { dependencies: (c) => [...] })` disables automatic tracking for that component
- **Examples:**
  ```typescript
  const [state, cubit] = useBloc(MyCubit, {
    dependencies: (c) => [c.state.count, c.isEven] // Manual control
  });
  ```

#### FR-5: Array and Collection Handling (Top-Level)
**Priority:** P1 (High)

- **Description:** Track array access at top-level only
- **Behavior:**
  - Accessing `state.items.length` → tracks `items`
  - Accessing `state.items[0]` → tracks `items`
  - Accessing `state.items.map(...)` → tracks `items`
  - Any access to array property or methods → tracks the array itself

#### FR-6: Fully Dynamic Dependency Tracking
**Priority:** P0 (Critical)

- **Description:** Dependencies are **completely reset and re-tracked on every React render cycle**
- **Behavior:**
  - Before render: Clear all tracked dependencies for this component
  - During render: Track every property/getter accessed
  - After render: Only these newly-tracked dependencies are monitored
  - If a property was tracked previously but NOT accessed in current render, it's no longer tracked
- **Examples:**
  ```typescript
  const [state] = useBloc(MyCubit);
  return (
    <div>
      {state.count} {/* Always tracked */}
      {state.count > 5 && <span>{state.name}</span>} {/* Tracked only when count > 5 */}
    </div>
  );

  // Render 1 (count = 3): Tracks [count] only
  // Render 2 (count = 6): Tracks [count, name] (name added)
  // Render 3 (count = 4): Tracks [count] only (name removed)
  ```
- **Implementation:** This is what `BlacAdapter.resetTracking()` attempts to do currently, but needs to work correctly

#### FR-7: Computed Getter Chains (Top-Level Tracking)
**Priority:** P2 (Medium)

- **Description:** Handle getters that call other getters
- **Behavior:** Track all top-level state properties accessed through the chain
- **Examples:**
  ```typescript
  class MyCubit extends Cubit<State> {
    get doubled() { return this.state.count * 2; }
    get tripled() { return this.doubled * 1.5; } // Uses another getter
  }
  // Accessing cubit.tripled should track state.count (top-level)
  // Note: The getter 'tripled' calls 'doubled' which accesses state.count
  ```

### Non-Functional Requirements

#### NFR-1: Performance
**Priority:** P0 (Critical)

- **Overhead:** Sub-millisecond tracking per render
- **Scalability:** Support 100+ concurrent component subscriptions
- **Memory:** Minimal footprint (<1KB per component subscription)
- **Target:** Make it as fast as technically feasible given requirements

#### NFR-2: Robustness
**Priority:** P0 (Critical)

- **Error Handling:** Graceful degradation on tracking failures (log warning, fall back to full rerender)
- **Edge Cases:** Handle getters with side effects, circular dependencies, async operations
- **Stability:** No crashes or memory leaks under normal or stress conditions

#### NFR-3: React Integration
**Priority:** P0 (Critical)

- **React 18:** Work with concurrent features (useTransition, useDeferredValue, Suspense)
- **Strict Mode:** Handle double mounting correctly
- **SSR:** Support server-side rendering (or gracefully degrade)

#### NFR-4: Developer Experience
**Priority:** P1 (High)

- **Automatic:** Tracking happens automatically without developer intervention
- **Debugging:** Log tracking activity when debug mode enabled
- **Errors:** Helpful error messages when tracking fails

#### NFR-5: Maintainability
**Priority:** P1 (High)

- **Code Quality:** Clean, well-documented implementation
- **Testability:** Comprehensive test coverage
- **No External Deps:** Use only React and standard JavaScript APIs

---

## Constraints

### Technical Constraints

1. **Integration:** Must work with existing BlaC architecture (Blac, BlocBase, SubscriptionManager, BlacAdapter)
2. **React Hook:** Must integrate with `useBloc` hook
3. **Patterns:** Must support both Cubit and Bloc patterns
4. **Instance Types:** Must handle shared, isolated, and persistent blocs
5. **No External Libraries:** Cannot add external dependencies beyond React

### Design Constraints

1. **Breaking Changes Allowed:** No need for backward compatibility (can be v3.0)
2. **Manual Override:** Must preserve `dependencies` option as escape hatch
3. **Memory Management:** Must use WeakMap/WeakRef for subscription tracking

---

## Current System Issues

### Critical Bugs (Must Fix)

**Bug #1: Class Getter False Positives**
- **Issue:** Getters trigger rerenders on ANY state change
- **Location:** `SubscriptionManager.shouldNotifyForPaths()` lines 288-295
- **Impact:** Defeats purpose of dependency tracking

**Bug #2: Deep Tracking Complexity (Not Needed)**
- **Issue:** Current system attempts to track nested paths like `state.user.name`
- **Clarification:** We only need top-level tracking (`state.user`)
- **Impact:** Over-complicated implementation for no benefit

### Architectural Issues

**Issue #1: Overly Conservative Approach**
- Current code comments admit it "can't determine which state properties the getter depends on"
- This was a known limitation that needs solving

**Issue #2: No Getter Execution Context**
- No mechanism to capture state accesses during getter execution
- Proxy tracking happens after getter returns, not during

---

## Out of Scope

The following are explicitly **out of scope** for this feature:

1. **Optimistic Updates:** Transaction/rollback mechanisms
2. **Time Travel:** Undo/redo state history
3. **Devtools Integration:** Chrome extension (future consideration)
4. **Cross-Bloc Dependencies:** Tracking dependencies across multiple bloc instances
5. **Async Getters:** Support for getters that return Promises (not supported in JS anyway)

---

## Open Questions

### Q1: State Tracking Implementation
**Question:** Should we use Proxy (current) or modify object getters?

**Options:**
- **A: Proxy (Current):** Intercept property access with Proxy wrapper
- **B: Getter Modification:** Modify object property descriptors to add tracking

**Decision:** TBD - to be researched

---

### Q2: Getter Tracking Strategy
**Question:** How should we capture state dependencies within getter execution?

**Options:**
- **A: Execution Context:** Create tracking context, run getter with proxied state, capture accesses
- **B: Static Analysis:** Parse getter function body (fragile, doesn't work with compiled code)
- **C: Getter Proxying:** Proxy the bloc instance, track state accesses when getter runs

**Decision:** TBD - to be researched

---

### Q3: Array Element Tracking
**Question:** Should `state.items[0]` track the specific index or the whole array?

**Decision:** ✅ **RESOLVED** - Track whole array only (top-level)
- `state.items[0]` → tracks `items`
- `state.items.length` → tracks `items`
- Any array access → tracks the array itself

---

### Q4: Performance vs Precision Trade-offs
**Question:** Where should we optimize for performance vs tracking precision?

**Considerations:**
- Tracking nested objects deeply has overhead
- Getter execution for dependency discovery has overhead
- Cache invalidation complexity vs recomputation

**Decision:** TBD - to be analyzed in discussion

---

## Dependencies

### Technical Dependencies
- React 18+
- TypeScript 5+
- Existing BlaC core (`@blac/core` v2.0+)

### Documentation Dependencies
- Must document new tracking behavior
- Must provide migration guide if breaking changes
- Must add debugging guide

---

## Testing Requirements

### Unit Tests
- Track primitive state properties
- Track nested object properties
- Track array properties and indices
- Track class getters with state dependencies
- Track getter chains (computed calling computed)
- Handle conditional property access
- Handle manual dependencies override

### Integration Tests
- Work with React 18 concurrent features
- Work with React Strict Mode (double mounting)
- Handle rapid state changes
- Handle multiple components subscribing to same bloc
- Handle component unmount/remount cycles

### Performance Tests
- Benchmark tracking overhead per render
- Benchmark with 100+ concurrent subscriptions
- Benchmark deep nested object tracking
- Benchmark getter execution overhead
- Compare to current implementation baseline

---

## Success Metrics

### Correctness Metrics
- 0 false negatives (missed rerenders)
- <1% false positives (unnecessary rerenders in complex scenarios)
- 100% test coverage for core tracking logic

### Performance Metrics
- Tracking overhead: <1ms per component per render (target <0.5ms)
- Memory overhead: <1KB per component subscription
- Subscription notification: <0.1ms per subscription
- Scales linearly with number of tracked dependencies (O(n))

### Quality Metrics
- Code coverage: >90%
- TypeScript strict mode: No errors
- ESLint: No errors or warnings
- No memory leaks under stress testing

---

## Implementation Phases

### Phase 1: Research & Design (Current)
- ✅ Identify current bugs
- ✅ Create specifications
- ⏳ Research implementation approaches
- ⏳ Design solution architecture
- ⏳ Create recommendation

### Phase 2: Core Implementation
- Implement state property tracking (Proxy or alternative)
- Implement class getter dependency tracking
- Implement nested property tracking
- Add comprehensive unit tests

### Phase 3: Integration & Optimization
- Integrate with existing BlacAdapter/SubscriptionManager
- Optimize performance hotspots
- Add performance benchmarks
- Handle edge cases

### Phase 4: Testing & Documentation
- Comprehensive integration tests
- React integration tests (concurrent, strict mode)
- Performance tests and benchmarks
- Documentation and examples

---

## Related Documents

- `/reports/dependency-tracking-bug.md` - Current bug analysis
- `/packages/blac-react/src/__tests__/dependency-tracking.test.tsx` - Test suite proving bugs
- `/packages/blac/src/subscription/SubscriptionManager.ts` - Current implementation
- `/packages/blac/src/adapter/ProxyFactory.ts` - Current proxy implementation

---

## Approval

**Status:** Draft - Awaiting User Confirmation

**Please Review:**
1. Are all requirements captured correctly?
2. Are priorities (P0/P1/P2) aligned with your expectations?
3. Are there any missing requirements or constraints?
4. Should any out-of-scope items be in-scope?
5. Any other concerns or additions?

Once confirmed, I'll proceed to the research phase.

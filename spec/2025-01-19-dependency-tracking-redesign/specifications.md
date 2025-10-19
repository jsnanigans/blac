# Dependency Tracking System - Specifications

**Date**: 2025-01-19
**Status**: Requirements Gathering Complete
**Priority**: Critical - Current implementation has failing tests

## Executive Summary

The BlaC state management library's dependency tracking system has fundamental architectural and correctness issues preventing proper getter-based dependency tracking. This specification covers a comprehensive review and redesign of the entire dependency tracking system (state + getters + subscriptions).

## Problem Statement

### Current Failing Behavior

**Test Case**: Component accesses `cubit.fullName` getter (which reads `state.firstName` + `state.lastName`)

**Expected**:
- Update `firstName` → Re-render ✅ (fullName changed)
- Update `lastName` → Re-render ✅ (fullName changed)
- Update `age` → NO re-render ✅ (fullName unchanged)

**Actual**:
- Update `firstName` → Re-render ✅
- Update `lastName` → Re-render ✅
- Update `age` → Re-render ❌ (FALSE POSITIVE)

**Impact**: 5 out of 197 tests failing - getter dependency tracking completely broken

### Root Cause Hypothesis

After investigation, the getter cache is not synchronizing properly across render cycles. Multiple attempted fixes failed:
1. Removed overly aggressive cache invalidation
2. Fixed cache warming to always update
3. Changed "no cache" behavior
4. Removed leaf path filtering

Despite all fixes, tests still fail, indicating a fundamental architectural issue.

## Requirements

### Functional Requirements

#### FR1: Getter Dependency Tracking
- **FR1.1**: When a component accesses a Bloc/Cubit getter during render, the system SHALL track that dependency
- **FR1.2**: On any state change, the system SHALL re-execute all tracked getters
- **FR1.3**: If a getter's return value changes (by Object.is comparison), the system SHALL trigger a re-render
- **FR1.4**: If a getter's return value is unchanged, the system SHALL NOT trigger a re-render
- **FR1.5**: Getter tracking SHALL work independently from state proxy dependency tracking

#### FR2: State Proxy Dependency Tracking
- **FR2.1**: When a component accesses state properties (e.g., `state.firstName`), the system SHALL track those paths
- **FR2.2**: On state change, if any tracked state path changed, the system SHALL trigger a re-render
- **FR2.3**: Deep/nested state access SHALL be tracked (e.g., `state.user.profile.email`)
- **FR2.4**: Array and object method access SHALL track the parent (e.g., `state.items.map` → track `items`)

#### FR3: Hybrid Tracking
- **FR3.1**: Components MAY use both state access AND getter access in the same render
- **FR3.2**: The system SHALL correctly combine dependencies from both sources
- **FR3.3**: A re-render SHALL trigger if EITHER state dependencies OR getter dependencies indicate a change

#### FR4: Manual Dependencies
- **FR4.1**: Users MAY provide a custom `dependencies` function
- **FR4.2**: Custom dependencies SHALL override automatic tracking
- **FR4.3**: Custom dependencies SHALL support generator functions and iterables

#### FR5: Correctness Guarantees
- **FR5.1**: Zero false negatives (missed re-renders when data changed)
- **FR5.2**: Zero false positives (unnecessary re-renders when data unchanged)
- **FR5.3**: Consistent behavior across React Strict Mode double-invocation
- **FR5.4**: No memory leaks from stale subscriptions or cached values

### Non-Functional Requirements

#### NFR1: Developer Experience (Priority: 2)
- **NFR1.1**: Simple mental model - "access it, track it, compare it"
- **NFR1.2**: Getter implementation requires no special syntax beyond standard TypeScript getters
- **NFR1.3**: Clear error messages when tracking fails
- **NFR1.4**: Minimal boilerplate for common use cases

#### NFR2: Performance (Priority: 3)
- **NFR2.1**: Tracking overhead SHALL NOT exceed 10% of render time for typical components
- **NFR2.2**: Getter re-execution SHALL only occur when state changes
- **NFR2.3**: Subscription cleanup SHALL be O(1) or O(log n)
- **NFR2.4**: Memory usage SHALL scale linearly with active subscriptions

#### NFR3: Debuggability (Priority: 4)
- **NFR3.1**: Developers SHALL be able to inspect tracked dependencies
- **NFR3.2**: Developers SHALL be able to see why a re-render occurred
- **NFR3.3**: Plugin system SHALL allow tracking of render events

### System Constraints

#### SC1: Architecture
- Complete redesign is acceptable
- Breaking changes to internal implementation are allowed
- Public API changes are acceptable if they improve correctness/DX

#### SC2: Technology Stack
- React 18+ with useSyncExternalStore
- TypeScript strict mode
- Proxy-based tracking (configurable)
- WeakRef for memory management

#### SC3: Compatibility
- Must work with isolated blocs (component-scoped instances)
- Must work with shared blocs (global instances)
- Must work with persistent blocs (keepAlive)
- Must integrate with existing plugin system

## Current Architecture Overview

### Component Structure

```
React Component (useBloc hook)
    ↓
BlacAdapter (orchestration)
    ↓
┌─────────────┬──────────────────┐
│             │                  │
ProxyFactory  SubscriptionManager  BlocBase
(tracking)    (notifications)      (state)
```

### Key Classes

1. **BlacAdapter** (`packages/blac/src/adapter/BlacAdapter.ts`)
   - Manages lifecycle between React and Bloc
   - Handles `resetTracking()` and `commitTracking()`
   - Maintains `pendingGetterValues` for cache warming
   - Creates proxies via ProxyFactory

2. **SubscriptionManager** (`packages/blac/src/subscription/SubscriptionManager.ts`)
   - Manages all subscriptions for a Bloc
   - Implements `notify()`, `checkGetterChanged()`
   - Maintains `getterCache` per subscription
   - Performs dependency-based notification filtering

3. **ProxyFactory** (`packages/blac/src/adapter/ProxyFactory.ts`)
   - Creates state proxies for nested tracking
   - Creates class proxies for getter tracking
   - Calls `trackAccess()` on property access

4. **useBloc Hook** (`packages/blac-react/src/useBloc.ts`)
   - React integration
   - Calls `resetTracking()` before render
   - Calls `commitTracking()` after render via useEffect
   - Uses useSyncExternalStore for state subscription

### Current Flow

#### Render Cycle
```
1. resetTracking() - clear pending dependencies
2. Render - proxies call trackAccess() for state/getters
3. useEffect - commitTracking() transfers to subscription
```

#### State Change Cycle
```
1. emit(newState) - BlocBase
2. notify(newState, oldState) - SubscriptionManager
3. shouldNotifyForPaths() - check dependencies
4. For getters: checkGetterChanged() - re-execute and compare
5. subscription.notify() - trigger React re-render
```

## Identified Issues

### Architectural Issues

**A1: Cache Timing Problem**
- Cache warming happens in `commitTracking()` (after render)
- Cache checking happens in `checkGetterChanged()` (during state change)
- Race condition: cache may not be populated when first checked

**A2: Dual Tracking Systems**
- `pendingGetterValues` in BlacAdapter (render-time)
- `getterCache` in Subscription (subscription-time)
- Error-prone transfer between the two

**A3: Unclear Ownership**
- Who owns the cache? Adapter or Subscription?
- Who invalidates the cache? When?
- Cache lifetime unclear

**A4: Complex Lifecycle**
- `resetTracking()` → `trackAccess()` → `commitTracking()` → `checkGetterChanged()`
- Four separate phases with data flowing between them
- Hard to reason about correctness

### Correctness Issues

**C1: Cache Not Updating**
- Despite all fixes, cache doesn't reflect current getter value
- Suggests fundamental flaw in approach

**C2: First Access Ambiguity**
- No cached value: changed or not changed?
- Current: returns `true` (assume changed)
- Alternative: returns `false` (assume unchanged)
- Both cause problems

**C3: Invalidation Strategy**
- When to clear cache? Every state change? Only relevant changes?
- Current: tried both, neither works
- Suggests value-based approach is flawed

## Success Criteria

### Must Have (P0)
1. All 197 tests pass, including 5 currently failing getter tests
2. Zero false positives (unnecessary re-renders)
3. Zero false negatives (missed re-renders)
4. Works correctly in React Strict Mode
5. No memory leaks

### Should Have (P1)
6. Simpler architecture than current implementation
7. Clear separation of concerns
8. Easy to understand and debug
9. Well-documented with inline comments

### Nice to Have (P2)
10. Performance improvements over current system
11. Better error messages
12. Enhanced debugging capabilities via plugins

## Out of Scope

- Changes to Bloc/Cubit API for defining getters
- Changes to event handling system
- Changes to plugin system architecture (only integration points)
- Performance optimizations beyond correctness fixes
- Migration guides or deprecation warnings (breaking changes allowed)

## Open Questions

1. Should we eliminate the cache entirely and use a different approach?
2. Can we unify state and getter tracking into a single mechanism?
3. Should getter re-execution happen during `notify()` or during render?
4. Is the proxy-based tracking adding unnecessary complexity?

## References

### Related Files
- Test failures: `packages/blac-react/src/__tests__/dependency-tracking.advanced.test.tsx`
- Core implementation: `packages/blac/src/adapter/BlacAdapter.ts`
- Subscription logic: `packages/blac/src/subscription/SubscriptionManager.ts`
- Proxy factory: `packages/blac/src/adapter/ProxyFactory.ts`
- React integration: `packages/blac-react/src/useBloc.ts`

### Investigation Reports
- `/Users/brendanmullins/Projects/blac/reports/getter-dependency-tracking-failure.md`
- `/Users/brendanmullins/Documents/Log/TempDoc/getter-debug-analysis.md`

### External Patterns
- Zustand's selector-based subscriptions
- Jotai's atom dependency tracking
- Valtio's proxy-based reactivity
- MobX's observable getters

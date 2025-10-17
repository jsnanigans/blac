# Dependency and Change Detection Improvement - Specifications

**Date:** 2025-01-17
**Status:** Draft - Awaiting User Review
**Feature:** Improved dependency and change detection in BlacAdapter

## Problem Statement

The current dependency and change detection system in BlaC has several issues:

1. **Unnecessary re-renders**: Components re-render when they shouldn't based on their dependencies
2. **Complex integration**: Difficult to integrate with frameworks beyond React
3. **Performance problems**: Slow dependency checking or change detection
4. **Missing re-renders**: Proxy tracking sometimes misses state accesses, causing components not to re-render when they should
5. **Code duplication**: React-specific logic is mixed with core adapter logic

## Goals

### Primary Goals
1. **Better testability**: Make dependency logic easier to test in isolation from React
2. **Framework agnostic**: Move dependency/change detection logic into BlacAdapter so other frameworks (Vue, Svelte, Angular) can integrate more easily
3. **Simplify useBloc**: Reduce complexity in the React hook implementation

### Secondary Goals
1. Fix proxy tracking issues where state accesses are missed
2. Reduce unnecessary re-renders
3. Improve performance of dependency checking and change detection
4. Support both callback and snapshot-based change notification patterns

## Current Architecture

### Current Responsibilities

**useBloc.ts (React-specific)**
- Creates BlacAdapter instance via useMemo
- Calls `adapter.resetTracking()` on every render
- Calls `adapter.notifyRender()` on every render
- Creates subscription via `useMemo` → `adapter.createSubscription()`
- Uses `useSyncExternalStore` with custom getSnapshot logic for dependencies
- Calls `adapter.commitTracking()` in useEffect after render
- Returns proxied state and bloc via `adapter.getStateProxy()` and `adapter.getBlocProxy()`

**BlacAdapter.ts (Framework-agnostic, but mixed)**
- Manages subscription lifecycle
- Handles dependency tracking (manual dependencies via `dependencies` option)
- Implements two-phase tracking: `resetTracking()` → `commitTracking()`
- Creates proxies for automatic dependency tracking
- Manages state snapshots for dependencies mode
- Provides getStateProxy() and getBlocProxy()
- Tracks access via `trackAccess()`

### Current Issues with Architecture

1. **Split Responsibility**: State snapshot logic is split between useBloc (getSnapshot in useSyncExternalStore) and BlacAdapter (stateSnapshot property)
2. **React-Specific Logic in Adapter**: The two-phase tracking (resetTracking/commitTracking) is designed specifically for React's render/commit cycle
3. **Complex Integration**: New frameworks need to understand resetTracking, commitTracking, notifyRender, createSubscription, getStateProxy, and getBlocProxy
4. **Proxy Tracking Issues**: The proxy-based dependency tracking sometimes misses accesses because:
   - `isTrackingActive` flag controls when tracking happens (line 169 BlacAdapter.ts)
   - Tracking only active during render phase
   - May miss accesses that happen outside render
5. **Performance**: Multiple function calls per render (resetTracking, notifyRender, getStateProxy, getBlocProxy, commitTracking)

## Requirements

### Functional Requirements

1. **FR-1**: Adapter must detect when dependencies have changed
   - Support array-based dependencies: `(bloc) => [bloc.state.count, bloc.state.user.id]`
   - Support generator-based dependencies: `(bloc) => bloc.iterIds()`
   - Support proxy-based automatic tracking (no dependencies option)

2. **FR-2**: Adapter must provide a way to get current state snapshot
   - State snapshot should be stable (same reference) when dependencies haven't changed
   - State snapshot should reflect latest state values even if dependencies haven't changed

3. **FR-3**: Adapter must notify frameworks when re-render is needed
   - Support callback-based notification: `onChange()` callback
   - Support snapshot-based notification: getSnapshot() method that returns different reference

4. **FR-4**: Adapter must handle subscription lifecycle
   - Framework controls when to subscribe/unsubscribe
   - Adapter manages subscription state internally
   - Cleanup must be automatic when adapter is destroyed

5. **FR-5**: Adapter must be testable in isolation
   - All dependency logic must be unit-testable without React
   - Clear API for testing state changes and notifications
   - No hidden dependencies on React lifecycle

### Non-Functional Requirements

1. **NFR-1**: Performance
   - Dependency checking must use early-exit optimization
   - Proxy creation must be cached and reused
   - State snapshot must be cached when dependencies haven't changed
   - Minimize function calls per framework render cycle

2. **NFR-2**: Framework Agnostic
   - Core dependency logic must not depend on React
   - API must be simple enough for any framework to integrate
   - Provide clear primitives that frameworks can compose

3. **NFR-3**: Backwards Compatibility
   - Breaking changes to public API are acceptable
   - Internal changes can be made freely
   - Goal is better design, not compatibility with old code

4. **NFR-4**: Reliability
   - Fix proxy tracking issues where accesses are missed
   - No race conditions between state changes and subscriptions
   - Deterministic behavior for same inputs

## Design Constraints

1. **DC-1**: Must use existing `SubscriptionManager` for underlying subscriptions
2. **DC-2**: Must support both manual dependencies and proxy-based tracking
3. **DC-3**: Must work with React's `useSyncExternalStore` pattern
4. **DC-4**: Framework decides whether to use sync (getSnapshot) or async (onChange) patterns
5. **DC-5**: Must maintain support for:
   - Isolated blocs (`static isolated = true`)
   - Keep-alive blocs (`static keepAlive = true`)
   - Instance management via `instanceId` and `staticProps`

## Success Criteria

The refactoring will be considered successful when:

1. **Testability**: BlacAdapter's dependency logic can be unit tested without React
2. **Simplicity**: useBloc.ts is under 100 lines and delegates most logic to BlacAdapter
3. **Framework Agnostic**: Clear documentation exists for integrating with Vue or Svelte (even if not implemented)
4. **No Missed Re-renders**: Proxy tracking reliably catches all state accesses
5. **No Unnecessary Re-renders**: Components only re-render when dependencies actually change
6. **Performance**: Benchmarks show no regression (or improvement) in JSFrameworkBenchmark

## Out of Scope

The following are explicitly out of scope for this feature:

1. Implementing adapters for Vue, Svelte, or other frameworks (only design for them)
2. Changing the Bloc/Cubit API
3. Modifying SubscriptionManager internals
4. Changing proxy creation logic in ProxyFactory
5. Performance optimizations unrelated to dependency tracking
6. Documentation updates (will be done after implementation)

## Open Questions

1. Should `resetTracking()` and `commitTracking()` be merged into a single "render" lifecycle method?
2. Should the adapter provide a single `subscribe()` method that returns both onChange callback AND getSnapshot function?
3. Should proxy tracking be always-on, or should it remain tied to render phase?
4. How should we handle the edge case where dependencies function itself throws an error?
5. Should we keep `notifyRender()` for plugin notifications, or is it redundant?

## References

- Current implementation: `packages/blac-react/src/useBloc.ts`
- Current implementation: `packages/blac/src/adapter/BlacAdapter.ts`
- Related: `packages/blac/src/subscription/SubscriptionManager.ts`
- Previous work: Generator support for dependencies (2025-01-17)
- Performance benchmark: `apps/perf/src/benchmarks/JSFrameworkBenchmark.tsx`

# Implementation Plan: Hybrid Adapter Pattern

## Overview

Implement a hybrid adapter layer that bridges BlaC's state management with React's lifecycle requirements, achieving 100% compatibility with React 18 features while maintaining fine-grained reactivity.

## Phase 1: Core Adapter Infrastructure

### 1.1 Adapter Foundation
- [ ] Create `ReactBlocAdapter` class structure #S:m
  - Basic class with bloc reference
  - Subscription management Map
  - Version tracking for change detection
  - Snapshot caching mechanism

- [ ] Implement subscription lifecycle #S:m
  - `subscribe(selector, notify)` method
  - Reference counting for subscriptions
  - Cleanup on zero subscribers
  - Stable subscription identity

- [ ] Add adapter caching system #S:s
  - WeakMap for bloc -> adapter mapping
  - Ensure single adapter per bloc
  - Lifecycle management for adapters

### 1.2 Change Detection
- [ ] Implement version-based tracking #S:m
  - Increment version on bloc state change
  - Track version per subscription
  - Quick change detection without deep compare

- [ ] Add path-based dependency tracking #S:l
  - Track accessed property paths
  - Map paths to subscriptions
  - Efficient lookup for notifications

- [ ] Create snapshot generation #S:m
  - Immutable snapshot creation
  - Structural sharing for unchanged parts
  - Efficient cloning strategy

## Phase 2: Selector & Dependency System

### 2.1 Selector Implementation
- [ ] Build selector infrastructure #S:m
  - Selector function type definitions
  - Selector result memoization
  - Dependency extraction from selectors

- [ ] Implement selector subscriptions #S:m
  - Track selector dependencies
  - Compare selector results for changes
  - Optimize with shallow comparison

- [ ] Add selector composition #S:s #P
  - Combine multiple selectors
  - Derived selector support
  - Selector factories

### 2.2 Automatic Tracking
- [ ] Create tracking proxy system #S:l
  - Proxy wrapper for state access
  - Automatic path collection
  - Integration with adapter

- [ ] Implement hybrid tracking mode #S:m
  - Auto-detect tracking needs
  - Switch between proxy and selector
  - Performance optimizations

- [ ] Add debugging utilities #S:s #P
  - Track what triggered re-renders
  - Dependency visualization
  - Performance metrics

## Phase 3: React Integration

### 3.1 Hook Implementation
- [ ] Refactor `useBloc` hook #S:l
  - Use adapter instead of direct subscription
  - Integrate with useSyncExternalStore
  - Maintain backwards compatibility

- [ ] Add hook options support #S:m
  - Selector option
  - Instance ID handling
  - Suspense configuration

- [ ] Implement subscription callbacks #S:m
  - Stable subscribe function
  - Proper cleanup in return
  - Handle Strict Mode double-mount

### 3.2 Strict Mode Compatibility
- [ ] Fix subscription timing #S:m
  - Subscribe in useSyncExternalStore callback
  - No side effects in render
  - Idempotent operations

- [ ] Handle double mounting #S:s
  - Detect remounts vs new instances
  - Preserve subscription state
  - Clean lifecycle management

- [ ] Add Strict Mode tests #S:m #P
  - Test all hook variations
  - Verify no warnings
  - Check for memory leaks

## Phase 4: React 18 Features

### 4.1 Suspense Integration
- [ ] Add promise tracking #S:m
  - Detect loading states in blocs
  - Track pending promises
  - Throw promises for Suspense

- [ ] Implement Suspense options #S:s
  - `suspense` flag in hook
  - Loading state detection
  - Error boundary support

- [ ] Create Suspense tests #S:m #P
  - Data fetching patterns
  - Error handling
  - Fallback rendering

### 4.2 Concurrent Features
- [ ] Support useTransition #S:m
  - Mark updates as transitions
  - Non-blocking state updates
  - Transition state tracking

- [ ] Implement useDeferredValue compat #S:s
  - Deferred subscription updates
  - Priority-based rendering
  - Performance optimization

- [ ] Add batching support #S:s
  - Automatic batching of updates
  - Manual batch API
  - React 18 automatic batching

### 4.3 SSR Support
- [ ] Implement server snapshots #S:m #P
  - `getServerSnapshot` method
  - Hydration safety
  - Deterministic server state

- [ ] Add SSR tests #S:s #P
  - Server rendering
  - Client hydration
  - Mismatch prevention

## Phase 5: Performance Optimizations

### 5.1 Caching & Memoization
- [ ] Implement result caching #S:m
  - Memoize selector results
  - Cache computed values
  - LRU cache for memory management

- [ ] Add structural sharing #S:m
  - Reuse unchanged objects
  - Minimize memory allocation
  - Efficient diff algorithm

- [ ] Optimize proxy creation #S:s #P
  - Lazy proxy instantiation
  - Proxy pooling
  - Shallow vs deep proxies

### 5.2 Batch Processing
- [ ] Build batching system #S:m
  - Queue state updates
  - Flush on microtask
  - Priority queue for urgent updates

- [ ] Add transaction support #S:s
  - Multiple bloc updates
  - Atomic commits
  - Rollback capability

## Phase 6: Cross-Bloc Dependencies

### 6.1 Dependency Resolution
- [ ] Implement bloc dependencies #S:l
  - Bloc can subscribe to other blocs
  - Automatic dependency tracking
  - Circular dependency detection

- [ ] Add computed blocs #S:m
  - Derive state from multiple blocs
  - Lazy evaluation
  - Dependency graph

### 6.2 Cascade Updates
- [ ] Build update propagation #S:m
  - Efficient cascade algorithm
  - Topological sort for updates
  - Prevent infinite loops

- [ ] Add dependency tests #S:m #P
  - Cross-bloc scenarios
  - Complex dependency chains
  - Performance benchmarks

## Phase 7: Migration & Compatibility

### 7.1 Compatibility Layer
- [ ] Create legacy adapter #S:m
  - Support old subscription model
  - Compatibility warnings
  - Gradual migration path

- [ ] Add migration utilities #S:s #P
  - Codemod scripts
  - Migration guide
  - Breaking change documentation

### 7.2 Testing & Validation
- [ ] Port existing tests #S:l
  - Update test suite for adapter
  - Ensure backwards compatibility
  - Add new test cases

- [ ] Performance benchmarks #S:m #P
  - Compare with current implementation
  - Memory usage analysis
  - Re-render metrics

- [ ] Integration testing #S:m
  - Real-world usage patterns
  - Edge cases
  - Stress testing

## Phase 8: Developer Experience

### 8.1 DevTools Integration
- [ ] Create DevTools adapter #S:m #P
  - Subscription inspection
  - State timeline
  - Performance profiling

- [ ] Add debugging helpers #S:s #P
  - Why did this render
  - Dependency graph visualization
  - Performance warnings

### 8.2 Documentation
- [ ] Write API documentation #S:m #P
  - New hook API
  - Selector patterns
  - Best practices

- [ ] Create migration guide #S:s #P
  - Step-by-step migration
  - Common patterns
  - Troubleshooting

- [ ] Add example projects #S:m #P
  - Basic usage
  - Advanced patterns
  - React Native example

## Technical Considerations

### Critical Path
1. Core Adapter (Phase 1) - Required for everything
2. React Integration (Phase 3) - Needed for testing
3. Selector System (Phase 2) - Enables fine-grained reactivity
4. React 18 Features (Phase 4) - Complete compatibility

### Parallelizable Work
- Documentation can start early
- DevTools can be built independently
- Tests can be written alongside implementation
- Performance optimizations can be incremental

### Risk Areas
1. **Subscription Timing**: Must align perfectly with React lifecycle
2. **Memory Management**: Prevent leaks with proper cleanup
3. **Performance**: Adapter overhead must be minimal
4. **Migration**: Existing code must continue working

### Dependencies
- Phase 1 must complete before Phase 2 & 3
- Phase 3 required for Phase 4
- Phase 5 can happen in parallel after Phase 3
- Phase 6 depends on stable adapter (Phase 2)
- Phase 7 & 8 can start after Phase 3

## Success Criteria

1. **All existing tests pass** with adapter implementation
2. **Strict Mode compliance** - zero warnings or errors
3. **Performance metrics** - equal or better than current
4. **Memory stability** - no leaks over time
5. **React 18 features** - all Suspense/Transition tests pass
6. **Developer adoption** - clear migration path

## Estimated Timeline

- Phase 1: 2-3 days
- Phase 2: 2-3 days
- Phase 3: 2 days
- Phase 4: 3-4 days
- Phase 5: 2 days (can be parallel)
- Phase 6: 2-3 days
- Phase 7: 2 days
- Phase 8: 2 days (can be parallel)

**Total: ~12-15 days** with parallelization, ~18-20 days sequential

## Next Steps

1. Begin with Phase 1.1 - Create ReactBlocAdapter foundation
2. Set up test infrastructure for adapter testing
3. Implement core subscription lifecycle
4. Build incremental progress with working tests at each phase
# Implementation Plan: Hybrid useBloc with Hooks-Based Architecture

## Overview

Implement a hybrid `useBloc` that defaults to `useState + useEffect` for better performance, with optional `useSyncExternalStore` for concurrent mode compatibility.

## Phase 1: Foundation and Configuration

### 1.1 Global Configuration System
- [ ] Create `BlocConfig.ts` with global mode settings #S:s
  - Default mode getter/setter
  - Type definitions for modes
  - Configuration validation

### 1.2 Type Definitions and Interfaces
- [ ] Update `UseBlocOptions` interface with `concurrent` flag #S:s
- [ ] Create shared type definitions for both implementations #S:s
- [ ] Ensure TypeScript compatibility across all modes #S:s

## Phase 2: Simple Mode Implementation

### 2.1 SimpleBridge Class
- [ ] Create `SimpleBridge.ts` for useState-based state management #S:m
  - Constructor accepting StateContainer
  - State synchronization logic
  - Subscription management
  - Proxy tracking integration

### 2.2 useBlocSimple Hook
- [ ] Implement `useBlocSimple.ts` hook #S:l
  - useState for state management
  - useEffect for subscriptions
  - Proxy tracking during render
  - Complete tracking in useEffect
  - Support all existing options (dependencies, instanceId, etc.)

### 2.3 Proxy Tracking Adaptation
- [ ] Adapt proxy tracking for simple mode #S:m
  - Track during render (not in getSnapshot)
  - Complete tracking after render
  - Ensure paths are properly collected

## Phase 3: Concurrent Mode Refactoring

### 3.1 Extract Current Implementation
- [ ] Refactor current `useBloc` to `useBlocConcurrent.ts` #S:m
  - Move existing logic without changes
  - Ensure ReactBridge continues to work
  - Maintain all current features

### 3.2 ReactBridge Compatibility
- [ ] Verify ReactBridge works with refactored structure #S:s
- [ ] No changes needed to ReactBridge itself #S:s
- [ ] Ensure proxy tracking still functions

## Phase 4: Integration and Facade

### 4.1 Implement Facade Hook
- [ ] Create new `useBloc.ts` as facade #S:m
  - Detect mode (options.concurrent || global default)
  - Delegate to appropriate implementation
  - Maintain exact same API signature

### 4.2 Shared Utilities
- [ ] Extract common logic to utilities #P #S:m
  - Instance key generation
  - Lifecycle management
  - Component ref handling
  - Mount/unmount callbacks

### 4.3 Feature Parity Verification
- [ ] Ensure both modes support: #S:m
  - Proxy tracking
  - Dependencies function
  - Instance management (isolated/shared)
  - Static props
  - Lifecycle callbacks

## Phase 5: Testing

### 5.1 Update Existing Tests
- [ ] Modify tests to work with new structure #S:l
  - Add mode parameter where needed
  - Update import paths
  - Ensure backward compatibility

### 5.2 Mode-Specific Tests
- [ ] Create tests for mode selection logic #P #S:m
- [ ] Test simple mode implementation #P #S:l
- [ ] Test concurrent mode preservation #P #S:m
- [ ] Test global configuration #P #S:s

### 5.3 Performance Tests
- [ ] Benchmark simple mode performance #S:m
  - Reconciliation count comparisons
  - Memory usage analysis
  - DevTools output verification

### 5.4 Edge Case Testing
- [ ] Test React Strict Mode behavior #P #S:m
- [ ] Test rapid state updates #P #S:m
- [ ] Test cleanup on unmount #P #S:m
- [ ] Test with dependencies function #P #S:m

## Phase 6: Documentation and Migration

### 6.1 API Documentation
- [ ] Document new `concurrent` option #S:s
- [ ] Document global configuration API #S:s
- [ ] Update examples with both modes #S:m

### 6.2 Migration Guide
- [ ] Write migration guide for existing users #S:m
  - How to maintain current behavior
  - How to adopt simple mode
  - Performance considerations

### 6.3 Performance Guide
- [ ] Document when to use each mode #S:s
- [ ] Provide performance comparison data #S:s
- [ ] Best practices for mode selection #S:s

## Phase 7: Optimization and Polish

### 7.1 Bundle Size Optimization
- [ ] Ensure tree-shaking works correctly #S:s
- [ ] Minimize shared utility overhead #S:s
- [ ] Consider code splitting opportunities #S:s

### 7.2 Performance Tuning
- [ ] Optimize SimpleBridge subscription handling #P #S:m
- [ ] Reduce unnecessary re-subscriptions #P #S:m
- [ ] Batch state updates where possible #P #S:s

### 7.3 Developer Experience
- [ ] Add development mode warnings #S:s
- [ ] Improve error messages #S:s
- [ ] Add debug logging for mode selection #S:s

## Technical Considerations

### Critical Implementation Details

1. **Proxy Tracking Timing**
   - Simple mode: Track during render, complete in useEffect
   - Concurrent mode: Track in getSnapshot (existing)

2. **Subscription Lifecycle**
   - Simple mode: Direct subscribe in useEffect
   - Concurrent mode: Via ReactBridge (existing)

3. **State Synchronization**
   - Simple mode: setState with Object.is comparison
   - Concurrent mode: useSyncExternalStore handles it

4. **Memory Management**
   - Both modes must properly cleanup on unmount
   - Bridges must be disposed for isolated instances

### Potential Challenges

1. **Ensuring Feature Parity**
   - Risk: Subtle behavioral differences between modes
   - Solution: Comprehensive test suite, careful implementation

2. **Proxy Tracking Integration**
   - Risk: Different tracking timing might cause issues
   - Solution: Careful coordination of tracking lifecycle

3. **TypeScript Compatibility**
   - Risk: Type mismatches between implementations
   - Solution: Shared type definitions, strict checking

4. **Bundle Size Impact**
   - Risk: Significant size increase from dual implementation
   - Solution: Shared utilities, tree-shaking optimization

## Dependencies

- No external dependencies required
- Uses existing React hooks (useState, useEffect, useSyncExternalStore)
- Leverages existing BlaC core functionality

## Success Criteria

- [x] 50-75% reduction in reconciliation overhead (simple mode)
- [x] Zero breaking changes for existing code
- [x] All existing tests pass
- [x] Feature parity between modes
- [x] Clear DevTools output in simple mode
- [x] TypeScript types remain unchanged

## Estimated Timeline

- Phase 1-2: Core implementation (1-2 days)
- Phase 3-4: Integration (1 day)
- Phase 5: Testing (1-2 days)
- Phase 6-7: Documentation and polish (1 day)

**Total: 4-6 days of development**

## Next Steps

1. Start with Phase 1.1 - Create BlocConfig.ts
2. Implement SimpleBridge and useBlocSimple in parallel
3. Test early and often to ensure feature parity
4. Get feedback on simple mode performance
5. Document as you go for easier adoption
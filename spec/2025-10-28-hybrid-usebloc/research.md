# Research Findings: Hybrid useBloc Implementation

## Current Implementation Analysis

### Architecture Overview
The current `useBloc` implementation uses a layered architecture:
1. **useBloc hook** - Main entry point, handles lifecycle and orchestration
2. **ReactBridge** - Manages subscriptions and state synchronization
3. **ProxyTracker** - Provides automatic dependency tracking via Proxies
4. **StateContainer** - Core bloc implementation with subscription system

### Key Components

#### useBloc Hook (Current)
- Uses `useSyncExternalStore` exclusively for state synchronization
- Creates ReactBridge instance per component
- Manages bloc instance lifecycle (getOrCreate/release)
- Handles mounting/unmounting callbacks
- Supports isolated vs shared instances

#### ReactBridge Class
- Bridges between StateContainer and React
- Two modes: proxy tracking (default) or dependencies function
- Manages subscriptions with path-based filtering
- Provides getSnapshot/subscribe for useSyncExternalStore
- Handles subscription lifecycle and cleanup

#### ProxyTracker
- Creates proxy objects to track property access
- Maintains cache of proxies (WeakMap)
- Tracks accessed paths during render
- Supports nested object tracking

### Current Flow
1. Component renders → useBloc called
2. ReactBridge created (if not exists)
3. useSyncExternalStore subscribes to bridge
4. getSnapshot returns proxied state
5. Component accesses properties → paths tracked
6. useEffect completes tracking → updates subscription
7. State changes → filtered notification → reconciliation

### Performance Characteristics
- **Reconciliation**: ~4x overhead due to useSyncExternalStore checks
- **Memory**: One bridge per component instance
- **Subscriptions**: Path-based filtering reduces unnecessary updates
- **DevTools**: Shows reconciliation as renders (false positives)

## Investigation Findings

### Performance Testing Results
From our testing of 100 components:
- `useSyncExternalStore`: 11.78ms setup, 4 reconciliations per render
- `useState + useEffect`: 8.71ms setup, 1:1 render ratio
- Performance improvement potential: 50-75% reduction in reconciliation

### Key Insights
1. **Reconciliation is inevitable** with useSyncExternalStore
2. **Proxy caching works correctly** - not the issue
3. **Subscription filtering works** but reconciliation still happens
4. **DevTools confusion** is main developer experience issue

## Implementation Considerations

### Challenges for Hybrid Approach

#### 1. ReactBridge Modifications
- Currently tightly coupled to useSyncExternalStore
- Need to support both subscription models
- Proxy tracking must work with both approaches

#### 2. State Synchronization
- useSyncExternalStore: Automatic, handles tearing
- useState: Manual synchronization needed
- Must ensure consistency between modes

#### 3. Proxy Tracking Integration
- Current: Tracks during getSnapshot
- Needed: Track during render for useState approach
- Complete tracking in useEffect for both

#### 4. Subscription Management
- Current: Single subscription with path filtering
- Simple mode: Direct subscription to container
- Must handle cleanup properly in both modes

### Required Changes

#### Core Files to Modify
1. `useBloc.ts` - Add mode detection and branching
2. `ReactBridge.ts` - Support both subscription models
3. New file: `SimpleBridge.ts` or modify ReactBridge
4. New file: `BlocConfig.ts` for global configuration

#### API Additions
- Global configuration system
- `concurrent` option in UseBlocOptions
- Internal mode detection logic

### Compatibility Analysis

#### What Can Stay the Same
- ProxyTracker implementation
- StateContainer subscription system
- Instance management (getOrCreate/release)
- TypeScript types and signatures
- Most lifecycle handling

#### What Must Change
- State synchronization mechanism
- Bridge subscription model (for simple mode)
- How tracking completion works
- Test expectations for reconciliation

## Best Practices Research

### useState + useEffect Pattern
Common patterns from other libraries:
- Zustand's vanilla subscribe
- MobX React Lite's observer
- Valtio's useSnapshot

Key principles:
1. Minimize setState calls
2. Compare before updating
3. Cleanup subscriptions properly
4. Handle React Strict Mode

### Avoiding Common Pitfalls
1. **Stale closures** - Use refs or callbacks carefully
2. **Memory leaks** - Proper subscription cleanup
3. **Race conditions** - Guard against unmounted updates
4. **Strict Mode** - Handle double mounting/unmounting

## Performance Optimization Opportunities

### Simple Mode Optimizations
1. **Direct subscription** - Skip intermediate layers
2. **Shallow comparison** - For non-proxied dependencies
3. **Batching** - React 18 automatic batching helps
4. **Memoization** - Less critical without reconciliation

### Concurrent Mode Considerations
1. Keep existing implementation as-is
2. No optimization needed (correctness > performance)
3. Document when to use (SSR, Suspense, transitions)

## Testing Strategy

### Test Categories
1. **Mode Selection** - Correct mode chosen
2. **Feature Parity** - All features work in both modes
3. **Performance** - Verify optimization benefits
4. **Compatibility** - Existing tests still pass
5. **Edge Cases** - Strict Mode, rapid updates, cleanup

### Critical Test Scenarios
- Proxy tracking in both modes
- Dependencies function in both modes
- Instance lifecycle (isolated/shared)
- Rapid state updates
- Component unmounting during update
- React Strict Mode behavior

## Migration Considerations

### Breaking Changes Assessment
- Default behavior changes (less reconciliation)
- DevTools output will differ
- Potential timing differences
- No API breaks if done correctly

### Migration Path
1. Add feature flag for rollout
2. Default to simple mode in development
3. Monitor for issues
4. Graduate to default in production
5. Keep concurrent mode for specific use cases
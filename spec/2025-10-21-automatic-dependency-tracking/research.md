# Research: Automatic Dependency Tracking Implementation

## Current Architecture Analysis

### Existing Proxy Implementation
The codebase already has proxy-based dependency tracking in `@blac/core`:
- `ProxyFactory.ts` - Creates reactive proxies for state objects
- `ConsumerTracker.ts` - Tracks proxy access during render
- Global config: `Blac.config.proxyDependencyTracking`

### Current useBlocAdapter Implementation
- Uses `useSyncExternalStore` for subscriptions
- Supports explicit selectors with caching
- Version-based change detection
- No automatic dependency tracking currently

### Key Components to Modify

1. **ReactBlocAdapter.ts**
   - Add dependency tracking logic
   - Integrate with proxy system
   - Handle dynamic dependency updates

2. **useBlocAdapter.ts**
   - Create tracking context during render
   - Pass dependencies to adapter
   - Handle selector vs auto-track logic

3. **ProxyFactory Integration**
   - Reuse existing proxy creation logic
   - Track property access during render
   - Reset tracking between renders

## Technical Considerations

### Proxy-based Tracking Pattern
```typescript
// During render:
1. Create tracking context
2. Wrap state in tracking proxy
3. Component accesses state.property
4. Proxy records "property" as dependency
5. Store dependencies for comparison
6. On state change, check if tracked properties changed
```

### Integration with useSyncExternalStore
- `getSnapshot` must return consistent references
- Need to track dependencies during snapshot creation
- Must handle React's double-render in dev mode

### Memory Management
- Proxies must be cleaned up properly
- Avoid creating new proxies every render
- Cache proxies when possible

## Best Practices & Patterns

### Similar Libraries
1. **MobX React**: Uses similar proxy-based tracking
   - Tracks during render
   - Updates dependencies dynamically
   - Handles conditional access

2. **Valtio**: Proxy-based state with React integration
   - Snapshot-based approach
   - Automatic dependency detection
   - Efficient re-render optimization

3. **Solid.js**: Fine-grained reactivity
   - Compile-time optimizations (not applicable here)
   - Runtime proxy tracking as fallback

### Common Patterns
1. **Tracking Context**: Thread-local-like context for current render
2. **Dependency Sets**: Use Set for O(1) lookups
3. **Path-based Tracking**: Track as "user.profile.name" strings
4. **Lazy Proxy Creation**: Only create proxies when needed

## Potential Challenges

### Challenge 1: React Double Render
- Development mode renders twice
- Must ensure consistent tracking
- Solution: Reset tracking at start of each render

### Challenge 2: Nested Proxy Creation
- Deep objects need recursive proxying
- Performance impact of deep proxies
- Solution: Lazy proxy creation, depth limits

### Challenge 3: Dependency Comparison
- String path comparison vs object reference
- Handling renamed/moved properties
- Solution: Path-based tracking with efficient comparison

### Challenge 4: Cleanup and Memory
- Proxies hold references to original objects
- Risk of memory leaks
- Solution: WeakMap for proxy cache, proper cleanup

## Implementation Strategy

### Phase 1: Core Tracking Infrastructure
1. Create `DependencyTracker` class
2. Integrate with existing `ProxyFactory`
3. Add tracking context to render phase

### Phase 2: Adapter Integration
1. Modify `ReactBlocAdapter` to accept dependencies
2. Update subscription logic for dependency comparison
3. Handle dynamic dependency updates

### Phase 3: Hook Integration
1. Update `useBlocAdapter` to use tracking
2. Add selector vs auto-track logic
3. Implement configuration options

### Phase 4: Developer Experience
1. Add debug logging
2. Create development warnings
3. Add DevTools integration hooks

## Performance Considerations

### Overhead Analysis
- Proxy creation: ~10-20% overhead (acceptable)
- Property access: ~5-10% overhead per access
- Dependency comparison: O(n) where n = tracked properties
- Overall impact: Acceptable for most use cases

### Optimization Opportunities
1. Cache proxies between renders
2. Use WeakMap for O(1) proxy lookups
3. Batch dependency updates
4. Skip tracking for primitive values

## Security Considerations

### Read-only Proxies
- Prevent state mutations during render
- Throw errors on setter access
- Maintain React's immutability expectations

### Side Effect Prevention
- Don't track getter side effects
- Warn about suspicious access patterns
- Provide escape hatches when needed
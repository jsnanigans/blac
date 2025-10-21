# Solution Design: Automatic Dependency Tracking

## Summary
We need to implement automatic dependency tracking for `useBlocAdapter` that detects which state properties are accessed during render and only triggers re-renders when those specific properties change. The system should dynamically update dependencies based on conditional access patterns.

## Key Considerations
- Must integrate with existing proxy infrastructure in @blac/core
- Should reuse ReactBlocAdapter's subscription model
- Need to maintain compatibility with explicit selectors
- Must handle React 18's double-render in development
- Performance overhead must be acceptable

## Solution Options

### Option 1: Inline Proxy Tracking (Recommended)
Create proxies during `getSnapshot` and track dependencies inline with render.

**Implementation:**
- Wrap state in tracking proxy during `getSnapshot`
- Record accessed properties in adapter
- Compare tracked properties on state changes
- Reset tracking each render cycle

**Pros:**
- Simple integration with existing architecture
- Minimal changes to hook API
- Natural fit with `useSyncExternalStore`
- Reuses existing ProxyFactory logic

**Cons:**
- Proxy creation on each snapshot call
- Potential performance overhead
- Requires careful cache management

**Scoring:**
- Complexity: 7/10 (moderate)
- Performance: 8/10 (good with caching)
- Maintainability: 9/10 (excellent)
- Compatibility: 10/10 (perfect)
- Developer Experience: 9/10 (excellent)

### Option 2: Render Phase Tracking
Use React's render phase to track dependencies before subscription.

**Implementation:**
- Create tracking context in hook body
- Wrap state before returning to component
- Pass dependencies to adapter subscription
- Update dependencies on each render

**Pros:**
- Clear separation of tracking and subscription
- More control over tracking lifecycle
- Easier to debug and understand

**Cons:**
- More complex integration with `useSyncExternalStore`
- Requires significant refactoring
- May conflict with React's concurrent features

**Scoring:**
- Complexity: 9/10 (high)
- Performance: 7/10 (good)
- Maintainability: 7/10 (good)
- Compatibility: 6/10 (fair)
- Developer Experience: 8/10 (very good)

### Option 3: Compiler Plugin Approach
Use a build-time plugin to analyze property access.

**Implementation:**
- Babel/SWC plugin to detect property access
- Generate static dependency lists
- Runtime uses pre-computed dependencies

**Pros:**
- Zero runtime overhead
- Predictable behavior
- Optimal performance

**Cons:**
- Requires build tooling changes
- Complex to implement
- Less flexible for dynamic patterns
- Out of scope for this project

**Scoring:**
- Complexity: 10/10 (very high)
- Performance: 10/10 (perfect)
- Maintainability: 5/10 (poor)
- Compatibility: 4/10 (poor)
- Developer Experience: 6/10 (fair)

### Option 4: Hybrid Selector Generation
Automatically generate selectors based on accessed properties.

**Implementation:**
- Track property access on first render
- Generate optimized selector function
- Use selector for subsequent renders
- Regenerate on dependency change

**Pros:**
- Combines benefits of selectors and tracking
- Can optimize over time
- Good performance characteristics

**Cons:**
- Complex state management
- Harder to predict behavior
- May cause unexpected re-renders

**Scoring:**
- Complexity: 8/10 (high)
- Performance: 9/10 (excellent)
- Maintainability: 6/10 (fair)
- Compatibility: 8/10 (very good)
- Developer Experience: 7/10 (good)

## Recommendation

**Option 1: Inline Proxy Tracking** is the recommended approach because:

1. **Best Integration**: Works naturally with existing `useSyncExternalStore` and `ReactBlocAdapter`
2. **Reuses Infrastructure**: Leverages existing `ProxyFactory` and proxy systems
3. **Maintainable**: Clear, understandable implementation that follows current patterns
4. **Compatible**: Works with all React 18 features and existing code
5. **Good Performance**: With proper caching, overhead is acceptable

The implementation would:
- Extend `ReactBlocAdapter` with dependency tracking
- Modify `getSnapshot` to wrap state in tracking proxy
- Cache proxies using WeakMap for performance
- Add debug logging for developer experience
- Maintain full backward compatibility
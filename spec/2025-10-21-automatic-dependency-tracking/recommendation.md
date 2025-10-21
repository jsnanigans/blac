# Recommendation: Inline Proxy Tracking with Custom Implementation

## Selected Solution
**Option 1: Inline Proxy Tracking** with a custom, focused implementation specifically designed for dependency tracking in the React adapter.

## Justification

### Why This Approach
1. **Clean Integration**: Works naturally with `useSyncExternalStore` and `ReactBlocAdapter`
2. **Independent Implementation**: Not reliant on potentially problematic existing ProxyFactory
3. **Focused Design**: Purpose-built for React dependency tracking, not generic proxy needs
4. **Performance Control**: Can optimize specifically for our use case
5. **Easier Debugging**: Simpler, focused code is easier to debug and maintain

### Why Not Rely on Existing ProxyFactory
- May have unknown issues or edge cases
- Designed for different use case (BloC internal tracking)
- Could have performance characteristics not suitable for React render tracking
- Mixing concerns makes debugging harder
- Better to have dedicated, tested implementation for this specific feature

## Implementation Approach

### Core Components

1. **DependencyTracker Class**
   - Standalone class for tracking property access
   - Manages proxy creation and caching
   - Handles depth limiting and path tracking
   - Provides clear API for React adapter

2. **TrackedProxy Creation**
   - Custom proxy wrapper focused on read tracking
   - Prevents mutations (read-only)
   - Efficient path construction
   - Lazy nested proxy creation

3. **ReactBlocAdapter Integration**
   - Add dependency tracking state
   - Modify getSnapshot to use tracked proxies
   - Compare dependencies on state changes
   - Clear lifecycle management

4. **Debug Logging System**
   - Comprehensive logging of tracked paths
   - Re-render reason explanations
   - Performance metrics
   - Development-only overhead

## Key Design Decisions

### Proxy Implementation
- Create our own lightweight proxy wrapper
- Focus only on property access tracking
- No setter support (throw errors on mutation attempts)
- Lazy creation of nested proxies

### Dependency Storage
- Store as Set of string paths (e.g., "user.profile.name")
- Efficient comparison using Set operations
- Clear and debuggable format
- Easy to serialize for DevTools

### Cache Strategy
- WeakMap for proxy caching per adapter instance
- Clear cache on state changes
- Reuse proxies within same render cycle
- Automatic garbage collection

### Depth Limiting
- Default 2 levels deep
- Configurable per-adapter or globally
- Track at leaf level when limit reached
- Clear warnings when limit is hit

## Risk Mitigation

### Performance Risks
- **Risk**: Proxy overhead on every render
- **Mitigation**: Aggressive caching, lazy creation, depth limits

### Memory Risks
- **Risk**: Memory leaks from proxy references
- **Mitigation**: WeakMap usage, proper cleanup, clear lifecycle

### Compatibility Risks
- **Risk**: Breaking existing selector-based code
- **Mitigation**: Clear precedence rules, selector disables tracking

### Debugging Risks
- **Risk**: Hard to understand why re-renders happen
- **Mitigation**: Comprehensive logging, clear DevTools integration

## Success Metrics

1. **Functional Success**
   - Components only re-render when accessed properties change ✓
   - Dynamic dependency tracking works correctly ✓
   - No interference with existing selectors ✓

2. **Performance Success**
   - Less than 15% overhead vs manual selectors
   - No memory leaks in long-running apps
   - Negligible impact when feature disabled

3. **Developer Experience Success**
   - Clear debug output showing tracked dependencies
   - Obvious when/why re-renders occur
   - Easy to opt-out when needed

## Alternatives Considered
- Using existing ProxyFactory (rejected due to unknown quality/issues)
- Render phase tracking (too complex with concurrent React)
- Compiler approach (out of scope)
- Hybrid selector generation (overcomplicated)

## Recommendation
Proceed with custom inline proxy tracking implementation that:
- Is purpose-built for React dependency tracking
- Has clear, maintainable code
- Provides excellent debugging capabilities
- Maintains full backward compatibility
- Can be incrementally improved over time
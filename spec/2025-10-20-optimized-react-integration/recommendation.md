# Recommendation: Hybrid Adapter Pattern

## Selected Solution

**Option 4: Hybrid Adapter Pattern** - Create an adapter layer that bridges the current BlaC architecture with React's lifecycle requirements.

## Justification

### Why This Approach

1. **Preserves Core Architecture**
   - Minimal changes to Blac/Cubit/BlocBase/Vertex classes
   - Existing bloc logic remains unchanged
   - Plugin system continues to work

2. **Optimal React Integration**
   - Clean separation between BlaC and React concerns
   - Full compatibility with React 18 features
   - Proper Strict Mode support
   - Natural fit with `useSyncExternalStore`

3. **Flexible Subscription Models**
   - Supports automatic dependency tracking via proxies
   - Allows explicit selectors for performance
   - Can optimize differently for shared vs isolated blocs
   - Enables gradual migration from current system

4. **Performance Benefits**
   - Reference counting for precise lifecycle management
   - Batched updates to minimize re-renders
   - Memoization opportunities in adapter layer
   - Can implement different strategies per use case

5. **Developer Experience**
   - Clear abstraction boundaries
   - Better debugging with adapter as inspection point
   - Type safety maintained throughout
   - Existing code can work with minimal changes

## Architecture Overview

```typescript
// Core adapter that bridges BlaC and React
class ReactBlocAdapter<T> {
  private bloc: BlocBase<T>;
  private subscriptions = new Map<string, AdapterSubscription>();
  private snapshot: T;
  private version = 0;

  // Stable subscription for useSyncExternalStore
  subscribe(selector, notify) { /* ... */ }

  // Snapshot generation for React
  getSnapshot(selector?) { /* ... */ }

  // Dependency tracking
  trackDependency(path) { /* ... */ }
}

// Enhanced hook with adapter
function useBloc<T>(
  BlocClass: Constructor<T>,
  options?: {
    selector?: (state: T) => any;
    suspense?: boolean;
    instanceId?: string;
  }
) {
  const adapter = useBlocAdapter(BlocClass, options);
  return useSyncExternalStore(
    adapter.subscribe,
    adapter.getSnapshot,
    adapter.getServerSnapshot
  );
}
```

## Key Design Decisions

### 1. Subscription Management
- **Reference Counting**: Each adapter tracks its subscriptions
- **Stable Identity**: Adapters cached per bloc instance
- **Lazy Creation**: Adapters created only when needed
- **Auto Cleanup**: Zero subscribers triggers cleanup

### 2. Dependency Tracking
- **Dual Mode**: Automatic via proxy OR explicit via selector
- **Path-Based**: Track property paths for fine-grained updates
- **Version-Based**: Quick change detection without deep comparison
- **Memoization**: Cache selector results between renders

### 3. React Integration
- **Strict Mode Safe**: Subscription in callback, no render side effects
- **Suspense Ready**: Built-in promise tracking for async states
- **Transition Support**: Mark updates as urgent or deferred
- **SSR Compatible**: Separate server snapshot support

### 4. Performance Optimizations
- **Batched Notifications**: Combine multiple updates
- **Shallow Comparison**: Default to shallow equality checks
- **Structural Sharing**: Reuse unchanged nested objects
- **Lazy Proxies**: Create proxies only when accessed

## Migration Strategy

### Phase 1: Adapter Implementation
- Implement core ReactBlocAdapter
- Add subscription management
- Integrate with existing BlocBase

### Phase 2: Hook Enhancement
- Update useBloc to use adapter
- Add selector support
- Implement Suspense integration

### Phase 3: Optimization
- Add batching logic
- Implement memoization
- Performance profiling

### Phase 4: Migration Tools
- Compatibility layer for existing code
- Migration guide and codemods
- Deprecation warnings

## Success Metrics

1. **All React 18 tests passing** including Strict Mode
2. **Performance parity or better** than current implementation
3. **Zero memory leaks** in subscription management
4. **Reduced re-renders** with selector pattern
5. **Clean migration path** for existing code

## Risk Mitigation

1. **Risk**: Additional abstraction complexity
   - **Mitigation**: Clear documentation and debugging tools

2. **Risk**: Performance overhead of adapter
   - **Mitigation**: Optimization strategies and caching

3. **Risk**: Migration friction
   - **Mitigation**: Backwards compatibility mode

## Next Steps

Proceed with detailed implementation planning for the Hybrid Adapter Pattern, breaking down the work into manageable phases with clear deliverables.
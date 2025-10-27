# Hybrid useBloc Implementation Specifications

## Overview
Implement a hybrid approach for `useBloc` that defaults to using `useState + useEffect` for better performance and clearer DevTools output, with an option to use `useSyncExternalStore` for concurrent mode compatibility.

## Requirements

### Core Requirements
1. **Default Implementation**: Use `useState + useEffect` by default instead of `useSyncExternalStore`
2. **Concurrent Mode Option**: Provide ability to opt-in to `useSyncExternalStore` when needed
3. **Feature Parity**: Both implementations must support all existing features
4. **Performance First**: Optimize for the common case (non-concurrent usage)

### Compatibility Requirements
- Maintain backward compatibility where possible without causing issues
- If breaking changes are necessary, they should be minimal and well-documented
- Existing test suite should continue to pass with minimal modifications

### Feature Support (Both Implementations)
All existing features must work identically in both modes:
- Proxy tracking for automatic dependency detection
- Dependencies function for manual dependency specification
- Instance ID support for shared/isolated instances
- Static props passing
- onMount/onUnmount lifecycle callbacks
- Proper TypeScript support with identical signatures
- SSR support (getServerSnapshot equivalent behavior)

### Configuration
- Global configuration to set default mode (useState or useSyncExternalStore)
- Per-hook override via options parameter
- No automatic detection of concurrent features
- Clear, explicit opt-in model

### Technical Constraints
1. **No New APIs**: Work within existing API surface
2. **No Selector API**: Do not add selector functionality in this implementation
3. **TypeScript**: Full TypeScript support with same type signatures
4. **Testing**: Maintain existing tests, update as needed, add new tests for hybrid behavior

## Success Criteria
1. Performance improvement: Reduced reconciliation overhead in default mode
2. DevTools clarity: Accurate render reporting in default mode
3. Backward compatibility: Existing code continues to work
4. Feature completeness: All existing features work in both modes
5. Type safety: No TypeScript regressions
6. Test coverage: All tests pass, new tests for mode switching

## API Design

### Global Configuration
```typescript
// Configure default mode globally
BlocConfig.setDefaultMode('simple' | 'concurrent');
```

### Hook Options
```typescript
interface UseBlocOptions<TBloc> {
  // Existing options
  staticProps?: AnyObject;
  instanceId?: string;
  dependencies?: (state: ExtractState<TBloc>, bloc: TBloc) => unknown[];
  onMount?: (bloc: TBloc) => void;
  onUnmount?: (bloc: TBloc) => void;

  // New option
  concurrent?: boolean; // Override global default
}
```

### Usage Examples
```typescript
// Uses global default (useState + useEffect)
const [state, bloc] = useBloc(MyBloc);

// Force concurrent mode (useSyncExternalStore)
const [state, bloc] = useBloc(MyBloc, { concurrent: true });

// With other options
const [state, bloc] = useBloc(MyBloc, {
  instanceId: 'shared',
  dependencies: (state) => [state.count],
  concurrent: false // Explicitly use simple mode
});
```

## Implementation Approach

### Two Internal Implementations
1. **useBlocSimple**: useState + useEffect based (default)
2. **useBlocConcurrent**: useSyncExternalStore based (current implementation)

### Shared Components
- ReactBridge modifications to support both modes
- ProxyTracker remains unchanged
- Instance management (getOrCreate, release) unchanged

## Performance Targets
- Simple mode: 50-75% reduction in reconciliation checks
- No performance regression in concurrent mode
- Minimal overhead for mode detection/switching

## Migration Path
1. Default behavior changes but API remains same
2. Apps wanting old behavior can set global config
3. Gradual migration by testing with new default
4. Documentation of performance benefits to encourage adoption
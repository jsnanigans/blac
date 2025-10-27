# Solution Design Discussion: Hybrid useBloc Implementation

## Summary

We need to implement a hybrid `useBloc` that defaults to `useState + useEffect` for better performance while maintaining the option to use `useSyncExternalStore` for concurrent mode compatibility. All existing features must work identically in both modes.

## Important Context

### Performance Impact
- Current implementation causes ~4x reconciliation overhead
- Simple mode can reduce reconciliation by 75%
- DevTools will show accurate renders in simple mode
- No tearing protection in simple mode (rarely needed)

### Constraints
- Must maintain feature parity between modes
- No new APIs or selector functionality
- Backward compatibility preferred
- Full TypeScript support required

## Solution Options

### Option 1: Dual Bridge Architecture

Create two separate bridge classes, one for each mode.

**Implementation:**
- `ReactBridge` - Current implementation (concurrent)
- `SimpleBridge` - New class for useState mode
- `useBloc` switches between bridges based on mode

**Pros:**
- Clean separation of concerns
- Each bridge optimized for its use case
- Easier to test independently
- No risk of breaking existing concurrent mode

**Cons:**
- Code duplication for shared functionality
- Maintenance burden of two implementations
- Larger bundle size
- More complex codebase

**Scoring:**
- Complexity: 7/10 (two separate implementations)
- Maintainability: 5/10 (dual maintenance burden)
- Performance: 10/10 (fully optimized for each case)
- Risk: 3/10 (low risk, isolated implementations)
- Bundle Size: 4/10 (significant duplication)

### Option 2: Unified Bridge with Mode Switching

Modify existing ReactBridge to support both modes internally.

**Implementation:**
- Single `ReactBridge` class with mode parameter
- Internal branching for subscribe/getSnapshot behavior
- Shared proxy tracking and lifecycle management

**Pros:**
- Single source of truth
- Shared code for common functionality
- Smaller bundle size
- Easier to ensure feature parity

**Cons:**
- More complex internal logic
- Risk of breaking existing functionality
- Harder to optimize for each mode
- Testing is more complex

**Scoring:**
- Complexity: 8/10 (complex internal branching)
- Maintainability: 7/10 (single codebase but complex)
- Performance: 8/10 (some shared overhead)
- Risk: 6/10 (could break existing code)
- Bundle Size: 9/10 (minimal overhead)

### Option 3: Composition-Based Approach

Keep ReactBridge as-is, create SimpleBridge, share common logic via composition.

**Implementation:**
- Extract shared logic to utility functions/base class
- `ReactBridge` remains unchanged
- `SimpleBridge` uses shared utilities
- `useBloc` chooses appropriate bridge

**Pros:**
- No risk to existing implementation
- Clean architecture with shared utilities
- Good balance of optimization and code reuse
- Gradual migration possible

**Cons:**
- Some code duplication still exists
- Need to carefully design shared interfaces
- Three modules instead of one or two

**Scoring:**
- Complexity: 6/10 (well-structured but multiple parts)
- Maintainability: 8/10 (clear separation, shared utilities)
- Performance: 10/10 (fully optimized)
- Risk: 2/10 (existing code untouched)
- Bundle Size: 7/10 (some overhead from utilities)

### Option 4: Hooks-Based Implementation

Implement two separate hooks with shared utilities.

**Implementation:**
- `useBlocSimple` - New hook with useState
- `useBlocConcurrent` - Wrapper around current implementation
- `useBloc` - Facade that delegates to appropriate hook
- Shared utilities for common logic

**Pros:**
- Very clean separation
- Each hook can be used independently
- Easy to test and understand
- Natural React patterns

**Cons:**
- More surface API (though not exposed)
- Need to ensure consistent behavior
- Some logic duplication in hooks

**Scoring:**
- Complexity: 5/10 (simple, familiar patterns)
- Maintainability: 9/10 (clear, simple hooks)
- Performance: 10/10 (optimal for each case)
- Risk: 2/10 (very low risk)
- Bundle Size: 6/10 (two hooks plus utilities)

## Common Implementation Considerations

### Proxy Tracking in Simple Mode
All options need to handle proxy tracking differently:
- Concurrent: Track during getSnapshot
- Simple: Track during render, complete in useEffect

### Global Configuration
All options need:
```typescript
class BlocConfig {
  private static defaultMode: 'simple' | 'concurrent' = 'simple';

  static setDefaultMode(mode: 'simple' | 'concurrent') {
    this.defaultMode = mode;
  }

  static getDefaultMode() {
    return this.defaultMode;
  }
}
```

### TypeScript Considerations
All options must maintain identical signatures:
```typescript
function useBloc<TBloc>(
  BlocClass: BlocConstructor<TBloc>,
  options?: UseBlocOptions<TBloc>
): UseBlocReturn<TBloc>
```

## Recommendation Request

I recommend **Option 3: Composition-Based Approach** or **Option 4: Hooks-Based Implementation** as they provide the best balance of:
- Low risk to existing code
- Clean architecture
- Optimal performance
- Maintainability

**Option 3** is better if you prefer class-based architecture.
**Option 4** is better if you prefer hooks and functional patterns.

Both avoid the risks of modifying existing working code while achieving the performance goals.

Which approach would you prefer, or would you like me to proceed with the recommended Option 4 (Hooks-Based Implementation) as it aligns best with React patterns and is easiest to maintain?
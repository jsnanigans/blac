# Automatic Dependency Tracking for useBlocAdapter

## Feature Overview
Implement automatic dependency tracking for the `useBlocAdapter` hook that detects which state properties are accessed during render and only triggers re-renders when those specific properties change.

## Requirements

### Core Functionality
1. **Automatic Property Detection**: Track which state properties are accessed during component render
2. **Dynamic Dependency Updates**: Re-evaluate dependencies on each render based on conditional logic
3. **Fine-grained Re-renders**: Only trigger re-renders when tracked properties actually change

### API Design
- Automatic tracking is the DEFAULT behavior for `useBlocAdapter` when no selector is provided
- When a selector is explicitly provided, automatic tracking is DISABLED
- Global configuration via `Blac.config` to disable autoTrack (default: enabled)

### Tracking Specifications
- **Depth Limit**: Track up to 2 levels deep by default (configurable)
- **Leaf Node Tracking**: Only track the actual accessed properties, not intermediate objects
- **Proxy-based Implementation**: Use ES6 Proxies to intercept property access
- **Read-only**: Disable setters to prevent state mutations during render

### Out of Scope (v1)
- Array, Set, and Map tracking (indices and methods)
- Computed properties and getters with side effects
- Deep tracking beyond 2 levels (unless configured)

### Performance & Configuration
- Proxy overhead is acceptable
- Global opt-out via `Blac.config.autoTrack = false`
- Per-hook opt-out when selector is provided

### Developer Experience
- Extensive debug logging showing:
  - Which properties were tracked
  - When dependencies change
  - Why re-renders are triggered
- Development-mode warnings for potential issues
- Clear documentation of behavior

### Compatibility
- Must work with React 18 features (Suspense, Concurrent Mode)
- Must maintain compatibility with existing selector-based usage
- Must work with React Strict Mode

## Success Criteria

1. **Functional Requirements**
   - Components only re-render when accessed properties change
   - Dependencies update dynamically based on conditional access
   - No re-renders for non-accessed property changes

2. **Performance Requirements**
   - Minimal overhead when tracking is disabled
   - Acceptable proxy overhead when enabled
   - No memory leaks from proxy references

3. **Developer Experience**
   - Clear debug output
   - Predictable behavior
   - Easy to understand and reason about

## Example Use Cases

### Basic Property Access
```tsx
// State: { id: number; name: string; email: string }
const [state] = useBlocAdapter(ProfileCubit);
return <>{state.name}</> // Only re-renders when name changes
```

### Conditional Access
```tsx
// State: { count: number; show: boolean }
const [state] = useBlocAdapter(CountCubit);
return <>{state.show ? state.count : 'hidden'}</>
// Re-renders when:
// - show changes
// - count changes (only if show is true)
```

### Nested Property Access
```tsx
// State: { user: { profile: { name: string } } }
const [state] = useBlocAdapter(UserCubit);
return <>{state.user.profile.name}</>
// Only re-renders when name changes (leaf node tracking)
```

## Technical Constraints

1. Must integrate with existing `ReactBlocAdapter` architecture
2. Must work with `useSyncExternalStore` subscription model
3. Must handle React's double-render in development mode
4. Must clean up proxy references to prevent memory leaks
5. Must be compatible with the existing selector result caching mechanism
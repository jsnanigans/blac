# Archived Code - Unified Tracking Implementation

**Date Archived**: 2025-10-21
**Reason**: Full migration to Adapter Pattern

## What's Here

This directory contains the old unified tracking implementation of BlaC React integration, which has been replaced by the new Adapter Pattern.

### Archived Components

#### `/unified-tracking/`

- `useBloc.old.ts` - The old useBloc hook using UnifiedDependencyTracker
  - Used proxy-based automatic dependency tracking
  - Had complex subscription management with UnifiedDependencyTracker
  - Required synchronization between render tracking and subscription updates

#### `/tests/`

All tests for the unified tracking system:

- `useBloc.*.test.tsx` - Various useBloc feature tests
- `dependency-tracking*.test.tsx` - Dependency tracking tests
- `deep-state-tracking*.test.tsx` - Deep state tracking tests
- `simple-debug.test.tsx` - Debugging tests
- `rerenderLogging.test.tsx` - Render logging tests

## Why Was It Replaced?

The new Adapter Pattern provides:

1. **Cleaner Architecture**: Clear separation between React lifecycle and BlaC state management
2. **Better Performance**: Version-based change detection instead of deep comparisons
3. **React 18 Compliance**: Built on useSyncExternalStore with proper subscription model
4. **Simpler Code**: No complex render tracking phases or subscription synchronization
5. **Better Memory Management**: Reference counting with generation counter prevents leaks
6. **Type Safety**: Better TypeScript inference with overloaded signatures

## Migration

The new `useBloc` is now a re-export of `useBlocAdapter`. The API is similar but uses selectors instead of automatic proxy tracking:

### Old (Unified Tracking)

```typescript
function Counter() {
  const [state, bloc] = useBloc(CounterBloc);
  // Accessing state.count automatically tracks it via proxy
  return <div>{state.count}</div>;
}
```

### New (Adapter Pattern)

```typescript
function Counter() {
  // Option 1: Full state (similar to old behavior)
  const [state, bloc] = useBloc(CounterBloc);
  return <div>{state.count}</div>;

  // Option 2: Optimized with selector (recommended)
  const [count, bloc] = useBloc(CounterBloc, {
    selector: (state) => state.count
  });
  return <div>{count}</div>;
}
```

## If You Need to Reference This Code

If you need to understand how the old unified tracking system worked:

1. See `unified-tracking/useBloc.old.ts` for the hook implementation
2. See `@blac/core` for `UnifiedDependencyTracker` and proxy factories
3. See tests in `tests/` for usage patterns and edge cases

## Status of Tests

All tests in `tests/` are for the old unified tracking system and are **not currently running**. They have been preserved for reference but may not work with the new adapter-based implementation.

Some tests may be portable to the new system with modifications, but many test the specific behavior of the unified tracking system (render phases, proxy tracking, etc.) which don't apply to the adapter pattern.

## Related Specifications

See `/spec/2025-10-20-optimized-react-integration/` for:

- Implementation plan and rationale
- Migration documentation
- Performance comparisons
- Architecture decisions

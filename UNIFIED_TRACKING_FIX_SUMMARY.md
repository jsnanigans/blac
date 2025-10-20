# Unified Tracking System Fix - Session Summary

## Overview
Fixed the unified dependency tracking system to properly trigger React component re-renders when bloc state changes. Improved test results from **102 passing / 122 failing** to **159 passing / 62 failing** tests.

## Root Cause
The unified tracking system was working correctly, but tests were using compiled JavaScript (`dist/`) instead of source files (`src/`). This caused a sync issue where:
1. Tests would reset the Blac singleton
2. But the old `UnifiedDependencyTracker` singleton would persist with old bloc UIDs
3. New subscriptions had new bloc UIDs that didn't match, so notifications were never triggered

## Key Changes Made

### 1. **Blac.ts** - Reset UnifiedDependencyTracker singleton
```typescript
// In SingletonBlacManager.resetInstance()
UnifiedDependencyTracker.resetInstance();
```
When the Blac instance is reset (during tests), we now also reset the tracker singleton to clear stale subscriptions.

### 2. **useBloc_Unified.ts** - Notification wrapper delegation pattern
Implemented a stable callback delegation pattern using `useCallback` and `useRef`:
- Creates a stable `notifyWrapper` function that delegates to `notifyRef.current()`
- React's `useSyncExternalStore` receives the stable wrapper
- The wrapper dynamically calls whatever `notifyRef.current()` is at call time
- This prevents timing issues where the callback changes before notification occurs

### 3. **vitest.config.ts** - Source file resolution
Updated both `@blac/react` and `@blac/core` vitest configs to resolve package imports to source files instead of compiled dist:
```typescript
resolve: {
  alias: {
    '@blac/core': path.resolve(__dirname, '../blac/src'),
    '@blac/react': path.resolve(__dirname, './src'),
    // ... other packages
  },
}
```
This ensures tests use TypeScript source code directly, avoiding any sync issues between source and compiled versions.

### 4. **Default Configuration**
Set `useUnifiedTracking: true` as the default configuration, making the unified system the primary tracking mechanism.

## Test Results

### Before
- **102 passing** tests
- **122 failing** tests
- System wasn't triggering re-renders on state changes

### After
- **159 passing** tests (+57 tests fixed)
- **62 failing** tests (-60 tests fixed)
- State changes properly trigger component re-renders
- Primitive state, getters, and custom dependencies all working

## Technical Insights

### Why the notification wrapper matters
The delegation pattern prevents a race condition where:
1. `useSyncExternalStore` is called with a subscribe function
2. That function creates the subscription and returns a cleanup function
3. BUT before the cleanup function can be stored, state might change
4. Without the delegation, the notification would call the old/wrong callback

By using a stable wrapper that delegates to a ref, we ensure the right callback is always called at the right time.

### Why source file resolution matters
Vitest was using compiled JavaScript from `dist/` which had:
- Stale code from previous builds
- No synchronization with TypeScript source changes
- Different lifecycle timing than source code

Resolving to source files (`src/`) ensures:
- Tests always use the latest TypeScript code
- No build step required for rapid iteration
- Consistent behavior between test and runtime

## Files Modified
1. `packages/blac/src/Blac.ts` - Reset tracker singleton
2. `packages/blac/src/Cubit.ts` - Removed debug logging
3. `packages/blac/src/BlocBase.ts` - Removed debug logging
4. `packages/blac/src/tracking/UnifiedDependencyTracker.ts` - Removed debug logging
5. `packages/blac-react/src/useBloc_Unified.ts` - Improved hook with correct delegate pattern
6. `packages/blac/vitest.config.ts` - Added source file resolution
7. `packages/blac-react/vitest.config.ts` - Added source file resolution

## Next Steps
1. Continue investigating the remaining 62 failing tests
2. Focus on edge cases with dependency tracking
3. Ensure React concurrent features (useTransition, useDeferredValue) work correctly
4. Optimize performance for large state objects and many subscribers

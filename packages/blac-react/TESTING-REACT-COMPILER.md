# Testing with React 19 Compiler

This document explains how to test `@blac/react` with and without the React 19 compiler to ensure compatibility and compare behavior.

## Overview

The React 19 compiler (formerly "React Forget") automatically optimizes components by memoizing them, potentially making manual `useMemo`, `useCallback`, and `React.memo` unnecessary. This has important implications for `@blac/react`'s proxy-based dependency tracking system.

## Running Tests

### Test WITHOUT Compiler (Default)

```bash
pnpm test              # Run all tests without compiler
pnpm test:watch        # Watch mode without compiler
```

### Test WITH Compiler

```bash
pnpm test:compiler           # Run all tests with compiler enabled
pnpm test:watch:compiler     # Watch mode with compiler enabled
```

### Compare Both

```bash
pnpm test:both         # Runs tests both ways for comparison
```

## What to Look For

### 1. **Proxy Dependency Tracking**

The compiler's automatic memoization might interfere with BlaC's proxy-based dependency tracking.

**Test Cases to Watch:**

- `src/__tests__/dependency-tracking/` - Core dependency tracking tests
- Components that use `selector` functions
- State access patterns in components

**Potential Issues:**

- Dependencies might not be tracked correctly if the compiler memoizes state access
- Re-renders might be skipped when they shouldn't be
- Proxy traps might not be triggered as expected

### 2. **Re-render Optimization**

The compiler adds its own memoization on top of BlaC's selective re-rendering.

**Questions to Answer:**

- Does the compiler respect BlaC's dependency tracking?
- Are there unnecessary re-renders being prevented (good)?
- Are there necessary re-renders being skipped (bad)?

**How to Test:**

- Use `@blac/plugin-render-logging` to track render counts
- Compare render counts with and without compiler
- Look for differences in `useBloc` selector behavior

### 3. **Memory Management**

BlaC uses WeakRef-based consumer tracking. The compiler's optimizations shouldn't interfere with cleanup.

**Test Cases:**

- Component mount/unmount cycles
- Instance lifecycle tests
- Consumer cleanup validation

### 4. **Arrow Function Methods**

BlaC requires arrow function methods for proper `this` binding.

**Verify:**

- Compiler doesn't break method binding
- `this.emit()` calls work correctly in Bloc/Cubit methods
- Event handlers maintain correct context

## Configuration

### Default Config (vitest.config.ts)

```typescript
// NO compiler - tests default BlaC behavior
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest-setup.ts',
  },
});
```

### Compiler Config (vitest.config.compiler.ts)

```typescript
// WITH compiler - tests React 19 optimizations
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
  // ... rest of config
});
```

## Expected Behavior

### ✅ Should Work the Same

- All existing tests should pass with compiler enabled
- State updates should trigger correct re-renders
- Dependency tracking should remain accurate
- Memory cleanup should work identically

### ⚠️ Might Differ (Investigate)

- **Render counts** - Compiler might reduce renders (potentially good)
- **Performance** - Compiler might improve or worsen performance
- **Proxy access patterns** - Need to verify proxy traps still fire

### ❌ Should Never Happen

- Tests passing without compiler but failing with it
- Dependencies being missed or tracked incorrectly
- Memory leaks or cleanup failures
- Method binding errors

## Debugging Compiler Issues

### Enable Compiler Logs

Edit `vitest.config.compiler.ts`:

```typescript
[
  'babel-plugin-react-compiler',
  {
    target: '19',
    compilationMode: 'annotation', // Only compile marked components
    environment: {
      enableTreatRefLikeIdentifiersAsRefs: true,
    },
  },
];
```

### Check What Gets Compiled

The compiler adds comments to transformed code. Look for:

```javascript
// @react-compiler-optimized
```

### Selective Testing

Test specific files:

```bash
pnpm test:compiler -- path/to/specific.test.tsx
```

## Known Considerations

### Proxy-Based Tracking

BlaC's proxy system intercepts property access to track dependencies. The compiler's memoization needs to preserve this behavior.

**Critical Path:**

1. Component renders and calls `useBloc(MyBloc)`
2. Proxy wrapper created around state
3. Component accesses `state.someProperty`
4. Proxy trap records dependency
5. Only re-render when `someProperty` changes

**What Could Break:**

- Compiler caching property access before proxy trap fires
- Memoization preventing dependency tracking on subsequent renders

### Subscription System

BlaC uses a dual subscription model (Consumers + Observers). The compiler shouldn't interfere with:

- Consumer registration/cleanup (WeakRef-based)
- Observer notifications
- State change propagation

## Reporting Issues

If you find discrepancies between compiler and non-compiler tests:

1. **Document the difference** - What test fails? How does behavior differ?
2. **Minimal reproduction** - Create a minimal test case
3. **Check proxy behavior** - Is dependency tracking affected?
4. **Performance impact** - Better or worse with compiler?
5. **Report findings** - Include both test runs in the issue

## Resources

- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Babel Plugin React Compiler](https://www.npmjs.com/package/babel-plugin-react-compiler)
- [BlaC Architecture Review](/blac-improvements.md)

---

**Last Updated:** 2025-10-09

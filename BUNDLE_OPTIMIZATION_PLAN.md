# Bundle Size Optimization Plan

## Overview

Current bundle analysis shows `@blac/core` is ~34KB minified, with tracking code (`tracking2.js`) comprising ~50% of the library. This plan outlines steps to reduce bundle size for typical React applications by ~40% without removing features.

## Current State

| Package | Minified | Notes |
|---------|----------|-------|
| @blac/core (index.js) | ~14KB | Core + all exports |
| @blac/core (tracking2.js) | ~14KB | Tracking chunk |
| @blac/adapter | ~4KB | Framework adapter |
| @blac/react | ~2KB | React hook |
| **Total** | **~34KB** | For React apps |

## Goals

- Reduce React app bundle to ~20KB minified (40% reduction)
- Maintain full feature set for users who need it
- No breaking changes to public API
- Better tree-shaking support

---

## Phase 1: Clean Up Tracking Exports (Quick Wins)

**Impact: ~15% bundle reduction**
**Risk: Low**
**Breaking Changes: None (internal APIs only)**

### 1.1 Remove low-level proxy exports from public API

These are exported but never used by downstream packages:

```ts
// Remove from packages/blac/src/tracking/index.ts exports:
- isProxyable
- createInternal
- createArrayProxy
- createForTarget
- ProxyState (type)
- createProxyState
- startProxy
- stopProxy
```

**Files to modify:**
- `packages/blac/src/tracking/index.ts`
- `packages/blac/src/tracking/tracking-proxy.ts` (mark as @internal)

### 1.2 Remove unused path utility exports

Only `shallowEqual` is used by adapter. Remove others from public export:

```ts
// Remove from packages/blac/src/tracking/index.ts exports:
- parsePath
- getValueAtPath
```

**Files to modify:**
- `packages/blac/src/tracking/index.ts`

### 1.3 Remove combined tracking proxy exports

Only used internally by `watch()`, not by adapter:

```ts
// Remove from packages/blac/src/tracking/index.ts exports:
- TrackingProxyState (type)
- createState / createTrackingProxyState
- startTracking / startTrackingProxy
- stopTracking / stopTrackingProxy
- createTrackingProxy
- hasChanges / hasTrackingProxyChanges
```

**Files to modify:**
- `packages/blac/src/tracking/index.ts`

### 1.4 Remove tracked execution exports

Only used by `watch()`:

```ts
// Remove from packages/blac/src/tracking/index.ts exports:
- tracked
- createTrackedContext
- TrackedContext (class)
- TrackedResult (type)
- TrackedOptions (type)
```

**Files to modify:**
- `packages/blac/src/tracking/index.ts`

### 1.5 Remove unused getter internals

```ts
// Remove from packages/blac/src/tracking/index.ts exports:
- getGetterExecutionContext
- isGetter
- getDescriptor
- getActiveTracker
- resetGetterState
```

**Files to modify:**
- `packages/blac/src/tracking/index.ts`

---

## Phase 2: Separate Entry Points (Tree-Shaking)

**Impact: ~20% bundle reduction**
**Risk: Medium**
**Breaking Changes: None (additive)**

### 2.1 Create separate entry point for watch()

Move `watch()` to its own entry point so it's not bundled unless imported.

**New export in package.json:**
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./tracking": "./dist/tracking.js",
    "./watch": "./dist/watch.js"
  }
}
```

**Files to create/modify:**
- `packages/blac/src/watch.ts` (new entry point)
- `packages/blac/tsdown.config.ts` (add entry)
- `packages/blac/package.json` (add export)

**watch.ts entry point:**
```ts
export { watch, instance, type WatchFn, type BlocRef } from './watch/watch';
export { tracked, createTrackedContext, TrackedContext } from './tracking/tracked';
```

### 2.2 Create separate entry point for plugins

**New export:**
```json
{
  "./plugins": "./dist/plugins.js"
}
```

**Files to create/modify:**
- `packages/blac/src/plugins.ts` (new entry point)
- `packages/blac/tsdown.config.ts`
- `packages/blac/package.json`

**plugins.ts entry point:**
```ts
export { PluginManager } from './plugin/PluginManager';
export type { BlacPlugin, BlacPluginWithInit, PluginContext, PluginConfig, InstanceMetadata } from './plugin/BlacPlugin';
export { getPluginManager } from './core/StateContainerRegistry';
```

### 2.3 Remove watch and plugins from main entry

After creating separate entry points, remove from `index.ts`:

```ts
// Remove from packages/blac/src/index.ts:
- export { watch, instance, type WatchFn, type BlocRef } from './watch';
- export { PluginManager } from './plugin/PluginManager';
- export type { BlacPlugin, ... } from './plugin/BlacPlugin';
- export { getPluginManager } from './core/StateContainerRegistry';
```

**Migration for users:**
```ts
// Before
import { watch, PluginManager } from '@blac/core';

// After
import { watch } from '@blac/core/watch';
import { PluginManager } from '@blac/core/plugins';
```

---

## Phase 3: Code Deduplication

**Impact: ~5% bundle reduction**
**Risk: Low**
**Breaking Changes: None**

### 3.1 Deduplicate getter execution logic

`tracking-proxy.ts` has duplicate getter tracking code in two places:
- `createBlocProxy()` (lines 604-676)
- `createTrackingProxy()` (lines 836-939)

Extract shared logic to a helper function:

```ts
// New helper function
function executeTrackedGetter(
  target: StateContainerInstance,
  prop: string | symbol,
  tracker: GetterState,
  onValue: (value: unknown) => void,
): unknown {
  // Shared depth checking, circular reference detection, context management
}
```

**Files to modify:**
- `packages/blac/src/tracking/tracking-proxy.ts`

### 3.2 Consider consolidating state types

Currently 4 separate state interfaces with overlapping concerns:
- `ProxyState`
- `DependencyState`
- `GetterState`
- `TrackingProxyState`

Evaluate if these can be simplified or composed differently.

---

## Phase 4: Registry Optimization (Optional)

**Impact: ~5% bundle reduction**
**Risk: Medium**
**Breaking Changes: Possible**

### 4.1 Create debug/advanced export

Move rarely-used registry functions to separate export:

```json
{
  "./debug": "./dist/debug.js"
}
```

Functions to move:
- `getStats()`
- `register()`
- `getAll()`
- `forEach()`
- `hasInstance()`
- `getRefCount()`
- `globalRegistry` (direct access)

### 4.2 Evaluate borrowSafe and ensure

These are for bloc-to-bloc communication. Consider:
- Keep in main export (current)
- Move to `./advanced` export
- Document as optional features

---

## Implementation Order

### Sprint 1: Quick Wins (Phase 1)
1. [ ] Audit all tracking exports against adapter imports
2. [ ] Remove unused exports from `tracking/index.ts`
3. [ ] Mark removed exports as `@internal` in source
4. [ ] Run build and verify no type errors
5. [ ] Run all tests
6. [ ] Measure new bundle size

### Sprint 2: Entry Points (Phase 2)
1. [ ] Create `watch.ts` entry point
2. [ ] Create `plugins.ts` entry point
3. [ ] Update tsdown.config.ts
4. [ ] Update package.json exports
5. [ ] Update internal imports to use new paths
6. [ ] Deprecate old imports (keep working for 1 version)
7. [ ] Update documentation
8. [ ] Measure new bundle size

### Sprint 3: Deduplication (Phase 3)
1. [ ] Extract shared getter execution logic
2. [ ] Review state type consolidation
3. [ ] Run performance benchmarks (ensure no regression)
4. [ ] Measure new bundle size

### Sprint 4: Registry (Phase 4) - Optional
1. [ ] Evaluate user impact of moving registry functions
2. [ ] Create debug export if proceeding
3. [ ] Update documentation

---

## Expected Results

| Phase | Cumulative Savings | React Bundle |
|-------|-------------------|--------------|
| Current | - | ~34KB |
| Phase 1 | ~15% | ~29KB |
| Phase 2 | ~35% | ~22KB |
| Phase 3 | ~40% | ~20KB |
| Phase 4 | ~45% | ~19KB |

---

## Verification

After each phase:

1. **Build check:**
   ```bash
   pnpm build
   ```

2. **Type check:**
   ```bash
   pnpm typecheck
   ```

3. **Test:**
   ```bash
   pnpm --filter @blac/core test
   pnpm --filter @blac/react test
   ```

4. **Bundle analysis:**
   ```bash
   # Check file sizes
   ls -la packages/blac/dist/*.js

   # Minified size
   npx terser packages/blac/dist/index.js -c -m | wc -c
   ```

5. **Integration test:**
   - Build example app
   - Verify useBloc works
   - Verify watch works (from new path)
   - Verify plugins work (from new path)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking internal imports in adapter | Run full test suite, check adapter builds |
| Tree-shaking doesn't work | Test with real bundler (Vite/webpack), not just tsdown |
| Performance regression from dedup | Run benchmark tests before/after |
| User confusion with new imports | Clear migration guide, deprecation warnings |

---

## Notes

- All changes should be backward compatible for at least one minor version
- Use `@deprecated` JSDoc tags before removing exports
- Consider adding bundle size check to CI
- Document the new import paths in README

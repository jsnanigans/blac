# @dirtytalk/structural

## 0.0.8

### Patch Changes

- Sync
- d4cf1fa: Fix `deepMerge` prototype pollution via a `"__proto__"` own key in a patch
  (e.g. one produced by `JSON.parse`). The merge loop now routes that one key
  through `Object.defineProperty` instead of bracket assignment, so it lands as
  a plain own property on the merged result instead of rewriting the result's
  prototype.
- 9012194: Two internal hot-path rewrites, no public shape change:
  - `PathInterner.ancestorIds` memo is now length-versioned instead of fully
    cleared on every `intern()` — a cached entry recomputes only when it is
    re-queried after the interner has grown, moving the cost from O(all
    cached entries) per intern to O(1) amortized per read. A dev-only
    warning fires once when an interner crosses 5000 paths (unbounded
    dynamic keys). Staleness guarantees are identical.
  - `deepMerge` now clones lazily: the merged object is created only on the
    first actually-changed key, and a fully no-op merge returns the target
    by reference, preserving reference identity for unchanged state.

- 0f40f5a: Fix two internal `dirtytalk-structural` issues: `ProxyCache` no longer
  accumulates one cache entry per prefix an object has ever been read at (e.g.
  an item that shifts index across renders) — `disarm()` now prunes each
  touched target down to just the prefixes read during that render. Also,
  `StructuralContainer.getConsumerPaths()` now returns a detached snapshot
  `Map` instead of the live per-consumer registry, so callers can no longer
  mutate live path-tracking state through the inspection API.
- Updated dependencies
- Updated dependencies [9012194]
- Updated dependencies [9012194]
- Updated dependencies [f592ebd]
  - @dirtytalk/engine@0.2.0

## 0.0.7

### Patch Changes

- Fix tracker aliasing/frozen-object/enumeration edge cases and ensure precise emit on off-skeleton wakes for `ALL_PATHS` subscribers. Add a `ProxyCache` for cross-render proxy reuse, a segment cache with integer ancestor lookup, a union fast-path with closureless refine and lazy prefix/equals memoization, and skip patch diffing when there are no consumers.
- Updated dependencies
  - @dirtytalk/engine@0.1.0

## 0.0.6

### Patch Changes

- Refine structural diff and path tracking: pin the array path when iterating and
  reading `.length` so array reads subscribe correctly, with related updates to
  the container, diff, path-interner, and tracker.

## 0.0.5

### Patch Changes

- Add per-index array iteration tracking and fix array identity-search so that
  iterating and reading array entries records the precise paths touched.

## 0.0.4

### Patch Changes

- Pin the array entry path during iteration. Iterating an array and reading entry properties (or `.length`) now tracks the stable array path rather than a transient per-iteration path, fixing missed subscriptions for array-derived state.
- Updated dependencies
  - @dirtytalk/engine@0.0.4

## 0.0.3

### Patch Changes

- Add dts
- Updated dependencies
  - @dirtytalk/engine@0.0.3

## 0.0.2

### Patch Changes

- replace core
- Updated dependencies
  - @dirtytalk/engine@0.0.2

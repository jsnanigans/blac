# @dirtytalk/structural

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

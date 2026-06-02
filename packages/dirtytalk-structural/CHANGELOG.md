# @dirtytalk/structural

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

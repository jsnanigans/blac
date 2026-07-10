# @dirtytalk/engine

## 0.1.0

### Minor Changes

- Add `DirtyChannel.dispose()` teardown, isolate the `onError` seam so failing listeners don't cross-contaminate channels, drain all pending flushes per scheduler tick instead of one, and lazily allocate the flush error array to cut per-tick overhead.

## 0.0.4

### Patch Changes

- Refresh pinned dependency versions across the monorepo. No public API changes.

## 0.0.3

### Patch Changes

- Add dts

## 0.0.2

### Patch Changes

- replace core

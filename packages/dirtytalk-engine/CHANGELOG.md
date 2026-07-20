# @dirtytalk/engine

## 0.2.0

### Minor Changes

- 9012194: BREAKING: removed the `/primitives` subpath (`Signal`, `Observable`); no
  in-repo consumers existed. Migrate to `DirtyChannel` or vendor the class.
- f592ebd: Scope `Scheduler.cancel()` to the caller's own pending flush instead of
  clearing every pending flush on the scheduler. The `Scheduler` interface's
  `cancel` now takes the `flush` function to cancel (`cancel?(flush: () =>
void): void`); existing 0-arg implementers remain structurally assignable
  since TS allows fewer parameters. `MicrotaskScheduler` and `RAFScheduler`
  only remove the given flush from their pending set, and only tear down the
  shared microtask/rAF callback once no flushes remain pending — so disposing
  one container sharing a scheduler with others no longer cancels their
  pending work too.

### Patch Changes

- Sync
- 9012194: Skip the subscriber-array snapshot in `DirtyChannel`'s flush when there is
  at most one subscriber. The single entry is read and run directly with the
  same `alive`/interest/error semantics as the snapshot loop, removing one
  array allocation per flush in the common single-consumer case. Re-entrancy
  contracts are unchanged: a subscriber added mid-flush still does not run
  until the next flush, and self-unsubscription mid-callback ends cleanly.

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

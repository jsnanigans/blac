---
"@dirtytalk/engine": minor
---

Scope `Scheduler.cancel()` to the caller's own pending flush instead of
clearing every pending flush on the scheduler. The `Scheduler` interface's
`cancel` now takes the `flush` function to cancel (`cancel?(flush: () =>
void): void`); existing 0-arg implementers remain structurally assignable
since TS allows fewer parameters. `MicrotaskScheduler` and `RAFScheduler`
only remove the given flush from their pending set, and only tear down the
shared microtask/rAF callback once no flushes remain pending — so disposing
one container sharing a scheduler with others no longer cancels their
pending work too.

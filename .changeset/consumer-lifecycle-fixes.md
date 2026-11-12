---
'@blac/core': patch
'@blac/react': patch
---

Fix stale renders and leaked instances at the edges of the consumer lifecycle.

`@blac/react`

- A state change raised between a component's commit and React's passive effects is no longer lost.
- A component whose bloc is disposed from outside (`clear`, `clearAll`, `clearWhere`, `forceDispose`) re-renders against a new instance instead of staying on the disposed one.
- `useBloc` releases its ref at the end of the tick in which the component unmounts. A consumer mounting in the same commit keeps the instance and its state, and StrictMode no longer creates the instance twice. Tests that assert disposal right after `unmount()` need `await flush()` first.

`@blac/core`

- `depend()` edges are released for an owner the registry did not create, and for one whose `init()` throws.
- `depend(Type)` no longer throws at construction when `Type` has a `static key` and no default args.
- An instance recreated under the same key by a `disposed` listener is no longer dropped from the registry.
- The dev args-mismatch warning fires once per instance and no longer throws for non-plain args.
- `release()` without a `refId` drops an auto-generated ref before a named one.
- `borrow()` is a plain lookup and no longer cancels a pending sweep.
- The per-instance `stateChanged` event is skipped when emits cancel out within a tick.
- New: `registry.destroy()` for a registry that is going away, used by `blacTestSetup()`; `watch(..., { registry })`.

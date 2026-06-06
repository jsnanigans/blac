---
"@blac/core": major
---

**BREAKING:** Remove the remaining legacy/back-compat surfaces.

- `StateContainer.subscribe(listener)` (listener-style override) is gone.
  `instance.subscribe` now resolves to the inherited path-scoped
  `StructuralContainer.subscribe(interest, cb)` (a pass-through to
  `instance.channel.subscribe`). For coarse state observation use
  `watch(Bloc, cb)` or `onSystemEvent('stateChanged', cb)`.
- The internal `EMIT` symbol export is removed — use the public `emit()`.
- `flushBlocUpdates()` (deprecated alias in `@blac/core/testing`) is removed —
  use `flush()`.

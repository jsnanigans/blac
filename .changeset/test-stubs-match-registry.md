---
'@blac/core': minor
---

Test stubs now initialize like registry-created instances.

- Per-class `equality` is resolved at construction, so it also applies to a
  bare `new`.
- `createCubitStub` always runs `init()`. A stub for a bloc with required
  `args` must now pass them, or its `init()` receives `undefined`.
- `createCubitStub` and `withBlocState` apply `state` to any
  `StateContainer`, not only `Cubit`; it was silently dropped before.

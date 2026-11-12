---
'@blac/core': minor
'@blac/react': patch
'@blac/logging-plugin': patch
---

Move to `@dirtytalk/structural` 0.2.

- core: breaking: the `channel` getter and `subscribe(interest, cb)` are gone. Use `bloc.subscribe(cb)` for every change, or `bloc.consume(cb)` and `consumer.setPaths(paths)` for path-scoped changes. `registerConsumerPaths`, `unregisterConsumer`, `getConsumerPaths` and `subscribePaths` are removed with them.
- core: `patch` goes through `emit`, so the configured equality applies to patches and a patched array wakes only the readers of the entries that changed.
- core: frozen state (immer output) is tracked as precisely as mutable state.
- core: plugins get `ALL_PATHS` in `onStateChange` when the change touched no watched path; otherwise the changed ids among the watched paths, as before.
- react: `useBloc` registers one consumer per container instead of a subscription plus a path registration.

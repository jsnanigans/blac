---
'@blac/core': patch
---

- `hasInstance()` returns `false` for a disposed entry that is still in the
  registry.
- Registry read methods no longer allocate an empty map for unknown types.
- Registry errors name classes by `getBlacName`, so they survive
  minification.
- `onSystemEvent` after dispose is a no-op.
- Merge `StateContainerRegistry.registerType` into the registry internals;
  use `register()` to register a class explicitly. Instances added with
  `insertInstance` (test overrides) are now tracked, so `clearAll()` disposes
  them.

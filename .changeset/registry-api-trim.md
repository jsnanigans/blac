---
'@blac/core': patch
'@blac/react': patch
---

Remove unused registry API and fix `BlocProvider` args comparison.

- core: removed the registry `stateChanged` lifecycle event (and `hasStateChangedListeners`). Use a plugin's `onStateChange` or `onSystemEvent('stateChanged')`.
- core: removed `register()` and `registry.register()`; types register on first acquire.
- core: removed `registry.resolveKey()`; use `resolveInstanceKey(BlocClass, args)`.
- react: `BlocProvider` compares `args` structurally instead of with `JSON.stringify`, so it no longer throws on cyclic or BigInt args or misses a change inside a `Map`, `Set` or class instance.

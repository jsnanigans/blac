---
'@blac/core': patch
---

`getPluginManager(registry?)` returns a plugin manager for any registry, so
plugins can observe scoped registries (e.g. one passed to
`RegistryProvider`). Without an argument it still returns the global one.

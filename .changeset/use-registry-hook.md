---
'@blac/react': minor
---

Add `useRegistry()`, which returns the registry `useBloc` uses: the nearest
`RegistryProvider`'s, else the global one. The plain `@blac/core` helpers
always use the global registry (`getRegistry()`).

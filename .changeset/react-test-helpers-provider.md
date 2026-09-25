---
'@blac/react': patch
---

`renderWithBloc` and `renderWithRegistry` no longer swap the global registry.
They restored it only in an overridden `unmount()`, which Testing Library's
automatic `cleanup()` bypasses, so the swap leaked into later tests. Setup now
runs under a temporary registry and the UI renders inside a
`RegistryProvider`.

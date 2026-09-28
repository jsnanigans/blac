---
'@blac/react': patch
---

`useBloc` now moves tracked deps to the new registry when a `RegistryProvider` swaps its registry, and releases them from the old one.

---
'@blac/react': patch
---

`BlocProvider` passes on new `args` when a field that `static key` ignores
changes; `useProvidedArgs` used to keep returning the old object.

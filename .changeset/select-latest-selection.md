---
'@blac/react': patch
---

Compare `select` results against the latest render. The selection was only
computed on the first render, so a selector depending on props could skip a
needed re-render after the props changed.

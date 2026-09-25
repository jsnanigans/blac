---
'@blac/core': patch
---

`release()` with a ref that isn't held is now a no-op, as documented. It
used to emit `refReleased` and could dispose an instance created with
`ensure()`.

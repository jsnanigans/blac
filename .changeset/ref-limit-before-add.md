---
'@blac/core': patch
---

The `maxRefsPerInstance` check now runs before the ref is added, so a
rejected `acquire()` no longer leaves a ref behind.

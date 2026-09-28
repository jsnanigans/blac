---
'@blac/core': patch
---

The `flush()` test helper keeps draining until a round passes with no new
state change, so emits made by subscribers are flushed too.

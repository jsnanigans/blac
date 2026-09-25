---
'@blac/react': patch
---

Dispose cross-bloc `.track()` deps created by a render that never commits
(SSR or a discarded render). Previously only the primary bloc was swept, and
the dep stayed registered forever.

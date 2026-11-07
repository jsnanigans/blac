---
'@blac/react': patch
---

A getter that calls `.track()` on the same dep more than once now keeps the reads made after the second call, so the component re-renders when they change.

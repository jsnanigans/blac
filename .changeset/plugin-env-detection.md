---
'@blac/core': patch
---

Treat an unknown environment as production when filtering plugins, matching
the rest of the library. A browser bundle without `process` (or an unset
`NODE_ENV`) previously installed plugins marked `environment: 'development'`.

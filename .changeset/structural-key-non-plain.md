---
'@blac/core': patch
---

Throw in development when `args` contain a `Map`, `Set` or class instance
without `toJSON`. They all serialized to `{}`, so different args silently
shared one instance key. Production behavior is unchanged.

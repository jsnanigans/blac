---
'@blac/core': patch
---

`patch(partial, { merge: 'shallow' })` replaces each given top-level key instead of deep-merging, for writes that must drop nested keys (reset a record to `{}`, remove an entry). Deep merge stays the default.

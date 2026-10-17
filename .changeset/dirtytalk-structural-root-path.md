---
'@dirtytalk/structural': patch
'@blac/devtools-ui': patch
---

`interner.lookup(rootId)` returns `''` instead of the internal `\0root`
sentinel; devtools shows it as `<root>`.

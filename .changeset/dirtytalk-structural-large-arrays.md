---
'@dirtytalk/structural': patch
---

Track arrays over 256 items as a whole instead of per index and field, so
huge lists no longer grow the interner and diff one path per element.

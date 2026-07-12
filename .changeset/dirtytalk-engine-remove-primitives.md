---
"@dirtytalk/engine": minor
---

BREAKING: removed the `/primitives` subpath (`Signal`, `Observable`); no
in-repo consumers existed. Migrate to `DirtyChannel` or vendor the class.

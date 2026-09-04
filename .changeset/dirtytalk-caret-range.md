---
'@dirtytalk/structural': minor
'@dirtytalk/spatial': minor
---

Move to `0.1.0` so caret ranges resolve.

Both packages were on `0.0.x`, where `^0.0.8` resolves to exactly `0.0.8` —
the caret carries no range. Dependents such as `@blac/core` therefore pinned a
single structural patch and needed their own release to ship any structural
fix. From `0.1.0`, `^0.1.0` admits patches as intended.

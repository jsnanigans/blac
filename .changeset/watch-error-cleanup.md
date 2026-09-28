---
'@blac/core': patch
---

`watch()` releases what it acquired when setup fails. If acquiring a target or
the first callback threw, earlier refs and subscriptions were never released.
All acquires and releases now also use the registry captured when `watch()`
was called, so a `setRegistry` in between can no longer split them across
registries.

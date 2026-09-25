---
'@blac/core': patch
'@blac/react': patch
---

Move the internal framework symbols (`APPLY_DEPS`, `REMOVE_DEPS_OWNER`,
`INIT_CONFIG`, `ON_DISPOSE`, `WITH_TRACKED_STATE`, `DEP_BRAND`) from the
main `@blac/core` entry to `@blac/core/internal`, and replace the registry's
`insertInstance` method with the internal `INSERT_INSTANCE` symbol. These
were never public API.

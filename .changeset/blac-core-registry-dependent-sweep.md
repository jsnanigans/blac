---
"@blac/core": patch
---

Fix two registry lifecycle leaks. Disposing an instance directly (bypassing
`release()`) now self-prunes it from the registry's instance map and from
`getAll()`, instead of leaving a stale entry behind. `depend()`-resolved
dependencies are now tracked as dependent edges on the owner and released
when the owner is disposed (direct `dispose()`, `release(..., { forceDispose:
true })`, or `clear()`), so a non-keepAlive dependency created via `depend()`
no longer leaks after every owner referencing it has gone away; keepAlive
dependencies are unaffected and diamond-shared dependencies are only disposed
once their last owner is gone.

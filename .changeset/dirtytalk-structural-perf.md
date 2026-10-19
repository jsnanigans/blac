---
'@dirtytalk/structural': patch
'@blac/react': patch
---

Faster tracking and diffing: `trackRender` uses a single handler object per
proxy (no per-proxy closures or path strings), `emit` and array `patch` stop
diffing a path at the first shared reference, and `patch` builds no path
strings. `registerConsumerPaths` stores a snapshot, so a tracking set that
keeps growing after registration no longer corrupts the skeleton for other
consumers. `patch` now wakes `ALL_PATHS` subscribers when per-path equality
calls every patched value equal. `useStructural` disarms its tracker at
commit, reuses proxies across renders and expands its interest with ancestor
watches. Exports `expandWithAncestors`, which `@blac/react` now imports
instead of keeping its own copy.

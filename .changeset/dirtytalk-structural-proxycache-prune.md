---
"@dirtytalk/structural": patch
---

Fix two internal `dirtytalk-structural` issues: `ProxyCache` no longer
accumulates one cache entry per prefix an object has ever been read at (e.g.
an item that shifts index across renders) — `disarm()` now prunes each
touched target down to just the prefixes read during that render. Also,
`StructuralContainer.getConsumerPaths()` now returns a detached snapshot
`Map` instead of the live per-consumer registry, so callers can no longer
mutate live path-tracking state through the inspection API.

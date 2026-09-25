---
'@blac/core': patch
---

Stop a disposed bloc from pinning its dependencies. Calling `track()` or
`untracked()` on a dep handle after the owner was disposed (for example, an
async method resolving after unmount) registered the dead owner as a
dependent, so the dep was never disposed. It now records no edge, sweeps a
dep that nothing else owns, and warns in development.

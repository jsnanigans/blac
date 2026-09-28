---
'@blac/core': minor
'@blac/react': patch
---

Sweep instances created during a render after a grace period instead of at the
end of the microtask.

A time-sliced render (`startTransition`) can yield between render and commit,
so the microtask sweep disposed the new instance before the commit claimed it.
`useBloc` then recreated it: the constructor and `init()` ran twice and the
component rendered an extra time. The delay is configurable with
`configureBlac({ unownedSweepDelayMs })` (default `5000`); another render that
reuses the still-unclaimed instance restarts it.

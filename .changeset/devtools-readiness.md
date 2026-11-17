---
'@blac/devtools-connect': patch
'@blac/devtools-ui': patch
---

DevTools readiness fixes: the overlay renders nothing in production and
connects to an agent installed after it opened; Alt+D no longer toggles while
typing and also works in the pop-out window. The selection follows a
re-created keyed instance, disposed instances keep only their final state, and
large instance lists and logs stay fast. Fixed a re-created instance being
dropped from the panel when an evicted disposed instance had the same id.

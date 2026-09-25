---
'@blac/core': patch
---

The plugin manager subscribes to container state only while an installed
plugin implements `onStateChange`, so plugins without it no longer disable
the single-consumer fast path. A plugin whose `onInstall` throws no longer
receives `onCreated` for existing instances.

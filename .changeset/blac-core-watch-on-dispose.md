---
"@blac/core": patch
---

`watch()` now subscribes to each watched instance's own dispose hook (new
`@internal` `ON_DISPOSE` symbol delegating to the existing per-instance
`onSystemEvent('dispose')` channel) instead of filtering the registry's
global `disposed` broadcast. Behavior is identical — the handler fires
only for that exact instance's disposal — but unrelated container
disposals no longer cost a check per active watcher.

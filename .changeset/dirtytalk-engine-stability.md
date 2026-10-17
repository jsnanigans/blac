---
'@dirtytalk/engine': patch
---

`DirtyChannel` no longer gets stuck when a `Space` method throws during a
flush: such errors are reported like subscriber errors and later marks flush
normally. Disposing a channel from a callback now stops the rest of that
flush. `ManualScheduler` gains `cancel(flush)`.

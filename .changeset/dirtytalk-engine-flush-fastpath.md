---
"@dirtytalk/engine": patch
---

Skip the subscriber-array snapshot in `DirtyChannel`'s flush when there is
at most one subscriber. The single entry is read and run directly with the
same `alive`/interest/error semantics as the snapshot loop, removing one
array allocation per flush in the common single-consumer case. Re-entrancy
contracts are unchanged: a subscriber added mid-flush still does not run
until the next flush, and self-unsubscription mid-callback ends cleanly.

---
'@dirtytalk/structural': patch
'@blac/react': patch
---

Faster updates with many row consumers. `emit` and `patch` diff along the consumer skeleton as a path trie, skipping unchanged subtrees by reference, and the new `subscribePaths(cb)` dispatches a flush by looking up the changed paths instead of checking every subscriber. `useStructural` and `useBloc` use it. One changed item of a 1,000-row list now costs ~10 µs in structural (was ~65 µs for `emit`, ~100 µs for `patch`). Removed `PathInterner.ancestorIds`, which nothing uses any more.

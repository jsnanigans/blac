---
'@dirtytalk/structural': patch
'@blac/react': patch
---

Faster tracking and mounting. Tracking proxies no longer register in a global `WeakMap` for `raw()`, a child proxy drops its parent path once per render instead of on every read, and own properties are read without `Reflect.get`. A getter defined on a state object itself now runs against the raw object: its path is still tracked, but the reads inside it are not recorded separately. Path subscriptions, skeleton diffs and `useBloc`'s dependency session allocate less per consumer.

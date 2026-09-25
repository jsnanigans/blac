---
'@blac/core': patch
---

`blacTestSetup()` disposes every instance in the test registry after each
test, so `onDispose` and plugin teardown run between tests.

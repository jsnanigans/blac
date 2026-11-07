---
'@blac/core': patch
'@blac/react': patch
---

Require `@dirtytalk/structural` 0.1.5, which fixes stale renders from dotted, backslash or NUL keys, values changing kind (object, array, `null`), keys added or removed with an `undefined` value, own-property checks (`Object.hasOwn`), and patches to an array root.

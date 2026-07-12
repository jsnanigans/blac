---
"@dirtytalk/structural": patch
---

Fix `deepMerge` prototype pollution via a `"__proto__"` own key in a patch
(e.g. one produced by `JSON.parse`). The merge loop now routes that one key
through `Object.defineProperty` instead of bracket assignment, so it lands as
a plain own property on the merged result instead of rewriting the result's
prototype.

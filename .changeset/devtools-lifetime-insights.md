---
'@blac/devtools-connect': patch
'@blac/devtools-ui': patch
---

DevTools shows each instance's lifetime (`keepAlive` / `isolated`), owners, hydration status and the refs holding it in a new **Info** view, marks idle and hydrating instances in the list, warns about classes with short-lived instances, exposes the selected instance as `$bloc` in the page console, and can download an instance's recorded history.

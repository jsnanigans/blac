---
'@blac/react': patch
---

Keep cross-bloc `.track()` subscriptions alive under `<StrictMode>`.

StrictMode's simulated unmount released the dep, and the remount skipped the
reconcile, so a `keepAlive` consumer lost its dep subscription and the dep
could be disposed while still on screen.

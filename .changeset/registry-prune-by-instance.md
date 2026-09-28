---
'@blac/core': patch
---

Release `depend()` dependencies when a disposed bloc shares its name with
another class.

The registry pruned disposed entries by `$blac.id` (`<name>:<key>`), which
collides for same-named classes, including minified builds. The prune then
failed, so the disposed bloc's dependencies were never released. Entries are
now pruned by instance.

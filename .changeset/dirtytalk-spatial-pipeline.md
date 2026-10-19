---
'@dirtytalk/spatial': patch
---

- `data` and `layout` damage now runs even for zero-size or off-screen nodes.
- Each node runs `rebuildData` and `doLayout` at most once per frame.
- `setBounds` re-lays-out the parent, as documented.
- `beginFrame` regions are clamped to the root bounds. Empty rects are
  dropped, a rect merges into an earlier region when their bounding rect is
  no larger than both together (a contained rect, a small move's
  erase/fill pair), and more than 16 regions collapse to the bounding rect
  of all of them.
- Damage raised by `rebuildData`/`doLayout` (a layout moving its children)
  is painted in the same frame instead of the next one.
- `batch` keeps `setBounds`' layout damage on the parent.
- The paint walk skips children outside the regions' bounding rect before
  testing each region.
- `batch` emits its damage even when the callback throws.
- `adoptChild` throws instead of creating a cycle.
- Adds `SceneRoot.dispose()`.
- Accumulating marks in a frame no longer copies the damage list on every mark.

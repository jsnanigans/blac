---
'@dirtytalk/spatial': minor
---

- `data` and `layout` damage now runs even for zero-size or off-screen nodes.
- Each node runs `rebuildData` and `doLayout` at most once per frame.
- `setBounds` re-lays-out the parent, as documented.
- `beginFrame` regions are clamped to the root bounds. Empty rects and rects
  inside another region are dropped, and more than 16 regions collapse to
  their bounding rect.
- `batch` emits its damage even when the callback throws.
- `adoptChild` throws instead of creating a cycle.
- Adds `SceneRoot.dispose()`.
- Accumulating marks in a frame no longer copies the damage list on every mark.

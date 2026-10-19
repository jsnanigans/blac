# @dirtytalk/spatial

## 0.1.2

### Patch Changes

- 2d3df09: Adds `protected SceneRoot.paintFrame(regions)`, so a subclass can replace the
  paint stage while keeping the data/layout stages, region clamping and timing.
- 52fd085: - `data` and `layout` damage now runs even for zero-size or off-screen nodes.
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
- Updated dependencies [b3309b2]
  - @dirtytalk/engine@0.2.2

## 0.1.1

### Patch Changes

- 6c8f484: Nothing but a patch to pick up the protected-mutation change.

  Both packages already sit on `0.1.0`, where `^0.1.0` admits patches as
  intended — on `0.0.x` a caret carried no range at all, so dependents such as
  `@blac/core` pinned a single structural patch.

## 0.0.6

### Patch Changes

- Sync
- Updated dependencies
- Updated dependencies [9012194]
- Updated dependencies [9012194]
- Updated dependencies [f592ebd]
  - @dirtytalk/engine@0.2.0

## 0.0.5

### Patch Changes

- Updated dependencies
  - @dirtytalk/engine@0.1.0

## 0.0.4

### Patch Changes

- Refresh pinned dependency versions across the monorepo. No public API changes.
- Updated dependencies
  - @dirtytalk/engine@0.0.4

## 0.0.3

### Patch Changes

- Add dts
- Updated dependencies
  - @dirtytalk/engine@0.0.3

## 0.0.2

### Patch Changes

- replace core
- Updated dependencies
  - @dirtytalk/engine@0.0.2

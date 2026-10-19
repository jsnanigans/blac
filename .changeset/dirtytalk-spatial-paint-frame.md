---
'@dirtytalk/spatial': patch
---

Adds `protected SceneRoot.paintFrame(regions)`, so a subclass can replace the
paint stage while keeping the data/layout stages, region clamping and timing.

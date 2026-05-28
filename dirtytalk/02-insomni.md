# Insomni Instantiation — Rect-based Damage

Insomni's instantiation of the shared engine. Replaces today's `Invalidator` (single dirty bit) with a damage-rect model that scales from "redraw the whole canvas" today to per-tile/per-scissor partial redraw later, with no API change to consumers.

---

## Today's problem

Insomni currently has `Invalidator` (in `packages/insomni/src/scheduler.ts`) — a dirty flag with `dirty: boolean`, `invalidate()`, `clear()`, plus auto-subscribe helpers (`track`, `trackElement`). Apps own the RAF loop, expose `needsFrame(): boolean`, and only paint when dirty.

This works for the "happy path" — pointer events on the canvas trigger `trackElement` which marks dirty, the next RAF tick paints, fields read during paint reflect the post-event mutations. But the design has structural holes:

1. **The UI widgets (`Button`, `Slider`, `Dropdown`, `ColorPicker`) have zero `Invalidator` integration.** Mutations to widget fields outside a tracked DOM event don't dirty anything. Programmatic state changes (`slider.value = 0.5` from a non-event-handler context) silently fail to redraw.
2. **`pointermove` is excluded from default tracked events.** Widgets that change appearance on hover only redraw if some other event fires. Hover-sensitive demos must opt in explicitly.
3. **Single dirty bit means full canvas repaint.** Even when one button changes colour, the entire canvas is re-rasterised. No path to scissor/tile partial redraw.
4. **No layout/data/paint distinction.** All dirtiness is the same kind. The plot library can't say "data changed, rebuild marks, then paint" vs "viewport changed, just paint."

---

## Design overview

Insomni adopts the engine with three additions on top:

- **`RectSpace`** — the `Space` implementation, with `Region = Rect[]` (or a more efficient compact representation).
- **`SceneNode`** — a base class for anything that paints; owns its bounds, contributes to damage when mutated, owns its subscriptions.
- **`DamageKind`** — a small enum (`paint` / `layout` / `data`) attached to damage entries so the render pipeline knows which stages to run.

These live in `packages/insomni/src/reactive/` (or similar).

---

## `RectSpace`

```ts
type Rect = { x: number; y: number; w: number; h: number }
type Damage = { rect: Rect; kind: DamageKind; node?: SceneNode }
type DirtyRegion = Damage[]  // v1: simple array. v2: spatial index.

const RectSpace: Space<DirtyRegion> = {
  empty: () => [],
  isEmpty: (r) => r.length === 0,
  union: (a, b) => a.length === 0 ? b : b.length === 0 ? a : [...a, ...b],
  intersects: (interest, dirty) => {
    if (interest.length === 0 || dirty.length === 0) return false
    for (const i of interest) for (const d of dirty) if (rectOverlaps(i.rect, d.rect)) return true
    return false
  },
}
```

**v1 representation:** plain array of `Damage` entries. Union concatenates. Intersection is O(N×M) — acceptable for small N (≤100 entries per frame, typical).

**v2 representation (future):** a coarse spatial index (e.g., a 64×64 occupancy grid in screen coords). Union ORs bits; intersection ANDs. Constant-time per-rect operations regardless of N. Worth doing when tile-based partial redraw lands and N can grow.

**Coalescing:** at flush time, the renderer can compute a single bounding rect (union of all `Damage.rect`) for the v1 "repaint whole canvas region" path. In v1 the bounding rect is typically the whole canvas; in v2 it's tighter and the tile dispatcher uses individual entries.

---

## `DamageKind`

```ts
type DamageKind = 'paint' | 'layout' | 'data'
```

- **`paint`** — pixel state stale within the rect. Re-rasterise. Most common; emitted by visual-only field changes (hover, pressed, value position).
- **`layout`** — bounds changed. Re-layout parent (if any), damage **old bounds** as `paint` (to erase) and **new bounds** as `paint` (to fill), then re-emit any laid-out children's positions.
- **`data`** — for plots: input data set changed. Trigger a heavier pipeline: re-bin / re-stack / re-scale → rebuild mark geometry → then `paint`.

The render pipeline processes damage in kind order: `data` → `layout` → `paint`. Earlier stages can promote damage entries to later stages (a `data` change always implies `layout` and `paint` for its node).

---

## `SceneNode`

```ts
abstract class SceneNode {
  bounds: Rect
  parent: SceneNode | null = null
  private queued: boolean = false

  abstract paint(layer: Layer): void

  // For nodes that own data/layout pipelines (e.g., plot mark layers)
  rebuildData?(): void
  doLayout?(): void

  protected markDamaged(kind: DamageKind, rect?: Rect): void {
    const r = rect ?? this.bounds
    this.root().channel.mark([{ rect: r, kind, node: this }])
  }

  protected batch(fn: () => void): void { ... }   // see below
  protected root(): SceneRoot { ... }              // walks parent chain
}
```

**Mutation discipline:**

- All observable state is **private**, accessed via getters/setters.
- Setters: `if (this._x === v) return; this._x = v; this.markDamaged('paint')`.
- Internal methods (pointer handlers, animation steps) use the setters, **not** direct private-field assignment.
- Multi-field mutations within one logical action wrap in `batch(() => { ... })`, which defers `markDamaged` calls to the end of the block and emits a single damage entry covering the union.

**`SceneRoot`:**

```ts
class SceneRoot extends SceneNode {
  channel: DirtyChannel<DirtyRegion>
  renderer: Renderer2D

  constructor(renderer: Renderer2D) {
    this.channel = new DirtyChannel(RectSpace, new RAFScheduler())
    this.channel.subscribe(
      () => [{ rect: this.bounds, kind: 'paint' }],   // root cares about everything
      (dirty) => this.renderFrame(dirty),
    )
  }

  private renderFrame(dirty: DirtyRegion): void {
    // Stage 1: data
    for (const d of dirty) if (d.kind === 'data' && d.node?.rebuildData) d.node.rebuildData()
    // Stage 2: layout
    for (const d of dirty) if (d.kind !== 'paint' && d.node?.doLayout) d.node.doLayout()
    // Stage 3: paint
    const paintRegion = unionRects(dirty.map(d => d.rect))
    this.renderer.beginFrame(paintRegion)
    this.walkAndPaint(paintRegion)
    this.renderer.endFrame()
  }
}
```

---

## Bounds tracking

Bounds changes are the trickiest case. Naïve `setBounds(r)` must:

1. Damage the **old** bounds as `paint` (to erase the node's previous footprint).
2. Update `this.bounds = r`.
3. Damage the **new** bounds as `paint` (to fill).
4. Mark the node as `layout` if the parent does layout-sensitive composition.

```ts
setBounds(next: Rect): void {
  if (rectEquals(this.bounds, next)) return
  const prev = this.bounds
  this.markDamaged('paint', prev)
  this.bounds = next
  this.markDamaged('paint', next)
  if (this.parent) this.markDamaged('layout')
}
```

In v1 (full-canvas repaint), the erase step is implicit — the whole frame clears. In v2 (partial repaint), the erase step is what makes movement visually correct.

---

## Pointer routing

Today, pointer events are handled by the app or demo, which dispatches to widgets directly. With `SceneNode`, the root can own pointer routing:

```ts
class SceneRoot {
  hitTest(x: number, y: number): SceneNode | null { ... }   // walks tree in z-order

  attachPointerEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', e => { ... dispatch to hit node ... })
    // pointermove also routes; widgets that change on hover handle it via markDamaged
  }
}
```

This subsumes today's `trackElement` safety net. Hover is no longer a special case — `pointermove` always dispatches; widgets that don't care ignore it; widgets that do call `markDamaged('paint')`. No more "did the demo opt in to hover" question.

---

## Plot integration

Each mark layer is a `SceneNode`. The plot's viewport is a `Signal<ViewportState>` that mark layers subscribe to in their constructor:

```ts
class MarkLayer extends SceneNode {
  constructor(private viewport: Signal<ViewportState>) {
    super()
    viewport.subscribe(() => this.markDamaged('paint'))
  }
  rebuildData() { /* re-bin against new data */ }
  paint(layer: Layer) { /* push commands using current viewport */ }
}
```

Viewport pan/zoom: one signal write fans out to N mark layers, each pushing one `paint` damage entry. Data update: caller invokes `markLayer.setData(...)` which marks `data`; the render pipeline rebuilds before painting.

Existing `MountedPlot` signals (`hovered`, `selected`, `brushed`, `hidden`) become standard `Signal<T>` instances — consumers (HUD overlay, React) subscribe via the engine primitives, not through ad-hoc wiring.

---

## Migration order

The transition is staged so insomni stays shippable at every step.

**Stage 0 — engine landing.** Add `@reactive/primitives` and `@reactive/dirty-channel` packages. No insomni changes yet.

**Stage 1 — wrap today's `Invalidator`.** Add a `SceneRoot` whose `paint` damage subscriber calls today's full-canvas paint. Replace `Invalidator.invalidate()` call sites with `root.markDamaged('paint')`. Behaviour unchanged; everything still over-paints.

**Stage 2 — convert one widget.** Pick `Slider` (smallest with non-trivial mutation). Make it a `SceneNode` with setters and `batch`. Verify ergonomics in real example code.

**Stage 3 — convert remaining primitives.** `Button`, `Dropdown`, `TabButtons`, chrome (`Sidebar`, `ScrollList`, `ResizeBox`).

**Stage 4 — convert composites.** `ColorPicker`. This is the stress test: nested widgets as child `SceneNode`s, multi-rep colour state, gradient stop list.

**Stage 5 — convert plot.** Mark layers, viewport, axes, HUD as `SceneNode`s. Existing signals stay as `Signal<T>`.

**Stage 6 — renderer partial redraw.** First scissor-rect partial redraw (single bounding rect of the damage list). Then tile dispatcher (per-tile decision based on damage occupancy grid).

Stages 0–5 are pure plumbing — same visual output, better foundation. Stage 6 lights up the perf win.

---

## What this design buys

- **Certainty.** Every state change goes through a setter that calls `markDamaged`. There is no syntactic path to mutate observable state without contributing damage. Programmatic mutation (`slider.value = 0.5` from anywhere) redraws correctly.
- **Granularity-ready.** Damage carries rects, not booleans. v1 ignores the per-rect info; v2 uses it. No API change.
- **Kind awareness.** `data`/`layout`/`paint` lets the render pipeline run the right stages. No more "data changed but the plot didn't re-bin because we just repainted."
- **Debuggability.** Damage list is inspectable per frame. Build a debug overlay that draws damage rects coloured by kind; trivially see what's invalidating and why.
- **No widget-author footguns.** The only way to make a widget "miss" a redraw is to mutate a `_` field directly, which a lint rule can ban.

---

## What this design does NOT do

- **Auto-track observable reads.** `paint()` reads any node's fields; the engine doesn't watch. Painting is invoked because *the node was damaged*, not because *its fields were read*. Different model from React/MobX.
- **Virtual scene diff.** Nodes don't produce a tree of intent that the engine diffs. Nodes mutate; they declare their own damage. The renderer trusts the declaration.
- **Cross-frame animation scheduling.** Animation libraries (the existing `AnimatedValue`) integrate by calling `markDamaged('paint')` per step while active. The engine doesn't know what an "animation" is.
- **Cull/culling.** Off-screen nodes are still painted if damaged. Culling is a renderer optimisation, layered above.

---

## Decisions

1. **Z-ordering and overlap** — **out of scope for v1.** The library produces the damage list; ordering/walking concerns are deferred. v1 paints by tree-walk in current z-order regardless of damage list ordering. Revisit when partial redraw lands.
2. **Children of layout-damaged nodes** — double-emission is allowed. The flush-time pass de-dupes / flattens overlapping damage entries before handing them to the renderer. Simpler than enforcing single-emit discipline at every call site.
3. **Clip rects** — `markDamaged` clamps its rect to the ancestor clip stack **when an ancestor explicitly disallows overflow** (e.g., viewports, scroll containers). Ancestors that allow overflow contribute nothing to clipping. Each `SceneNode` declares `clipsOverflow: boolean` (default `false`); the clamp walks the ancestor chain and intersects against every node where it's `true`.
4. **DPR / device pixel ratio** — damage rects are in **CSS pixels** at the `SceneNode` layer. The renderer multiplies by DPR when scissoring/clipping at the GPU stage.
5. **`AnimatedValue` migration** — yes. Replace the `invalidator: Invalidator` option with `node: SceneNode`. Each `step()` call while `active` invokes `node.markDamaged('paint')`. Fewer wiring concepts, single source of truth for "what needs to repaint."
6. **Off-screen / not-yet-attached nodes** — `markDamaged` is a silent no-op when the node has no `parent` chain to a `SceneRoot`. State mutations still apply (the setter writes the field); damage just doesn't propagate. On attach (`parent.adoptChild(node)`), the node emits a single full-bounds `paint` damage entry to ensure the newly-visible region is painted. No buffering, no queue.

## Open questions

(none — all insomni-layer questions resolved)

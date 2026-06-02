---
title: Concepts
description: The model behind @dirtytalk/spatial — why a single dirty bit loses information, the damage list that replaces it, and the data → layout → paint pipeline.
---

This page explains the model behind `@dirtytalk/spatial`: why a single dirty bit is not enough, how the damage list replaces it, and how the scene root turns a flushed list of damage into ordered data → layout → paint work. It is the _why_ and the _mental model_. For a hands-on walkthrough, start with [Getting Started](/dirtytalk/spatial/getting-started); for the exhaustive surface, see the [API Reference](/dirtytalk/spatial/api-reference).

## The problem: a single dirty bit loses information

After a mutation, every renderer faces three questions: _what_ changed, _who_ cares, and _when_ do we tell them. The naive answer is a boolean: "something is dirty, repaint." That bit is cheap to set and tells you nothing useful. It cannot tell the renderer _which pixels_ to redraw, so the renderer clears the whole canvas. It cannot tell the pipeline _what kind_ of change happened, so even a colour tweak re-runs layout. The dirty bit is lossy by construction — it throws away precisely the information you need to do less work.

The fix is to make "what changed" a _value_, not a flag. In the 2D-spatial domain that value is a list of **damage entries**, each carrying a rectangle (where) and a kind (what sort of change). A subscriber can intersect its interest against the list cheaply; the renderer can rasterise exactly the listed rectangles; the pipeline can decide, per entry, which stages to run. The damage list is computed once at the source and shared by everyone downstream.

This is the DirtyTalk thesis applied to pixels. The same engine primitives power [`@dirtytalk/structural`](/dirtytalk/structural/concepts) for state-shaped domains; there the region is a set of paths instead of a set of rects.

## Rect: the unit of "where"

A `Rect` is an axis-aligned rectangle in CSS pixels, with a top-left origin:

```ts
interface Rect {
  x: number;
  y: number;
  w: number; // width  — note: w/h, not width/height
  h: number;
}
```

All spatial geometry is expressed in these. The package ships a small set of pure rect helpers — no side effects, allocation-light:

| Helper                    | Answers                                                  |
| ------------------------- | -------------------------------------------------------- |
| `rectOverlaps(a, b)`      | Do these two rects share positive area?                  |
| `rectEquals(a, b)`        | Are these structurally identical (field-by-field `===`)? |
| `unionRects(rects)`       | What is the bounding box of all of these?                |
| `rectClamp(inner, outer)` | What is the intersection of these two?                   |
| `pointInRect(x, y, r)`    | Does this point fall inside this rect?                   |

Two conventions matter and are consistent across the package:

- **Half-open intervals.** Both `rectOverlaps` and `pointInRect` treat the bottom and right edges as _exclusive_: a point at `r.x + r.w` is _outside_, and two rects whose edges merely touch do **not** overlap. This matches the CSS pixel-grid convention and means adjacent tiles never double-count a shared edge.
- **Zero-area rects are empty.** A rect with `w <= 0` or `h <= 0` overlaps nothing and contains no points. `unionRects([])` returns the origin sentinel `{ x: 0, y: 0, w: 0, h: 0 }`.

:::caution[`rectClamp` is intersection, not "move inside"]
Despite the name, `rectClamp(inner, outer)` returns the _geometric intersection_ of the two rects, flooring width and height at zero. If `inner` lies entirely outside `outer`, you get a zero-area rect — not `inner` nudged inward. It is used to clip damage to clipping ancestors, which is exactly an intersection.
:::

## DamageKind: the unit of "what sort"

Each damage entry carries a `kind` that classifies the change and, through it, decides which pipeline stages run:

```ts
type DamageKind = 'paint' | 'layout' | 'data';
```

| Kind     | Emit when                                                                                | Stages triggered                                    |
| -------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `paint`  | A visual-only field changed — colour, label, pressed/hover state. Geometry is unchanged. | Paint only.                                         |
| `layout` | The node's bounds changed. `setBounds` emits this for the parent automatically.          | Layout (`doLayout`) → paint.                        |
| `data`   | The underlying data set changed — e.g. new plot samples that must be re-binned.          | Data (`rebuildData`) → layout (`doLayout`) → paint. |

The ordering is a containment hierarchy: `data` implies `layout` implies `paint`. A `data` change must rebuild derived data, which may move things, which must be redrawn. A `paint` change skips straight to drawing. Stage selection is **per entry**: in a single flush that mixes kinds, a `data` node runs all three stages while a `paint` node in the same flush only paints.

A full damage entry is:

```ts
interface Damage {
  rect: Rect;
  kind: DamageKind;
  node?: unknown; // the emitting SceneNode at runtime; optional for root-level marks
}
```

`node` is typed `unknown` on purpose so the `types.ts` module has no import cycle with `scene-node.ts`. At runtime it holds the `SceneNode` that emitted the damage (the root casts it back when running the pipeline). It is optional because damage pushed directly into the channel — not through a node — may have no owning node.

## RectSpace: the algebra the channel speaks

The engine's `DirtyChannel` is generic over a region type via a `Space<Region>` — four pure methods that define how regions combine and test for overlap. `RectSpace` is that algebra instantiated for `DirtyRegion`, which is simply `readonly Damage[]`:

```ts
type DirtyRegion = readonly Damage[];

// RectSpace satisfies Space<DirtyRegion>:
//   empty()                 -> []  (a fresh array each call)
//   isEmpty(r)              -> r.length === 0
//   union(a, b)             -> [...a, ...b]  (with identity short-circuits)
//   intersects(interest, d) -> any interest rect overlaps any dirty rect
```

Three properties of this v1 implementation are worth internalising:

- **`union` is concatenation with a reference short-circuit.** If one side is empty, the other side is returned _by reference_ (no copy); otherwise the two arrays are concatenated into a fresh one. There is no dedup and no geometric merge — damage entries accumulate as a plain list. This is safe precisely because `DirtyRegion` is `readonly`: nobody may mutate an array returned by `union` or `empty`.
- **`intersects` ignores `DamageKind`.** Overlap is purely geometric: it returns `true` as soon as any interest rect overlaps any dirty rect, regardless of kind. A `paint` interest matches a `layout` damage at the same rect.
- **It is O(N×M).** Both `union` and `intersects` are linear/quadratic over a plain array. There is no spatial index in v1. For typical per-frame damage counts this is cheap; it is a deliberate simplicity trade-off, not an oversight.

:::note[Why a list and not a merged region?]
A merged region (one big union rect, or a coverage mask) would lose the disjoint structure that makes partial redraw pay off. Keeping damage as a list of individual rects lets a multi-rect-scissor renderer skip the dead space _between_ damaged areas — most importantly the gap a node leaves behind when it moves. See the move discussion under `setBounds` below.
:::

## SceneNode: who owns bounds and emits damage

A `SceneNode` is one node in the retained scene tree. It is abstract — you subclass it and implement `paint`. Its responsibilities:

- **Own its `bounds`.** The node's axis-aligned rectangle. Mutate it through `setBounds` (which tracks damage) rather than assigning directly.
- **Hold the parent chain.** `parent` and `children` form the tree. `children` is in _adoption order_, which is also _z-order_: later-adopted children are topmost.
- **Emit damage.** The protected `markDamaged(kind, rect?)` is how a node declares that a region of itself changed. The rect defaults to the node's bounds and is clipped on the way up by any ancestor with `clipsOverflow === true`.
- **Coalesce mutations.** The protected `batch(fn)` buffers all `markDamaged` calls made inside `fn` and flushes them grouped by kind when `fn` returns.

### How damage reaches the root

`markDamaged` does not talk to the channel directly. It resolves the owning root by walking _up_ the parent chain (starting at the node itself), and calls the root's emit method. Root identity is **duck-typed**: any ancestor exposing a function-valued `_emitDamage` member counts as a root. The corollary is the most important gotcha in the package:

:::caution[Detached nodes silently swallow damage]
If a node is not connected to a root, `markDamaged` is a no-op — it does not throw. `setBounds` still mutates `bounds`, and `adoptChild`/`removeChild` still wire the tree, but no damage is emitted. Adopt-time paint only fires once the whole subtree is connected to a root. Build your tree, attach it to a `SceneRoot`, _then_ mutate.
:::

### batch vs. a move: two coalescing behaviours

These look similar but differ deliberately, and the difference is the whole reason damage is a list:

- **`batch(fn)` unions same-kind rects into one region.** Two `paint` marks inside a batch become a single `paint` entry whose rect is their bounding box. A `paint` plus a `data` mark become two entries (one per kind). The grouping is by kind, in first-seen order.
- **`setBounds` (a move) emits two _disjoint_ paint rects, not unioned.** Moving a node emits `paint` over the old footprint (erase) and `paint` over the new footprint (fill), plus a `layout` for the parent. These two paint rects are deliberately _not_ unioned at the channel level, so a renderer that scissors per-rect leaves the dead gap between the old and new positions untouched. Unioning them would force a repaint of everything in between.

If `setBounds` is called with an equal rect, it is a complete no-op — no damage, no mutation.

## SceneRoot: the three-stage pipeline

`SceneRoot` is the concrete node at the top of the tree. It owns the `DirtyChannel`, the scheduler, and the `Renderer2D`, and it subscribes itself exactly once at construction. Its interest is a _thunk_ returning its current bounds, so resizing the root is respected on the next flush. Any damage overlapping the root's bounds triggers a frame.

When the channel flushes, the root receives the coalesced `DirtyRegion` and runs three ordered stages over it:

1. **Stage 1 — data.** For each entry whose `kind === 'data'`, if its node defines `rebuildData()`, call it. This is where a plot layer re-bins samples or recomputes mark geometry.
2. **Stage 2 — layout.** For each entry whose `kind !== 'paint'` (so `layout` _and_ `data`), if its node defines `doLayout()`, call it. Data changes flow through here too, because new data may need repositioning.
3. **Stage 3 — paint.** Compute the paint regions — in normal mode these are the _individual_ damage rects (`dirty.map(d => d.rect)`), **not** their union. Call `renderer.beginFrame(regions)`, then walk the children in adoption order painting only those whose bounds overlap a region (the _cull_), then call `renderer.endFrame()`.

For a single `data` damage the strict call order is: `rebuildData → doLayout → beginFrame → paint → endFrame`.

<details>
<summary>Culling is where the win lands, and it is one level deep</summary>

`_paintCulled` walks the root's direct children and paints a child only if its bounds overlap at least one damage region. Repaint cost therefore scales with the _damaged area_, not the _scene size_ — the headline benefit of damage tracking. The cull is one level deep: only the root's direct children are tested. A child that survives the cull is responsible for drawing its own subtree however it likes. If you set `root.fullFrame = true`, the cull is bypassed: every frame repaints `[this.bounds]` and every child paints. That mode exists as a baseline for measuring the cost difference, not for production.

</details>

The optional `onFrameTiming` hook reports `{ layoutMs, paintMs, paintedNodes }` per rendered frame. When the hook is omitted, `performance.now()` is never called — there is zero timing overhead in the common case.

## PointerRouter: hit-testing and z-order

Input is the dual of output: the renderer asks "what is at this rect?", the pointer router asks "what is at this point?". `PointerRouter` answers by hit-testing the tree.

`SceneRoot.hitTest(x, y)` walks children in _reverse_ adoption order, so the topmost (last-adopted) child wins when several overlap. For the first child whose bounds contain the point (`pointInRect`, half-open), it recurses and returns the _deepest_ descendant hit, or that child if no grandchild matches. If no child contains the point it returns `null` — the root itself is never a valid hit target.

`PointerRouter.dispatch(e)` adds **capture** semantics on top of hit-testing:

- A `down` hit-tests, _captures_ the hit node for that `pointerId`, invokes its `onPointerDown`, and returns it. A miss captures nothing and returns `null`.
- A `move`/`up`/`cancel` with an existing capture is delivered to the _captured_ node even if the pointer has drifted outside its bounds — this is what makes dragging work. An `up` or `cancel` releases the capture.
- An _uncaptured_ `move` routes by current hit (this is how hover works). An _uncaptured_ `up`/`cancel` is dropped and returns `null`.

Handlers are optional. The router treats a node as a `Partial<PointerHandler>` and optional-chains the relevant method, so a node with no handler is a valid, returnable hit target that simply receives no callback and never throws. The router is framework-agnostic: `SpatialPointerEvent` is a plain object you build from a DOM `PointerEvent` at the boundary.

## The Renderer2D contract: v1 vs. the planned v2

`SceneRoot` never rasterises. It calls two abstract hooks on the renderer you supply:

```ts
interface Renderer2D {
  beginFrame(regions: readonly Rect[]): void; // never called with an empty array
  endFrame(): void;
}
```

The contract's subtlety is in `regions`. It is the list of the frame's _individual_ damage rects, **not** their union. A far single-frame move arrives as two disjoint rects (erase old, fill new), so a renderer that scissors to each rect leaves the dead gap untouched.

- **v1 — bounding-rect redraw.** The simplest correct renderer ignores the disjoint structure: call `unionRects(regions)` and clip to that one bounding box, or ignore `regions` entirely and clear the whole canvas. Correct, easy, but repaints the gap.
- **planned v2 — tile/scissor redraw.** A renderer that issues one scissored draw call per rect (or per damaged tile) redraws only the listed areas and skips everything between them. The damage list is shaped to make this possible — that is why same-kind batch rects are unioned but a move's two footprints are not.

## What it is not

- **Not a GPU renderer.** It ships the `Renderer2D` contract, not an implementation. You bring the rasteriser.
- **Not a spatial index.** v1 uses a plain array; `union` concatenates and `intersects` is O(N×M). No dedup, no quadtree.
- **Not auto-tracked reactivity.** `paint()` runs because a node was _damaged_, not because a field was read. This is a declared-damage model, not a dependency graph like React or MobX. Contrast [BlaC tracked state](/core/tracked).
- **Not a virtual-scene diff.** Nodes declare their own damage; the renderer trusts the declaration. There is no reconciliation pass.
- **Not an animation primitive.** Animate by calling `markDamaged('paint')` each step.
- **Not coupled to the browser.** No dependency on `window`, `document`, or `HTMLCanvasElement`. `SpatialPointerEvent` is a plain object you construct at the DOM boundary.

## See also

- [Getting Started](/dirtytalk/spatial/getting-started) — build a working scene step by step.
- [API Reference](/dirtytalk/spatial/api-reference) — every type, helper, method, and option.
- [Engine: Concepts](/dirtytalk/engine/concepts) — the `Space` algebra, `DirtyChannel`, and scheduler model this builds on.
- [Structural: Concepts](/dirtytalk/structural/concepts) — the same engine applied to path-set state.

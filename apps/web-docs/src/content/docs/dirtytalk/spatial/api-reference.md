---
title: API Reference
description: The complete public surface of @dirtytalk/spatial — Rect helpers, RectSpace, SceneNode, SceneRoot, the render pipeline, and PointerRouter.
---

The complete public surface of `@dirtytalk/spatial`, organised by export. Every signature here matches the source. This page is a lookup reference; for the model behind these APIs read [Concepts](/dirtytalk/spatial/concepts), and for a guided build see [Getting Started](/dirtytalk/spatial/getting-started).

All exports come from the package root — there are no subpaths:

```ts
import {
  // values
  rectOverlaps,
  rectEquals,
  unionRects,
  rectClamp,
  pointInRect,
  RectSpace,
  SceneNode,
  SceneRoot,
  PointerRouter,
} from '@dirtytalk/spatial';

import type {
  // types
  Rect,
  DamageKind,
  Damage,
  DirtyRegion,
  SceneNodeOptions,
  Renderer2D,
  SceneRootOptions,
  FrameTiming,
  SpatialPointerEvent,
  PointerHandler,
} from '@dirtytalk/spatial';
```

Scheduler classes (`SyncScheduler`, `ManualScheduler`, `RAFScheduler`, `MicrotaskScheduler`) and the `Space`/`DirtyChannel` primitives come from [`@dirtytalk/engine`](/dirtytalk/engine/api-reference).

## Types

### `Rect`

A 2D axis-aligned rectangle in CSS pixels, top-left origin. Note the field names are `w`/`h`, not `width`/`height`.

```ts
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

### `DamageKind`

Classifies a damage entry and thereby selects which pipeline stages run.

```ts
type DamageKind = 'paint' | 'layout' | 'data';
```

| Value      | Stages run             |
| ---------- | ---------------------- |
| `'paint'`  | Paint only.            |
| `'layout'` | Layout → paint.        |
| `'data'`   | Data → layout → paint. |

### `Damage`

A single damage entry: a rectangle, a kind, and (at runtime) the emitting node.

```ts
interface Damage {
  rect: Rect;
  kind: DamageKind;
  node?: unknown;
}
```

`node` is typed `unknown` to avoid an import cycle between `types.ts` and `scene-node.ts`. At runtime it holds the emitting `SceneNode`; `SceneRoot` casts it to `SceneNode | undefined` when running the pipeline. It is optional — damage marked directly on the channel may have no node.

### `DirtyRegion`

The region type carried by the spatial `DirtyChannel`: a read-only list of damage entries.

```ts
type DirtyRegion = readonly Damage[];
```

:::caution[Treat as immutable]
`RectSpace.union` may return one of its inputs _by reference_ (the empty short-circuit). Never mutate an array obtained from `union` or `empty`; the `readonly` type enforces this at compile time.
:::

## Rect helpers

All five are pure, side-effect-free `const` arrow functions. Only `unionRects` and `rectClamp` allocate a new `Rect`.

### `rectOverlaps(a, b)`

```ts
const rectOverlaps: (a: Rect, b: Rect) => boolean;
```

Returns `true` iff the two rects share _positive_ area. Uses half-open semantics: touching edges do not overlap. Returns `false` if either rect has `w <= 0` or `h <= 0`.

| Inputs                                       | Result  |
| -------------------------------------------- | ------- |
| Identical non-empty rects                    | `true`  |
| One fully contained in the other             | `true`  |
| Right edge of A == left edge of B (touching) | `false` |
| Either rect has `w = 0` or `h = 0`           | `false` |

```ts
rectOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }); // true
rectOverlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }); // false (touching)
```

### `rectEquals(a, b)`

```ts
const rectEquals: (a: Rect, b: Rect) => boolean;
```

Field-by-field structural equality using `===` (no epsilon/tolerance): `a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h`. Any single differing field yields `false`.

```ts
rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 4 }); // true
rectEquals({ x: 1, y: 2, w: 3, h: 4 }, { x: 1, y: 2, w: 3, h: 5 }); // false
```

### `unionRects(rects)`

```ts
const unionRects: (rects: readonly Rect[]) => Rect;
```

Returns the bounding box (axis-aligned hull) of all input rects. Does not mutate inputs.

- Empty array → the origin sentinel `{ x: 0, y: 0, w: 0, h: 0 }`.
- Single-element array → a rect equal to that element.
- Each rect's extent is treated as `[x, x + w]`; zero-area members are not special-cased and can still pull the hull toward their corner.

```ts
unionRects([
  { x: 0, y: 0, w: 30, h: 30 },
  { x: 50, y: 50, w: 20, h: 20 },
]); // { x: 0, y: 0, w: 70, h: 70 }

unionRects([]); // { x: 0, y: 0, w: 0, h: 0 }
```

### `rectClamp(inner, outer)`

```ts
const rectClamp: (inner: Rect, outer: Rect) => Rect;
```

Returns the _geometric intersection_ of `inner` and `outer`, with width and height floored at `0` via `Math.max(0, …)`. This is the function used to clip damage to clipping ancestors.

- Non-overlapping inputs → a zero-area rect.
- `inner` fully inside `outer` → a rect value-equal to `inner`.
- `inner` equal to `outer` → an equal rect.

```ts
rectClamp({ x: 5, y: 5, w: 100, h: 100 }, { x: 0, y: 0, w: 50, h: 50 });
// { x: 5, y: 5, w: 45, h: 45 }  (intersection)

rectClamp({ x: 200, y: 200, w: 10, h: 10 }, { x: 0, y: 0, w: 50, h: 50 });
// { x: 200, y: 200, w: 0, h: 0 }  (no overlap -> zero area)
```

### `pointInRect(x, y, r)`

```ts
const pointInRect: (x: number, y: number, r: Rect) => boolean;
```

Half-open point test over `[x, x + w) × [y, y + h)`: the top-left corner is inclusive, the bottom-right edge is exclusive (CSS pixel-grid convention). A zero-area rect (`w = 0` or `h = 0`) contains no points.

```ts
pointInRect(0, 0, { x: 0, y: 0, w: 10, h: 10 }); // true  (top-left inclusive)
pointInRect(10, 5, { x: 0, y: 0, w: 10, h: 10 }); // false (right edge exclusive)
```

:::note[`pointInRect` is fully public]
It is exported from the package root even though the README's export table omits it.
:::

## `RectSpace`

```ts
const RectSpace: Space<DirtyRegion>;
```

The `Space<DirtyRegion>` implementation that wires the rect algebra into the engine's `DirtyChannel`. `Space<Region>` (from `@dirtytalk/engine`) requires four pure methods, which `RectSpace` provides:

| Method                                 | Behaviour                                                                                                                                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `empty(): DirtyRegion`                 | Returns `[]`. A **fresh array on every call** (`empty() !== empty()`).                                                                                                                                            |
| `isEmpty(r): boolean`                  | `r.length === 0`.                                                                                                                                                                                                 |
| `union(a, b): DirtyRegion`             | Identity short-circuit: if `a` is empty returns `b` by reference; if `b` is empty returns `a` by reference; otherwise returns `[...a, ...b]`. Never mutates. Concatenation only — no dedup, no geometric merge.   |
| `intersects(interest, dirty): boolean` | `false` if either side is empty. Otherwise a nested loop returning `true` as soon as any `interest` rect overlaps any `dirty` rect (via `rectOverlaps`). O(N×M). **`DamageKind` is ignored** — only rects matter. |

You normally never call these directly; `SceneRoot` passes `RectSpace` to its `DirtyChannel`. They are public for advanced uses (e.g. building your own channel over the spatial region).

```ts
import { DirtyChannel } from '@dirtytalk/engine';
import { RectSpace } from '@dirtytalk/spatial';
import type { DirtyRegion } from '@dirtytalk/spatial';

const channel = new DirtyChannel<DirtyRegion>(RectSpace, scheduler);
```

## `SceneNode`

```ts
abstract class SceneNode {
  constructor(options?: SceneNodeOptions);
}
```

The abstract base class for every node in the scene tree. Subclass it and implement `paint`. Owns its bounds and contributes damage to the root channel via the parent chain.

### `SceneNodeOptions`

```ts
interface SceneNodeOptions {
  bounds?: Rect;
  clipsOverflow?: boolean;
}
```

| Option          | Default                      | Meaning                                                                     |
| --------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `bounds`        | `{ x: 0, y: 0, w: 0, h: 0 }` | The node's initial axis-aligned rectangle.                                  |
| `clipsOverflow` | `false`                      | When `true`, _descendants'_ damage rects are clamped to this node's bounds. |

### Public properties

| Property        | Type                | Default                     | Meaning                                                                    |
| --------------- | ------------------- | --------------------------- | -------------------------------------------------------------------------- |
| `bounds`        | `Rect`              | from options or `{0,0,0,0}` | The node's rectangle. Mutable, but prefer `setBounds` for damage tracking. |
| `parent`        | `SceneNode \| null` | `null`                      | Parent in the tree; set by `adoptChild` / `removeChild`.                   |
| `children`      | `SceneNode[]`       | `[]`                        | Direct children in adoption order (= z-order; later = topmost).            |
| `clipsOverflow` | `boolean`           | `false`                     | When `true`, descendants' damage is clamped to this node's bounds.         |

### `abstract paint(layer)`

```ts
abstract paint(layer: unknown): void;
```

Called during the paint stage. Subclasses **must** implement it. `layer` is the renderer-provided draw surface; the spatial package never inspects it (during the culled walk `SceneRoot` calls `child.paint(undefined)`). Define `layer` to whatever your renderer needs.

### `rebuildData?()` (optional)

```ts
rebuildData?(): void;
```

Optional hook for nodes that own a data pipeline (e.g. plot mark layers). Called in **Stage 1** only for `data`-kind damage entries whose node defines it. Use it to re-bin or recompute derived geometry.

### `doLayout?()` (optional)

```ts
doLayout?(): void;
```

Optional hook for nodes that own layout. Called in **Stage 2** for any non-`paint` damage entry (`layout` _or_ `data`) whose node defines it. Use it to position content within `this.bounds`.

### `protected markDamaged(kind, rect?)`

```ts
protected markDamaged(kind: DamageKind, rect?: Rect): void;
```

The core damage emitter — protected, so only subclasses call it. Behaviour:

1. `rect` defaults to `this.bounds` if omitted.
2. The rect is clipped by walking up the parent chain: every ancestor with `clipsOverflow === true` clamps it (`rectClamp`) to that ancestor's bounds. Cumulative across multiple clipping ancestors. (A node's own `clipsOverflow` does not clip its own damage — only ancestors clip.)
3. Builds `{ rect: clipped, kind, node: this }`.
4. If a `batch` is active, pushes into the buffer and returns (no emit yet).
5. Otherwise resolves the root. If there is no connected root, it is a **silent no-op**. Otherwise calls `root._emitDamage(damage)`.

```ts
class Badge extends SceneNode {
  paint(_layer: unknown): void {}
  flash(): void {
    this.markDamaged('paint'); // defaults to this.bounds
  }
}
```

### `protected batch(fn)`

```ts
protected batch(fn: () => void): void;
```

Coalesces all `markDamaged` calls made inside `fn` before emitting.

- **Nested batch**: if a batch is already in flight, just runs `fn()` — the outer batch absorbs everything; the inner one does not emit separately.
- Runs `fn()` inside `try/finally`; the buffer is always cleared even if `fn` throws.
- **Empty buffer → no emit** (`batch(() => {})` emits nothing).
- On flush, buffered damages are grouped by kind. For each kind: one entry → emitted as-is; multiple → emitted as a single entry whose rect is `unionRects` of that kind's rects. Each grouped entry is emitted via the root.
- Kind-grouping order follows first-seen-kind order.

```ts
class Panel extends SceneNode {
  paint(_layer: unknown): void {}
  redrawTwoRegions(): void {
    this.batch(() => {
      this.markDamaged('paint', { x: 0, y: 0, w: 30, h: 30 });
      this.markDamaged('paint', { x: 50, y: 50, w: 20, h: 20 });
    });
    // Same-kind rects union -> beginFrame gets ONE region:
    //   [{ x: 0, y: 0, w: 70, h: 70 }]
  }
}
```

:::caution[batch unions same-kind rects; a move does not]
`batch` collapses same-kind rects into one region. By contrast `setBounds` deliberately emits two _disjoint_ `paint` rects (old + new footprint) that are not unioned, so a multi-rect-scissor renderer can skip the dead gap between them.
:::

### `setBounds(next)`

```ts
setBounds(next: Rect): void;
```

The damage-tracked way to move or resize a node.

- **No-op if** `rectEquals(this.bounds, next)` — no damage, no mutation.
- Otherwise: emits `markDamaged('paint', prev)` (erase old footprint), assigns `this.bounds = next`, emits `markDamaged('paint', next)` (fill new footprint), and **if the node has a parent**, emits `markDamaged('layout')` (re-layout the parent). Net for a connected node with a parent: **2 paint + 1 layout**.
- On a root-less node it still mutates `this.bounds` but emits nothing.

```ts
node.setBounds({ x: 100, y: 40, w: 120, h: 40 });
// erase old rect (paint) + fill new rect (paint) + parent layout
```

### `adoptChild(child)`

```ts
adoptChild(child: SceneNode): void;
```

Attaches `child` as the topmost child of this node.

- If `child` already has a parent, detaches it first via `child.parent.removeChild(child)`.
- Sets `child.parent = this` and appends to `this.children` (so it becomes topmost in z-order).
- **If this node is connected to a root**, emits a single full-bounds `paint` for the child (`child.markDamaged('paint', child.bounds)`) so the newly-visible region paints. If not connected, no damage is emitted.

### `removeChild(child)`

```ts
removeChild(child: SceneNode): void;
```

Detaches `child` from this node.

- No-op if `child` is not in `this.children`.
- Splices the child out, then emits `child.markDamaged('paint', child.bounds)` to damage the vacated area, **then** sets `child.parent = null`. (Order matters: damage is emitted while the child is still parented so root resolution still works.)

<details>
<summary>Root resolution and clipping internals</summary>

`SceneNode` resolves its owning root by walking the parent chain, **starting at itself** — a node that is itself a root resolves to itself (so `SceneRoot.adoptChild` can emit adopt-time paint for its direct children). Root detection is structural/duck-typed: any ancestor exposing a function-valued `_emitDamage` member counts as a root. A node not connected to such a root silently swallows all damage. Damage rects are clipped by cumulative `rectClamp` against each ancestor whose `clipsOverflow` is `true`.

</details>

## `SceneRoot`

```ts
class SceneRoot extends SceneNode {
  constructor(renderer: Renderer2D, options?: SceneRootOptions);
}
```

The concrete root node. Owns the `DirtyChannel<DirtyRegion>`, the scheduler, and the `Renderer2D`, and drives the three-stage pipeline. Inherits all of `SceneNode` (`bounds`, `parent`, `children`, `clipsOverflow`, `setBounds`, `adoptChild`, `removeChild`, `markDamaged`, `batch`).

### Constructor

```ts
constructor(renderer: Renderer2D, options: SceneRootOptions = {})
```

| Parameter               | Notes                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| `renderer`              | Required. Stored on `this.renderer`.                                              |
| `options.scheduler`     | Default `new RAFScheduler()`. Pass `SyncScheduler` or `ManualScheduler` in tests. |
| `options.bounds`        | Passed to `super`; defaults to `{0,0,0,0}`. Used as the default interest region.  |
| `options.onFrameTiming` | Optional. When set, every rendered frame is timed and reported.                   |

On construction it creates `this.channel = new DirtyChannel(RectSpace, scheduler ?? new RAFScheduler())` and subscribes once with `interest = () => [{ rect: this.bounds, kind: 'paint' }]` (a thunk, re-evaluated per flush so resizing is respected) and callback `(dirty) => this._renderFrame(dirty)`.

### `SceneRootOptions`

```ts
interface SceneRootOptions {
  scheduler?: Scheduler; // default: new RAFScheduler()
  bounds?: Rect; // default interest region
  onFrameTiming?: (timing: FrameTiming) => void; // opt-in timing hook
}
```

### Public properties

| Property    | Type                                 | Notes                                                                                                                                                                                                           |
| ----------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel`   | `readonly DirtyChannel<DirtyRegion>` | The owned dirty channel. You can push marks directly via `channel.mark([...])`.                                                                                                                                 |
| `renderer`  | `readonly Renderer2D`                | The renderer contract instance.                                                                                                                                                                                 |
| `fullFrame` | `boolean` (default `false`)          | When `true`, damage is ignored: every frame repaints `[this.bounds]` and the paint walk visits all children (no culling). The "damage tracking off" baseline for cost comparison — leave `false` in production. |

### `paint(_layer)`

```ts
paint(_layer: unknown): void;
```

The root does not paint itself. It walks children in adoption order and calls each `child.paint(_layer)`. This is the un-culled walk, distinct from the culled walk used during rendering.

### `hitTest(x, y)`

```ts
hitTest(x: number, y: number): SceneNode | null;
```

Returns the topmost, deepest node containing the point, or `null`.

- Walks children in reverse adoption order (topmost = last adopted wins).
- For the first child whose bounds contain `(x, y)` (`pointInRect`, half-open), recurses and returns the deepest descendant hit, else that child itself.
- Returns `null` if no child contains the point. **The root is never a valid hit target.**

```ts
const node = root.hitTest(120, 35); // SceneNode | null
```

### `channel`-direct marking

Because `channel` is public, you can mark damage that has no owning node — e.g. a manual full-region invalidation:

```ts
root.channel.mark([{ rect: { x: 0, y: 0, w: 800, h: 600 }, kind: 'paint' }]);
```

### The render pipeline (behaviour)

When the channel flushes, the root runs three ordered stages over the flushed `DirtyRegion`:

1. **Stage 1 — data.** For each entry: if `kind === 'data'` and the node defines `rebuildData`, call it.
2. **Stage 2 — layout.** For each entry: if `kind !== 'paint'` (so `layout` or `data`) and the node defines `doLayout`, call it.
3. **Stage 3 — paint.** `regions = fullFrame ? [this.bounds] : dirty.map(d => d.rect)` (the individual, disjoint rects — not their union). Call `renderer.beginFrame(regions)`; paint each top-level child whose bounds overlap a region, in adoption order (this is the cull); call `renderer.endFrame()`.

Strict per-frame call order for a `data` damage: `rebuildData → doLayout → beginFrame → paint → endFrame`. The cull is one level deep — only direct children of the root are culled; a painted child draws its own subtree.

### `Renderer2D`

```ts
interface Renderer2D {
  beginFrame(regions: readonly Rect[]): void;
  endFrame(): void;
}
```

The renderer contract the package ships (no implementation). `beginFrame(regions)` begins a frame clipped/scissored to the given damage regions; **the array is never empty when called**, and `regions` is the list of _individual_ damage rects, not their union. A v1 renderer may `unionRects(regions)` and clip to the bounding box, or ignore `regions` and clear the whole canvas; a multi-rect renderer scissors to each. `endFrame()` takes no arguments (submit/flush).

```ts
const renderer: Renderer2D = {
  beginFrame(regions) {
    // v1: clip to the bounding box of all damage
    const box = unionRects([...regions]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.clearRect(box.x, box.y, box.w, box.h);
  },
  endFrame() {
    ctx.restore();
  },
};
```

### `FrameTiming`

```ts
interface FrameTiming {
  layoutMs: number; // ms in data + layout stages (rebuildData + doLayout)
  paintMs: number; // ms in paint stage (beginFrame -> paint walk -> endFrame)
  paintedNodes: number; // top-level nodes whose paint() actually ran this frame
}
```

Reported via `onFrameTiming` exactly once per _rendered_ frame. `paintedNodes` is the headline cost signal — it scales with the damaged area (every child in full-frame mode), not the scene size. When `onFrameTiming` is omitted there is **zero overhead**: `performance.now()` is never called.

```ts
const root = new SceneRoot(renderer, {
  bounds: { x: 0, y: 0, w: 800, h: 600 },
  onFrameTiming: ({ layoutMs, paintMs, paintedNodes }) => {
    console.log(
      `layout ${layoutMs}ms paint ${paintMs}ms nodes ${paintedNodes}`,
    );
  },
});
```

## `PointerRouter`

```ts
class PointerRouter {
  constructor(root: SceneRoot);
  dispatch(e: SpatialPointerEvent): SceneNode | null;
}
```

Routes pointer events into the scene with capture semantics. Framework-agnostic: you translate DOM `PointerEvent`s into `SpatialPointerEvent`s at the boundary. Maintains a private capture map keyed by `pointerId`.

### `SpatialPointerEvent`

```ts
interface SpatialPointerEvent {
  type: 'down' | 'move' | 'up' | 'cancel';
  x: number;
  y: number;
  buttons: number;
  pointerId: number;
}
```

A minimal, surface-agnostic pointer event. Build it from a DOM event: `{ type, x: e.offsetX, y: e.offsetY, buttons: e.buttons, pointerId: e.pointerId }`.

### `PointerHandler`

```ts
interface PointerHandler {
  onPointerDown?(e: SpatialPointerEvent): void;
  onPointerMove?(e: SpatialPointerEvent): void;
  onPointerUp?(e: SpatialPointerEvent): void;
  onPointerCancel?(e: SpatialPointerEvent): void;
}
```

The optional handler interface a `SceneNode` may implement to receive pointer callbacks. The router treats nodes as `Partial<PointerHandler>` and optional-chains the matching method — a node with no handler is still a valid hit target, receives no callback, and never throws.

### `constructor(root)`

```ts
constructor(root: SceneRoot)
```

Holds the root for hit-testing.

### `dispatch(e)`

```ts
dispatch(e: SpatialPointerEvent): SceneNode | null;
```

Dispatches an event and returns the receiving node (or `null`). Capture-based semantics:

| Event                                 | Behaviour                                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `down`                                | Hit-tests via `root.hitTest`. On a hit: captures the node for `e.pointerId`, invokes `onPointerDown`, returns it. On a miss: captures nothing, returns `null`. |
| `move`/`up`/`cancel` **with capture** | Delivers to the captured node (even if the pointer drifted outside its bounds). On `up`/`cancel`, releases the capture. Returns the captured node.             |
| `move` **uncaptured**                 | Hit-tests by current position; invokes `onPointerMove` on the hit (if any); returns it or `null`.                                                              |
| `up`/`cancel` **uncaptured**          | Dropped — returns `null`, no handler invoked.                                                                                                                  |

Multiple `pointerId`s are tracked independently. Hover is just `move` dispatch — a node repaints on hover by calling `markDamaged('paint')` inside `onPointerMove`.

```ts
const router = new PointerRouter(root);

const hit = router.dispatch({
  type: 'down',
  x: 120,
  y: 35,
  buttons: 1,
  pointerId: 1,
});
// `hit` is the captured node; subsequent move/up for pointerId 1 follow it.
```

## See also

- [Getting Started](/dirtytalk/spatial/getting-started) — install and build a working scene.
- [Concepts](/dirtytalk/spatial/concepts) — the damage model, pipeline, and pointer routing explained.
- [Engine: API Reference](/dirtytalk/engine/api-reference) — `Space`, `DirtyChannel`, and the scheduler classes.
- [Engine: Concepts](/dirtytalk/engine/concepts) — coalescing, interest, and flush semantics.

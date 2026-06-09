# @dirtytalk/spatial

Rect-based damage-tracking instantiation of @dirtytalk/engine, for canvas/GPU renderers and any 2D scene graph.

> [!WARNING]
> **BlaC v2 is in pre-release (beta).** While in beta, **breaking API changes may
> ship in patch releases** without a major version bump. Pin an exact version and
> check the changelog before upgrading. Strict semver resumes once v2 is officially
> out of beta.

## Why this exists

Two libraries — a WebGPU renderer and a state container — solve the same problem in different
domains: after a mutation, _what changed, who cares, and when do we tell them?_ Today both answer
this at the consumer: the renderer repaints the whole canvas because it has no rect-level damage
info; the state container re-walks state N times for N subscribers. The shared move is to compute
"what changed" once at the source, in a format every subscriber can intersect cheaply. This package
is that compute layer for the 2D spatial domain.

Single-dirty-bit invalidation is the root of the problem. Once you record only whether _something_
changed, you've lost the information you need to do less work. This package replaces the dirty bit
with a damage list: each entry carries a `Rect` and a `DamageKind`. `kind` tells the render pipeline
which stages to run (`data → layout → paint`); `rect` tells the renderer exactly what area to
rasterise. In v1 the renderer repaints the bounding rect of all damage entries — the same work as
before. In v2 a scissor/tile partial-redraw path uses the individual entries. No API change to scene
nodes or callers either way.

## What's in the box

- `Rect` type + helpers: `rectOverlaps`, `rectEquals`, `unionRects`, `rectClamp`.
- `Damage` entry record + `DamageKind` type (`'paint' | 'layout' | 'data'`).
- `RectSpace` — the `Space<Damage[]>` implementation that wires the engine to the 2D rect algebra.
- `SceneNode` — abstract base class for any painted object; owns bounds, parent chain,
  `markDamaged`, and `batch`.
- `SceneRoot` — concrete subclass that owns the `DirtyChannel<Damage[]>` and scheduler, drives the
  `data → layout → paint` pipeline, and calls the `Renderer2D` contract.
- `Renderer2D` interface — the contract a real GPU renderer plugs into (`beginFrame` / `endFrame`);
  this package ships the interface, not an implementation.
- `PointerRouter` — pointer dispatch via hit-testing the scene tree; accepts the
  surface-agnostic `SpatialPointerEvent` shape.
- `SpatialPointerEvent` + `PointerHandler` — the framework-agnostic event types.

## Install

```bash
pnpm add @dirtytalk/spatial @dirtytalk/engine
```

## Quick example — minimal scene

```ts
import { SceneNode, SceneRoot } from '@dirtytalk/spatial';
import type { Renderer2D, Rect } from '@dirtytalk/spatial';
import { SyncScheduler } from '@dirtytalk/engine';

// --- Stub renderer (logs the paint region instead of rasterising) ---
const stubRenderer: Renderer2D = {
  beginFrame(paintRegion: Rect): void {
    console.log('beginFrame', paintRegion);
  },
  endFrame(): void {
    console.log('endFrame');
  },
};

// --- A simple button node ---
class Button extends SceneNode {
  private _label = '';

  get label(): string {
    return this._label;
  }

  setValue(label: string): void {
    if (this._label === label) return;
    this._label = label;
    this.markDamaged('paint');
  }

  paint(_layer: unknown): void {
    // Draw the button using _layer commands (renderer-provided).
  }
}

// --- Wire it up ---
const root = new SceneRoot(stubRenderer, { scheduler: new SyncScheduler() });
root.bounds = { x: 0, y: 0, w: 800, h: 600 };

const btn = new Button();
btn.bounds = { x: 10, y: 10, w: 120, h: 40 };
root.adoptChild(btn);

// Mutate — damage flows to the renderer automatically.
btn.setValue('Click me');
// => beginFrame { x: 10, y: 10, w: 120, h: 40 }
// => endFrame
```

A real renderer — such as a WebGPU layer that wraps a `GPUDevice` — would plug in via the same
`Renderer2D` interface: `beginFrame` sets up the render pass and applies the scissor rect;
`endFrame` submits the command encoder.

## Quick example — pointer routing

```ts
import { PointerRouter } from '@dirtytalk/spatial';
import type { SpatialPointerEvent } from '@dirtytalk/spatial';

const router = new PointerRouter(root);

// Translate a DOM PointerEvent to SpatialPointerEvent and dispatch.
canvas.addEventListener('pointerdown', (e) => {
  const spatialEvent: SpatialPointerEvent = {
    type: 'down',
    x: e.offsetX,
    y: e.offsetY,
    buttons: e.buttons,
    pointerId: e.pointerId,
  };
  const hit = router.dispatch(spatialEvent);
  // `hit` is the topmost SceneNode whose bounds contain (x, y), or null.
});
```

`PointerRouter.dispatch` walks the tree in z-order, runs hit-testing against `node.bounds`,
and delivers the event to the hit node's `PointerHandler` methods. Nodes that don't implement a
handler simply don't receive the call. Hover is handled the same way as clicks — route
`pointermove` events through the same `dispatch` call and let nodes call `markDamaged('paint')`
in their `onPointerMove` if they change appearance on hover.

## API surface — public exports

| Export                | File                | Role                                            |
| --------------------- | ------------------- | ----------------------------------------------- |
| `Rect`                | `types.ts`          | 2D axis-aligned rectangle (CSS pixels)          |
| `DamageKind`          | `types.ts`          | `'paint' \| 'layout' \| 'data'`                 |
| `Damage`              | `types.ts`          | Single damage entry: `{ rect, kind, node? }`    |
| `DirtyRegion`         | `types.ts`          | `readonly Damage[]` — the channel's Region type |
| `rectOverlaps`        | `rect.ts`           | True if two rects share any area                |
| `rectEquals`          | `rect.ts`           | Deep equality for rects                         |
| `unionRects`          | `rect.ts`           | Bounding rect of a list of rects                |
| `rectClamp`           | `rect.ts`           | Clamp inner rect to outer rect                  |
| `RectSpace`           | `rect-space.ts`     | `Space<Damage[]>` for the engine                |
| `SceneNode`           | `scene-node.ts`     | Abstract base for paintable nodes               |
| `SceneRoot`           | `scene-root.ts`     | Root node; owns channel + render pipeline       |
| `Renderer2D`          | `scene-root.ts`     | Interface for the renderer contract             |
| `PointerRouter`       | `pointer-router.ts` | Hit-test-based pointer dispatch                 |
| `SpatialPointerEvent` | `pointer-router.ts` | Surface-agnostic pointer event shape            |
| `PointerHandler`      | `pointer-router.ts` | Interface nodes implement to receive events     |

## Damage kinds

| Kind     | When to emit                                                                 | Pipeline stages triggered                                      |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `paint`  | A visual-only field changed (colour, label, pressed state).                  | Paint only.                                                    |
| `layout` | The node's bounds changed. `setBounds` emits this automatically.             | Layout pass for the parent, then paint for old and new bounds. |
| `data`   | The node's input data set changed (e.g., a plot layer received new samples). | Data rebuild → layout → paint. All downstream stages run.      |

## Render pipeline

The `SceneRoot` processes a flush in three ordered stages:

**Stage 1 — data.** For each damage entry with `kind === 'data'`, call `node.rebuildData()` if
defined. This is where expensive operations like re-binning or recomputing mark geometry live.

**Stage 2 — layout.** For each damage entry with `kind !== 'paint'`, call `node.doLayout()` if
defined. A `data` change always implies a layout pass for that node.

**Stage 3 — paint.** Compute `paintRegion = unionRects(dirty.map(d => d.rect))`. Call
`renderer.beginFrame(paintRegion)`, walk the scene tree and call each node's `paint` method, then
call `renderer.endFrame()`.

A single state change — for example, `button.setValue('Save')` — emits one `paint` damage entry,
skips stages 1 and 2, and goes directly to stage 3.

## What it is not

- **No GPU renderer included.** `SceneRoot` calls `renderer.beginFrame(paintRegion)` and
  `renderer.endFrame()` as abstract hooks; the real rasterisation lives in the renderer you provide.
- **No spatial index.** v1 uses a plain array for the damage list; union concatenates, intersection
  is O(N×M). A coarse occupancy-grid spatial index is planned for v2 when tile-based partial redraw
  lands.
- **No auto-tracked reads.** `paint()` is invoked because _the node was damaged_, not because its
  fields were read. There is no hidden dependency graph. This is a different model from React or
  MobX.
- **No virtual scene diff.** Nodes mutate their own state and declare their own damage. The renderer
  trusts the declaration.
- **No animation primitive.** Animation integrates by calling `markDamaged('paint')` each step.
  The engine does not know what an animation is.
- **Not coupled to any browser API.** `SpatialPointerEvent` is a plain object; you translate DOM
  events to it at the boundary. The package has no `window`, `document`, or `HTMLCanvasElement`
  dependency.

## License

MIT — see LICENSE.

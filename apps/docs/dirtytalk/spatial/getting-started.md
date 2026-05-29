# Getting Started

This page gets you from an empty file to a live scene graph that paints only what changed. It is hands-on: you will build a stub renderer, a tiny `Button` node, wire up a `SceneRoot`, mutate state, and watch the exact damaged region flow through the pipeline. Then you will route a DOM `PointerEvent` into the scene. If you want the *why* behind the design, read [Concepts](/dirtytalk/spatial/concepts); for the exhaustive surface, see the [API Reference](/dirtytalk/spatial/api-reference).

## What this package is for

`@dirtytalk/spatial` is the 2D-spatial instantiation of the DirtyTalk thesis: compute *what changed* once, at the source, as a list of rectangle-carrying damage entries, so every subscriber can do less work. A renderer normally has to choose between repainting the whole canvas (cheap to write, expensive to run) or hand-rolling per-widget invalidation (fast, but bespoke and bug-prone). This package gives you the second outcome with the first amount of effort: nodes declare their own damage, the root coalesces it through a scheduler, and the paint walk is culled to the damaged area.

It is a *compute layer*, not a rendering engine. It tells you which rectangles to redraw and in what order to run data/layout/paint work. You supply the actual rasteriser behind the `Renderer2D` contract.

## Install

`@dirtytalk/spatial` depends on `@dirtytalk/engine` — the engine provides the `Space`, `DirtyChannel`, and `Scheduler` primitives that the scene root is built on. Install both.

::: code-group

```bash [pnpm]
pnpm add @dirtytalk/spatial @dirtytalk/engine
```

```bash [npm]
npm install @dirtytalk/spatial @dirtytalk/engine
```

```bash [yarn]
yarn add @dirtytalk/spatial @dirtytalk/engine
```

:::

::: info Single entry point
Everything is exported from the package root. There are no subpath entries — import `Rect`, `SceneNode`, `SceneRoot`, `PointerRouter`, and the rect helpers all from `@dirtytalk/spatial`. Scheduler classes (`SyncScheduler`, `ManualScheduler`, `RAFScheduler`, `MicrotaskScheduler`) come from `@dirtytalk/engine`.
:::

## A complete minimal scene

We will build the smallest scene that demonstrates the whole loop: a renderer that logs frames, a node that knows how to invalidate itself, and a root that drives the pipeline.

### Step 1 — a stub renderer

The package ships the `Renderer2D` *contract*, not an implementation. A renderer is just an object with `beginFrame(regions)` and `endFrame()`. For learning, log the regions you are handed.

```ts
import type { Renderer2D, Rect } from '@dirtytalk/spatial';

const stubRenderer: Renderer2D = {
  beginFrame(regions: readonly Rect[]): void {
    console.log('beginFrame', regions);
  },
  endFrame(): void {
    console.log('endFrame');
  },
};
```

`beginFrame` receives the frame's *individual* damage rects (never an empty array). `endFrame` takes no arguments and is where a real renderer would submit or flush.

### Step 2 — a node that damages itself

Subclass `SceneNode` and implement the abstract `paint` method. When the node's visible state changes, call the protected `markDamaged('paint')` to tell the root that this node's rectangle needs repainting.

```ts
import { SceneNode } from '@dirtytalk/spatial';

class Button extends SceneNode {
  private _label = '';

  get label(): string {
    return this._label;
  }

  setValue(label: string): void {
    if (this._label === label) return; // skip redundant work
    this._label = label;
    this.markDamaged('paint'); // visual-only change -> paint stage only
  }

  paint(_layer: unknown): void {
    // Draw the button into the renderer-provided layer.
    // The spatial package never inspects `_layer` — it's yours to define.
  }
}
```

Two things to notice. First, the early-return guard: if the label did not change, do not emit damage. Second, `markDamaged('paint')` with no rect defaults to the node's own `bounds`, which is exactly the region a label change dirties.

### Step 3 — construct the root with a scheduler

`SceneRoot` owns the dirty channel, the scheduler, and the renderer. For a predictable, synchronous teaching loop, pass a `SyncScheduler` — every `markDamaged` flushes immediately, so one mutation produces one frame.

```ts
import { SceneRoot } from '@dirtytalk/spatial';
import { SyncScheduler } from '@dirtytalk/engine';

const root = new SceneRoot(stubRenderer, {
  scheduler: new SyncScheduler(),
  bounds: { x: 0, y: 0, w: 800, h: 600 },
});
```

The `bounds` you pass become the root's *interest region*: any damage overlapping that rectangle triggers a frame.

### Step 4 — set bounds and adopt the child

Give the button a footprint and attach it to the tree with `adoptChild`. Because the root is connected, the adoption emits a one-time full-bounds `paint` for the newly visible child.

```ts
const btn = new Button({ bounds: { x: 10, y: 10, w: 120, h: 40 } });

root.adoptChild(btn);
// => beginFrame [ { x: 10, y: 10, w: 120, h: 40 } ]
// => endFrame
```

### Step 5 — mutate and observe the painted region

Now change the label. The node damages its own bounds, the channel flushes synchronously, and the renderer is handed exactly that rectangle.

```ts
btn.setValue('Click me');
// => beginFrame [ { x: 10, y: 10, w: 120, h: 40 } ]
// => endFrame

btn.setValue('Click me'); // no change -> no damage -> no frame
// (nothing logged)
```

The second call logs nothing: the guard in `setValue` short-circuits, so the channel never marks, and an empty flush fires no callback. This is the payoff in miniature — work is proportional to what actually changed.

::: tip Scheduler choice changes everything about coalescing
`SyncScheduler` flushes on every `mark`, so three mutations produce three frames. Swap in `ManualScheduler` (flush on `pump()`), `MicrotaskScheduler`, or the default `RAFScheduler`, and multiple mutations before the flush coalesce into one frame. See [Concepts](/dirtytalk/spatial/concepts) and the engine's [scheduler model](/dirtytalk/engine/concepts).
:::

### The full file

```ts
import { SceneNode, SceneRoot } from '@dirtytalk/spatial';
import type { Renderer2D, Rect } from '@dirtytalk/spatial';
import { SyncScheduler } from '@dirtytalk/engine';

const stubRenderer: Renderer2D = {
  beginFrame(regions: readonly Rect[]): void {
    console.log('beginFrame', regions);
  },
  endFrame(): void {
    console.log('endFrame');
  },
};

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
    // draw with _layer
  }
}

const root = new SceneRoot(stubRenderer, {
  scheduler: new SyncScheduler(),
  bounds: { x: 0, y: 0, w: 800, h: 600 },
});

const btn = new Button({ bounds: { x: 10, y: 10, w: 120, h: 40 } });
root.adoptChild(btn);

btn.setValue('Click me');
```

## Wiring up pointer input

The scene graph does not know about the DOM. To drive it from real input, construct a `PointerRouter` over the root and translate each DOM `PointerEvent` into a plain `SpatialPointerEvent` at the boundary.

```ts
import { PointerRouter } from '@dirtytalk/spatial';
import type { SpatialPointerEvent } from '@dirtytalk/spatial';

const router = new PointerRouter(root);

canvas.addEventListener('pointerdown', (e) => {
  const spatialEvent: SpatialPointerEvent = {
    type: 'down',
    x: e.offsetX,
    y: e.offsetY,
    buttons: e.buttons,
    pointerId: e.pointerId,
  };

  const hit = router.dispatch(spatialEvent);
  // `hit` is the topmost SceneNode at (x, y), or null.
});
```

`dispatch` returns the node that received the event (or `null` if nothing was hit). A `down` *captures* the hit node for that `pointerId`: subsequent `move`/`up`/`cancel` events for the same pointer are delivered to the captured node even if the pointer has drifted off its bounds — exactly the drag behaviour you want. Route every pointer phase through the same `dispatch`.

```ts
for (const [domType, spatialType] of [
  ['pointerdown', 'down'],
  ['pointermove', 'move'],
  ['pointerup', 'up'],
  ['pointercancel', 'cancel'],
] as const) {
  canvas.addEventListener(domType, (e) => {
    router.dispatch({
      type: spatialType,
      x: e.offsetX,
      y: e.offsetY,
      buttons: e.buttons,
      pointerId: e.pointerId,
    });
  });
}
```

To react to a pointer, give the node a handler method. Any of `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel` is optional; the router optional-chains them, so a node without a handler is still a valid hit target and simply receives no callback.

```ts
class HoverButton extends SceneNode {
  private _hovered = false;
  paint(_layer: unknown): void {}
  onPointerMove(_e: SpatialPointerEvent): void {
    if (this._hovered) return;
    this._hovered = true;
    this.markDamaged('paint'); // hover repaints, like any other state change
  }
}
```

Hover is just a `move` dispatch; the node decides whether the change is worth a repaint by calling `markDamaged`.

## When to reach for this package

Use `@dirtytalk/spatial` when you have a 2D scene where repainting everything on every change is too expensive, and you want a principled invalidation model rather than ad-hoc dirty flags. Good fits:

- A canvas/WebGPU UI with many widgets where most frames touch a small area.
- A chart or plot surface where data updates should re-bin and re-layout, but a hover should only repaint.
- Any retained-mode 2D tree that needs ordered data → layout → paint stages keyed off *what* changed.

Reach for something else when you only ever full-frame repaint (then you do not need damage tracking), when you need a full GPU renderer out of the box (this ships only the contract), or when you want auto-tracked reactive reads — this is a *declared-damage* model, not a dependency graph. The sibling [`@dirtytalk/structural`](/dirtytalk/structural/concepts) package applies the same engine to state-shaped (path-set) domains.

## See also

- [Concepts](/dirtytalk/spatial/concepts) — the damage model, the three-stage pipeline, and pointer routing explained.
- [API Reference](/dirtytalk/spatial/api-reference) — every export, signature, and option.
- [Engine: Concepts](/dirtytalk/engine/concepts) — the `Space` algebra, schedulers, and `DirtyChannel` that power the root.
- [DirtyTalk overview](/dirtytalk/) — the shared thesis across the three packages.

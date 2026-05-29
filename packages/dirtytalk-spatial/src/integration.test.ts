import { describe, expect, it, vi } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { SceneNode, SceneRoot, PointerRouter, unionRects } from './index';
import type {
  Rect,
  Renderer2D,
  SceneNodeOptions,
  PointerHandler,
  SpatialPointerEvent,
} from './index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRenderer = (): Renderer2D & {
  frames: Array<{ regions: readonly Rect[] }>;
  endCount: number;
  reset(): void;
} => {
  const frames: Array<{ regions: readonly Rect[] }> = [];
  let endCount = 0;
  return {
    frames,
    get endCount() {
      return endCount;
    },
    reset() {
      frames.length = 0;
      endCount = 0;
    },
    beginFrame(regions: readonly Rect[]) {
      frames.push({ regions });
    },
    endFrame() {
      endCount++;
    },
  };
};

const makeRoot = (
  renderer: Renderer2D,
  bounds: Rect = { x: 0, y: 0, w: 200, h: 200 },
) =>
  new SceneRoot(renderer, {
    scheduler: new SyncScheduler(),
    bounds,
  });

// ---------------------------------------------------------------------------
// Test 1 — Damage flows from node mutation to renderer
// ---------------------------------------------------------------------------

describe('integration: damage → renderer flow', () => {
  it('setPressed on TestButton produces a beginFrame containing the button bounds', () => {
    class TestButton extends SceneNode {
      private _pressed = false;
      paint(_layer: unknown): void {}
      setPressed(v: boolean): void {
        this._pressed = v;
        this.markDamaged('paint');
      }
    }

    const renderer = makeRenderer();
    const root = makeRoot(renderer);

    const button = new TestButton({ bounds: { x: 10, y: 10, w: 50, h: 20 } });
    root.adoptChild(button);
    // adoptChild under SyncScheduler already produced one frame; reset before mutation.
    renderer.reset();

    button.setPressed(true);

    expect(renderer.frames).toHaveLength(1);
    const { regions } = renderer.frames[0];
    // Single paint damage → one region covering the button's bounds.
    expect(regions).toHaveLength(1);
    const paintRegion = regions[0];
    expect(paintRegion.x).toBeLessThanOrEqual(10);
    expect(paintRegion.y).toBeLessThanOrEqual(10);
    expect(paintRegion.x + paintRegion.w).toBeGreaterThanOrEqual(10 + 50);
    expect(paintRegion.y + paintRegion.h).toBeGreaterThanOrEqual(10 + 20);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Render pipeline stage ordering
// ---------------------------------------------------------------------------

describe('integration: render-pipeline stage ordering', () => {
  it('data damage runs rebuildData → doLayout → beginFrame → paint → endFrame', () => {
    class DataLayer extends SceneNode {
      rebuildData = vi.fn();
      doLayout = vi.fn();
      paint = vi.fn();
      pubMark(kind: 'paint' | 'layout' | 'data'): void {
        this.markDamaged(kind);
      }
    }

    const callOrder: string[] = [];
    const renderer: Renderer2D = {
      beginFrame(_regions: readonly Rect[]) {
        callOrder.push('beginFrame');
      },
      endFrame() {
        callOrder.push('endFrame');
      },
    };
    const root = makeRoot(renderer);
    const layer = new DataLayer({ bounds: { x: 0, y: 0, w: 100, h: 100 } });

    // Wrap vi.fn() calls to record order
    layer.rebuildData.mockImplementation(() => callOrder.push('rebuildData'));
    layer.doLayout.mockImplementation(() => callOrder.push('doLayout'));
    layer.paint.mockImplementation(() => callOrder.push('paint'));

    root.adoptChild(layer);
    // Reset after adopt-time paint frame.
    callOrder.length = 0;
    layer.rebuildData.mockClear();
    layer.doLayout.mockClear();
    layer.paint.mockClear();

    layer.pubMark('data');

    expect(callOrder).toEqual([
      'rebuildData',
      'doLayout',
      'beginFrame',
      'paint',
      'endFrame',
    ]);
    expect(layer.rebuildData).toHaveBeenCalledOnce();
    expect(layer.doLayout).toHaveBeenCalledOnce();
    expect(layer.paint).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Test 3 — PointerRouter end-to-end
// ---------------------------------------------------------------------------

describe('integration: PointerRouter end-to-end', () => {
  class InteractiveNode extends SceneNode implements PointerHandler {
    events: SpatialPointerEvent[] = [];
    constructor(opts: SceneNodeOptions) {
      super(opts);
    }
    paint(_layer: unknown): void {}
    onPointerDown(e: SpatialPointerEvent) {
      this.events.push(e);
    }
    onPointerMove(e: SpatialPointerEvent) {
      this.events.push(e);
    }
    onPointerUp(e: SpatialPointerEvent) {
      this.events.push(e);
    }
    onPointerCancel(e: SpatialPointerEvent) {
      this.events.push(e);
    }
  }

  it('down hits topmost node; captured move follows; up releases; uncaptured move re-hits', () => {
    const renderer = makeRenderer();
    const root = makeRoot(renderer);

    // A and B both overlap (25,25); B is adopted after A so B is on top.
    const nodeA = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const nodeB = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(nodeA);
    root.adoptChild(nodeB);

    const router = new PointerRouter(root);

    // 1. down at (25,25) — both overlap but only B (topmost) should receive it.
    router.dispatch({ type: 'down', x: 25, y: 25, buttons: 1, pointerId: 1 });
    expect(nodeB.events).toHaveLength(1);
    expect(nodeB.events[0].type).toBe('down');
    expect(nodeA.events).toHaveLength(0);

    // 2. captured move to (500,500) — outside all bounds, but B still receives it.
    router.dispatch({ type: 'move', x: 500, y: 500, buttons: 1, pointerId: 1 });
    expect(nodeB.events).toHaveLength(2);
    expect(nodeB.events[1].type).toBe('move');
    expect(nodeA.events).toHaveLength(0);

    // 3. up at (500,500) — B receives, capture is released.
    router.dispatch({ type: 'up', x: 500, y: 500, buttons: 0, pointerId: 1 });
    expect(nodeB.events).toHaveLength(3);
    expect(nodeB.events[2].type).toBe('up');

    // 4. uncaptured move back to (25,25) — re-hits B (still topmost).
    nodeA.events.length = 0;
    nodeB.events.length = 0;
    router.dispatch({ type: 'move', x: 25, y: 25, buttons: 0, pointerId: 1 });
    expect(nodeB.events).toHaveLength(1);
    expect(nodeB.events[0].type).toBe('move');
    expect(nodeA.events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Batch coalescing
// ---------------------------------------------------------------------------

describe('integration: batch coalescing', () => {
  it('two markDamaged calls inside batch produce exactly one beginFrame with a single union region', () => {
    class BatchNode extends SceneNode {
      paint(_layer: unknown): void {}
      pubBatch(fn: () => void): void {
        this.batch(fn);
      }
      pubMark(kind: 'paint' | 'layout' | 'data', rect?: Rect): void {
        this.markDamaged(kind, rect);
      }
    }

    const renderer = makeRenderer();
    const root = makeRoot(renderer);
    const node = new BatchNode({ bounds: { x: 0, y: 0, w: 200, h: 200 } });
    root.adoptChild(node);
    renderer.reset();

    const r1: Rect = { x: 0, y: 0, w: 30, h: 30 };
    const r2: Rect = { x: 50, y: 50, w: 20, h: 20 };
    // batch() coalesces same-kind damage into one union'd entry before emitting,
    // so the renderer sees a single region (the union) — distinct from an
    // un-batched move, which arrives as two disjoint rects.
    const expected = unionRects([r1, r2]);

    node.pubBatch(() => {
      node.pubMark('paint', r1);
      node.pubMark('paint', r2);
    });

    expect(renderer.frames).toHaveLength(1);
    expect(renderer.frames[0].regions).toEqual([expected]);
  });
});

import { describe, expect, it } from 'vite-plus/test';
import { SyncScheduler, ManualScheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { SceneRoot } from './scene-root';
import type { Renderer2D } from './scene-root';
import type { Rect } from './types';

const makeRenderer = (): Renderer2D & {
  calls: Array<['begin' | 'end', ReadonlyArray<Rect>?]>;
} => {
  const calls: Array<['begin' | 'end', ReadonlyArray<Rect>?]> = [];
  return {
    calls,
    beginFrame(regions) {
      calls.push(['begin', regions]);
    },
    endFrame() {
      calls.push(['end']);
    },
  };
};

class TestNode extends SceneNode {
  paintCalls = 0;
  paint(_layer: unknown): void {
    this.paintCalls++;
  }
}

class PipelineNode extends SceneNode {
  order: string[] = [];
  paint(_layer: unknown): void {
    this.order.push('paint');
  }
  rebuildData(): void {
    this.order.push('rebuildData');
  }
  doLayout(): void {
    this.order.push('doLayout');
  }
  // expose protected helpers
  pubMark(kind: 'paint' | 'layout' | 'data', rect?: Rect) {
    this.markDamaged(kind, rect);
  }
}

describe('SceneRoot', () => {
  // 1. Construction wires the channel with RectSpace + provided scheduler.
  it('construction wires the channel with the provided scheduler', () => {
    const renderer = makeRenderer();
    const scheduler = new SyncScheduler();
    const root = new SceneRoot(renderer, {
      scheduler,
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    expect(root.channel).toBeDefined();
    expect(root.renderer).toBe(renderer);
  });

  // 2. A child's markDamaged reaches the renderer.
  it("a child's markDamaged reaches the renderer via beginFrame", () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const child = new TestNode({ bounds: { x: 10, y: 10, w: 50, h: 50 } });
    root.adoptChild(child);
    // adoptChild triggers a 'paint' damage automatically; clear calls
    renderer.calls.length = 0;

    // Manually mark from child — need to expose markDamaged
    class ExposedNode extends SceneNode {
      paintCalls = 0;
      paint(_layer: unknown): void {
        this.paintCalls++;
      }
      pub(kind: 'paint' | 'layout' | 'data', rect?: Rect) {
        this.markDamaged(kind, rect);
      }
    }
    const node = new ExposedNode({ bounds: { x: 20, y: 20, w: 30, h: 30 } });
    root.adoptChild(node);
    renderer.calls.length = 0;

    node.pub('paint');
    const beginCalls = renderer.calls.filter((c) => c[0] === 'begin');
    expect(beginCalls.length).toBeGreaterThan(0);
    expect(beginCalls[0][1]).toEqual([{ x: 20, y: 20, w: 30, h: 30 }]);
  });

  // 3. endFrame runs after beginFrame in order.
  it('endFrame runs after beginFrame', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child);
    renderer.calls.length = 0;

    // trigger a damage
    class ExposedNode extends SceneNode {
      paint(_layer: unknown): void {}
      pub() {
        this.markDamaged('paint');
      }
    }
    const n = new ExposedNode({ bounds: { x: 5, y: 5, w: 5, h: 5 } });
    root.adoptChild(n);
    renderer.calls.length = 0;
    n.pub();

    expect(renderer.calls[0][0]).toBe('begin');
    expect(renderer.calls[1][0]).toBe('end');
  });

  // 4. A single damage entry is passed through as a one-element region list.
  it('single damage entry is passed as a one-element region list', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const r: Rect = { x: 10, y: 20, w: 30, h: 40 };
    root.channel.mark([{ rect: r, kind: 'paint' }]);
    const begin = renderer.calls.find((c) => c[0] === 'begin');
    expect(begin).toBeDefined();
    expect(begin?.[1]).toEqual([r]);
  });

  // 5. Multiple damage entries stay disjoint — passed as separate rects, NOT
  //    collapsed into their bounding union (so a multi-rect scissor can skip the
  //    gap between them).
  it('multiple damage entries are passed as separate rects, not their union', () => {
    const renderer = makeRenderer();
    const scheduler = new ManualScheduler();
    const root = new SceneRoot(renderer, {
      scheduler,
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const d1 = { rect: { x: 0, y: 0, w: 10, h: 10 }, kind: 'paint' as const };
    const d2 = { rect: { x: 50, y: 50, w: 10, h: 10 }, kind: 'paint' as const };
    // mark both before pumping so they accumulate in one flush
    root.channel.mark([d1]);
    root.channel.mark([d2]);
    scheduler.pump();

    const begin = renderer.calls.find((c) => c[0] === 'begin');
    expect(begin).toBeDefined();
    // Two disjoint rects — NOT unioned to (0,0,60,60).
    expect(begin?.[1]).toEqual([d1.rect, d2.rect]);
  });

  // 6. Detached node mutation doesn't reach the renderer.
  it('detached node mutation does not reach the renderer', () => {
    const renderer = makeRenderer();
    const _root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });

    class ExposedNode extends SceneNode {
      paint(_layer: unknown): void {}
      pub() {
        this.markDamaged('paint');
      }
    }
    const node = new ExposedNode({ bounds: { x: 10, y: 10, w: 20, h: 20 } });
    // NOT adopted — detached

    renderer.calls.length = 0;
    node.pub();
    expect(renderer.calls.length).toBe(0);
  });

  // 7. paint(_layer) walks children in adoption order.
  it('paint walks children in adoption order', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });

    const order: number[] = [];
    class OrderedNode extends SceneNode {
      constructor(
        private id: number,
        opts: { bounds: Rect },
      ) {
        super(opts);
      }
      paint(_layer: unknown): void {
        order.push(this.id);
      }
    }

    const a = new OrderedNode(1, { bounds: { x: 0, y: 0, w: 10, h: 10 } });
    const b = new OrderedNode(2, { bounds: { x: 10, y: 0, w: 10, h: 10 } });
    const c = new OrderedNode(3, { bounds: { x: 20, y: 0, w: 10, h: 10 } });
    root.adoptChild(a);
    root.adoptChild(b);
    root.adoptChild(c);
    // clear from adopt-time paint calls
    order.length = 0;

    // trigger a paint via channel
    root.channel.mark([{ rect: root.bounds, kind: 'paint' }]);

    expect(order).toEqual([1, 2, 3]);
  });

  // 8. data-kind damage triggers rebuildData first, then doLayout, then paint.
  it('data-kind damage runs rebuildData then doLayout then paint', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const node = new PipelineNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(node);

    // clear from adopt paint
    node.order.length = 0;
    renderer.calls.length = 0;

    root.channel.mark([{ rect: node.bounds, kind: 'data', node }]);

    // rebuildData then doLayout happen in stage 1 & 2
    // paint happens when renderer calls paint on children
    expect(node.order[0]).toBe('rebuildData');
    expect(node.order[1]).toBe('doLayout');
    expect(node.order[2]).toBe('paint');
  });

  // 9. layout-kind damage skips rebuildData but runs doLayout.
  it('layout-kind damage skips rebuildData but runs doLayout', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const node = new PipelineNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(node);
    node.order.length = 0;
    renderer.calls.length = 0;

    root.channel.mark([{ rect: node.bounds, kind: 'layout', node }]);

    expect(node.order).not.toContain('rebuildData');
    expect(node.order).toContain('doLayout');
    expect(node.order).toContain('paint');
  });

  // 10. paint-kind damage runs neither rebuildData nor doLayout.
  it('paint-kind damage runs neither rebuildData nor doLayout', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const node = new PipelineNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(node);
    node.order.length = 0;
    renderer.calls.length = 0;

    root.channel.mark([{ rect: node.bounds, kind: 'paint', node }]);

    expect(node.order).not.toContain('rebuildData');
    expect(node.order).not.toContain('doLayout');
    expect(node.order).toContain('paint');
  });

  // 11. Mixed-kind damages run the right stages for each entry.
  it('mixed-kind damages run the right stages per entry', () => {
    const renderer = makeRenderer();
    const scheduler = new ManualScheduler();
    const root = new SceneRoot(renderer, {
      scheduler,
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });
    const dataNode = new PipelineNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const paintNode = new PipelineNode({
      bounds: { x: 60, y: 0, w: 50, h: 50 },
    });
    root.adoptChild(dataNode);
    root.adoptChild(paintNode);
    dataNode.order.length = 0;
    paintNode.order.length = 0;

    root.channel.mark([
      { rect: dataNode.bounds, kind: 'data', node: dataNode },
      { rect: paintNode.bounds, kind: 'paint', node: paintNode },
    ]);
    scheduler.pump();

    // dataNode should have rebuildData + doLayout + paint
    expect(dataNode.order).toContain('rebuildData');
    expect(dataNode.order).toContain('doLayout');
    expect(dataNode.order).toContain('paint');
    // paintNode should only paint
    expect(paintNode.order).not.toContain('rebuildData');
    expect(paintNode.order).not.toContain('doLayout');
    expect(paintNode.order).toContain('paint');
  });

  // 12. Multiple synchronous marks via SyncScheduler produce one frame per mark.
  it('multiple synchronous marks via SyncScheduler produce one frame per mark', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 200, h: 200 },
    });

    const r: Rect = { x: 10, y: 10, w: 20, h: 20 };
    root.channel.mark([{ rect: r, kind: 'paint' }]);
    root.channel.mark([{ rect: r, kind: 'paint' }]);
    root.channel.mark([{ rect: r, kind: 'paint' }]);

    const beginCount = renderer.calls.filter((c) => c[0] === 'begin').length;
    expect(beginCount).toBe(3);
  });

  // 13. hitTest returns null on empty root.
  it('hitTest returns null on empty root', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    expect(root.hitTest(50, 50)).toBeNull();
  });

  // 14. hitTest returns the only child when (x,y) is inside.
  it('hitTest returns the only child when point is inside', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const child = new TestNode({ bounds: { x: 10, y: 10, w: 50, h: 50 } });
    root.adoptChild(child);
    expect(root.hitTest(20, 20)).toBe(child);
  });

  // 15. hitTest returns the topmost (later-adopted) child when two overlap.
  it('hitTest returns the later-adopted child when two overlap at the point', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const childA = new TestNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const childB = new TestNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(childA);
    root.adoptChild(childB);
    // childB was adopted last — it's topmost
    expect(root.hitTest(10, 10)).toBe(childB);
  });

  // 16. hitTest returns null when (x,y) is outside all children.
  it('hitTest returns null when point is outside all children', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const child = new TestNode({ bounds: { x: 10, y: 10, w: 20, h: 20 } });
    root.adoptChild(child);
    expect(root.hitTest(80, 80)).toBeNull();
  });

  // 16b. onFrameTiming reports a layout + paint split for each rendered frame.
  it('onFrameTiming fires once per frame with numeric layout + paint times', () => {
    const renderer = makeRenderer();
    const timings: Array<{ layoutMs: number; paintMs: number }> = [];
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      onFrameTiming: (t) => timings.push(t),
    });
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 10, h: 10 } });
    root.adoptChild(child); // one frame from the adopt-time paint
    timings.length = 0;

    root.channel.mark([{ rect: { x: 0, y: 0, w: 5, h: 5 }, kind: 'paint' }]);

    expect(timings).toHaveLength(1);
    expect(typeof timings[0].layoutMs).toBe('number');
    expect(typeof timings[0].paintMs).toBe('number');
    expect(timings[0].layoutMs).toBeGreaterThanOrEqual(0);
    expect(timings[0].paintMs).toBeGreaterThanOrEqual(0);
  });

  // 17. hitTest descends into grandchildren.
  it('hitTest returns a grandchild for a point inside it', () => {
    const renderer = makeRenderer();
    const root = new SceneRoot(renderer, {
      scheduler: new SyncScheduler(),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const child = new TestNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const grandchild = new TestNode({ bounds: { x: 5, y: 5, w: 20, h: 20 } });
    root.adoptChild(child);
    child.adoptChild(grandchild);
    // Point inside grandchild — deepest hit wins
    expect(root.hitTest(10, 10)).toBe(grandchild);
    // Point inside child but outside grandchild — child wins
    expect(root.hitTest(40, 40)).toBe(child);
  });
});

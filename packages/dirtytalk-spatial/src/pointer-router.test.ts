import { describe, expect, it } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { SceneRoot } from './scene-root';
import type { Renderer2D } from './scene-root';
import { PointerRouter } from './pointer-router';
import type { PointerHandler, SpatialPointerEvent } from './pointer-router';

const makeRenderer = (): Renderer2D => ({
  beginFrame() {},
  endFrame() {},
});

const makeRoot = () =>
  new SceneRoot(makeRenderer(), {
    scheduler: new SyncScheduler(),
    bounds: { x: 0, y: 0, w: 200, h: 200 },
  });

class InteractiveNode extends SceneNode implements PointerHandler {
  events: SpatialPointerEvent[] = [];
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

/** A node that registers a hit but has no handler methods. */
class SilentNode extends SceneNode {
  paint(_layer: unknown): void {}
}

const ev = (
  type: SpatialPointerEvent['type'],
  x: number,
  y: number,
  pointerId = 1,
): SpatialPointerEvent => ({ type, x, y, buttons: 1, pointerId });

// ---------------------------------------------------------------------------
// hitTest cases (1–5) — exercised via PointerRouter but test hitTest semantics.
// ---------------------------------------------------------------------------

describe('SceneRoot.hitTest via PointerRouter', () => {
  // 1. hitTest returns null on empty root.
  it('hitTest returns null on empty root', () => {
    const root = makeRoot();
    const router = new PointerRouter(root);
    expect(router.dispatch(ev('down', 50, 50))).toBeNull();
  });

  // 2. hitTest returns the only child when (x,y) is inside.
  it('hitTest returns the only child when point is inside', () => {
    const root = makeRoot();
    const child = new InteractiveNode({
      bounds: { x: 10, y: 10, w: 50, h: 50 },
    });
    root.adoptChild(child);
    const router = new PointerRouter(root);
    expect(router.dispatch(ev('down', 20, 20))).toBe(child);
  });

  // 3. hitTest returns the topmost (later-adopted) child when two overlap.
  it('hitTest returns the later-adopted child when two overlap at the point', () => {
    const root = makeRoot();
    const childA = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 50, h: 50 },
    });
    const childB = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 50, h: 50 },
    });
    root.adoptChild(childA);
    root.adoptChild(childB);
    const router = new PointerRouter(root);
    expect(router.dispatch(ev('down', 10, 10))).toBe(childB);
  });

  // 4. hitTest returns null when (x,y) is outside all children.
  it('hitTest returns null when point is outside all children', () => {
    const root = makeRoot();
    const child = new InteractiveNode({
      bounds: { x: 10, y: 10, w: 20, h: 20 },
    });
    root.adoptChild(child);
    const router = new PointerRouter(root);
    expect(router.dispatch(ev('down', 80, 80))).toBeNull();
  });

  // 5. hitTest descends into grandchildren.
  it('hitTest returns grandchild for a point inside it', () => {
    const root = makeRoot();
    const child = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const grandchild = new InteractiveNode({
      bounds: { x: 5, y: 5, w: 20, h: 20 },
    });
    root.adoptChild(child);
    child.adoptChild(grandchild);
    const router = new PointerRouter(root);
    expect(router.dispatch(ev('down', 10, 10))).toBe(grandchild);
    // Point inside child but outside grandchild
    expect(router.dispatch(ev('down', 40, 40))).toBe(child);
  });
});

// ---------------------------------------------------------------------------
// PointerRouter dispatch cases (6–14).
// ---------------------------------------------------------------------------

describe('PointerRouter', () => {
  // 6. dispatch('down') captures the hit node for that pointerId.
  it("dispatch('down') captures the hit node", () => {
    const root = makeRoot();
    const node = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    router.dispatch(ev('down', 10, 10));
    expect(node.events).toHaveLength(1);
    expect(node.events[0].type).toBe('down');
  });

  // 7. dispatch('move') for a captured pointer goes to the captured node even when outside.
  it("dispatch('move') for captured pointer routes to captured node when point drifts outside", () => {
    const root = makeRoot();
    const node = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    router.dispatch(ev('down', 10, 10));
    // Drift outside node bounds
    const result = router.dispatch(ev('move', 150, 150));
    expect(result).toBe(node);
    expect(node.events.find((e) => e.type === 'move')).toBeDefined();
  });

  // 8. dispatch('up') for a captured pointer releases the capture; subsequent down re-captures.
  it("dispatch('up') releases capture; subsequent down re-captures", () => {
    const root = makeRoot();
    const nodeA = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const nodeB = new InteractiveNode({
      bounds: { x: 100, y: 0, w: 50, h: 50 },
    });
    root.adoptChild(nodeA);
    root.adoptChild(nodeB);
    const router = new PointerRouter(root);

    // Capture nodeA
    router.dispatch(ev('down', 10, 10));
    router.dispatch(ev('up', 10, 10));

    // Now down on nodeB — should capture nodeB, not be stuck on nodeA
    router.dispatch(ev('down', 110, 10));
    expect(nodeB.events.find((e) => e.type === 'down')).toBeDefined();
  });

  // 9. dispatch('cancel') releases capture.
  it("dispatch('cancel') releases capture", () => {
    const root = makeRoot();
    const node = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    router.dispatch(ev('down', 10, 10));
    router.dispatch(ev('cancel', 10, 10));

    // After cancel, an uncaptured move outside should return null
    const result = router.dispatch(ev('move', 150, 150));
    expect(result).toBeNull();
  });

  // 10. Uncaptured move routes by current hit.
  it('uncaptured move routes by current hit position', () => {
    const root = makeRoot();
    const node = new InteractiveNode({
      bounds: { x: 10, y: 10, w: 50, h: 50 },
    });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    // No prior down — uncaptured move
    const result = router.dispatch(ev('move', 20, 20));
    expect(result).toBe(node);
    expect(node.events.find((e) => e.type === 'move')).toBeDefined();
  });

  // 11. Uncaptured up is dropped (returns null, no handler invoked).
  it('uncaptured up is dropped', () => {
    const root = makeRoot();
    const node = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    // No prior down
    const result = router.dispatch(ev('up', 10, 10));
    expect(result).toBeNull();
    expect(node.events).toHaveLength(0);
  });

  // 12. Multiple pointerIds are independent.
  it('multiple pointerIds are independent', () => {
    const root = makeRoot();
    const nodeA = new InteractiveNode({ bounds: { x: 0, y: 0, w: 50, h: 50 } });
    const nodeB = new InteractiveNode({
      bounds: { x: 100, y: 0, w: 50, h: 50 },
    });
    root.adoptChild(nodeA);
    root.adoptChild(nodeB);
    const router = new PointerRouter(root);

    // Capture pointer 1 on nodeA, pointer 2 on nodeB
    router.dispatch(ev('down', 10, 10, 1));
    router.dispatch(ev('down', 110, 10, 2));

    // Move pointer 1 to nodeB's area — should still go to nodeA (captured)
    const r1 = router.dispatch(ev('move', 110, 10, 1));
    expect(r1).toBe(nodeA);

    // Move pointer 2 to nodeA's area — should still go to nodeB (captured)
    const r2 = router.dispatch(ev('move', 10, 10, 2));
    expect(r2).toBe(nodeB);
  });

  // 13. A node without onPointerDown is hit-tested but receives no callback.
  it('node without onPointerDown is hit-tested but receives no callback error', () => {
    const root = makeRoot();
    const node = new SilentNode({ bounds: { x: 0, y: 0, w: 100, h: 100 } });
    root.adoptChild(node);
    const router = new PointerRouter(root);

    // Should not throw; node is returned even though it has no handler
    const result = router.dispatch(ev('down', 10, 10));
    expect(result).toBe(node);
  });

  // 14. Hit-test order respects adoption order (last adopted = topmost).
  it('hit-test order: last adopted child wins when overlapping', () => {
    const root = makeRoot();
    const first = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const second = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    const third = new InteractiveNode({
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    root.adoptChild(first);
    root.adoptChild(second);
    root.adoptChild(third);
    const router = new PointerRouter(root);

    // third was adopted last — it should be the topmost hit
    const result = router.dispatch(ev('down', 50, 50));
    expect(result).toBe(third);
    expect(first.events).toHaveLength(0);
    expect(second.events).toHaveLength(0);
    expect(third.events).toHaveLength(1);
  });
});

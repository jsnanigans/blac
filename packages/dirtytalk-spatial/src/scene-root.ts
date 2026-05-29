import { DirtyChannel, RAFScheduler } from '@dirtytalk/engine';
import type { Scheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { RectSpace } from './rect-space';
import { pointInRect, rectOverlaps } from './rect';
import type { Damage, DirtyRegion, Rect } from './types';

/**
 * Renderer interface: the spatial package ships this contract, not an implementation.
 * `regions` is the list of the frame's individual damage rects, NOT their union — a
 * far single-frame move arrives as two disjoint rects (erase old + fill new), so a
 * renderer that scissors to each rect leaves the dead gap between them untouched.
 * Renderers that don't yet implement multi-rect scissor/tile dispatch can union the
 * list themselves (`unionRects(regions)`) and clip to the bounding box, or ignore it
 * and clear the whole canvas.
 */
export interface Renderer2D {
  /**
   * Begin a frame, clipped/scissored to the given damage regions.
   * The array is never empty when called. v1 implementations may union the
   * regions or clear the whole canvas; multi-rect renderers scissor to each.
   */
  beginFrame(regions: readonly Rect[]): void;
  endFrame(): void;
}

/** Per-frame wall-clock split of the render pipeline (CPU-side). */
export interface FrameTiming {
  /** ms spent in the data + layout stages (rebuildData + doLayout). */
  layoutMs: number;
  /** ms spent in the paint stage (beginFrame → paint walk → endFrame). */
  paintMs: number;
  /**
   * Number of top-level nodes whose `paint()` actually ran this frame — the
   * survivors of the damage cull (every child in full-frame mode). This is the
   * headline cost signal: it scales with the damaged area, not the scene size.
   */
  paintedNodes: number;
}

export interface SceneRootOptions {
  /** Default: `new RAFScheduler()`. Tests should pass `SyncScheduler` or `ManualScheduler`. */
  scheduler?: Scheduler;

  /** Bounds of the root (used as the default interest region). */
  bounds?: Rect;

  /**
   * Optional per-frame timing hook. When provided, each render frame is timed
   * (layout stages vs paint stage) and reported here. Omit it for zero timing
   * overhead — `performance.now()` is only called when this is set.
   */
  onFrameTiming?: (timing: FrameTiming) => void;
}

export class SceneRoot extends SceneNode {
  readonly channel: DirtyChannel<DirtyRegion>;
  readonly renderer: Renderer2D;
  private readonly onFrameTiming?: (timing: FrameTiming) => void;

  /**
   * When true, damage is ignored: every frame repaints the whole bounds and the
   * paint walk visits all children (no culling). This is the "damage tracking
   * off" baseline used for cost comparisons — leave it false in production.
   */
  fullFrame = false;

  constructor(renderer: Renderer2D, options: SceneRootOptions = {}) {
    super({ bounds: options.bounds });
    this.renderer = renderer;
    this.onFrameTiming = options.onFrameTiming;
    this.channel = new DirtyChannel(
      RectSpace,
      options.scheduler ?? new RAFScheduler(),
    );

    // Subscribe with "interest = whole root bounds" so any damage triggers a flush callback.
    // We use a thunk that re-evaluates bounds in case the root is resized.
    this.channel.subscribe(
      () => [{ rect: this.bounds, kind: 'paint' as const }],
      (dirty) => this._renderFrame(dirty),
    );
  }

  paint(_layer: unknown): void {
    // The root itself doesn't paint; it's a container.
    // Walk children in adoption order.
    for (const child of this.children) {
      child.paint(_layer);
    }
  }

  /**
   * Paint walk, culled to the frame's damage regions: a top-level child is
   * skipped unless its bounds intersect at least one region. This is where
   * damage tracking pays off — repaint cost scales with the damaged area, not
   * the scene size. Adoption order (z-order) is preserved among painted nodes.
   */
  private _paintCulled(regions: readonly Rect[]): number {
    let painted = 0;
    for (const child of this.children) {
      for (const region of regions) {
        if (rectOverlaps(region, child.bounds)) {
          child.paint(undefined);
          painted++;
          break;
        }
      }
    }
    return painted;
  }

  /** Package-private — called by SceneNode.markDamaged via the structural-type contract. */
  _emitDamage(damage: Damage): void {
    this.channel.mark([damage]);
  }

  hitTest(x: number, y: number): SceneNode | null {
    return hitTestNode(this, x, y);
  }

  private _renderFrame(dirty: DirtyRegion): void {
    const timing = this.onFrameTiming;
    const t0 = timing ? performance.now() : 0;
    // Stage 1 — data
    for (const d of dirty) {
      const node = d.node as SceneNode | undefined;
      if (d.kind === 'data' && node?.rebuildData) node.rebuildData();
    }
    // Stage 2 — layout (also runs for 'data' since data implies layout)
    for (const d of dirty) {
      const node = d.node as SceneNode | undefined;
      if (d.kind !== 'paint' && node?.doLayout) node.doLayout();
    }
    // Stage 3 — paint. In full-frame mode, damage is ignored: repaint the whole
    // bounds and visit every child. Otherwise hand the renderer the individual
    // damage rects (disjoint, so a multi-rect scissor skips the dead gap between
    // a move's old/new footprints) and cull the walk to nodes touching them.
    const regions = this.fullFrame ? [this.bounds] : dirty.map((d) => d.rect);
    const t1 = timing ? performance.now() : 0;
    this.renderer.beginFrame(regions);
    const paintedNodes = this._paintCulled(regions);
    this.renderer.endFrame();
    if (timing) {
      timing({
        layoutMs: t1 - t0,
        paintMs: performance.now() - t1,
        paintedNodes,
      });
    }
  }
}

/**
 * Walk children in reverse adoption order (topmost = last adopted wins).
 * Returns the deepest hit descendant, the child itself if it contains (x,y)
 * but no grandchild does, or null if no child contains the point.
 * The root is never a valid hit target.
 */
const hitTestNode = (
  node: SceneNode,
  x: number,
  y: number,
): SceneNode | null => {
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (!pointInRect(x, y, child.bounds)) continue;
    const deeper = hitTestNode(child, x, y);
    if (deeper) return deeper;
    return child; // child contains (x,y) but no grandchild does
  }
  return null; // no child contains the point
};

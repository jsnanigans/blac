import { DirtyChannel, RAFScheduler } from '@dirtytalk/engine';
import type { Scheduler } from '@dirtytalk/engine';
import { SceneNode } from './scene-node';
import { RectSpace } from './rect-space';
import { pointInRect, rectClamp, rectOverlaps, unionRects } from './rect';
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

/**
 * Past this many distinct damage rects a frame collapses to their bounding
 * rect: per-rect scissoring and the culled paint walk (children × regions)
 * stop paying off.
 */
const MAX_REGIONS = 16;

// The frame's damage rects clamped to `bounds`, empty rects dropped. A rect
// merges into an earlier region when their bounding rect is no larger than
// both areas together (containment, or a small move's overlapping erase/fill
// pair), so disjoint rects stay separate. Past MAX_REGIONS the frame
// collapses to one bounding rect.
const frameRegions = (dirty: DirtyRegion, bounds: Rect): Rect[] => {
  const regions: Rect[] = [];
  let i = 0;
  outer: for (; i < dirty.length; i++) {
    const r = rectClamp(dirty[i].rect, bounds);
    if (r.w <= 0 || r.h <= 0) continue;
    for (const k of regions) {
      const x = Math.min(k.x, r.x);
      const y = Math.min(k.y, r.y);
      const w = Math.max(k.x + k.w, r.x + r.w) - x;
      const h = Math.max(k.y + k.h, r.y + r.h) - y;
      if (w * h <= k.w * k.h + r.w * r.h) {
        k.x = x;
        k.y = y;
        k.w = w;
        k.h = h;
        continue outer;
      }
    }
    regions.push(r);
    if (regions.length > MAX_REGIONS) break;
  }
  if (regions.length <= MAX_REGIONS) return regions;
  for (i++; i < dirty.length; i++) {
    const r = rectClamp(dirty[i].rect, bounds);
    if (r.w > 0 && r.h > 0) regions.push(r);
  }
  return [unionRects(regions)];
};

const overlapsAny = (regions: readonly Rect[], r: Rect): boolean => {
  for (const region of regions) if (rectOverlaps(region, r)) return true;
  return false;
};

export class SceneRoot extends SceneNode {
  readonly channel: DirtyChannel<DirtyRegion>;
  readonly renderer: Renderer2D;
  private readonly onFrameTiming?: (timing: FrameTiming) => void;

  // Collects damage raised by the data/layout stages so it joins the frame
  // being rendered instead of waiting for the next one.
  private _stageDamage: Damage[] | null = null;

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

    // Interest = whole root bounds, re-read each flush in case the root is
    // resized. The entry is reused, not reallocated per flush.
    const interest: Damage = { rect: this.bounds, kind: 'paint' };
    const interestRegion: DirtyRegion = [interest];
    this.channel.subscribe(
      () => {
        interest.rect = this.bounds;
        return interestRegion;
      },
      (dirty) => this._renderFrame(dirty),
    );
  }

  /** Cancels any pending frame; later damage is ignored. */
  dispose(): void {
    this.channel.dispose();
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
    // Most children miss the regions' bounding rect; test that first.
    const all = regions.length === 1 ? regions[0] : unionRects(regions);
    let painted = 0;
    for (const child of this.children) {
      if (!rectOverlaps(all, child.bounds)) continue;
      if (regions.length > 1 && !overlapsAny(regions, child.bounds)) continue;
      child.paint(undefined);
      painted++;
    }
    return painted;
  }

  /**
   * Stage 3: paint `regions` (never empty) and return the number of nodes
   * painted. Override to drive a different renderer or paint walk; stages 1–2,
   * region clamping and timing stay with the base pipeline.
   */
  protected paintFrame(regions: readonly Rect[]): number {
    this.renderer.beginFrame(regions);
    const painted = this._paintCulled(regions);
    this.renderer.endFrame();
    return painted;
  }

  /** Package-private — called by SceneNode.markDamaged via the structural-type contract. */
  _emitDamage(damage: Damage): void {
    if (this._stageDamage !== null) this._stageDamage.push(damage);
    else this.channel.mark([damage]);
  }

  hitTest(x: number, y: number): SceneNode | null {
    return hitTestNode(this, x, y);
  }

  // Stage 1 — data, then stage 2 — layout ('data' implies layout). Each node
  // runs each stage at most once per frame however often it was marked. Damage
  // the stages raise (a doLayout moving children) is staged again and joins
  // this frame; returns the frame's full damage list.
  private _runStages(dirty: DirtyRegion): DirtyRegion {
    const extra: Damage[] = [];
    this._stageDamage = extra;
    let rebuilt: Set<SceneNode> | undefined;
    let laidOut: Set<SceneNode> | undefined;
    let list = dirty;
    let from = 0;
    try {
      for (;;) {
        const to = list.length;
        for (let i = from; i < to; i++) {
          const d = list[i];
          const node = d.node as SceneNode | undefined;
          if (d.kind !== 'data' || !node?.rebuildData) continue;
          if ((rebuilt ??= new Set()).has(node)) continue;
          rebuilt.add(node);
          node.rebuildData();
        }
        for (let i = from; i < to; i++) {
          const d = list[i];
          const node = d.node as SceneNode | undefined;
          if (d.kind === 'paint' || !node?.doLayout) continue;
          if ((laidOut ??= new Set()).has(node)) continue;
          laidOut.add(node);
          node.doLayout();
        }
        if (extra.length === 0) return list;
        list = list.concat(extra);
        extra.length = 0;
        from = to;
      }
    } finally {
      this._stageDamage = null;
    }
  }

  private _renderFrame(marked: DirtyRegion): void {
    const timing = this.onFrameTiming;
    const t0 = timing ? performance.now() : 0;
    const dirty = this._runStages(marked);
    // Stage 3 — paint. In full-frame mode, damage is ignored: repaint the whole
    // bounds and visit every child. Otherwise hand the renderer the individual
    // damage rects (disjoint, so a multi-rect scissor skips the dead gap between
    // a move's old/new footprints) and cull the walk to nodes touching them.
    const regions = this.fullFrame
      ? [this.bounds]
      : frameRegions(dirty, this.bounds);
    const t1 = timing ? performance.now() : 0;
    // Pipeline-only damage (data/layout) with nothing on screen to repaint.
    if (regions.length === 0) return;
    const paintedNodes = this.paintFrame(regions);
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

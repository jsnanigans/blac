import type { Renderer2D, Rect } from '@dirtytalk/spatial';

/** Geometry of the most recently painted frame. (Timing lives in SceneRoot.) */
export interface RenderedFrame {
  /** The rects actually repainted (the whole-canvas bounds in full-frame mode). */
  rects: Rect[];
  /** Sum of repainted rect areas, in CSS px². */
  areaPx: number;
}

/**
 * A concrete `Renderer2D` for the spatial demo, drawing to a 2D canvas context.
 *
 * `beginFrame(regions)` scissors the context to the frame's damage rects and
 * only repaints the background inside them; everything outside keeps its pixels.
 * Whether those regions are the small damage rects or the whole bounds is
 * decided upstream by `SceneRoot.fullFrame` — this renderer just clips to what
 * it's handed, so it stays a clean, mode-agnostic scene renderer.
 *
 * The spatial package ships only the `Renderer2D` interface; this class is the
 * kind of implementation a real renderer (insomni's WebGPU layer) would replace.
 * Repaint-region visualisation is handled by a separate overlay canvas in the
 * React layer.
 */
export class Canvas2DRenderer implements Renderer2D {
  /** Set true on teardown so a trailing rAF frame can't draw to a dead canvas. */
  disposed = false;

  /** Geometry of the last painted frame; read by the demo HUD. */
  lastFrame: RenderedFrame | null = null;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    private readonly background: string,
  ) {}

  beginFrame(regions: readonly Rect[]): void {
    if (this.disposed) return;
    const { ctx } = this;
    if (regions.length === 0) {
      this.lastFrame = { rects: [], areaPx: 0 };
      return;
    }
    // Round each damaged rect OUT to whole pixels and inflate by 1px. Box
    // positions are fractional, so a clip on a fractional boundary leaves the
    // previous frame's ~0.5px anti-aliased edge fringe just outside the erase
    // rect — that residue is the hairline seams. Padding to whole pixels
    // guarantees the fringe is covered. Standard practice for damage-tracked
    // renderers; it's a rasterisation concern, so the scene stays fractional.
    const rects = regions.map((r) => snapOut(r, 1));
    ctx.save();
    // Scissor to the UNION of the rects via one clip path with N rect subpaths
    // (non-zero winding → the region is exactly the rects, gaps excluded).
    // Nothing outside the rects can be touched — so a far move's dead corridor
    // survives untouched.
    ctx.beginPath();
    for (const r of rects) ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // "Clear" means repaint the background within each scissor rect.
    ctx.fillStyle = this.background;
    for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h);
    // Area is the LOGICAL damage area (pre-snap) so full-frame reads a clean
    // 100%; `rects` stays snapped so the flash matches the painted pixels.
    this.lastFrame = {
      rects,
      areaPx: regions.reduce((sum, r) => sum + r.w * r.h, 0),
    };
  }

  endFrame(): void {
    if (this.disposed) return;
    // Only restore the clip if beginFrame actually saved one (skipped on empty).
    if (this.lastFrame && this.lastFrame.rects.length > 0) this.ctx.restore();
  }
}

/** Round a rect outward to whole pixels and inflate by `pad` on every side. */
function snapOut(r: Rect, pad: number): Rect {
  const x = Math.floor(r.x) - pad;
  const y = Math.floor(r.y) - pad;
  const right = Math.ceil(r.x + r.w) + pad;
  const bottom = Math.ceil(r.y + r.h) + pad;
  return { x, y, w: right - x, h: bottom - y };
}

import type { Renderer2D, Rect } from '@dirtytalk/spatial';

/**
 * A concrete `Renderer2D` for the spatial demo, drawing to a 2D canvas context.
 *
 * The whole point: `beginFrame(region)` scissors the context to the damaged
 * rect and only repaints the background inside it. Everything outside the
 * region keeps its existing pixels — so when you drag one box, only the
 * corridor between its old and new position is actually redrawn. That is the
 * damage-tracking payoff.
 *
 * The spatial package ships only the `Renderer2D` interface; this class is the
 * kind of implementation a real renderer (insomni's WebGPU layer) would replace.
 * Repaint-region visualisation is handled by a separate overlay canvas in the
 * React layer, so this stays a clean scene renderer.
 */
export class Canvas2DRenderer implements Renderer2D {
  /** Set true on teardown so a trailing rAF frame can't draw to a dead canvas. */
  disposed = false;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    private readonly background: string,
  ) {}

  beginFrame(region: Rect): void {
    if (this.disposed) return;
    const { ctx } = this;
    // Round the damaged rect OUT to whole pixels and inflate by 1px. Box
    // positions are fractional, so a clip on a fractional boundary leaves the
    // previous frame's ~0.5px anti-aliased edge fringe just outside the erase
    // rect — that residue is the hairline seams. Padding to whole pixels
    // guarantees the fringe is covered. Standard practice for damage-tracked
    // renderers; it's a rasterisation concern, so the scene stays fractional.
    const r = snapOut(region, 1);
    ctx.save();
    // Scissor to the padded rect — nothing outside it can be touched.
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    // "Clear" means repaint the background within the scissor region.
    ctx.fillStyle = this.background;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    this.drawGrid(r);
  }

  endFrame(): void {
    if (this.disposed) return;
    this.ctx.restore();
  }

  /** A faint grid, clipped to the region, so partial repaints read clearly. */
  private drawGrid(region: Rect): void {
    const { ctx } = this;
    const step = 32;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    const startX = Math.floor(region.x / step) * step;
    const startY = Math.floor(region.y / step) * step;
    for (let x = startX; x <= region.x + region.w; x += step) {
      ctx.moveTo(x + 0.5, region.y);
      ctx.lineTo(x + 0.5, region.y + region.h);
    }
    for (let y = startY; y <= region.y + region.h; y += step) {
      ctx.moveTo(region.x, y + 0.5);
      ctx.lineTo(region.x + region.w, y + 0.5);
    }
    ctx.stroke();
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

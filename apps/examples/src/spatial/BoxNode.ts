import { SceneNode } from '@dirtytalk/spatial';
import type {
  Rect,
  SpatialPointerEvent,
  PointerHandler,
} from '@dirtytalk/spatial';
import type { Canvas2DRenderer } from './Canvas2DRenderer';

export interface BoxOptions {
  bounds: Rect;
  label: string;
  color: string;
}

/**
 * A draggable rectangle. It is both a `SceneNode` (it paints itself and owns
 * its bounds) and a `PointerHandler` (the `PointerRouter` dispatches pointer
 * events to it once it is hit-tested).
 *
 * Dragging calls `setBounds`, which the base class turns into erase(old) +
 * fill(new) paint damage — so a drag repaints exactly those two footprints and
 * nothing else (not their bounding union; the gap between them is left alone).
 *
 * Note: everything is drawn strictly inside `bounds`. No shadows or glows that
 * bleed past the edges — damage rects are the bounds, so painting outside them
 * would leave trails when the box moves.
 */
export class BoxNode extends SceneNode implements PointerHandler {
  readonly label: string;
  readonly color: string;

  private dragging = false;
  private grabDx = 0;
  private grabDy = 0;

  constructor(
    private readonly renderer: Canvas2DRenderer,
    options: BoxOptions,
  ) {
    super({ bounds: options.bounds });
    this.label = options.label;
    this.color = options.color;
  }

  paint(): void {
    if (this.renderer.disposed) return;
    const { ctx } = this.renderer;
    const { x, y, w, h } = this.bounds;

    ctx.beginPath();
    this.roundRectPath(x, y, w, h, 12);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.dragging) {
      // Lighten the fill (same path, inside bounds).
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fill();
      // Border must stay fully inside bounds: a stroke is centred on its path,
      // so an edge-aligned 2px stroke would paint 1px OUTSIDE bounds — and since
      // the damage rect is exactly bounds, that 1px halo never gets erased and
      // smears a trail as the box moves. Inset the path by the line width.
      const inset = 2;
      ctx.beginPath();
      this.roundRectPath(
        x + inset,
        y + inset,
        w - inset * 2,
        h - inset * 2,
        10,
      );
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.stroke();
    }

    ctx.fillStyle = '#0b0d16';
    ctx.font =
      "600 13px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, x + w / 2, y + h / 2);
  }

  onPointerDown(e: SpatialPointerEvent): void {
    this.dragging = true;
    this.grabDx = e.x - this.bounds.x;
    this.grabDy = e.y - this.bounds.y;
    // Repaint in place to show the "held" styling.
    this.markDamaged('paint');
  }

  onPointerMove(e: SpatialPointerEvent): void {
    if (!this.dragging) return;
    const { w, h } = this.bounds;
    const maxX = this.renderer.ctx.canvas.clientWidth - w;
    const maxY = this.renderer.ctx.canvas.clientHeight - h;
    this.setBounds({
      x: clamp(e.x - this.grabDx, 0, Math.max(0, maxX)),
      y: clamp(e.y - this.grabDy, 0, Math.max(0, maxY)),
      w,
      h,
    });
  }

  onPointerUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.markDamaged('paint');
  }

  onPointerCancel(): void {
    this.onPointerUp();
  }

  private roundRectPath(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const { ctx } = this.renderer;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

import { SceneNode } from '@dirtytalk/spatial';
import type { Rect } from '@dirtytalk/spatial';
import type { Canvas2DRenderer } from './Canvas2DRenderer';

/**
 * A static, non-interactive background tile. Cheap to paint on its own, but the
 * scene holds hundreds of them — so the cost that matters is how MANY get
 * painted. With damage tracking the paint walk is culled to the tiles under the
 * drag (a handful); in full-frame mode every tile repaints every frame. That
 * gap is the whole point of the demo.
 */
export class TileNode extends SceneNode {
  constructor(
    private readonly renderer: Canvas2DRenderer,
    bounds: Rect,
    private readonly fill: string,
  ) {
    super({ bounds });
  }

  paint(): void {
    if (this.renderer.disposed) return;
    const { ctx } = this.renderer;
    const { x, y, w, h } = this.bounds;
    const r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = this.fill;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();
  }
}

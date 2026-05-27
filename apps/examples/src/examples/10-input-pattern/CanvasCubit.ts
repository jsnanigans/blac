import { Cubit } from '@blac/core';

export interface CanvasDeps {
  canvas: HTMLCanvasElement | null;
  onTick?: (frame: number) => void;
}

export interface CanvasState {
  running: boolean;
  frame: number;
}

/**
 * Cubit that receives a canvas element via deps.
 * Starts a tiny animation loop in onDepsChanged when the canvas appears,
 * and stops it when the canvas is removed (deps owner unmounts).
 */
export class CanvasCubit extends Cubit<CanvasState, void, CanvasDeps> {
  private _rafId: number | null = null;

  constructor() {
    super({ running: false, frame: 0 });
  }

  protected override onDepsChanged(
    next: Readonly<CanvasDeps>,
    _prev: Readonly<CanvasDeps>,
  ): void {
    if (next.canvas) {
      this._startLoop(next.canvas, next.onTick);
    } else {
      this._stopLoop();
    }
  }

  private _startLoop(
    canvas: HTMLCanvasElement,
    onTick?: (frame: number) => void,
  ): void {
    this._stopLoop();
    this.patch({ running: true });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = this.state.frame;
    const draw = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, w, h);

      // Animated circle
      const t = frameCount * 0.03;
      const cx = w / 2 + Math.cos(t) * (w * 0.28);
      const cy = h / 2 + Math.sin(t * 0.7) * (h * 0.28);
      const radius = 18 + Math.sin(t * 1.3) * 6;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, '#a78bfa');
      grad.addColorStop(1, '#6d28d9');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Frame counter text
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px monospace';
      ctx.fillText(`frame ${frameCount}`, 8, h - 8);

      this.patch({ frame: frameCount });
      onTick?.(frameCount);

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }

  private _stopLoop(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.patch({ running: false });
  }
}

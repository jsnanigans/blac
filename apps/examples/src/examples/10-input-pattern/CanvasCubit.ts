import { Cubit } from '@blac/core';
import { dbg } from './debug';

export interface CanvasDeps {
  canvas: HTMLCanvasElement | null;
  onTick?: (frame: number) => void;
}

export interface CanvasState {
  /** Coarse flag, emitted ONLY on real start/stop transitions. */
  running: boolean;
}

/**
 * Receives a canvas via deps and runs an animation loop while it's present.
 *
 * Guardrails that keep this well-behaved:
 * 1. React only to canvas *identity* changes (other dep churn just refreshes
 *    the stored onTick), so the loop is never restarted spuriously.
 * 2. Idempotent start + generation token: a stale in-flight `draw` terminates
 *    itself, so loops can never stack.
 * 3. Emit state only on transitions — never per frame.
 * 4. Stop on dispose, so a disposed instance never leaves a RAF loop alive.
 *
 * The frame counter is imperative (drawn to the canvas, pushed out via the
 * `onTick` dep). It never goes through bloc state.
 */
export class CanvasCubit extends Cubit<CanvasState, void, CanvasDeps> {
  private _rafId: number | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _onTick?: (frame: number) => void;
  private _frame = 0;
  private _gen = 0;

  constructor() {
    super({ running: false });
    this.onSystemEvent('dispose', () => this._stop('dispose'));
  }

  protected override onDepsChanged(
    next: Readonly<CanvasDeps>,
    prev: Readonly<CanvasDeps>,
  ): void {
    this._onTick = next.onTick;

    if (next.canvas === prev.canvas) {
      dbg('Canvas.deps:noop');
      return;
    }

    dbg('Canvas.deps:canvas', { attached: next.canvas !== null });
    if (next.canvas) this._start(next.canvas);
    else this._stop('canvas-removed');
  }

  private _start(canvas: HTMLCanvasElement): void {
    if (this._canvas === canvas && this._rafId !== null) return;
    this._stop('restart');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this._canvas = canvas;
    const gen = ++this._gen;
    if (!this.state.running) this.patch({ running: true });
    dbg('Canvas.start', { gen });

    const draw = () => {
      if (gen !== this._gen || this.isDisposed) return;

      // Keep the backing store matched to the displayed size × DPR so the
      // scene stays crisp and the blob keeps its aspect ratio instead of being
      // stretched by CSS. Geometry below works in CSS pixels.
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        this._rafId = requestAnimationFrame(draw);
        return;
      }
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw) canvas.width = bw;
      if (canvas.height !== bh) canvas.height = bh;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const frame = ++this._frame;

      ctx.fillStyle = '#0f0f1a';
      ctx.fillRect(0, 0, w, h);

      const t = frame * 0.03;
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

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px monospace';
      ctx.fillText(`frame ${frame}`, 8, h - 8);

      // High-frequency value leaves via the dep callback only — never state.
      this._onTick?.(frame);

      this._rafId = requestAnimationFrame(draw);
    };

    this._rafId = requestAnimationFrame(draw);
  }

  private _stop(reason: string): void {
    this._gen++;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._canvas = null;
    if (this.state.running && !this.isDisposed) {
      dbg('Canvas.stop', { reason });
      this.patch({ running: false });
    }
  }
}

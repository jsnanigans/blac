import { Cubit } from '@blac/core';
import { dbg } from './debug';

export interface TickerDeps {
  /** A DOM element the cubit writes to imperatively — the kind of
   *  non-serializable handle the `deps` lane exists for (was the canvas). */
  display: HTMLElement | null;
  /** Optional per-tick sink. Consumers throttle on their side. */
  onTick?: (tick: number) => void;
}

export interface TickerState {
  running: boolean;
  tick: number;
}

/**
 * Non-canvas `deps` demo. Receives a DOM element via `deps` and writes the tick
 * count into it imperatively. No animation, no RAF.
 *
 * The loop is OPT-IN (Start/Stop), defaults to OFF, and runs at a deliberately
 * slow 500ms cadence. That separates the questions we've been unable to answer:
 *
 *   - Does merely MOUNTING + injecting deps freeze?  → open the section, touch nothing.
 *   - Does a single manual STEP freeze?              → click Step once.
 *   - Does a slow LOOP freeze?                       → click Start (2 emits/sec).
 *
 * If any of these freezes, it is NOT a canvas/RAF/frequency problem — it's the
 * deps lane itself, and the debug counters will show which call is spiralling.
 */
export class TickerCubit extends Cubit<TickerState, void, TickerDeps> {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _display: HTMLElement | null = null;
  private _onTick?: (tick: number) => void;

  constructor() {
    super({ running: false, tick: 0 });
    // Safety net: never leave a timer running on a disposed instance.
    this.onSystemEvent('dispose', () => this.stop());
  }

  protected override onDepsChanged(
    next: Readonly<TickerDeps>,
    prev: Readonly<TickerDeps>,
  ): void {
    // Refreshing the callback never requires any loop change.
    this._onTick = next.onTick;

    if (next.display === prev.display) {
      dbg('Ticker.deps:noop', { running: this.state.running });
      return;
    }

    dbg('Ticker.deps:display', { attached: next.display !== null });
    this._display = next.display;
    this._paint(); // reflect current value into the freshly-attached node
  }

  /** Start the slow loop. Idempotent — starting twice is a no-op. */
  start = (): void => {
    if (this._timer !== null) return;
    dbg('Ticker.start');
    if (!this.state.running) this.patch({ running: true });
    this._timer = setInterval(() => this._advance(), 500);
  };

  /** Stop the loop. Safe to call when already stopped or disposed. */
  stop = (): void => {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this.state.running && !this.isDisposed) {
      dbg('Ticker.stop');
      this.patch({ running: false });
    }
  };

  /** Advance one tick manually. */
  step = (): void => this._advance();

  private _advance(): void {
    if (this.isDisposed) return;
    const tick = this.state.tick + 1;
    dbg('Ticker.advance', { tick });
    this.patch({ tick }); // coarse: at most 2/sec — fine for state + devtools
    this._paint(tick);
    this._onTick?.(tick);
  }

  private _paint(tick = this.state.tick): void {
    if (this._display) this._display.textContent = `tick ${tick}`;
  }
}

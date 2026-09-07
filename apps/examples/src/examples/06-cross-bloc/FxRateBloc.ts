import { Cubit } from '@blac/core';

export interface FxRateState {
  usdPerEur: number;
  ticks: number;
}

/**
 * A simulated live currency feed (EUR → USD). Random-walks the rate on an
 * interval to mimic a market data stream. Nothing "owns" this bloc — it just
 * publishes a number that other blocs derive from. The CheckoutBloc reaches it
 * via `this.depend(FxRateBloc).track()`, so any consumer reading the derived
 * total wakes on every tick without ever touching FxRateBloc directly.
 */
export class FxRateBloc extends Cubit<FxRateState> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ usdPerEur: 1.08, ticks: 0 });
  }

  /** Start the feed. Idempotent — safe under StrictMode's double-mount. */
  start = () => {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      const drift = (Math.random() - 0.5) * 0.02;
      const next = Math.min(1.2, Math.max(0.95, this.state.usdPerEur + drift));
      this.patch({
        usdPerEur: Math.round(next * 10_000) / 10_000,
        ticks: this.state.ticks + 1,
      });
    }, 1500);
  };

  stop = () => {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };
}

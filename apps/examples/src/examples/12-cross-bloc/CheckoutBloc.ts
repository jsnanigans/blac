import { Cubit } from '@blac/core';
import { CartBloc } from './CartBloc';
import { FxRateBloc } from './FxRateBloc';
import { PromoBloc, TIER_DISCOUNT } from './PromoBloc';

export interface CheckoutState {
  /** When true, the receipt tracks the live FX feed; when false it holds a
   *  captured rate and rate ticks no longer reach the receipt. */
  liveFx: boolean;
  /** Rate captured at the moment FX was frozen. */
  frozenRate: number;
}

export interface Receipt {
  subtotalEur: number;
  discountPct: number;
  usdPerEur: number;
  totalUsd: number;
  liveFx: boolean;
}

/**
 * Derives the final order total from THREE independently-owned blocs. The
 * `receipt` getter is the whole point of this demo: a component that does only
 * `useBloc(CheckoutBloc)` and reads `checkout.receipt` is auto-subscribed to
 * the cart's line items, the live FX feed, and the membership tier — because
 * each dependency is reached through `this.<handle>.track()` during the
 * consumer's render. No prop drilling, no extra `useBloc` calls in the view.
 */
export class CheckoutBloc extends Cubit<CheckoutState> {
  private cart = this.depend(CartBloc);
  private fx = this.depend(FxRateBloc);
  private promo = this.depend(PromoBloc);

  constructor() {
    super({ liveFx: true, frozenRate: 1.08 });
  }

  get receipt(): Receipt {
    // `.track()` returns [trackedState, trackedInstance]. Read raw fields off
    // the state snapshot (1st element); read derived getters off the instance
    // proxy (2nd element). Either kind of read subscribes this consumer.
    const [, cartBloc] = this.cart.track();
    const [promoState] = this.promo.track();

    // Transitive dep-getter tracking: subtotalEur reads the cart's own state,
    // so the line items it touches join this consumer's interest set.
    const subtotalEur = cartBloc.subtotalEur;
    const discountPct = TIER_DISCOUNT[promoState.tier];

    // Conditional (dynamic) dependency: only track the FX feed while "live".
    // When frozen, this branch is skipped, the FX subscription is dropped on
    // the next render, and rate ticks stop waking the receipt. Toggling back
    // on re-tracks it — the dependency graph is rebuilt every render.
    let usdPerEur = this.state.frozenRate;
    if (this.state.liveFx) {
      const [fxState] = this.fx.track();
      usdPerEur = fxState.usdPerEur;
    }

    const totalUsd = subtotalEur * (1 - discountPct) * usdPerEur;
    return {
      subtotalEur,
      discountPct,
      usdPerEur,
      totalUsd,
      liveFx: this.state.liveFx,
    };
  }

  toggleLiveFx = () => {
    if (this.state.liveFx) {
      // Capture the current live rate so the total holds steady once frozen.
      // `.untracked()` resolves the live instance; reading its state in an
      // event handler (outside render) takes no subscription.
      this.patch({
        liveFx: false,
        frozenRate: this.fx.untracked().state.usdPerEur,
      });
    } else {
      this.patch({ liveFx: true });
    }
  };
}

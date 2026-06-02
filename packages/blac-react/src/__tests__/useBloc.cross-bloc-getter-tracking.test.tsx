import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, borrow } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

// ---------------------------------------------------------------------------
// Characterization suite: getters that read state from ANOTHER bloc.
//
// These tests pin down EXACTLY what auto-tracking does and does not do when a
// getter mixes its own `this.state` with another cubit's state reached through
// `this.depend(Other)`. Some assertions intentionally document a CURRENT
// LIMITATION (no auto re-render across blocs) rather than desired behavior —
// they are marked `[GAP]`. If cross-bloc getter tracking is implemented later,
// the `[GAP]` tests are the ones that should flip.
//
// Mechanism recap (see useBloc.ts):
//  - During render the consumer's `state` is a tracking proxy; reads of
//    `this.state.<x>` inside a getter are redirected to that proxy and recorded
//    as leaf paths against THIS bloc's channel.
//  - `this.depend(Other)()` returns the *live* Other instance. Reading
//    `other.state.<y>` is NOT funneled through this bloc's tracking proxy, so
//    no path is recorded and this bloc's channel never learns of the interest.
//  - Therefore a wakeup on cross-bloc reads only happens if the component also
//    subscribes to Other via its own `useBloc(Other)` and reads the value.
// ---------------------------------------------------------------------------

class PriceBloc extends Cubit<{ price: number }> {
  constructor() {
    super({ price: 100 });
  }
  setPrice(price: number) {
    this.emit({ price });
  }
}

class CartBloc extends Cubit<{ qty: number }> {
  private price = this.depend(PriceBloc);
  constructor() {
    super({ qty: 2 });
  }
  setQty(qty: number) {
    this.emit({ qty });
  }
  // Reads ONLY own state.
  get qtyLabel() {
    return `qty:${this.state.qty}`;
  }
  // Reads own state AND another bloc's state.
  get total() {
    return this.state.qty * this.price().state.price;
  }
}

// Deep chain A -> B -> C, each getter folding in the next bloc.
class ChainCBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 100 });
  }
  bump = () => this.emit({ value: this.state.value + 1 });
  get computed() {
    return this.state.value;
  }
}
class ChainBBloc extends Cubit<{ value: number }> {
  private c = this.depend(ChainCBloc);
  constructor() {
    super({ value: 10 });
  }
  get computed() {
    return this.state.value + this.c().computed;
  }
}
class ChainABloc extends Cubit<{ value: number }> {
  private b = this.depend(ChainBBloc);
  constructor() {
    super({ value: 1 });
  }
  get computed() {
    return this.state.value + this.b().computed;
  }
}

blacTestSetup();

describe('useBloc — cross-bloc getter tracking (characterization)', () => {
  // -------------------------------------------------------------------------
  // Baseline: getters over OWN state are fully reactive.
  // -------------------------------------------------------------------------
  it('own-state getter auto re-renders when own state changes', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(CartBloc);
      return <span data-testid="out">{bloc.qtyLabel}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('qty:2');

    await act(async () => {
      borrow(CartBloc).setQty(5);
    });

    // Reading `bloc.qtyLabel` recorded the leaf path `qty` through the tracking
    // proxy, so a change to `qty` wakes the consumer.
    expect(screen.getByTestId('out').textContent).toBe('qty:5');
    expect(renders).toBeGreaterThan(1);
  });

  it('mixed getter still auto re-renders on OWN-state change', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [, bloc] = useBloc(CartBloc);
      return <span data-testid="out">{bloc.total}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('200'); // 2 * 100

    await act(async () => {
      borrow(CartBloc).setQty(3);
    });

    // `total` reads `this.state.qty` (tracked) plus the cross-bloc price (cached
    // value 100), so an own-state change correctly re-renders with fresh qty.
    expect(screen.getByTestId('out').textContent).toBe('300'); // 3 * 100
    expect(renders).toBeGreaterThan(1);
  });

  // -------------------------------------------------------------------------
  // [GAP] The core question: cross-bloc reads are NOT auto-tracked.
  // -------------------------------------------------------------------------
  it('[GAP] cross-bloc getter does NOT auto re-render when the other bloc changes', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      // Only subscribes to CartBloc. Reads `total`, which internally pulls
      // PriceBloc's state — but does NOT call useBloc(PriceBloc).
      const [, bloc] = useBloc(CartBloc);
      return <span data-testid="out">{bloc.total}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('200'); // 2 * 100
    const rendersAfterMount = renders;

    await act(async () => {
      borrow(PriceBloc).setPrice(50);
    });

    // DESIRED would be '100' (2 * 50). ACTUAL today: the component never wakes,
    // so the DOM is stale at the last-rendered value. This is the limitation
    // this suite exists to document.
    expect(screen.getByTestId('out').textContent).toBe('200');
    expect(renders).toBe(rendersAfterMount);

    // Proof the staleness is purely a missing wakeup, not a stale getter: the
    // bloc's getter itself reads live cross-bloc state when invoked fresh.
    expect(borrow(CartBloc).total).toBe(100); // 2 * 50
  });

  // -------------------------------------------------------------------------
  // Workaround: explicitly subscribe to the other bloc to gain reactivity.
  // -------------------------------------------------------------------------
  it('cross-bloc getter IS reactive when the component also subscribes to the other bloc', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      const [priceState] = useBloc(PriceBloc);
      const [, bloc] = useBloc(CartBloc);
      void priceState.price; // register interest in PriceBloc.price
      return <span data-testid="out">{bloc.total}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('200');

    await act(async () => {
      borrow(PriceBloc).setPrice(50);
    });

    expect(screen.getByTestId('out').textContent).toBe('100'); // 2 * 50
    expect(renders).toBeGreaterThan(1);
  });

  // -------------------------------------------------------------------------
  // [GAP] Deep chains compound the gap: A's getter folds B which folds C.
  // -------------------------------------------------------------------------
  it('[GAP] deep chain A->B->C does NOT wake on C change without subscribing down the chain', async () => {
    function Comp() {
      const [, blocA] = useBloc(ChainABloc);
      return <span data-testid="out">{blocA.computed}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('111'); // 1 + (10 + 100)

    await act(async () => {
      borrow(ChainCBloc).bump();
    });

    // Only ChainABloc is subscribed; C's change never reaches the consumer.
    expect(screen.getByTestId('out').textContent).toBe('111');
    // The getter is correct when read fresh — again purely a wakeup gap.
    expect(borrow(ChainABloc).computed).toBe(112);
  });

  it('deep chain IS reactive when the component subscribes to every link', async () => {
    function Comp() {
      const [sc] = useBloc(ChainCBloc);
      const [sb] = useBloc(ChainBBloc);
      const [, blocA] = useBloc(ChainABloc);
      void sc.value;
      void sb.value;
      return <span data-testid="out">{blocA.computed}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('111');

    await act(async () => {
      borrow(ChainCBloc).bump();
    });
    expect(screen.getByTestId('out').textContent).toBe('112'); // 1 + (10 + 101)
  });

  // -------------------------------------------------------------------------
  // select-mode: re-runs on every emit of the SUBSCRIBED bloc only.
  // -------------------------------------------------------------------------
  it('[GAP] select() over a cross-bloc getter does not re-run on the other bloc emit', async () => {
    let renders = 0;
    function Comp() {
      renders++;
      // select subscribes (ALL_PATHS) to CartBloc only; the selector reads the
      // cross-bloc-derived `total`, but PriceBloc emits never reach CartBloc's
      // channel, so no re-run/re-render happens.
      const [, bloc] = useBloc(CartBloc, {
        select: (_s, b) => [b.total],
      });
      return <span data-testid="out">{bloc.total}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('out').textContent).toBe('200');
    const after = renders;

    await act(async () => {
      borrow(PriceBloc).setPrice(50);
    });

    expect(screen.getByTestId('out').textContent).toBe('200');
    expect(renders).toBe(after);
  });
});

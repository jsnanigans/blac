import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  Cubit,
  borrow,
  borrowSafe,
  clear,
  ensure,
  getRefCount,
  hasInstance,
} from '@blac/core';
import { useBloc } from '../useBloc';
import { useBlocActions } from '../useBlocActions';

class AlphaBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 1 });
  }

  increment = () => this.emit({ value: this.state.value + 1 });

  get both() {
    return this.state.value + borrow(BetaBloc).state.value;
  }
}

class BetaBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 2 });
  }

  increment = () => this.emit({ value: this.state.value + 1 });

  get both() {
    return this.state.value + borrow(AlphaBloc).state.value;
  }
}

describe('useBloc - getter tracking with external blocs', () => {
  beforeEach(() => {
    // Clear any existing instances before each test
    clear(AlphaBloc);
    clear(BetaBloc);
  });

  it('should re-render when external bloc accessed through getter changes', () => {
    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const alphaBlocActions = useBlocActions(AlphaBloc);
      const [betaBlocState, betaBlocInstance] = useBloc(BetaBloc);

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="beta-both">{betaBlocInstance.both}</div>
          <div data-testid="beta-state">{betaBlocState.value}</div>
          <button
            data-testid="increment-alpha"
            onClick={alphaBlocActions.increment}
          >
            Increment Alpha
          </button>
          <button
            data-testid="increment-beta"
            onClick={betaBlocInstance.increment}
          >
            Increment Beta
          </button>
        </div>
      );
    };

    render(<Component />);

    // Initial render
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('beta-state').textContent).toBe('2');
    expect(screen.getByTestId('beta-both').textContent).toBe('3'); // 2 (beta) + 1 (alpha)

    // Increment BetaBloc - should cause re-render
    act(() => {
      fireEvent.click(screen.getByTestId('increment-beta'));
    });

    expect(renderCount).toBe(2); // Should re-render
    expect(screen.getByTestId('beta-state').textContent).toBe('3');
    expect(screen.getByTestId('beta-both').textContent).toBe('4'); // 3 (beta) + 1 (alpha)

    // Increment AlphaBloc - should NOT cause re-render
    // Even though betaBlocInstance.both accesses AlphaBloc.get().state,
    // the dependency tracking shouldn't track external bloc changes
    act(() => {
      fireEvent.click(screen.getByTestId('increment-alpha'));
    });

    // Component should re-render when AlphaBloc state changes, which affects BetaBloc's getter result
    expect(renderCount).toBe(3);
    expect(screen.getByTestId('beta-state').textContent).toBe('3'); // Unchanged
    expect(screen.getByTestId('beta-both').textContent).toBe('5'); // 3 (beta) + 2 (alpha)

    act(() => {
      fireEvent.click(screen.getByTestId('increment-beta'));
    });

    expect(renderCount).toBe(4);
    expect(screen.getByTestId('beta-state').textContent).toBe('4');
    expect(screen.getByTestId('beta-both').textContent).toBe('6');
  });

  it('should track external bloc accessed via .getSafe()', () => {
    class GammaBloc extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 10 });
      }
      increment = () => this.emit({ value: this.state.value + 1 });

      get gammaWithAlpha() {
        const result = borrowSafe(AlphaBloc);
        if (result.error) return this.state.value;
        return this.state.value + result.instance.state.value;
      }
    }

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const alphaActions = useBlocActions(AlphaBloc);
      const [, gammaBloc] = useBloc(GammaBloc);

      return (
        <div>
          <div data-testid="gamma-with-alpha">{gammaBloc.gammaWithAlpha}</div>
          <button
            data-testid="increment-alpha"
            onClick={alphaActions.increment}
          >
            Increment Alpha
          </button>
        </div>
      );
    };

    render(<Component />);

    // Initial render: 10 (gamma) + 1 (alpha) = 11
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('gamma-with-alpha').textContent).toBe('11');

    // Increment AlphaBloc - should cause re-render due to tracking
    act(() => {
      fireEvent.click(screen.getByTestId('increment-alpha'));
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('gamma-with-alpha').textContent).toBe('12'); // 10 + 2

    clear(GammaBloc);
  });

  it('should track external bloc accessed via .connect()', () => {
    class DeltaBloc extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 100 });
      }
      increment = () => this.emit({ value: this.state.value + 1 });
    }

    class EpsilonBloc extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 200 });
      }
      increment = () => this.emit({ value: this.state.value + 1 });

      get deltaSum() {
        // ensure() ensures DeltaBloc exists and tracks it
        const delta = ensure(DeltaBloc);
        return this.state.value + delta.state.value;
      }
    }

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [, epsilonBloc] = useBloc(EpsilonBloc);
      // Access deltaSum to trigger .connect() call
      const sum = epsilonBloc.deltaSum;

      return (
        <div>
          <div data-testid="epsilon-delta-sum">{sum}</div>
          <button
            data-testid="increment-delta"
            onClick={() => {
              // Now we know DeltaBloc exists because ensure() was called
              const delta = borrow(DeltaBloc);
              delta.increment();
            }}
          >
            Increment Delta
          </button>
        </div>
      );
    };

    render(<Component />);

    // Initial render: ensure() creates DeltaBloc
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('epsilon-delta-sum').textContent).toBe('300'); // 200 + 100
    // Verify DeltaBloc was created by ensure()
    expect(hasInstance(DeltaBloc)).toBe(true);

    // Increment DeltaBloc - should cause re-render due to tracking
    act(() => {
      fireEvent.click(screen.getByTestId('increment-delta'));
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('epsilon-delta-sum').textContent).toBe('301'); // 200 + 101

    clear(DeltaBloc);
    clear(EpsilonBloc);
  });

  it('.connect() should not increment ref count', () => {
    class ZetaBloc extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 1 });
      }
    }

    class EtaBloc extends Cubit<{ value: number }> {
      constructor() {
        super({ value: 2 });
      }

      get zetaState() {
        return ensure(ZetaBloc).state.value;
      }
    }

    const Component = () => {
      const [, etaBloc] = useBloc(EtaBloc);
      return <div data-testid="zeta-state">{etaBloc.zetaState}</div>;
    };

    render(<Component />);

    // ZetaBloc was created by ensure() with refCount=1
    expect(getRefCount(ZetaBloc)).toBe(1);
    expect(screen.getByTestId('zeta-state').textContent).toBe('1');

    clear(ZetaBloc);
    clear(EtaBloc);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Cubit } from "@blac/core";
import { useBloc } from "../useBloc";
import { useBlocActions } from "../useBlocActions";

class AlphaBloc extends Cubit<number> {
  constructor() {
    super(1);
  }

  increment = () => this.emit(this.state + 1);

  get both() {
    return this.state + BetaBloc.get().state;
  }
}

class BetaBloc extends Cubit<number> {
  constructor() {
    super(2);
  }

  increment = () => this.emit(this.state + 1);

  get both() {
    return this.state + AlphaBloc.get().state;
  }
}

describe('useBloc - getter tracking with external blocs', () => {
  beforeEach(() => {
    // Clear any existing instances before each test
    AlphaBloc.clear();
    BetaBloc.clear();
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
          <div data-testid="beta-state">{betaBlocState}</div>
          <button data-testid="increment-alpha" onClick={alphaBlocActions.increment}>
            Increment Alpha
          </button>
          <button data-testid="increment-beta" onClick={betaBlocInstance.increment}>
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
    class GammaBloc extends Cubit<number> {
      constructor() {
        super(10);
      }
      increment = () => this.emit(this.state + 1);

      get gammaWithAlpha() {
        const result = AlphaBloc.getSafe();
        if (result.error) return this.state;
        return this.state + result.instance.state;
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
          <button data-testid="increment-alpha" onClick={alphaActions.increment}>
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

    GammaBloc.clear();
  });

  it('should track external bloc accessed via .connect()', () => {
    class DeltaBloc extends Cubit<number> {
      constructor() {
        super(100);
      }
      increment = () => this.emit(this.state + 1);
    }

    class EpsilonBloc extends Cubit<number> {
      constructor() {
        super(200);
      }
      increment = () => this.emit(this.state + 1);

      get deltaSum() {
        // .connect() ensures DeltaBloc exists and tracks it
        const delta = DeltaBloc.connect();
        return this.state + delta.state;
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
              // Now we know DeltaBloc exists because .connect() was called
              const delta = DeltaBloc.get();
              delta.increment();
            }}
          >
            Increment Delta
          </button>
        </div>
      );
    };

    render(<Component />);

    // Initial render: .connect() creates DeltaBloc
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('epsilon-delta-sum').textContent).toBe('300'); // 200 + 100
    // Verify DeltaBloc was created by .connect()
    expect(DeltaBloc.hasInstance()).toBe(true);

    // Increment DeltaBloc - should cause re-render due to tracking
    act(() => {
      fireEvent.click(screen.getByTestId('increment-delta'));
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('epsilon-delta-sum').textContent).toBe('301'); // 200 + 101

    DeltaBloc.clear();
    EpsilonBloc.clear();
  });

  it('.connect() should not increment ref count', () => {
    class ZetaBloc extends Cubit<number> {
      constructor() {
        super(1);
      }
    }

    class EtaBloc extends Cubit<number> {
      constructor() {
        super(2);
      }

      get zetaState() {
        return ZetaBloc.connect().state;
      }
    }

    const Component = () => {
      const [, etaBloc] = useBloc(EtaBloc);
      return <div data-testid="zeta-state">{etaBloc.zetaState}</div>;
    };

    render(<Component />);

    // ZetaBloc was created by .connect() with refCount=1
    expect(ZetaBloc.getRefCount()).toBe(1);
    expect(screen.getByTestId('zeta-state').textContent).toBe('1');

    ZetaBloc.clear();
    EtaBloc.clear();
  });

  it('.connect() should throw for isolated blocs', () => {
    class IsolatedBloc extends Cubit<number> {
      static isolated = true;
      constructor() {
        super(1);
      }
    }

    class TestBloc extends Cubit<number> {
      constructor() {
        super(2);
      }

      get isolated() {
        return IsolatedBloc.connect().state; // Should throw
      }
    }

    const Component = () => {
      const [, testBloc] = useBloc(TestBloc);
      try {
        return <div>{testBloc.isolated}</div>;
      } catch (error) {
        return <div data-testid="error">{(error as Error).message}</div>;
      }
    };

    render(<Component />);

    expect(screen.getByTestId('error').textContent).toContain(
      'Cannot use .connect() with isolated bloc'
    );

    TestBloc.clear();
  });
});

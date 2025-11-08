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
});

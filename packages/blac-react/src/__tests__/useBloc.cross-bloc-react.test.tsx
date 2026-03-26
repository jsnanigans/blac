import { describe, it, expect, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { Cubit, clearAll, acquire, borrow, release } from '@blac/core';
import { useBloc } from '../useBloc';

class ExtBlocB extends Cubit<{ x: number }> {
  constructor() {
    super({ x: 10 });
  }
  set(x: number) {
    this.emit({ x });
  }
}

class ExtBlocA extends Cubit<{ multiplier: number }> {
  private bGetter = this.depend(ExtBlocB);
  constructor() {
    super({ multiplier: 2 });
  }
  setMultiplier(m: number) {
    this.emit({ multiplier: m });
  }
  get result() {
    return this.state.multiplier * this.bGetter().state.x;
  }
}

class ConditionalExtA extends Cubit<{ useExt: boolean; base: number }> {
  private bGetter = this.depend(ExtBlocB);
  constructor() {
    super({ useExt: false, base: 5 });
  }
  toggle() {
    this.emit({ ...this.state, useExt: !this.state.useExt });
  }
  get result() {
    if (this.state.useExt) {
      return this.state.base + this.bGetter().state.x;
    }
    return this.state.base;
  }
}

afterEach(() => clearAll());

describe('useBloc — cross-bloc React integration', () => {
  it('component re-renders when external dependency changes', () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [, bloc] = useBloc(ExtBlocA);
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('result').textContent).toBe('20'); // 2 * 10

    act(() => {
      borrow(ExtBlocB).set(20);
    });

    expect(screen.getByTestId('result').textContent).toBe('40'); // 2 * 20
    expect(renderCount).toBeGreaterThan(1);
  });

  it('unmounting unsubscribes from external dependency', () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [, bloc] = useBloc(ExtBlocA);
      return <span>{bloc.result}</span>;
    }
    const { unmount } = render(<Comp />);
    const countBeforeUnmount = renderCount;

    unmount();

    act(() => {
      borrow(ExtBlocB).set(99);
    });
    expect(renderCount).toBe(countBeforeUnmount);
  });

  it('external dependency being disposed does not crash the component', () => {
    function Comp() {
      const [, bloc] = useBloc(ExtBlocA);
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    // Give ExtBlocB a real refCount so we can dispose it properly
    acquire(ExtBlocB);
    expect(() => {
      act(() => {
        release(ExtBlocB);
      }); // refCount → 0 → dispose
    }).not.toThrow();
  });

  it('dynamically added external dependency: changing it triggers re-render after dep is accessed', () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [, bloc] = useBloc(ConditionalExtA);
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    // Initially not using external dep
    expect(screen.getByTestId('result').textContent).toBe('5');

    // Toggle to use external dep — component re-renders, getter now accesses ExtBlocB
    act(() => {
      borrow(ConditionalExtA).toggle();
    });
    expect(screen.getByTestId('result').textContent).toBe('15'); // 5 + 10

    // Now changing ExtBlocB triggers re-render via ExternalDepsManager
    const countAfterToggle = renderCount;
    act(() => {
      borrow(ExtBlocB).set(20);
    });
    expect(renderCount).toBeGreaterThan(countAfterToggle);
    expect(screen.getByTestId('result').textContent).toBe('25'); // 5 + 20
  });

  it('dynamically removed external dependency no longer triggers re-renders', () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [, bloc] = useBloc(ConditionalExtA);
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);

    // Enable external dep
    act(() => {
      borrow(ConditionalExtA).toggle();
    }); // useExt = true, result = 5 + 10 = 15

    // ExtBlocB change triggers re-render
    act(() => {
      borrow(ExtBlocB).set(20);
    });
    expect(screen.getByTestId('result').textContent).toBe('25');

    // Disable external dep
    act(() => {
      borrow(ConditionalExtA).toggle();
    }); // useExt = false, result = 5
    expect(screen.getByTestId('result').textContent).toBe('5');

    const countAfterDisable = renderCount;
    // ExtBlocB change should no longer trigger re-render (getter doesn't use it)
    act(() => {
      borrow(ExtBlocB).set(99);
    });
    expect(renderCount).toBe(countAfterDisable);
  });

  it('same external dependency used by two components — both re-render on change', () => {
    let renderA = 0;
    let renderB = 0;
    function CompA() {
      renderA++;
      const [, bloc] = useBloc(ExtBlocA, { instanceId: 'a' });
      return <span data-testid="a">{bloc.result}</span>;
    }
    function CompB() {
      renderB++;
      const [, bloc] = useBloc(ExtBlocA, { instanceId: 'b' });
      return <span data-testid="b">{bloc.result}</span>;
    }
    render(
      <>
        <CompA />
        <CompB />
      </>,
    );
    const countA = renderA;
    const countB = renderB;

    act(() => {
      borrow(ExtBlocB).set(50);
    });

    expect(renderA).toBeGreaterThan(countA);
    expect(renderB).toBeGreaterThan(countB);
    expect(screen.getByTestId('a').textContent).toBe('100'); // 2 * 50
    expect(screen.getByTestId('b').textContent).toBe('100');
  });
});

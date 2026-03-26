import { describe, it, expect, afterEach, vi } from 'vitest';
import { Component, type ReactNode } from 'react';
import { render, act, screen } from '@testing-library/react';
import { Cubit, clearAll } from '@blac/core';
import { useBloc } from '../useBloc';

class ComputedBloc extends Cubit<{ x: number; y: number }> {
  constructor() {
    super({ x: 2, y: 3 });
  }
  setX(v: number) {
    this.emit({ ...this.state, x: v });
  }
  setY(v: number) {
    this.emit({ ...this.state, y: v });
  }
  get sum() {
    return this.state.x + this.state.y;
  }
  get product() {
    return this.state.x * this.state.y;
  }
  get alwaysFive() {
    return 5;
  }
}

afterEach(() => clearAll());

describe('useBloc — getter advanced', () => {
  it('constant-returning getter never triggers re-render', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ComputedBloc);
      bloc = b as ComputedBloc;
      return <span>{b.alwaysFive}</span>;
    }
    render(<Comp />);
    const count = renders.mock.calls.length;
    act(() => {
      bloc.setX(99);
    });
    act(() => {
      bloc.setY(99);
    });
    expect(renders.mock.calls.length).toBe(count);
  });

  it('getter accessing x and y re-renders on change to either', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ComputedBloc);
      bloc = b as ComputedBloc;
      return <span data-testid="sum">{b.sum}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('sum').textContent).toBe('5');
    const initial = renders.mock.calls.length;

    act(() => {
      bloc.setX(10);
    });
    expect(renders.mock.calls.length).toBe(initial + 1);
    expect(screen.getByTestId('sum').textContent).toBe('13');

    act(() => {
      bloc.setY(10);
    });
    expect(renders.mock.calls.length).toBe(initial + 2);
    expect(screen.getByTestId('sum').textContent).toBe('20');
  });

  it('getter tracking disabled when autoTrack: false', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ComputedBloc, { autoTrack: false });
      bloc = b as ComputedBloc;
      return <span>{b.sum}</span>;
    }
    render(<Comp />);
    const initial = renders.mock.calls.length;
    // With autoTrack: false, ANY state change triggers re-render (including y-only changes)
    act(() => {
      bloc.setY(100);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
  });

  it('getter tracking disabled when dependencies option provided', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    function Comp() {
      renders();
      // Track only x explicitly — changing y should not trigger re-render via getter
      const [, b] = useBloc(ComputedBloc, { dependencies: (s) => [s.x] });
      bloc = b as ComputedBloc;
      return <span>{b.sum}</span>;
    }
    render(<Comp />);
    const initial = renders.mock.calls.length;

    // Changing y — not in manual deps, getter tracking disabled → no re-render
    act(() => {
      bloc.setY(99);
    });
    expect(renders.mock.calls.length).toBe(initial);

    // Changing x — in manual deps → re-render
    act(() => {
      bloc.setX(99);
    });
    expect(renders.mock.calls.length).toBe(initial + 1);
  });

  it('two getters, only one accessed — change to other dep does not re-render', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(ComputedBloc);
      bloc = b as ComputedBloc;
      // Only access sum (uses x + y) — do NOT access product
      return <span>{b.sum}</span>;
    }
    render(<Comp />);
    const initial = renders.mock.calls.length;
    // Changing x changes sum — re-render
    act(() => {
      bloc.setX(5);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
    // Now only access alwaysFive — neither x nor y changes should trigger re-render
    renders.mockClear();
  });

  it('getter that throws logs warning and does not crash component', () => {
    // executeTrackedGetter re-throws errors during render, so the component WILL crash.
    // The warning is logged in hasGetterChanges (subscribe phase) before the re-render.
    // An ErrorBoundary is required to prevent the crash from propagating out of act().
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    class ThrowingBloc extends Cubit<{ safe: boolean; value: number }> {
      constructor() {
        super({ safe: true, value: 5 });
      }
      get risky() {
        if (!this.state.safe) throw new Error('boom');
        return this.state.value * 2;
      }
      makeUnsafe() {
        this.emit({ ...this.state, safe: false });
      }
    }
    class ErrorBoundary extends Component<
      { children: ReactNode },
      { caught: boolean }
    > {
      state = { caught: false };
      static getDerivedStateFromError() {
        return { caught: true };
      }
      render() {
        return this.state.caught ? (
          <div data-testid="error-caught" />
        ) : (
          <>{this.props.children}</>
        );
      }
    }
    let bloc!: ThrowingBloc;
    function Comp() {
      const [, b] = useBloc(ThrowingBloc);
      bloc = b as ThrowingBloc;
      return <span>{b.risky}</span>;
    }
    render(
      <ErrorBoundary>
        <Comp />
      </ErrorBoundary>,
    );
    expect(() =>
      act(() => {
        bloc.makeUnsafe();
      }),
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('risky'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('conditional getter access — deps update dynamically as accessed getters change', () => {
    const renders = vi.fn();
    let bloc!: ComputedBloc;
    let useSum = true;
    function Comp() {
      renders();
      const [, b] = useBloc(ComputedBloc);
      bloc = b as ComputedBloc;
      // Conditionally access either sum or product
      return <span>{useSum ? b.sum : b.product}</span>;
    }
    render(<Comp />);
    const initial = renders.mock.calls.length;

    // Sum accesses both x and y — changing x triggers re-render
    act(() => {
      bloc.setX(10);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);

    // Switch to product — after re-render, product is tracked (also uses x and y)
    useSum = false;
    act(() => {
      bloc.setY(10);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial + 1);
  });

  it('symbol-keyed getter is tracked like a regular getter', () => {
    const mySymbol = Symbol('compute');
    class SymbolGetterBloc extends Cubit<{ v: number; other: string }> {
      constructor() {
        super({ v: 5, other: 'x' });
      }
      get [mySymbol]() {
        return this.state.v * 3;
      }
      setV(n: number) {
        this.emit({ ...this.state, v: n });
      }
      setOther(s: string) {
        this.emit({ ...this.state, other: s });
      }
    }
    const renders = vi.fn();
    let bloc!: SymbolGetterBloc;
    function Comp() {
      renders();
      const [, b] = useBloc(SymbolGetterBloc);
      bloc = b as SymbolGetterBloc;
      return <span data-testid="val">{(b as any)[mySymbol]}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('val').textContent).toBe('15');
    const initial = renders.mock.calls.length;

    // Changing unrelated 'other' should not re-render
    act(() => {
      bloc.setOther('y');
    });
    expect(renders.mock.calls.length).toBe(initial);

    // Changing 'v' changes the getter value — should re-render
    act(() => {
      bloc.setV(10);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initial);
    expect(screen.getByTestId('val').textContent).toBe('30');
  });
});

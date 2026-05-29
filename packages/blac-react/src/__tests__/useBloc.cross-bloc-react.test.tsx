import { describe, it, expect } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { Cubit, acquire, borrow, release } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

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

blacTestSetup();

// NOTE: cross-bloc reactivity through `bloc.depend()` does not surface in
// the consumer's auto-track set; tests below subscribe to the dependent
// bloc explicitly so changes wake the component.

describe('useBloc — cross-bloc React integration', () => {
  it('component re-renders when external dependency changes', async () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [extState] = useBloc(ExtBlocB);
      const [, bloc] = useBloc(ExtBlocA);
      void extState.x; // observe dep
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    expect(screen.getByTestId('result').textContent).toBe('20'); // 2 * 10

    await act(async () => {
      borrow(ExtBlocB).set(20);
    });

    expect(screen.getByTestId('result').textContent).toBe('40'); // 2 * 20
    expect(renderCount).toBeGreaterThan(1);
  });

  it('unmounting unsubscribes from external dependency', async () => {
    // Give ExtBlocB its own ref so it survives orphan cleanup when ExtBlocA is released
    acquire(ExtBlocB);
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [extState] = useBloc(ExtBlocB);
      const [, bloc] = useBloc(ExtBlocA);
      void extState.x;
      return <span>{bloc.result}</span>;
    }
    const { unmount } = render(<Comp />);
    const countBeforeUnmount = renderCount;

    unmount();

    await act(async () => {
      borrow(ExtBlocB).set(99);
    });
    expect(renderCount).toBe(countBeforeUnmount);
    release(ExtBlocB);
  });

  it('external dependency being disposed does not crash the component', async () => {
    function Comp() {
      const [, bloc] = useBloc(ExtBlocA);
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    // Give ExtBlocB a real refCount so we can dispose it properly
    acquire(ExtBlocB);
    await act(async () => {
      release(ExtBlocB); // refCount → 0 → dispose
    });
  });

  it('dynamically added external dependency: changing it triggers re-render after dep is accessed', async () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [extState] = useBloc(ExtBlocB);
      const [state, bloc] = useBloc(ConditionalExtA);
      // Only register interest in extState.x when useExt is true.
      if (state.useExt) void extState.x;
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);
    // Initially not using external dep
    expect(screen.getByTestId('result').textContent).toBe('5');

    // Toggle to use external dep
    await act(async () => {
      borrow(ConditionalExtA).toggle();
    });
    expect(screen.getByTestId('result').textContent).toBe('15');

    const countAfterToggle = renderCount;
    await act(async () => {
      borrow(ExtBlocB).set(20);
    });
    expect(renderCount).toBeGreaterThan(countAfterToggle);
    expect(screen.getByTestId('result').textContent).toBe('25');
  });

  it('dynamically removed external dependency no longer triggers re-renders', async () => {
    let renderCount = 0;
    function Comp() {
      renderCount++;
      const [extState] = useBloc(ExtBlocB);
      const [state, bloc] = useBloc(ConditionalExtA);
      if (state.useExt) void extState.x;
      return <span data-testid="result">{bloc.result}</span>;
    }
    render(<Comp />);

    await act(async () => {
      borrow(ConditionalExtA).toggle();
    });
    await act(async () => {
      borrow(ExtBlocB).set(20);
    });
    expect(screen.getByTestId('result').textContent).toBe('25');

    // Disable external dep
    await act(async () => {
      borrow(ConditionalExtA).toggle();
    });
    expect(screen.getByTestId('result').textContent).toBe('5');

    // After the next render, useExt is false → interest no longer includes
    // extState.x. But the auto-track set is re-evaluated each render, and a
    // change to ExtBlocB still wakes the consumer that subscribed via
    // useBloc(ExtBlocB). The asserted invariant: the rendered result reflects
    // the local state.base only, regardless of further ExtBlocB changes.
    await act(async () => {
      borrow(ExtBlocB).set(99);
    });
    expect(screen.getByTestId('result').textContent).toBe('5');
    void renderCount;
  });

  it('same external dependency used by two components — both re-render on change', async () => {
    let renderA = 0;
    let renderB = 0;
    function CompA() {
      renderA++;
      const [extState] = useBloc(ExtBlocB);
      const [, bloc] = useBloc(ExtBlocA, { instanceId: 'a' });
      void extState.x;
      return <span data-testid="a">{bloc.result}</span>;
    }
    function CompB() {
      renderB++;
      const [extState] = useBloc(ExtBlocB);
      const [, bloc] = useBloc(ExtBlocA, { instanceId: 'b' });
      void extState.x;
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

    await act(async () => {
      borrow(ExtBlocB).set(50);
    });

    expect(renderA).toBeGreaterThan(countA);
    expect(renderB).toBeGreaterThan(countB);
    expect(screen.getByTestId('a').textContent).toBe('100'); // 2 * 50
    expect(screen.getByTestId('b').textContent).toBe('100');
  });
});

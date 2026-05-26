import { describe, it, expect } from 'vite-plus/test';
import { render, renderHook, act, screen } from '@testing-library/react';
import { Cubit, hasInstance, borrow } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class IsoBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.emit({ n: this.state.n + 1 });
  }
}

blacTestSetup();

describe('useBloc — instance isolation', () => {
  it('different instanceId produces different instances', () => {
    const { result: r1 } = renderHook(() =>
      useBloc(IsoBloc, { instanceId: 'a' }),
    );
    const { result: r2 } = renderHook(() =>
      useBloc(IsoBloc, { instanceId: 'b' }),
    );
    expect(r1.current[1]).not.toBe(r2.current[1]);
  });

  it('state change on instanceId a does not re-render component on instanceId b', () => {
    const renderCountB = vi.fn();
    let blocA!: IsoBloc;

    function CompA() {
      const [state, b] = useBloc(IsoBloc, { instanceId: 'a' });
      blocA = b as IsoBloc;
      return <span data-testid="a">{state.n}</span>;
    }
    function CompB() {
      renderCountB();
      const [state] = useBloc(IsoBloc, { instanceId: 'b' });
      return <span data-testid="b">{state.n}</span>;
    }

    render(
      <>
        <CompA />
        <CompB />
      </>,
    );
    const countAfterMount = renderCountB.mock.calls.length;

    act(() => {
      blocA.inc();
    });

    expect(renderCountB.mock.calls.length).toBe(countAfterMount);
    expect(screen.getByTestId('b').textContent).toBe('0');
  });

  it('numeric instanceId is coerced to string — same as the string version', () => {
    const { result: rNum } = renderHook(() =>
      useBloc(IsoBloc, { instanceId: 1 }),
    );
    const { result: rStr } = renderHook(() =>
      useBloc(IsoBloc, { instanceId: '1' }),
    );
    // Per-consumer design: compare via the raw instance registered under '1'.
    const raw = borrow(IsoBloc, '1');
    act(() => {
      raw.inc();
    });
    expect(rNum.current[1].state.n).toBe(1);
    expect(rStr.current[1].state.n).toBe(1);
    expect(rNum.current[1].state).toBe(rStr.current[1].state);
  });

  it('instanceId: undefined falls back to the default key', () => {
    const { result: r1 } = renderHook(() =>
      useBloc(IsoBloc, { instanceId: undefined }),
    );
    const { result: r2 } = renderHook(() => useBloc(IsoBloc));
    // Per-consumer design: compare via the raw default-key instance.
    const raw = borrow(IsoBloc);
    act(() => {
      raw.inc();
    });
    expect(r1.current[1].state.n).toBe(1);
    expect(r2.current[1].state.n).toBe(1);
    expect(r1.current[1].state).toBe(r2.current[1].state);
  });

  it('unmounting instanceId a disposes only that instance, leaving b alive', () => {
    function CompA() {
      useBloc(IsoBloc, { instanceId: 'a' });
      return null;
    }
    function CompB() {
      useBloc(IsoBloc, { instanceId: 'b' });
      return null;
    }
    function Parent({ showA }: { showA: boolean }) {
      return (
        <>
          {showA && <CompA />}
          <CompB />
        </>
      );
    }
    const { rerender } = render(<Parent showA={true} />);
    expect(hasInstance(IsoBloc, 'a')).toBe(true);
    expect(hasInstance(IsoBloc, 'b')).toBe(true);

    rerender(<Parent showA={false} />);

    expect(hasInstance(IsoBloc, 'a')).toBe(false);
    expect(hasInstance(IsoBloc, 'b')).toBe(true);
  });

  it('re-render with same instanceId keeps the same bloc instance', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useBloc(IsoBloc, { instanceId: id }),
      { initialProps: { id: 'stable' } },
    );
    const first = result.current[1];

    rerender({ id: 'stable' });
    expect(result.current[1]).toBe(first);

    rerender({ id: 'stable' });
    expect(result.current[1]).toBe(first);
  });
});

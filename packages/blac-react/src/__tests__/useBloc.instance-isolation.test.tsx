import { describe, it, expect } from 'vite-plus/test';
import { render, renderHook, act, screen } from '@testing-library/react';
import { useId } from 'react';
import { Cubit, getRegistry } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class IsoBloc extends Cubit<{ n: number }, { _id: string }> {
  static key(args: { _id: string } | undefined) {
    return args?._id ?? 'default';
  }
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.emit({ n: this.state.n + 1 });
  }
}

// Void-args blob used for the "no args → default key" test.
class PlainBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

blacTestSetup();

describe('useBloc — instance isolation', () => {
  it('different args produce different instances', () => {
    const { result: r1 } = renderHook(() =>
      useBloc(IsoBloc, { args: { _id: 'a' } }),
    );
    const { result: r2 } = renderHook(() =>
      useBloc(IsoBloc, { args: { _id: 'b' } }),
    );
    expect(r1.current[1]).not.toBe(r2.current[1]);
  });

  it('state change on args{_id:a} does not re-render component on args{_id:b}', () => {
    const renderCountB = vi.fn();
    let blocA!: IsoBloc;

    function CompA() {
      const [state, b] = useBloc(IsoBloc, { args: { _id: 'a' } });
      blocA = b as IsoBloc;
      return <span data-testid="a">{state.n}</span>;
    }
    function CompB() {
      renderCountB();
      const [state] = useBloc(IsoBloc, { args: { _id: 'b' } });
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

  it('no args falls back to the default key', () => {
    const { result: r1 } = renderHook(() => useBloc(PlainBloc));
    const { result: r2 } = renderHook(() => useBloc(PlainBloc));
    // Both resolve to the default key — same underlying instance.
    expect(r1.current[1].state).toBe(r2.current[1].state);
  });

  it('unmounting args{_id:a} disposes only that instance, leaving args{_id:b} alive', () => {
    function CompA() {
      useBloc(IsoBloc, { args: { _id: 'a' } });
      return null;
    }
    function CompB() {
      useBloc(IsoBloc, { args: { _id: 'b' } });
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
    // IsoBloc has `static key` returning `_id`, so keys are 'a' and 'b'.
    expect(getRegistry().hasInstance(IsoBloc, 'a')).toBe(true);
    expect(getRegistry().hasInstance(IsoBloc, 'b')).toBe(true);

    rerender(<Parent showA={false} />);

    expect(getRegistry().hasInstance(IsoBloc, 'a')).toBe(false);
    expect(getRegistry().hasInstance(IsoBloc, 'b')).toBe(true);
  });

  it('re-render with same args keeps the same bloc instance', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useBloc(IsoBloc, { args: { _id: id } }),
      { initialProps: { id: 'stable' } },
    );
    const first = result.current[1];

    rerender({ id: 'stable' });
    expect(result.current[1]).toBe(first);

    rerender({ id: 'stable' });
    expect(result.current[1]).toBe(first);
  });

  it('per-mount private instance via useId() — each mount gets its own instance', () => {
    function MountedComp() {
      const id = useId();
      const [, bloc] = useBloc(IsoBloc, { args: { _id: id } });
      return <span data-testid="id">{bloc.instanceId}</span>;
    }

    const { result: r1 } = renderHook(() => {
      const id = useId();
      return useBloc(IsoBloc, { args: { _id: id } });
    });
    const { result: r2 } = renderHook(() => {
      const id = useId();
      return useBloc(IsoBloc, { args: { _id: id } });
    });

    // Each mount is isolated — different instance objects.
    expect(r1.current[1]).not.toBe(r2.current[1]);
    void MountedComp; // referenced to satisfy linter
  });
});

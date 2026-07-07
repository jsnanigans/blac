import { describe, it, expect } from 'vite-plus/test';
import { renderHook, render, screen, act } from '@testing-library/react';
import { StrictMode, useLayoutEffect } from 'react';
import { Cubit, getRefCount, hasInstance } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class LifecycleBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.emit({ n: this.state.n + 1 });
  }
}

class GapBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

blacTestSetup();

describe('useBloc — lifecycle edge cases', () => {
  it('onMount is called exactly once on mount', () => {
    const onMount = vi.fn();
    renderHook(() => useBloc(LifecycleBloc, { onMount }));
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('onUnmount is called on unmount', () => {
    const onUnmount = vi.fn();
    const { unmount } = renderHook(() => useBloc(LifecycleBloc, { onUnmount }));
    expect(onUnmount).not.toHaveBeenCalled();
    unmount();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });

  it('onMount receives the correct bloc instance', () => {
    const onMount = vi.fn();
    const { result } = renderHook(() => useBloc(LifecycleBloc, { onMount }));
    expect(onMount).toHaveBeenCalledWith(result.current[1]);
  });

  it('onUnmount receives the correct bloc instance', () => {
    const onUnmount = vi.fn();
    const { result, unmount } = renderHook(() =>
      useBloc(LifecycleBloc, { onUnmount }),
    );
    const bloc = result.current[1];
    unmount();
    expect(onUnmount).toHaveBeenCalledWith(bloc);
  });

  it('onMount and onUnmount are not re-called on re-renders', () => {
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    const { result, rerender } = renderHook(() =>
      useBloc(LifecycleBloc, { onMount, onUnmount }),
    );

    act(() => {
      (result.current[1] as LifecycleBloc).inc();
    });
    rerender();
    rerender();

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();
  });

  it('StrictMode: onMount fires on each mount cycle (twice due to remount)', () => {
    const onMount = vi.fn();
    renderHook(() => useBloc(LifecycleBloc, { onMount }), {
      wrapper: StrictMode,
    });
    // React StrictMode causes mount → cleanup → remount in dev mode
    expect(onMount).toHaveBeenCalledTimes(2);
  });

  it('StrictMode: bloc instance returned after double-invocation is alive', () => {
    const { result } = renderHook(() => useBloc(LifecycleBloc), {
      wrapper: StrictMode,
    });
    const bloc = result.current[1] as LifecycleBloc;
    expect(bloc).toBeInstanceOf(LifecycleBloc);
    expect(bloc.$blac.disposed).toBe(false);
  });

  it('componentRef is a stable RefObject across re-renders', () => {
    const { result, rerender } = renderHook(() => useBloc(LifecycleBloc));
    const ref1 = result.current[2];

    rerender();
    const ref2 = result.current[2];

    rerender();
    const ref3 = result.current[2];

    expect(ref1).toBe(ref2);
    expect(ref2).toBe(ref3);
    expect(ref1).toHaveProperty('current');
  });

  it('onUnmount is called before instance release', () => {
    let isDisposedAtUnmount: boolean | undefined;
    const onUnmount = vi.fn((bloc: LifecycleBloc) => {
      isDisposedAtUnmount = bloc.$blac.disposed;
    });
    const { unmount } = renderHook(() => useBloc(LifecycleBloc, { onUnmount }));
    unmount();
    expect(onUnmount).toHaveBeenCalledOnce();
    expect(isDisposedAtUnmount).toBe(false);
  });

  // R2: an emit that lands after a subscriber's render read but before its
  // passive subscribe (here, from a sibling's useLayoutEffect during commit)
  // must not leave the subscriber stale after paint.
  it('R2: emit in a sibling useLayoutEffect during commit is not missed', async () => {
    function Sibling() {
      const [, bloc] = useBloc(GapBloc);
      useLayoutEffect(() => {
        (bloc as GapBloc).increment();
      }, [bloc]);
      return null;
    }
    function Subscriber() {
      const [state] = useBloc(GapBloc);
      return <div data-testid="count">{state.count}</div>;
    }
    await act(async () => {
      render(
        <>
          <Subscriber />
          <Sibling />
        </>,
      );
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  // R3/R4: StrictMode double-invokes effects (mount→unmount→mount). The
  // ownership ref is taken/released in a layout effect, so the net is a single
  // ref while mounted and full disposal on unmount.
  it('StrictMode double-invoke leaves the refcount balanced', () => {
    function Comp() {
      useBloc(LifecycleBloc);
      return null;
    }
    const { unmount } = render(
      <StrictMode>
        <Comp />
      </StrictMode>,
    );
    expect(getRefCount(LifecycleBloc)).toBe(1);
    unmount();
    expect(hasInstance(LifecycleBloc)).toBe(false);
  });
});

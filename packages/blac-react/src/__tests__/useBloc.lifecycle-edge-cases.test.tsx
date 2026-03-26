import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { Cubit, clearAll } from '@blac/core';
import { useBloc } from '../useBloc';

class LifecycleBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.emit({ n: this.state.n + 1 });
  }
}

afterEach(() => clearAll());

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
    expect(bloc.isDisposed).toBe(false);
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
      isDisposedAtUnmount = bloc.isDisposed;
    });
    const { unmount } = renderHook(() => useBloc(LifecycleBloc, { onUnmount }));
    unmount();
    expect(onUnmount).toHaveBeenCalledOnce();
    expect(isDisposedAtUnmount).toBe(false);
  });
});

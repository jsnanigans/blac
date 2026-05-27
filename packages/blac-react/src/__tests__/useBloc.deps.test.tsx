/**
 * Tests for useBloc deps option — per-consumer non-serializable handle merge,
 * post-commit wiring, onDepsChanged, multi-consumer merge + withdraw, and the
 * invariant that deps never re-create the instance.
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

type CanvasDeps = { el?: { id: number }; cb?: () => void };

// A bloc that reacts to an injected `el` handle appearing/disappearing.
class Canvas extends Cubit<{ ready: boolean }, void, CanvasDeps> {
  constructor() {
    super({ ready: false });
  }

  protected onDepsChanged(
    next: Readonly<CanvasDeps>,
    prev: Readonly<CanvasDeps>,
  ): void {
    if (next.el && next.el !== prev.el) this.emit({ ready: true });
    if (!next.el && prev.el) this.emit({ ready: false });
  }
}

describe('useBloc deps option', () => {
  it('wires a dep post-commit and fires onDepsChanged', async () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(Canvas, { deps: { el: { id: 1 } } });
      // Read `ready` in the render body so autoTrack subscribes to it and the
      // post-commit onDepsChanged emit triggers a re-render.
      void state.ready;
      return [state, bloc] as const;
    });
    await waitFor(() => expect(result.current[0].ready).toBe(true));
    expect(result.current[1].deps.el).toEqual({ id: 1 });
  });

  it('merges slices from two consumers and withdraws on unmount', () => {
    const el = { id: 1 };
    const cb = () => {};

    // Consumer A contributes `el`.
    const a = renderHook(() => useBloc(Canvas, { deps: { el } }));
    // Consumer B contributes a different key `cb` on the SAME instance.
    const b = renderHook(() => useBloc(Canvas, { deps: { cb } }));

    // Both consumers see the same merged view.
    expect(a.result.current[1].deps.el).toBe(el);
    expect(a.result.current[1].deps.cb).toBe(cb);
    expect(b.result.current[1].deps.el).toBe(el);
    expect(b.result.current[1].deps.cb).toBe(cb);

    // Unmount A: only A's key is withdrawn; B's key is untouched.
    a.unmount();
    expect(b.result.current[1].deps.el).toBeUndefined();
    expect(b.result.current[1].deps.cb).toBe(cb);

    b.unmount();
  });

  it('does NOT re-create the instance when deps identity changes', () => {
    const { result, rerender } = renderHook(
      ({ el }: { el: { id: number } }) => useBloc(Canvas, { deps: { el } }),
      { initialProps: { el: { id: 1 } } },
    );

    const first = result.current[1];

    // New `el` object identity each rerender — must reuse the same instance.
    rerender({ el: { id: 2 } });
    expect(result.current[1]).toBe(first);

    rerender({ el: { id: 3 } });
    expect(result.current[1]).toBe(first);
  });
});

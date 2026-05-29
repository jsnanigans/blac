/**
 * Tests for useBloc:
 *   A. select drives manual-deps mode (renamed from dependencies)
 *
 * NOTE: The pre-rewrite dev-only "unknown option key" and "instanceId/args
 * disagreement" warnings have been removed. They lived in the old adapter
 * layer (deleted in E0) and the new direct-channel implementation doesn't
 * carry them forward. Those tests have been deleted; the contract they
 * tested no longer exists.
 */

import { describe, it, expect } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

// ---------------------------------------------------------------------------
// Shared blocs
// ---------------------------------------------------------------------------

class SimpleBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

blacTestSetup();

// ---------------------------------------------------------------------------
// A. select drives manual-deps mode (renamed from dependencies)
// ---------------------------------------------------------------------------

describe('useBloc — select option drives manual-deps re-render mode', () => {
  it('select replaces dependencies: only re-renders when selected values change', async () => {
    class TwoFieldBloc extends Cubit<{ a: number; b: number }> {
      constructor() {
        super({ a: 0, b: 0 });
      }
      setA(v: number) {
        this.emit({ ...this.state, a: v });
      }
      setB(v: number) {
        this.emit({ ...this.state, b: v });
      }
    }

    const renders = vi.fn();

    const { result } = renderHook(() => {
      renders();
      return useBloc(TwoFieldBloc, { select: (s) => [s.a] });
    });

    const initialRenders = renders.mock.calls.length;
    const bloc = result.current[1] as TwoFieldBloc;

    // Changing 'a' (in select) triggers re-render
    await act(async () => {
      bloc.setA(1);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initialRenders);

    const afterFirstChange = renders.mock.calls.length;

    // Changing 'b' (NOT in select) does NOT trigger re-render
    await act(async () => {
      bloc.setB(99);
    });
    expect(renders.mock.calls.length).toBe(afterFirstChange);
  });

  it('select: () => [] never re-renders after initial mount', async () => {
    const renders = vi.fn();
    const { result } = renderHook(() => {
      renders();
      return useBloc(SimpleBloc, { select: () => [] });
    });

    const afterMount = renders.mock.calls.length;
    const bloc = result.current[1] as SimpleBloc;

    await act(async () => {
      bloc.increment();
    });
    await act(async () => {
      bloc.increment();
    });

    expect(renders.mock.calls.length).toBe(afterMount);
  });
});

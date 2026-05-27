/**
 * Tests for dev-only warnings in useBloc (Preact):
 *   B. Unknown option-key warning
 *   C. instanceId + args-derived key disagreement warning
 *   A. select drives manual-deps mode (renamed from dependencies)
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/preact';
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

class ArgsBloc extends Cubit<{ id: string | null }, { userId: string }> {
  constructor() {
    super({ id: null });
  }
  protected init(a: { userId: string }) {
    this.emit({ id: a.userId });
  }
}

blacTestSetup();

// ---------------------------------------------------------------------------
// B. Unknown option-key warning
// ---------------------------------------------------------------------------

describe('useBloc — unknown option key warning (dev)', () => {
  it('warns when an unknown option key is passed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // `props` is a v1-ism that no longer exists
      renderHook(() => useBloc(SimpleBloc, { props: {} } as any));
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('props'),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('includes all unknown keys in the warning message', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() =>
        useBloc(SimpleBloc, { foo: 1, bar: 2 } as any),
      );
      const callArg: string = spy.mock.calls[0][0];
      expect(callArg).toContain('foo');
      expect(callArg).toContain('bar');
    } finally {
      spy.mockRestore();
    }
  });

  it('does NOT warn when only known option keys are used', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() =>
        useBloc(SimpleBloc, {
          autoTrack: true,
          onMount: () => {},
          onUnmount: () => {},
        }),
      );
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('does NOT warn when no options are passed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() => useBloc(SimpleBloc));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// C. instanceId + args-derived key disagreement warning
// ---------------------------------------------------------------------------

describe('useBloc — instanceId and args key disagreement warning (dev)', () => {
  it('warns when explicit instanceId and args-derived key disagree', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() =>
        useBloc(ArgsBloc, {
          instanceId: 'my-explicit-id',
          args: { userId: 'alice' },
        }),
      );
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('my-explicit-id'),
      );
      const callArg: string = spy.mock.calls[0][0];
      // Should also mention the args-derived key
      expect(callArg).toContain(JSON.stringify({ userId: 'alice' }));
    } finally {
      spy.mockRestore();
    }
  });

  it('does NOT warn when only instanceId is provided (no args)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() => useBloc(SimpleBloc, { instanceId: 'only-id' }));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('does NOT warn when only args are provided (no explicit instanceId)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      renderHook(() =>
        useBloc(ArgsBloc, { args: { userId: 'bob' } }),
      );
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// A. select drives manual-deps mode (renamed from dependencies)
// ---------------------------------------------------------------------------

describe('useBloc — select option drives manual-deps re-render mode', () => {
  it('select replaces dependencies: only re-renders when selected values change', () => {
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
    void act(() => {
      bloc.setA(1);
    });
    expect(renders.mock.calls.length).toBeGreaterThan(initialRenders);

    const afterFirstChange = renders.mock.calls.length;

    // Changing 'b' (NOT in select) does NOT trigger re-render
    void act(() => {
      bloc.setB(99);
    });
    expect(renders.mock.calls.length).toBe(afterFirstChange);
  });

  it('select: () => [] never re-renders after initial mount', () => {
    const renders = vi.fn();
    const { result } = renderHook(() => {
      renders();
      return useBloc(SimpleBloc, { select: () => [] });
    });

    const afterMount = renders.mock.calls.length;
    const bloc = result.current[1] as SimpleBloc;

    void act(() => {
      bloc.increment();
    });
    void act(() => {
      bloc.increment();
    });

    expect(renders.mock.calls.length).toBe(afterMount);
  });
});

/**
 * Tests for useBloc hook - Constructor Pattern
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import { renderHook, act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Cubit, borrow, ensure, getRefCount } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

// Test implementations
class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Used in Args-Based Shared Instances tests (requires args for identity)
class ArgsCounterBloc extends Cubit<{ count: number }, { _id: string }> {
  static key(args: { _id: string } | undefined) {
    return args?._id ?? 'default';
  }
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

class IsolatedBloc extends Cubit<{ count: number }, { _id: string }> {
  static key(args: { _id: string } | undefined) {
    return args?._id ?? 'default';
  }
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Used in BR2 tests (dep-reconcile short-circuit).
class DepBloc extends Cubit<{ val: number }> {
  constructor() {
    super({ val: 0 });
  }
  inc = () => {
    this.emit({ val: this.state.val + 1 });
  };
}

class ToggleDepConsumerBloc extends Cubit<{ watch: boolean }> {
  private dep = this.depend(DepBloc);
  constructor() {
    super({ watch: true });
  }
  setWatch = (w: boolean) => {
    this.emit({ watch: w });
  };
  get value() {
    if (this.state.watch) {
      const [d] = this.dep.track();
      return d.val;
    }
    return -1;
  }
}

class TwoFieldBloc extends Cubit<{ a: number; b: number }> {
  constructor() {
    super({ a: 0, b: 0 });
  }
  setA = (v: number) => {
    this.emit({ ...this.state, a: v });
  };
  setB = (v: number) => {
    this.emit({ ...this.state, b: v });
  };
}

class FieldSwitchConsumerBloc extends Cubit<{ useA: boolean }> {
  private dep = this.depend(TwoFieldBloc);
  constructor() {
    super({ useA: true });
  }
  setUseA = (v: boolean) => {
    this.emit({ useA: v });
  };
  get value() {
    const [s] = this.dep.track();
    return this.state.useA ? s.a : s.b;
  }
}

describe('useBloc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Basic Usage', () => {
    it('should create bloc instance and subscribe to state', () => {
      const { result } = renderHook(() => useBloc(CounterBloc));
      const [state, bloc] = result.current;
      expect(state.count).toBe(0);
      expect(bloc).toBeInstanceOf(CounterBloc);
    });

    it('should update when bloc state changes', async () => {
      const { result } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        const _ = state.count; // access state to subscribe
        return { state, bloc };
      });

      await act(async () => {
        result.current.bloc.increment();
      });

      expect(result.current.state.count).toBe(1);
    });

    it('should share instance across multiple hooks (default shared)', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        // access state to subscribe
        const _ = state.count;
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        const _ = state.count;
        return { state, bloc };
      });

      // Per-consumer design: each useBloc consumer returns its own proxy.
      // Identity is asserted via the shared underlying raw bloc.
      const raw = borrow(CounterBloc);
      await act(async () => {
        raw.increment();
      });

      expect(result1.current.state.count).toBe(1);
      expect(result2.current.state.count).toBe(1);
      expect(result1.current.bloc.state).toBe(result2.current.bloc.state);
    });
  });

  describe('SSR', () => {
    it('should render on the server without proxy-based tracking', () => {
      vi.stubGlobal('window', undefined);
      vi.stubGlobal('document', undefined);

      function TestComponent() {
        const [state] = useBloc(CounterBloc);
        return <span>{state.count}</span>;
      }

      const html = renderToString(<TestComponent />);

      expect(html).toContain('0');
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance for each unique args', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(IsolatedBloc, { args: { _id: 'iso-a' } }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(IsolatedBloc, { args: { _id: 'iso-b' } }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Should be different instances
      expect(bloc1).not.toBe(bloc2);
    });

    it('should maintain separate state for each args-isolated instance', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          args: { _id: 'iso-c' },
          select: () => [],
        });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          args: { _id: 'iso-d' },
          select: () => [],
        });
        return { state, bloc };
      });

      await act(async () => {
        result1.current.bloc.increment();
      });

      // bloc.state always reflects current value regardless of select mode.
      expect(result1.current.bloc.state.count).toBe(1);
      expect(result2.current.bloc.state.count).toBe(0);
    });
  });

  describe('Args-Based Shared Instances', () => {
    it('different args produce different instances', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(ArgsCounterBloc, { args: { _id: 'counter-1' } }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(ArgsCounterBloc, { args: { _id: 'counter-2' } }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Different args → different instances
      expect(bloc1).not.toBe(bloc2);
    });

    it('same args produce the same shared instance', async () => {
      const { result: result1 } = renderHook(() =>
        useBloc(ArgsCounterBloc, { args: { _id: 'shared-counter' } }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(ArgsCounterBloc, { args: { _id: 'shared-counter' } }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Per-consumer design: each consumer returns its own proxy. Identity is
      // asserted via the shared underlying raw instance.
      const raw = borrow(ArgsCounterBloc, { args: { _id: 'shared-counter' } });
      await act(async () => {
        raw.increment();
      });
      expect(bloc1.state.count).toBe(1);
      expect(bloc2.state.count).toBe(1);
      expect(bloc1.state).toBe(bloc2.state);
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('should call onMount callback', () => {
      const onMount = vi.fn();

      renderHook(() => useBloc(CounterBloc, { onMount }));

      expect(onMount).toHaveBeenCalledTimes(1);
    });

    it('should call onUnmount callback', () => {
      const onUnmount = vi.fn();

      const { unmount } = renderHook(() => useBloc(CounterBloc, { onUnmount }));

      expect(onUnmount).not.toHaveBeenCalled();

      unmount();

      expect(onUnmount).toHaveBeenCalledTimes(1);
    });

    it('should receive bloc instance in callbacks', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const { result, unmount } = renderHook(() =>
        useBloc(CounterBloc, { onMount, onUnmount }),
      );

      const [, bloc] = result.current;

      expect(onMount).toHaveBeenCalledWith(bloc);

      unmount();

      expect(onUnmount).toHaveBeenCalledWith(bloc);
    });
  });

  describe('BR3: args-key Object.is fast-path', () => {
    it('stable args object across re-renders does not restringify', () => {
      const stableArgs = { _id: 'stable-1' };
      const spy = vi.spyOn(JSON, 'stringify');

      const { rerender } = renderHook(
        ({ args }) => useBloc(ArgsCounterBloc, { args }),
        { initialProps: { args: stableArgs } },
      );

      const callsAfterMount = spy.mock.calls.length;
      rerender({ args: stableArgs });
      expect(spy.mock.calls.length).toBe(callsAfterMount);

      spy.mockRestore();
    });

    it('changed args object recomputes the key', () => {
      const spy = vi.spyOn(JSON, 'stringify');

      const { rerender, result } = renderHook(
        ({ args }) => useBloc(ArgsCounterBloc, { args }),
        { initialProps: { args: { _id: 'change-a' } } },
      );
      const [, bloc1] = result.current;
      const callsAfterMount = spy.mock.calls.length;

      rerender({ args: { _id: 'change-b' } });
      const [, bloc2] = result.current;

      expect(spy.mock.calls.length).toBeGreaterThan(callsAfterMount);
      expect(bloc1).not.toBe(bloc2);

      spy.mockRestore();
    });

    it('void args still collapse to an undefined key across re-renders', () => {
      const { rerender, result } = renderHook(() => useBloc(CounterBloc));
      const [, bloc1] = result.current;

      rerender();
      const [, bloc2] = result.current;

      expect(bloc1).toBe(bloc2);
    });
  });

  describe('BR2: guarded dep-reconcile layout effect', () => {
    it('identical tracked paths on the primary bloc skip re-registration', () => {
      const instance = ensure(CounterBloc);
      const spy = vi.spyOn(instance, 'registerConsumerPaths');

      const { rerender } = renderHook(() => {
        const [state] = useBloc(CounterBloc);
        const _ = state.count; // record the 'count' leaf path
        return state;
      });

      const callsAfterMount = spy.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThan(0);

      rerender();

      expect(spy.mock.calls.length).toBe(callsAfterMount);
      spy.mockRestore();
    });

    it('identical dep set and paths skip dep reconciliation', () => {
      const depInstance = ensure(DepBloc);
      const spy = vi.spyOn(depInstance, 'registerConsumerPaths');

      const { rerender } = renderHook(() => {
        const [, bloc] = useBloc(ToggleDepConsumerBloc);
        const _ = bloc.value;
        return bloc;
      });

      const callsAfterMount = spy.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThan(0);

      rerender();

      expect(spy.mock.calls.length).toBe(callsAfterMount);
      spy.mockRestore();
    });

    it('dropping a dep still unsubscribes and stops waking the consumer', async () => {
      let renders = 0;
      function Comp() {
        renders++;
        const [, bloc] = useBloc(ToggleDepConsumerBloc);
        return <span data-testid="out">{bloc.value}</span>;
      }
      render(<Comp />);
      expect(screen.getByTestId('out').textContent).toBe('0');

      await act(async () => {
        ensure(ToggleDepConsumerBloc).setWatch(false);
      });
      expect(screen.getByTestId('out').textContent).toBe('-1');
      expect(getRefCount(DepBloc)).toBe(0);

      const countAfterDrop = renders;
      await act(async () => {
        ensure(DepBloc).inc();
      });

      // Dep emitted, but the reconcile dropped the subscription on the
      // previous commit — no re-render should be triggered.
      expect(renders).toBe(countAfterDrop);
    });

    it('re-adding a dep subscribes again and wakes the consumer on change', async () => {
      let renders = 0;
      function Comp() {
        renders++;
        const [, bloc] = useBloc(ToggleDepConsumerBloc);
        return <span data-testid="out">{bloc.value}</span>;
      }
      render(<Comp />);

      await act(async () => {
        ensure(ToggleDepConsumerBloc).setWatch(false);
      });
      await act(async () => {
        ensure(ToggleDepConsumerBloc).setWatch(true);
      });
      expect(getRefCount(DepBloc)).toBe(1);

      const countAfterReEnable = renders;
      await act(async () => {
        ensure(DepBloc).inc();
      });

      expect(screen.getByTestId('out').textContent).toBe('1');
      expect(renders).toBeGreaterThan(countAfterReEnable);
    });

    it('changing tracked dep paths still reconciles (re-registers)', async () => {
      const depInstance = ensure(TwoFieldBloc);
      const spy = vi.spyOn(depInstance, 'registerConsumerPaths');

      function Comp() {
        const [, bloc] = useBloc(FieldSwitchConsumerBloc);
        return <span data-testid="out">{bloc.value}</span>;
      }
      render(<Comp />);

      const callsAfterMount = spy.mock.calls.length;
      expect(callsAfterMount).toBeGreaterThan(0);

      await act(async () => {
        ensure(FieldSwitchConsumerBloc).setUseA(false);
      });

      // Tracked leaf switched from 'a' to 'b' — the path set changed, so the
      // reconcile must NOT be skipped.
      expect(spy.mock.calls.length).toBeGreaterThan(callsAfterMount);

      spy.mockRestore();
    });
  });
});

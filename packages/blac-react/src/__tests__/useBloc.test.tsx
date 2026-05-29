/**
 * Tests for useBloc hook - Constructor Pattern
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Cubit, borrow } from '@blac/core';
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

class IsolatedBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
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
    it('should create new instance for each instanceId', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(IsolatedBloc, { instanceId: 'iso-a' }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(IsolatedBloc, { instanceId: 'iso-b' }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Should be different instances
      expect(bloc1).not.toBe(bloc2);
    });

    it('should maintain separate state for each instance', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-c',
          select: () => [],
        });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-d',
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

  describe('Custom Instance IDs', () => {
    it('should use custom instance ID for shared blocs', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'counter-1' }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'counter-2' }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Different IDs should get different instances
      expect(bloc1).not.toBe(bloc2);
    });

    it('should share instance with same custom ID', async () => {
      const { result: result1 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'shared-counter' }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'shared-counter' }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Per-consumer design: each consumer returns its own proxy. Identity is
      // asserted via the shared underlying raw instance.
      const raw = borrow(CounterBloc, 'shared-counter');
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
});

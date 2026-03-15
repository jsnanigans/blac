/**
 * Tests for useBloc hook - Preact Integration
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/preact';
import { StateContainer, clearAll } from '@blac/core';
import { useBloc } from '../useBloc';

class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };

  reset = () => {
    this.update(() => ({ count: 0 }));
  };
}

describe('useBloc', () => {
  afterEach(() => {
    clearAll();
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

      act(() => {
        result.current.bloc.increment();
      });

      expect(result.current.state.count).toBe(1);
    });

    it('should share instance across multiple hooks (default shared)', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        const _ = state.count;
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        const _ = state.count;
        return { state, bloc };
      });

      expect(result1.current.bloc).toBe(result2.current.bloc);

      act(() => {
        result1.current.bloc.increment();
      });

      expect(result1.current.state.count).toBe(1);
      expect(result2.current.state.count).toBe(1);
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance for each hook', () => {
      const { result: result1 } = renderHook(() => useBloc(IsolatedBloc));
      const { result: result2 } = renderHook(() => useBloc(IsolatedBloc));

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      expect(bloc1).not.toBe(bloc2);
    });

    it('should maintain separate state for each instance', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, { autoTrack: false });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, { autoTrack: false });
        return { state, bloc };
      });

      act(() => {
        result1.current.bloc.increment();
      });

      expect(result1.current.state.count).toBe(1);
      expect(result2.current.state.count).toBe(0);
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

      expect(bloc1).not.toBe(bloc2);
    });

    it('should share instance with same custom ID', () => {
      const { result: result1 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'shared-counter' }),
      );
      const { result: result2 } = renderHook(() =>
        useBloc(CounterBloc, { instanceId: 'shared-counter' }),
      );

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      expect(bloc1).toBe(bloc2);
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

/**
 * Tests for useBloc hook - Constructor Pattern
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/test';

blacTestSetup();

// Test implementations
class CounterBloc extends Cubit<{ count: number }> {
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

class IsolatedBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

describe('useBloc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // describe('Generic Bloc', () => {
  //   it('should work with generic bloc and explicit state type', () => {
  //     const { result } = renderHook(() => {
  //       const [state, bloc] =
  //         useBloc<GenericBloc<{ items: string[] }>>(GenericBloc);
  //       return { state, bloc };
  //     });
  //
  //     const { state, bloc } = result.current;
  //     expect(state).toEqual({ items: [] });
  //     expect(bloc).toBeInstanceOf(GenericBloc);
  //
  //     act(() => {
  //       bloc.setState({ items: ['a', 'b', 'c'] });
  //     });
  //
  //     expect(result.current.state).toEqual({ items: ['a', 'b', 'c'] });
  //   });
  // });

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
        // access state to subscribe
        const _ = state.count;
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        const _ = state.count;
        return { state, bloc };
      });

      // Should be same instance
      expect(result1.current.bloc).toBe(result2.current.bloc);

      act(() => {
        result1.current.bloc.increment();
      });

      expect(result1.current.state.count).toBe(1);
      expect(result2.current.state.count).toBe(1);
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
    it('should create new instance for each hook', () => {
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
          autoTrack: false,
        });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-d',
          autoTrack: false,
        });
        return { state, bloc };
      });

      act(() => {
        result1.current.bloc.increment();
      });

      expect(result1.current.state.count).toBe(1);
      expect(result2.current.state.count).toBe(0);
    });

    it('should update state return when its not accessed because autoTrack is disabled', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-e',
          autoTrack: false,
        });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-f',
          autoTrack: false,
        });
        return { state, bloc };
      });

      expect(result1.current.bloc.state.count).toBe(0);
      expect(result1.current.state.count).toBe(0);
      expect(result2.current.bloc.state.count).toBe(0);
      expect(result2.current.state.count).toBe(0);

      act(() => {
        result1.current.bloc.increment();
      });

      // result1 bloc.state is always uptodate, should show 1 after increment
      expect(result1.current.bloc.state.count).toBe(1);
      // but result1 state is not accessed, so should not trigger update, remains 0
      expect(result1.current.state.count).toBe(1);
      // result2 remains unaffected
      expect(result2.current.bloc.state.count).toBe(0);
      expect(result2.current.state.count).toBe(0);
    });

    it('should not update state return when its not accessed because autoTrack is enabled', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-g',
          autoTrack: true,
        });
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc, {
          instanceId: 'iso-h',
          autoTrack: true,
        });
        return { state, bloc };
      });

      expect(result1.current.bloc.state.count).toBe(0);
      expect(result1.current.state.count).toBe(0);
      expect(result2.current.bloc.state.count).toBe(0);
      expect(result2.current.state.count).toBe(0);

      act(() => {
        result1.current.bloc.increment();
      });

      // result1 bloc.state is always uptodate, should show 1 after increment
      expect(result1.current.bloc.state.count).toBe(1);
      // but result1 state is not accessed, so should not trigger update, remains 0
      expect(result1.current.state.count).toBe(0);
      // result2 remains unaffected
      expect(result2.current.bloc.state.count).toBe(0);
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

      // Different IDs should get different instances
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

      // Same ID should get same instance
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

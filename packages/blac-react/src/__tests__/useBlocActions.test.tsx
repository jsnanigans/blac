/**
 * Tests for useBlocActions hook - Action-only access without state subscription
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StateContainer } from '@blac/core';
import { useBlocActions } from '../useBlocActions';

// Test implementations
class CounterBloc extends StateContainer<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };

  decrement = () => {
    this.update((state) => ({ count: state.count - 1 }));
  };

  reset = () => {
    this.update(() => ({ count: 0 }));
  };
}

class IsolatedBloc extends StateContainer<{ value: number }> {
  static isolated = true;

  constructor() {
    super({ value: 0 });
  }

  increment = () => {
    this.update((state) => ({ value: state.value + 1 }));
  };
}

class UserBloc extends StateContainer<{ name: string }> {
  constructor(props?: { initialName?: string }) {
    super({ name: props?.initialName || '' });
  }

  setName = (name: string) => {
    this.update(() => ({ name }));
  };
}

describe('useBlocActions', () => {
  afterEach(() => {
    // Clear all bloc instances between tests
    StateContainer.clearAllInstances();
  });

  describe('Basic Usage', () => {
    it('should return bloc instance with action methods', () => {
      const { result } = renderHook(() => useBlocActions(CounterBloc));

      expect(result.current).toBeInstanceOf(CounterBloc);
      expect(typeof result.current.increment).toBe('function');
      expect(typeof result.current.decrement).toBe('function');
    });

    it('should allow calling bloc methods', () => {
      const { result } = renderHook(() => useBlocActions(CounterBloc));

      const bloc = result.current;

      // Should not throw
      act(() => {
        bloc.increment();
        bloc.decrement();
        bloc.reset();
      });

      // Verify state changed in bloc itself (not via hook re-render)
      expect(bloc.state.count).toBe(0);
    });

    it('should NOT cause re-renders when bloc state changes', async () => {
      let renderCount = 0;

      const { result } = renderHook(() => {
        renderCount++;
        return useBlocActions(CounterBloc);
      });

      const bloc = result.current;

      // Initial render
      expect(renderCount).toBe(1);

      // Change state multiple times
      act(() => {
        bloc.increment();
        bloc.increment();
        bloc.increment();
      });

      // Wait a bit to ensure no re-renders happen
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still be 1 - no re-renders from state changes
      expect(renderCount).toBe(1);

      // But state in bloc should have changed
      expect(bloc.state.count).toBe(3);
    });
  });

  describe('Instance Management', () => {
    it('should share instance across multiple hooks (default shared)', () => {
      const { result: result1 } = renderHook(() => useBlocActions(CounterBloc));
      const { result: result2 } = renderHook(() => useBlocActions(CounterBloc));

      // Should be same instance
      expect(result1.current).toBe(result2.current);
    });

    it('should create separate instances for isolated blocs', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );

      // Should be different instances
      expect(result1.current).not.toBe(result2.current);
    });

    it('should maintain separate state for isolated instances', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );

      const bloc1 = result1.current;
      const bloc2 = result2.current;

      act(() => {
        bloc1.increment();
        bloc1.increment();
      });

      expect(bloc1.state.value).toBe(2);
      expect(bloc2.state.value).toBe(0); // Other instance unchanged
    });

    it('should use custom instance ID for shared blocs', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(CounterBloc, { instanceId: 'counter-1' }),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(CounterBloc, { instanceId: 'counter-2' }),
      );

      // Different IDs should get different instances
      expect(result1.current).not.toBe(result2.current);
    });

    it('should share instance with same custom ID', () => {
      const { result: result1 } = renderHook(() =>
        useBlocActions(CounterBloc, { instanceId: 'shared-counter' }),
      );
      const { result: result2 } = renderHook(() =>
        useBlocActions(CounterBloc, { instanceId: 'shared-counter' }),
      );

      // Same ID should get same instance
      expect(result1.current).toBe(result2.current);
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('should call onMount callback', () => {
      const onMount = vi.fn();

      renderHook(() => useBlocActions(CounterBloc, { onMount }));

      expect(onMount).toHaveBeenCalledTimes(1);
    });

    it('should call onUnmount callback', () => {
      const onUnmount = vi.fn();

      const { unmount } = renderHook(() =>
        useBlocActions(CounterBloc, { onUnmount }),
      );

      expect(onUnmount).not.toHaveBeenCalled();

      unmount();

      expect(onUnmount).toHaveBeenCalledTimes(1);
    });

    it('should receive bloc instance in callbacks', () => {
      const onMount = vi.fn();
      const onUnmount = vi.fn();

      const { result, unmount } = renderHook(() =>
        useBlocActions(CounterBloc, { onMount, onUnmount }),
      );

      const bloc = result.current;

      expect(onMount).toHaveBeenCalledWith(bloc);

      unmount();

      expect(onUnmount).toHaveBeenCalledWith(bloc);
    });
  });

  describe('Cleanup', () => {
    it('should dispose isolated blocs on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useBlocActions(IsolatedBloc),
      );

      const bloc = result.current;
      const disposeSpy = vi.spyOn(bloc, 'dispose');

      unmount();

      await waitFor(() => {
        expect(disposeSpy).toHaveBeenCalled();
      });
    });

    it('should release bloc reference on unmount', () => {
      const { unmount } = renderHook(() => useBlocActions(CounterBloc));

      const releaseSpy = vi.spyOn(CounterBloc as any, 'release');

      unmount();

      expect(releaseSpy).toHaveBeenCalled();
    });
  });

  describe('Static Props', () => {
    it('should pass static props to constructor', () => {
      const { result } = renderHook(() =>
        useBlocActions(UserBloc, {
          staticProps: { initialName: 'Alice' },
        }),
      );

      const bloc = result.current;
      expect(bloc.state.name).toBe('Alice');
    });
  });

  describe('Type Inference', () => {
    it('should infer bloc type from constructor', () => {
      const { result } = renderHook(() => useBlocActions(UserBloc));

      const bloc = result.current;

      // TypeScript should know these methods exist
      bloc.setName('Test');

      expect(bloc).toBeInstanceOf(UserBloc);
      expect(bloc.state.name).toBe('Test');
    });
  });
});

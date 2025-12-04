/**
 * Tests for useBloc hook - Constructor Pattern
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StateContainer } from '@blac/core';
import { useBloc } from '../useBloc';

// Test implementations
class CounterBloc extends StateContainer<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.update((state) => state + 1);
  };

  reset = () => {
    this.update(() => 0);
  };
}

class IsolatedBloc extends StateContainer<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    this.update((state) => state + 1);
  };
}

class UserBloc extends StateContainer<{ name: string; email: string }> {
  constructor(props?: { initialName?: string }) {
    super({ name: props?.initialName || '', email: '' });
  }

  setName = (name: string) => {
    this.update((state) => ({ ...state, name }));
  };

  setEmail = (email: string) => {
    this.update((state) => ({ ...state, email }));
  };
}

// class GenericBloc<T> extends StateContainer<T> {
//   constructor(initialState: T) {
//     super(initialState);
//   }
//
//   setState = (newState: T) => {
//     this.update(() => newState);
//   };
// }

describe('useBloc', () => {
  afterEach(() => {
    // Clear all bloc instances between tests
    StateContainer.clearAllInstances();
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
      expect(state).toBe(0);
      expect(bloc).toBeInstanceOf(CounterBloc);
    });

    it('should update when bloc state changes', async () => {
      const { result } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        return { state, bloc };
      });

      act(() => {
        result.current.bloc.increment();
      });

      await waitFor(() => {
        expect(result.current.state).toBe(1);
      });
    });

    it('should share instance across multiple hooks (default shared)', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(CounterBloc);
        return { state, bloc };
      });

      // Should be same instance
      expect(result1.current.bloc).toBe(result2.current.bloc);

      act(() => {
        result1.current.bloc.increment();
      });

      await waitFor(() => {
        expect(result1.current.state).toBe(1);
        expect(result2.current.state).toBe(1);
      });
    });
  });

  describe('Isolated Instances', () => {
    it('should create new instance for each hook', () => {
      const { result: result1 } = renderHook(() => useBloc(IsolatedBloc));
      const { result: result2 } = renderHook(() => useBloc(IsolatedBloc));

      const [, bloc1] = result1.current;
      const [, bloc2] = result2.current;

      // Should be different instances
      expect(bloc1).not.toBe(bloc2);
    });

    it('should maintain separate state for each instance', async () => {
      const { result: result1 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc);
        return { state, bloc };
      });
      const { result: result2 } = renderHook(() => {
        const [state, bloc] = useBloc(IsolatedBloc);
        return { state, bloc };
      });

      act(() => {
        result1.current.bloc.increment();
      });

      await waitFor(() => {
        expect(result1.current.state).toBe(1);
        expect(result2.current.state).toBe(0); // Other instance unchanged
      });
    });

    it('should dispose isolated blocs on unmount', async () => {
      const { result, unmount } = renderHook(() => useBloc(IsolatedBloc));

      const [, bloc] = result.current;
      const disposeSpy = vi.spyOn(bloc, 'dispose');

      unmount();

      await waitFor(() => {
        expect(disposeSpy).toHaveBeenCalled();
      });
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

  describe('Static Props', () => {
    it('should pass static props to constructor', () => {
      const { result } = renderHook(() =>
        useBloc(UserBloc, {
          props: { initialName: 'Bob' },
        }),
      );

      const [state] = result.current;
      expect(state.name).toBe('Bob');
    });
  });

  describe('Type Inference', () => {
    it('should infer state type from bloc', () => {
      const { result } = renderHook(() => useBloc(CounterBloc));

      const [state] = result.current;

      // TypeScript should know this is a number
      expect(typeof state).toBe('number');
    });

    it('should infer bloc type from constructor', () => {
      const { result } = renderHook(() => useBloc(UserBloc));

      const [, bloc] = result.current;

      // TypeScript should know these methods exist
      bloc.setName('Test');
      bloc.setEmail('test@example.com');

      expect(bloc).toBeInstanceOf(UserBloc);
    });
  });
});

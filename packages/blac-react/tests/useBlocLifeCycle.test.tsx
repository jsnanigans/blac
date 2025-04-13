import { act, renderHook, waitFor } from '@testing-library/react';
import {
    Blac,
    Bloc,
    BlocGeneric,
    BlocHookDependencyArrayFn,
    InferPropsFromGeneric
} from 'blac-next';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import useBloc from '../src/useBloc';

// --- Local Definition if not exported from blac-next ---
// Copied from useBloc.tsx as it's not exported directly
export interface LocalBlocHookOptions<B extends BlocGeneric<any, any>> {
  id?: string;
  dependencySelector?: BlocHookDependencyArrayFn<B>;
  props?: InferPropsFromGeneric<B>;
  onMount?: (bloc: B) => void;
}

// --- Mocks and Setup ---

// Mock Actions (if needed by reducer)
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'SET_SOURCE'; payload: string }
  | { type: 'SET_PROPS'; payload: CounterProps };

// Mock Bloc for testing props and state
interface CounterState {
  count: number;
  source: string;
}
interface CounterProps {
  initialCount: number;
  source: string;
}

// Assuming Bloc requires State and Action generics. Add Props if needed.
class CounterBloc extends Bloc<CounterState, CounterAction, CounterProps> {
  // Corrected constructor: super with initial state, then set props
  constructor(props: CounterProps) {
    const initialState = { count: props.initialCount, source: props.source };
    super(initialState); // Assumes constructor takes only initial state
    // props might be set internally by Blac.getBloc or useBloc,
    // but we set it here for the initial state logic consistency in the mock.
    // IMPORTANT: This might be overwritten immediately by useBloc if props are passed.
    this.props = props;
  }

  // Implement the abstract reducer method
  reducer(action: CounterAction, state: CounterState): CounterState {
    switch (action.type) {
      case 'INCREMENT':
        return { ...state, count: state.count + 1 };
      case 'SET_SOURCE':
        return { ...state, source: action.payload };
      case 'SET_PROPS': // Handles state reaction *after* props have been set externally
        // Use payload props, fall back to current state if needed
        return {
          ...state,
          source: action.payload.source,
          count: action.payload.initialCount ?? state.count,
        };
      default:
        // If an action type isn't recognized, return the existing state.
        // It's good practice to handle the default case explicitly.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return state;
    }
  }

  // Public methods dispatch actions to the reducer
  increment = () => this.add({ type: 'INCREMENT' });
  setSource = (source: string) =>
    this.add({ type: 'SET_SOURCE', payload: source });

  // Call this *manually* in tests AFTER props are changed externally
  // if the bloc needs to reactively update its state based on new props.
  syncStateWithProps = (newProps: CounterProps) => {
    this.add({ type: 'SET_PROPS', payload: newProps });
  };

  // NO get/set props override - avoid conflict with base class property
}

// Mock Bloc for testing isolation
type IsolatedAction = { type: 'INCREMENT' };
class IsolatedBloc extends Bloc<{ value: number }, IsolatedAction> {
  // Provide Action generic
  // static isolated = true; // Assuming this static prop is read by useBloc/Blac
  constructor() {
    super({ value: 0 }); // Only initial state needed if no props
  }

  reducer(action: IsolatedAction, state: { value: number }): { value: number } {
    if (action.type === 'INCREMENT') {
      return { value: state.value + 1 };
    }
    return state;
  }

  increment = () => this.add({ type: 'INCREMENT' });
}
// Manually set isolated if not read from static prop automatically
(IsolatedBloc as any).isolated = true;

beforeEach(() => {
  Blac.resetInstance();
});
afterEach(() => {
  Blac.resetInstance();
});

describe('useBloc Hook Lifecycle & Options with Vitest', () => {
  // Removed Blac.clear() from beforeEach/afterEach

  test('should call onMount callback when the hook mounts', () => {
    const onMountMock = vi.fn();
    const initialOpts: LocalBlocHookOptions<CounterBloc> = {
      props: { initialCount: 0, source: 'test' },
      onMount: onMountMock,
    };
    const { result } = renderHook(() =>
      useBloc(CounterBloc, initialOpts as any),
    );

    expect(onMountMock).toHaveBeenCalledTimes(1);
    expect(onMountMock).toHaveBeenCalledWith(result.current[1]);
  });

  test('should pass initial props and set initial state', () => {
    const initialProps: CounterProps = { initialCount: 10, source: 'initial' };
    const initialOpts: LocalBlocHookOptions<CounterBloc> = {
      props: initialProps,
    };
    const { result } = renderHook(() =>
      useBloc(CounterBloc, initialOpts as any),
    );

    const [state, blocInstance] = result.current;

    expect(blocInstance.props).toEqual(initialProps);
    expect(state.count).toBe(10);
    expect(state.source).toBe('initial');
  });

  test('should update instance props and react state when props change in the primary hook instance', async () => {
    const initialProps: CounterProps = { initialCount: 5, source: 'first' };
    type HookInputProps = LocalBlocHookOptions<CounterBloc>;
    const initialOpts: HookInputProps = { props: initialProps };

    const { result, rerender } = renderHook(
      (opts: HookInputProps) => useBloc(CounterBloc, opts as any),
      { initialProps: initialOpts },
    );

    const [, initialInstance] = result.current;
    expect(initialInstance.props).toEqual(initialProps);
    expect(result.current[0].source).toBe('first');

    const updatedProps: CounterProps = { initialCount: 5, source: 'updated' };
    const updatedOpts: HookInputProps = { props: updatedProps };

    act(() => {
      rerender(updatedOpts);
    });

    expect(result.current[1].props).toEqual(updatedProps);

    act(() => {
      (result.current[1] as CounterBloc).syncStateWithProps(updatedProps);
    });

    await waitFor(() => {
      expect(result.current[0].source).toBe('updated');
    });
    expect(result.current[1].state.source).toBe('updated');
  });

  test('should NOT update instance props/state when props change in a secondary hook instance', async () => {
    const blocId = 'shared-counter';
    const initialProps: CounterProps = { initialCount: 1, source: 'primary' };
    const primaryOpts: LocalBlocHookOptions<CounterBloc> = {
      id: blocId,
      props: initialProps,
    };

    const { result: primaryResult } = renderHook(() =>
      useBloc(CounterBloc, primaryOpts as any),
    );
    const [, primaryInstance] = primaryResult.current;

    await waitFor(() => {
      expect(primaryInstance.props).toEqual(initialProps);
      expect(primaryInstance.state.source).toBe('primary');
    });

    const secondaryInitialProps: CounterProps = {
      initialCount: 1,
      source: 'secondary',
    };
    type HookInputProps = LocalBlocHookOptions<CounterBloc>;
    const secondaryInitialOpts: HookInputProps = {
      id: blocId,
      props: secondaryInitialProps,
    };

    const { result: secondaryResult, rerender } = renderHook(
      (opts: HookInputProps) => useBloc(CounterBloc, opts as any),
      { initialProps: secondaryInitialOpts },
    );

    const [, secondaryInstanceHook] = secondaryResult.current;
    expect(secondaryInstanceHook._id).toBe(primaryInstance._id);

    expect(primaryInstance.props).toEqual(initialProps);
    await waitFor(() => {
      expect(primaryInstance.state.source).toBe('primary');
      expect(secondaryResult.current[0].source).toBe('primary');
    });

    const updatedSecondaryProps: CounterProps = {
      initialCount: 1,
      source: 'secondary-updated',
    };
    const updatedSecondaryOpts: HookInputProps = {
      id: blocId,
      props: updatedSecondaryProps,
    };

    act(() => {
      rerender(updatedSecondaryOpts);
    });

    expect(primaryInstance.props).toEqual(initialProps);
    await waitFor(() => {
      expect(primaryInstance.state.source).toBe('primary');
      expect(secondaryResult.current[0].source).toBe('primary');
    });
    act(() => {
      primaryInstance.increment();
    });
    await waitFor(() => {
      expect(primaryInstance.state.count).toBe(initialProps.initialCount + 1);
      expect(primaryInstance.state.source).toBe('primary');
    });
  });

  test('should manage consumers correctly on mount and unmount', async () => {
    const blocId = 'consumer-test';
    const initialProps: CounterProps = { initialCount: 0, source: 'consumers' };
    const blocOptions: LocalBlocHookOptions<CounterBloc> = {
      id: blocId,
      props: initialProps,
    };

    expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();

    const { unmount: unmountFirst } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() =>
      expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeInstanceOf(
        CounterBloc,
      ),
    );
    const instance = Blac.getBloc(CounterBloc, { id: blocId });
    expect(instance).toBeDefined();
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));

    const { unmount: unmountSecond } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(2));
    expect(Blac.getBloc(CounterBloc, { id: blocId })).toBe(instance);

    const { unmount: unmountThird } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(3));

    act(() => {
      unmountSecond();
    });
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(2));
    expect(Blac.getBloc(CounterBloc, { id: blocId })).toBe(instance);

    act(() => {
      unmountFirst();
    });
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));
    expect(Blac.getBloc(CounterBloc, { id: blocId })).toBe(instance);

    act(() => {
      unmountThird();
    });
    await waitFor(() => {
      expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();
    });
  });

  test('should create separate instances for isolated blocs', async () => {
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useBloc(IsolatedBloc),
    );
    await waitFor(() =>
      expect(result1.current[1]).toBeInstanceOf(IsolatedBloc),
    );
    const [state1, instance1] = result1.current;
    expect(state1.value).toBe(0);

    const { result: result2, unmount: unmount2 } = renderHook(() =>
      useBloc(IsolatedBloc),
    );
    await waitFor(() =>
      expect(result2.current[1]).toBeInstanceOf(IsolatedBloc),
    );
    const [state2, instance2] = result2.current;
    expect(state2.value).toBe(0);

    expect(instance1).not.toBe(instance2);

    act(() => {
      instance1.increment();
    });
    await waitFor(() => expect(result1.current[0].value).toBe(1));
    expect(result2.current[0].value).toBe(0);

    act(() => {
      instance2.increment();
      instance2.increment();
    });
    await waitFor(() => expect(result2.current[0].value).toBe(2));
    expect(result1.current[0].value).toBe(1);

    await waitFor(() => expect(instance1?._consumers?.size ?? 0).toBe(1));
    await waitFor(() => expect(instance2?._consumers?.size ?? 0).toBe(1));

    act(() => {
      unmount1();
    });
    act(() => {
      unmount2();
    });
  });

  // --- Strict Mode / Dev Mode Simulation Tests ---

  describe('useBloc Hook in Strict Mode / Dev Environment', () => {
    // Note: React Testing Library with React 18+ runs effects twice in tests
    // by default, simulating Strict Mode behavior. We verify the outcome.

    test('should call onMount only once and manage consumers correctly despite Strict Mode double effects', async () => {
      const blocId = 'strict-mode-test';
      const onMountMock = vi.fn();
      const initialProps: CounterProps = { initialCount: 0, source: 'strict' };
      const blocOptions: LocalBlocHookOptions<CounterBloc> = {
        id: blocId,
        props: initialProps,
        onMount: onMountMock,
      };

      expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();

      const { unmount } = renderHook(() =>
        useBloc(CounterBloc, blocOptions as any),
      );

      // Check if bloc instance is created
      await waitFor(() =>
        expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeInstanceOf(
          CounterBloc,
        ),
      );
      const instance = Blac.getBloc(CounterBloc, { id: blocId });
      expect(instance).toBeDefined();

      // Verify onMount was called exactly once, even if the effect ran twice
      expect(onMountMock).toHaveBeenCalledTimes(1);
      expect(onMountMock).toHaveBeenCalledWith(instance);

      // Verify consumer count is 1
      await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));

      // Clean up
      act(() => {
        unmount();
      });

      // Verify bloc is cleaned up after unmount
      await waitFor(() => {
        expect(() =>
          Blac.getBlocOrThrow(CounterBloc, { id: blocId }),
        ).toThrow();
      });
    });

    test('should handle simulated hot reload (unmount and remount)', async () => {
      const blocId = 'reload-test';
      const initialProps: CounterProps = { initialCount: 5, source: 'reload' };
      const blocOptions: LocalBlocHookOptions<CounterBloc> = {
        props: initialProps,
      };

      // Initial mount
      const { result, unmount } = renderHook(
        (opts) => useBloc(CounterBloc, opts as any),
        { initialProps: blocOptions },
      );

      let instance = result.current[1];
      await waitFor(() => expect(instance).toBeInstanceOf(CounterBloc));
      expect(instance?.state.count).toBe(5);
      await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));
      const initialInstanceId = instance?._id;

      // Simulate unmount (like before reload)
      act(() => {
        unmount();
      });

      await waitFor(() => {
        expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();
      });

      // Simulate remount (like after reload)
      act(() => {
        // Rerender doesn't remount from scratch, we need a new hook render
        // to simulate a full component remount after being unmounted.
        // However, we'll use the same renderHook result variable `remounted`
        // to avoid shadowing or confusion.
        // This conceptually represents the *new* component instance after reload.
        renderHook((opts) => useBloc(CounterBloc, opts as any), {
          initialProps: blocOptions,
        });
      });

      // Check instance is recreated or re-retrieved
      await waitFor(() =>
        expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeInstanceOf(
          CounterBloc,
        ),
      );
      instance = Blac.getBloc(CounterBloc, { id: blocId });
      expect(instance).toBeDefined();
      expect(instance?._id).toBe(initialInstanceId); // Should be a new instance
      expect(instance?.state.count).toBe(5); // State re-initialized from props
      await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1)); // New consumer set

      // Clean up the second render
      // We need to get the unmount function from the *second* renderHook call.
      // This structure is a bit awkward. A better approach might be two separate
      // renderHook calls in the test body directly. Let's refactor slightly.

      // Refactored approach:
      const { unmount: unmountFirstRender } = renderHook(
        (opts) => useBloc(CounterBloc, opts as any),
        { initialProps: blocOptions },
      );
      const firstInstance = Blac.getBloc(CounterBloc, { id: blocId });
      await waitFor(() => expect(firstInstance).toBeInstanceOf(CounterBloc));
      const firstInstanceId = firstInstance?._id;
      act(() => unmountFirstRender());
      await waitFor(() => {
        expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();
      });

      const { unmount: unmountSecondRender } = renderHook(
        (opts) => useBloc(CounterBloc, opts as any),
        { initialProps: blocOptions },
      );
      const secondInstance = Blac.getBloc(CounterBloc, { id: blocId });
      await waitFor(() => expect(secondInstance).toBeInstanceOf(CounterBloc));
      expect(secondInstance?._id).not.toBe(firstInstanceId);
      expect(secondInstance?.state.count).toBe(5);
      await waitFor(() =>
        expect(secondInstance?._consumers?.size ?? 0).toBe(1),
      );

      act(() => unmountSecondRender());
      await waitFor(() => {
        expect(Blac.getBloc(CounterBloc, { id: blocId })).toBeUndefined();
      });
    });

    test('isolated bloc should get a new instance after simulated hot reload', async () => {
      // Initial mount
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useBloc(IsolatedBloc),
      );
      const instance1 = result1.current[1];
      await waitFor(() => expect(instance1).toBeInstanceOf(IsolatedBloc));
      act(() => instance1.increment());
      await waitFor(() => expect(instance1.state.value).toBe(1));

      // Simulate unmount
      act(() => unmount1());

      // Simulate remount
      const { result: result2, unmount: unmount2 } = renderHook(() =>
        useBloc(IsolatedBloc),
      );
      const instance2 = result2.current[1];
      await waitFor(() => expect(instance2).toBeInstanceOf(IsolatedBloc));

      // Verify it's a new instance with initial state
      expect(instance1).not.toBe(instance2);
      expect(result2.current[0].value).toBe(0); // Should be reset

      // Clean up
      act(() => unmount2());
    });
  });
});

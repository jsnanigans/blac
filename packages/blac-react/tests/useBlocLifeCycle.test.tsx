import { act, renderHook, waitFor } from '@testing-library/react';
import {
    Blac,
    Bloc,
    BlocGeneric,
    BlocHookDependencyArrayFn,
    InferPropsFromGeneric,
} from 'blac-next';
import { describe, expect, test, vi } from 'vitest';
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

// Helper uses Blac.getBloc, similar to useBloc hook
const getBlocInstance = <B extends new (...args: any[]) => Bloc<any, any, any>>(
  blocClass: B,
  options?: { id?: string; props?: any },
): InstanceType<B> | undefined => {
  try {
    // We don't *need* instanceRef here, just retrieving based on class/id
    return Blac.getBloc(blocClass, {
      id: options?.id,
      props: options?.props,
    }) as InstanceType<B> | undefined;
  } catch (e) {
    // Blac.getBloc might throw if not found, handle gracefully
    // console.error("Error calling Blac.getBloc:", e);
    return undefined;
  }
};

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

    expect(getBlocInstance(CounterBloc, { id: blocId })).toBeUndefined();

    const { unmount: unmountFirst } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() =>
      expect(getBlocInstance(CounterBloc, { id: blocId })).toBeInstanceOf(
        CounterBloc,
      ),
    );
    const instance = getBlocInstance(CounterBloc, { id: blocId });
    expect(instance).toBeDefined();
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));

    const { unmount: unmountSecond } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(2));
    expect(getBlocInstance(CounterBloc, { id: blocId })).toBe(instance);

    const { unmount: unmountThird } = renderHook(() =>
      useBloc(CounterBloc, blocOptions as any),
    );
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(3));

    act(() => {
      unmountSecond();
    });
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(2));
    expect(getBlocInstance(CounterBloc, { id: blocId })).toBe(instance);

    act(() => {
      unmountFirst();
    });
    await waitFor(() => expect(instance?._consumers?.size ?? 0).toBe(1));
    expect(getBlocInstance(CounterBloc, { id: blocId })).toBe(instance);

    act(() => {
      unmountThird();
    });
    await waitFor(() => {
      expect(getBlocInstance(CounterBloc, { id: blocId })).toBeUndefined();
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
});

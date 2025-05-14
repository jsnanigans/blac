/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Blac } from '@blac/core';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import externalBlocStore from '../src/externalBlocStore';
import useBloc, { BlocHookOptions } from '../src/useBloc';

// Mock externalBlocStore
vi.mock('../src/externalBlocStore', () => ({
  default: vi.fn().mockImplementation(() => ({
    subscribe: vi.fn((_listener) => {
      // Simulate subscription, return unsubscribe function
      return () => {};
    }),
    getSnapshot: vi.fn(() => ({})),
    getServerSnapshot: vi.fn(() => ({})),
  })),
}));

// Mock Blac core methods
const mockGetBloc = vi.fn();
const mockAddConsumer = vi.fn();
const mockRemoveConsumer = vi.fn();
const mockFindRegisteredBlocInstance = vi.fn();

// Assign mocks to Blac static/instance methods
// Use type assertion to satisfy TypeScript & disable linter warnings
(Blac as any).getBloc = mockGetBloc;
(Blac.instance as any).findRegisteredBlocInstance =
  mockFindRegisteredBlocInstance;

// Define simple Bloc classes for testing
interface TestState {
  count: number;
}

// Helper base class to add mockable lifecycle methods
class BlocBaseClass<S> {
  state: S;
  _instanceRef?: string;
  _consumers: Set<string> = new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any; // Keep any for mock simplicity

  // Mock lifecycle methods needed by useBloc
  _addConsumer = mockAddConsumer;
  _removeConsumer = mockRemoveConsumer;

  // Required static property for useBloc logic
  static isolated = false;

  constructor(initialState: S) {
    this.state = initialState;
  }

  emit(newState: S) {
    this.state = newState;
  }

  // Placeholder for potential defaultDependencySelector used by useBloc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultDependencySelector?(newState: S, _oldState: S): any[][] {
    // Fixed
    return [[newState]];
  }

  // Simulate setting instance ref during Blac.getBloc
  setInstanceRef(ref: string) {
    if (!this._instanceRef) {
      this._instanceRef = ref;
    }
  }
}

// Mock classes (no decorators)
class SharedBloc extends BlocBaseClass<TestState> {
  constructor() {
    super({ count: 0 });
  }
  increment() {
    this.emit({ count: this.state.count + 1 });
  }
  static isolated = false;
}

class IsolatedBloc extends BlocBaseClass<TestState> {
  constructor() {
    super({ count: 10 });
  }
  decrement() {
    this.emit({ count: this.state.count - 1 });
  }
  static isolated = true;
}

describe('useBloc Lifecycle', () => {
  let sharedBlocInstance: SharedBloc;
  let isolatedBlocInstance: IsolatedBloc;

  beforeEach(() => {
    vi.clearAllMocks();

    sharedBlocInstance = new SharedBloc();
    isolatedBlocInstance = new IsolatedBloc();

    // Configure mockGetBloc
    mockGetBloc.mockImplementation(
      (
        blocConstructor: any, // Keep any for mock flexibility
        options?: BlocHookOptions<any> & { instanceRef?: string },
      ) => {
        const isConstructorIsolated = (blocConstructor as typeof BlocBaseClass)
          .isolated;
        const instanceRef =
          options?.instanceRef ||
          (isConstructorIsolated
            ? `isolated-${String(Math.random())}`
            : `shared-${options?.id || 'default'}-${String(Math.random())}`);

        if (!isConstructorIsolated) {
          if (options?.id) {
            sharedBlocInstance.setInstanceRef(instanceRef);
            return sharedBlocInstance;
          }
          sharedBlocInstance.setInstanceRef(instanceRef);
          return sharedBlocInstance;
        } else {
          const newIsolatedInstance = new IsolatedBloc();
          newIsolatedInstance.setInstanceRef(instanceRef);
          return newIsolatedInstance;
        }
      },
    );

    // Mock findRegisteredBlocInstance
    mockFindRegisteredBlocInstance.mockImplementation((blocConstructor, id) => {
      if (blocConstructor === SharedBloc) {
        // Always return the *same* shared instance for SharedBloc regardless of id in this test setup
        // unless a specific isolated instance logic is needed elsewhere.
        return sharedBlocInstance;
      }
      return undefined;
    });

    // Configure externalBlocStore mock
    const mock = (resolvedBloc: any) => {
      return {
        subscribe: vi.fn((listener: () => void) => {
          return () => {};
        }),
        getSnapshot: vi.fn(() => resolvedBloc.state),
        getServerSnapshot: vi.fn(() => resolvedBloc.state),
      };
    };
    vi.mocked(externalBlocStore).mockImplementation(mock as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should get a shared Bloc instance on mount', () => {
    renderHook(() => useBloc(SharedBloc as any));
    expect(mockGetBloc).toHaveBeenCalledTimes(1);
    expect(mockGetBloc).toHaveBeenCalledWith(
      SharedBloc,
      expect.objectContaining({
        id: undefined,
        props: undefined,
        instanceRef: expect.any(String),
      }),
    );
  });

  it('should get an isolated Bloc instance on mount', () => {
    const { result } = renderHook(() => useBloc(IsolatedBloc as any));
    expect(mockGetBloc).toHaveBeenCalledTimes(1);
    expect(mockGetBloc).toHaveBeenCalledWith(
      IsolatedBloc,
      expect.objectContaining({
        id: expect.any(String),
        props: undefined,
        instanceRef: expect.any(String),
      }),
    );
    expect(result.current[1]).toBeInstanceOf(IsolatedBloc);
    expect(result.current[1]).not.toBe(isolatedBlocInstance);
  });

  it('should call onMount callback after mounting', () => {
    const handleMount = vi.fn();
    renderHook(() => useBloc(SharedBloc as any, { onMount: handleMount }));
    expect(handleMount).toHaveBeenCalledTimes(1);
    expect(handleMount).toHaveBeenCalledWith(sharedBlocInstance);
  });

  it('should add consumer on mount', () => {
    renderHook(() => useBloc(SharedBloc as any));
    expect(mockAddConsumer).toHaveBeenCalledTimes(1);
    expect(mockAddConsumer).toHaveBeenCalledWith(expect.any(String));
  });

  it('should remove consumer on unmount', () => {
    const { unmount } = renderHook(() => useBloc(SharedBloc as any));
    expect(mockRemoveConsumer).not.toHaveBeenCalled();
    unmount();
    expect(mockRemoveConsumer).toHaveBeenCalledTimes(1);
    expect(mockRemoveConsumer).toHaveBeenCalledWith(expect.any(String));
  });

  it('should use the blocId for shared blocs when provided', () => {
    renderHook(() => useBloc(SharedBloc as any, { id: 'my-specific-bloc' }));
    expect(mockGetBloc).toHaveBeenCalledWith(
      SharedBloc,
      expect.objectContaining({
        id: 'my-specific-bloc',
        instanceRef: expect.any(String),
      }),
    );
  });

  it('should use the react hook id for isolated blocs even if blocId is provided', () => {
    const { result } = renderHook(() =>
      useBloc(IsolatedBloc as any, { id: 'should-be-ignored' }),
    );
    const reactId = result.current[1]._instanceRef;

    expect(mockGetBloc).toHaveBeenCalledWith(
      IsolatedBloc,
      expect.objectContaining({
        id: reactId,
        instanceRef: reactId,
      }),
    );
    const calls = mockGetBloc.mock.calls;
    const relevantCallArgs = calls[calls.length - 1][1];
    expect(relevantCallArgs.id).not.toBe('should-be-ignored');
  });

  // Tests for multiple hooks interacting with the same shared bloc
  it('should share the same instance for multiple hooks with the same shared bloc id', () => {
    const blocId = 'shared-multi-hook-test';
    const { result: hook1 } = renderHook(() =>
      useBloc(SharedBloc as any, { id: blocId }),
    );
    const { result: hook2 } = renderHook(() =>
      useBloc(SharedBloc as any, { id: blocId }),
    );

    // Should fetch the same bloc instance
    expect(mockGetBloc).toHaveBeenCalledTimes(2);
    expect(hook1.current[1]._instanceRef).toBeDefined();
    expect(hook2.current[1]._instanceRef).toBeDefined();
    expect(sharedBlocInstance._instanceRef).toBeDefined();
    expect(hook1.current[1]._instanceRef).toBe(hook2.current[1]._instanceRef);
    expect(hook1.current[1]._instanceRef).toBe(sharedBlocInstance._instanceRef);
  });

  it('should manage consumers correctly for multiple hooks with the same shared bloc id', () => {
    const blocId = 'shared-consumer-test';
    let firstInstanceRef: string | undefined;
    let secondInstanceRef: string | undefined;

    // Reset mock calls relevant to this test
    mockGetBloc.mockClear();
    mockAddConsumer.mockClear();
    mockRemoveConsumer.mockClear();

    // Override getBloc slightly for this test to capture instanceRefs
    const originalGetBloc = mockGetBloc.getMockImplementation();
    mockGetBloc.mockImplementation((blocConstructor, options) => {
      const instance = originalGetBloc?.(blocConstructor, options);
      if (instance && blocConstructor === SharedBloc) {
        if (!firstInstanceRef) firstInstanceRef = options?.instanceRef;
        else if (!secondInstanceRef) secondInstanceRef = options?.instanceRef;
      }
      return instance;
    });

    const { unmount: unmount1 } = renderHook(() =>
      useBloc(SharedBloc as any, { id: blocId }),
    );
    const { unmount: unmount2 } = renderHook(() =>
      useBloc(SharedBloc as any, { id: blocId }),
    );

    // Should add two consumers
    expect(mockAddConsumer).toHaveBeenCalledTimes(2);

    expect(firstInstanceRef).toBeDefined();
    expect(secondInstanceRef).toBeDefined();

    // Unmount first hook
    unmount1();
    expect(mockRemoveConsumer).toHaveBeenCalledTimes(1);
    // Check it was called with the first hook's instanceRef
    expect(mockRemoveConsumer).toHaveBeenCalledWith(firstInstanceRef);

    // Unmount second hook
    unmount2();
    expect(mockRemoveConsumer).toHaveBeenCalledTimes(2);
    // Check it was called with the second hook's instanceRef
    expect(mockRemoveConsumer).toHaveBeenCalledWith(secondInstanceRef);

    // Restore original mock
    if (originalGetBloc) {
      mockGetBloc.mockImplementation(originalGetBloc);
    }
  });

  // Define a Bloc that accepts props for the next test
  interface PropsBlocState {
    value: string;
  }
  interface PropsBlocProps {
    initialValue: string;
  }

  class PropsBloc extends BlocBaseClass<PropsBlocState> {
    constructor(props: PropsBlocProps) {
      super({ value: props.initialValue });
      this.props = props; // Store props if needed
    }
    static isolated = false; // Shared Bloc for simplicity

    updateValue(newValue: string) {
      this.emit({ value: newValue });
    }
  }

  it('should handle props correctly during lifecycle', () => {
    const initialProps = { initialValue: 'Hello' };
    const blocId = 'props-bloc-test';
    const handleMount = vi.fn();
    let blocInstance: PropsBloc | undefined;

    // Mock getBloc specifically for PropsBloc
    mockGetBloc.mockImplementation(
      (
        blocConstructor:
          | typeof PropsBloc
          | typeof SharedBloc
          | typeof IsolatedBloc,
        options,
      ) => {
        if (blocConstructor === PropsBloc) {
          // Explicitly type the options expected by PropsBloc constructor
          const props = options?.props as PropsBlocProps | undefined;
          if (!props) throw new Error('PropsBloc requires props'); // Or handle appropriately
          blocInstance = new PropsBloc(options?.props as PropsBlocProps);
          blocInstance.setInstanceRef(
            options?.instanceRef || 'defaultPropsRef',
          );
          return blocInstance;
        }
        // Fallback for other Blocs in setup
        if (blocConstructor === SharedBloc) return sharedBlocInstance;
        if (blocConstructor === IsolatedBloc) return new IsolatedBloc();
        return undefined;
      },
    );

    const { unmount, rerender } = renderHook(
      ({ props }) =>
        useBloc(PropsBloc as any, {
          id: blocId,
          props: props,
          onMount: handleMount,
        }),
      { initialProps: { props: initialProps } },
    );

    expect(mockGetBloc).toHaveBeenCalledWith(
      PropsBloc,
      expect.objectContaining({ props: initialProps, id: blocId }),
    );
    expect(handleMount).toHaveBeenCalledTimes(1);
    expect(mockAddConsumer).toHaveBeenCalledTimes(1);
    expect(blocInstance).toBeDefined();
    expect(blocInstance?.state.value).toBe('Hello');

    // Rerender with new props - should NOT call getBloc or onMount again for shared bloc
    const newProps = { initialValue: 'World' }; // Note: initialValue might not re-init an existing shared bloc
    rerender({ props: newProps });

    // Verify getBloc wasn't called again for the *same* shared instance
    // Count how many times getBloc was called for PropsBloc
    const propsBlocCalls = mockGetBloc.mock.calls.filter(
      (call) => call[0] === PropsBloc,
    );
    expect(propsBlocCalls.length).toBe(1);
    // Verify onMount wasn't called again
    expect(handleMount).toHaveBeenCalledTimes(1);
    // Verify consumer count is still 1
    expect(mockAddConsumer).toHaveBeenCalledTimes(1);
    // Check if props were passed to the existing instance (implementation specific)
    // In this mock setup, props are only used on creation, so state won't change here
    // expect(blocInstance?.state.value).toBe('World'); // This depends on how useBloc handles prop updates

    // Get the instanceRef assigned during the initial getBloc call
    expect(blocInstance).toBeDefined();
    const instanceRef = blocInstance?._instanceRef;

    // Unmount
    unmount();
    expect(mockRemoveConsumer).toHaveBeenCalledTimes(1);
  });
});

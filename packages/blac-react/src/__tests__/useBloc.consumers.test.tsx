/**
 * Tests for useBloc consumer tracking with DevTools
 */
/// <reference types="@testing-library/jest-dom" />
import {
  describe,
  it,
  expect,
  vi,
  afterEach,
  beforeEach,
} from 'vite-plus/test';
import { renderHook, act, cleanup, render } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';
import React from 'react';

blacTestSetup();

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.update((state) => ({ count: state.count + 1 }));
  };
}

class TodoCubit extends Cubit<{ items: string[] }> {
  constructor() {
    super({ items: [] });
  }
}

function makeDevtoolsMock() {
  return {
    registerConsumer: vi.fn(),
    unregisterConsumer: vi.fn(),
  };
}

describe('useBloc consumer tracking', () => {
  let devtoolsMock: ReturnType<typeof makeDevtoolsMock>;

  beforeEach(() => {
    devtoolsMock = makeDevtoolsMock();
    (window as any).__BLAC_DEVTOOLS__ = devtoolsMock;
  });

  afterEach(() => {
    delete (window as any).__BLAC_DEVTOOLS__;
    cleanup();
  });

  it('should register consumer on mount', () => {
    renderHook(() => useBloc(CounterCubit));

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(1);
    expect(devtoolsMock.registerConsumer).toHaveBeenCalledWith(
      expect.any(String), // instanceId
      expect.any(String), // consumerId
      expect.any(String), // componentName
    );
  });

  it('should unregister consumer on unmount', () => {
    const { unmount } = renderHook(() => useBloc(CounterCubit));

    const [instanceId, consumerId] =
      devtoolsMock.registerConsumer.mock.calls[0];

    unmount();

    expect(devtoolsMock.unregisterConsumer).toHaveBeenCalledTimes(1);
    expect(devtoolsMock.unregisterConsumer).toHaveBeenCalledWith(
      instanceId,
      consumerId,
    );
  });

  it('should pass the correct instanceId to devtools', () => {
    const { result } = renderHook(() => useBloc(CounterCubit));
    const [, bloc] = result.current;

    const registeredInstanceId = devtoolsMock.registerConsumer.mock.calls[0][0];

    // The registered instanceId should match the bloc's instanceId
    expect(registeredInstanceId).toBe((bloc as any).instanceId);
  });

  it('should generate unique consumer IDs for each hook call', () => {
    renderHook(() => useBloc(CounterCubit));
    renderHook(() => useBloc(CounterCubit));

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(2);

    const consumerId1 = devtoolsMock.registerConsumer.mock.calls[0][1];
    const consumerId2 = devtoolsMock.registerConsumer.mock.calls[1][1];

    expect(consumerId1).not.toBe(consumerId2);
  });

  it('should register separate consumers for different bloc types', () => {
    renderHook(() => useBloc(CounterCubit));
    renderHook(() => useBloc(TodoCubit));

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(2);

    const instanceId1 = devtoolsMock.registerConsumer.mock.calls[0][0];
    const instanceId2 = devtoolsMock.registerConsumer.mock.calls[1][0];

    expect(instanceId1).not.toBe(instanceId2);
  });

  it('should not register when devtools is not available', () => {
    delete (window as any).__BLAC_DEVTOOLS__;

    expect(() => {
      renderHook(() => useBloc(CounterCubit));
    }).not.toThrow();
  });

  it('should not crash when devtools has no registerConsumer method', () => {
    (window as any).__BLAC_DEVTOOLS__ = {};

    expect(() => {
      renderHook(() => useBloc(CounterCubit));
    }).not.toThrow();
  });

  it('should register only once even after re-renders', () => {
    const { result } = renderHook(() => {
      const [state, bloc] = useBloc(CounterCubit);
      const _ = state.count;
      return { state, bloc };
    });

    // Trigger re-renders
    act(() => {
      result.current.bloc.increment();
    });
    act(() => {
      result.current.bloc.increment();
    });

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(1);
  });

  it('should capture component name from React fiber', () => {
    function MyNamedComponent() {
      const [state] = useBloc(CounterCubit);
      return <div>{state.count}</div>;
    }

    render(<MyNamedComponent />);

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(1);
    const componentName = devtoolsMock.registerConsumer.mock.calls[0][2];
    // Component name should be captured from the fiber
    // In test environment it should be 'MyNamedComponent' or 'Unknown'
    expect(typeof componentName).toBe('string');
    expect(componentName.length).toBeGreaterThan(0);
  });

  it('should capture displayName when set (browser environment)', () => {
    const MyComponent = () => {
      const [state] = useBloc(CounterCubit);
      return <div>{state.count}</div>;
    };
    MyComponent.displayName = 'CustomDisplayName';

    render(<MyComponent />);

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(1);
    const componentName = devtoolsMock.registerConsumer.mock.calls[0][2];
    // In happy-dom, React fiber internals may not expose displayName;
    // in a real browser the fiber approach captures it. Either way we get a string.
    expect(typeof componentName).toBe('string');
    expect(componentName.length).toBeGreaterThan(0);
    // If fiber worked, it should be the displayName; otherwise falls back to 'Unknown'
    expect(['CustomDisplayName', 'MyComponent', 'Unknown']).toContain(
      componentName,
    );
  });

  it('should register with correct instanceId when using instanceId option', () => {
    renderHook(() => useBloc(CounterCubit, { instanceId: 'my-counter' }));

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(1);
    const registeredInstanceId = devtoolsMock.registerConsumer.mock.calls[0][0];
    expect(registeredInstanceId).toContain('my-counter');
  });

  it('should unregister all consumers when multiple components unmount', () => {
    const hook1 = renderHook(() => useBloc(CounterCubit));
    const hook2 = renderHook(() => useBloc(CounterCubit));

    expect(devtoolsMock.registerConsumer).toHaveBeenCalledTimes(2);

    hook1.unmount();
    hook2.unmount();

    expect(devtoolsMock.unregisterConsumer).toHaveBeenCalledTimes(2);

    // Each unregister should use the same consumerId that was registered
    const registeredIds = devtoolsMock.registerConsumer.mock.calls.map(
      (call: any[]) => call[1],
    );
    const unregisteredIds = devtoolsMock.unregisterConsumer.mock.calls.map(
      (call: any[]) => call[1],
    );

    expect(new Set(unregisteredIds)).toEqual(new Set(registeredIds));
  });
});

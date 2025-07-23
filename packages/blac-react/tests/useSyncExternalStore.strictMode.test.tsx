import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { StrictMode, useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';

interface CounterState {
  count: number;
}

class DirectCounterCubit extends Cubit<CounterState> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('useSyncExternalStore Direct Integration with Strict Mode', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('should work with React useSyncExternalStore directly in Strict Mode', () => {
    const { result } = renderHook(() => {
      const { externalStore, instance } = useExternalBlocStore(DirectCounterCubit, {});
      
      const state = useSyncExternalStore(
        externalStore.subscribe,
        externalStore.getSnapshot,
        externalStore.getServerSnapshot
      );

      return { state, instance };
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const { state: initialState, instance } = result.current;
    expect(initialState.count).toBe(0);

    // Check subscription health
    console.log('Initial consumers:', instance.current._consumers.size);
    console.log('Initial observers:', instance.current._observer._observers.size);

    // Trigger increment
    act(() => {
      instance.current.increment();
    });

    console.log('After increment state:', result.current.state.count);
    console.log('After increment consumers:', instance.current._consumers.size);
    console.log('After increment observers:', instance.current._observer._observers.size);

    expect(result.current.state.count).toBe(1);
  });

  test('should maintain stable subscription references in Strict Mode', () => {
    let subscribeCallCount = 0;
    let getSnapshotCallCount = 0;
    
    const { result } = renderHook(() => {
      const { externalStore, instance } = useExternalBlocStore(DirectCounterCubit, {});
      
      // Wrap functions to count calls
      const wrappedSubscribe = (listener: any) => {
        subscribeCallCount++;
        console.log(`Subscribe called ${subscribeCallCount} times`);
        return externalStore.subscribe(listener);
      };
      
      const wrappedGetSnapshot = () => {
        getSnapshotCallCount++;
        return externalStore.getSnapshot();
      };
      
      const state = useSyncExternalStore(
        wrappedSubscribe,
        wrappedGetSnapshot,
        externalStore.getServerSnapshot
      );

      return { state, instance };
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    console.log('Subscribe calls:', subscribeCallCount);
    console.log('GetSnapshot calls:', getSnapshotCallCount);

    act(() => {
      result.current.instance.current.increment();
    });

    console.log('After increment - Subscribe calls:', subscribeCallCount);
    console.log('After increment - GetSnapshot calls:', getSnapshotCallCount);
    console.log('Final state:', result.current.state.count);

    expect(result.current.state.count).toBe(1);
  });
});
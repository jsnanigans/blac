import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';

interface CounterState {
  count: number;
}

class DebugCounterCubit extends Cubit<CounterState> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    console.log('Cubit.increment called, current state:', this.state.count);
    this.patch({ count: this.state.count + 1 });
    console.log('Cubit.increment finished, new state:', this.state.count);
  };
}

describe('Debug Subscription Lifecycle', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('should show detailed subscription behavior in Strict Mode', () => {
    console.log('=== Starting test ===');
    
    const { result } = renderHook(() => {
      console.log('Hook render starting');
      const store = useExternalBlocStore(DebugCounterCubit, {});
      console.log('External store created');
      
      return store;
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    console.log('Hook render completed');
    const { externalStore, instance } = result.current;
    
    console.log('Initial state:', externalStore.getSnapshot());
    console.log('Instance consumers:', instance.current._consumers.size);
    console.log('Instance observers:', instance.current._observer._observers.size);

    // Subscribe manually to see what happens
    let notificationCount = 0;
    const listener = (state: CounterState) => {
      notificationCount++;
      console.log(`Listener called ${notificationCount} times with state:`, state);
    };
    
    console.log('About to subscribe manually');
    const unsubscribe = externalStore.subscribe(listener);
    console.log('Manual subscription completed');
    
    console.log('After manual subscription - consumers:', instance.current._consumers.size);
    console.log('After manual subscription - observers:', instance.current._observer._observers.size);

    // Now trigger increment
    console.log('=== Triggering increment ===');
    act(() => {
      instance.current.increment();
    });
    
    console.log('After increment:');
    console.log('Snapshot:', externalStore.getSnapshot());
    console.log('Notification count:', notificationCount);
    console.log('Consumers:', instance.current._consumers.size);
    console.log('Observers:', instance.current._observer._observers.size);

    unsubscribe();
    console.log('=== Test completed ===');
  });
});
import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { StrictMode, useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';
import { useBloc } from '../src';

interface CounterState {
  count: number;
}

class TimingCounterCubit extends Cubit<CounterState> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
    console.log('TimingCounterCubit constructor called');
  }

  increment = () => {
    console.log('TimingCounterCubit.increment called');
    this.patch({ count: this.state.count + 1 });
  };
}

describe('React Strict Mode Timing Analysis', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('should show what happens during Strict Mode with external store', () => {
    let hookCallCount = 0;
    let subscribeCallCount = 0;
    let getSnapshotCallCount = 0;
    
    const { result } = renderHook(() => {
      hookCallCount++;
      console.log(`Hook call ${hookCallCount}`);
      
      const { externalStore, instance } = useExternalBlocStore(TimingCounterCubit, {});
      
      const originalSubscribe = externalStore.subscribe;
      const originalGetSnapshot = externalStore.getSnapshot;
      
      const wrappedSubscribe = (listener: any) => {
        subscribeCallCount++;
        console.log(`Subscribe call ${subscribeCallCount}`);
        return originalSubscribe(listener);
      };
      
      const wrappedGetSnapshot = () => {
        getSnapshotCallCount++;
        const snapshot = originalGetSnapshot();
        console.log(`GetSnapshot call ${getSnapshotCallCount}, value:`, snapshot);
        return snapshot;
      };
      
      const state = useSyncExternalStore(
        wrappedSubscribe,
        wrappedGetSnapshot,
        externalStore.getServerSnapshot
      );

      console.log(`Hook ${hookCallCount} complete - state:`, state, 'instance uid:', instance.current.uid);
      return { state, instance };
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    console.log('=== Hook setup complete ===');
    console.log('Hook calls:', hookCallCount);
    console.log('Subscribe calls:', subscribeCallCount);
    console.log('GetSnapshot calls:', getSnapshotCallCount);
    console.log('Final state:', result.current.state);

    // Now trigger increment
    console.log('=== Triggering increment ===');
    act(() => {
      result.current.instance.current.increment();
    });

    console.log('=== After increment ===');
    console.log('Final state after increment:', result.current.state);
  });

  test('should compare with useBloc behavior', () => {
    let hookCallCount = 0;
    
    const { result } = renderHook(() => {
      hookCallCount++;
      console.log(`useBloc hook call ${hookCallCount}`);
      
      const [state, instance] = useBloc(TimingCounterCubit);
      
      console.log(`useBloc hook ${hookCallCount} complete - state:`, state, 'instance uid:', instance.uid);
      return [state, instance];
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    console.log('=== useBloc setup complete ===');
    console.log('useBloc hook calls:', hookCallCount);
    console.log('useBloc final state:', result.current[0]);

    // Now trigger increment
    console.log('=== useBloc triggering increment ===');
    act(() => {
      result.current[1].increment();
    });

    console.log('=== useBloc after increment ===');
    console.log('useBloc final state after increment:', result.current[0]);
  });
});
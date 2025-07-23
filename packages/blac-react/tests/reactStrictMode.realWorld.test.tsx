import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBloc } from '../src';

interface CounterState {
  count: number;
}

class RealWorldCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('Real World React Strict Mode Behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('should handle the exact pattern seen in demo app logs', async () => {
    let subscribeCount = 0;
    let unsubscribeCount = 0;
    let observerCount = 0;

    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(RealWorldCounterCubit);
      
      // Track observer count changes
      const currentObserverCount = cubit._observer._observers.size;
      if (currentObserverCount !== observerCount) {
        console.log(`Observer count changed: ${observerCount} -> ${currentObserverCount}`);
        observerCount = currentObserverCount;
      }
      
      return [state, cubit] as const;
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    console.log('=== After initial mount ===');
    console.log('State:', result.current[0]);
    console.log('Observers:', result.current[1]._observer._observers.size);
    console.log('Consumers:', result.current[1]._consumers.size);

    // Verify we have observers after initial mount
    expect(result.current[1]._observer._observers.size).toBeGreaterThan(0);

    // Wait a bit to let any delayed cleanup happen
    await new Promise(resolve => setTimeout(resolve, 10));

    console.log('=== After 10ms delay ===');
    console.log('Observers:', result.current[1]._observer._observers.size);
    console.log('Consumers:', result.current[1]._consumers.size);

    // Should still have observers after the delay
    expect(result.current[1]._observer._observers.size).toBeGreaterThan(0);

    console.log('=== Triggering increment ===');
    act(() => {
      result.current[1].increment();
    });

    console.log('=== After increment ===');
    console.log('State:', result.current[0]);
    console.log('Observers:', result.current[1]._observer._observers.size);
    console.log('Consumers:', result.current[1]._consumers.size);

    // This is the critical test - state should update to 1
    expect(result.current[0].count).toBe(1);
    
    // Should still have observers after state update
    expect(result.current[1]._observer._observers.size).toBeGreaterThan(0);
  });

  test('should handle multiple rapid mount/unmount cycles like React Strict Mode', async () => {
    // Create a specific cubit class for this test to avoid interference
    class TestCounterCubit extends Cubit<CounterState> {
      constructor() {
        super({ count: 0 });
      }

      increment = () => {
        this.patch({ count: this.state.count + 1 });
      };
    }

    const { result: firstMount } = renderHook(() => useBloc(TestCounterCubit), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const firstCubit = firstMount.current[1];
    const firstObserverCount = firstCubit._observer._observers.size;
    console.log('First mount observers:', firstObserverCount);

    // Simulate React Strict Mode behavior: mount, unmount immediately, then remount
    const { result: secondMount, unmount } = renderHook(() => useBloc(TestCounterCubit), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const secondCubit = secondMount.current[1];
    console.log('Second mount observers:', secondCubit._observer._observers.size);
    console.log('Same instance?', secondCubit === firstCubit);

    // Immediately unmount (simulating React Strict Mode)
    unmount();
    console.log('After unmount observers:', firstCubit._observer._observers.size);

    // Quick remount (React Strict Mode pattern)
    const { result: thirdMount } = renderHook(() => useBloc(TestCounterCubit), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const thirdCubit = thirdMount.current[1];
    console.log('After remount observers:', thirdCubit._observer._observers.size);

    // Should have observers for the final mount
    expect(thirdCubit._observer._observers.size).toBeGreaterThan(0);

    // State update should work - use the current cubit instance
    act(() => {
      thirdCubit.increment();
    });

    // Check the state from the current mount's perspective
    expect(thirdMount.current[0].count).toBe(1);
  });
});
import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBloc } from '../src';

interface CounterState {
  count: number;
}

class StrictModeCounterCubit extends Cubit<CounterState> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('useBloc React Strict Mode Compatibility', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('should handle React Strict Mode double mounting without breaking subscriptions', () => {
    const { result } = renderHook(() => useBloc(StrictModeCounterCubit), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const [initialState, cubit] = result.current;
    expect(initialState.count).toBe(0);

    // Verify the bloc has consumers (subscriptions)
    expect(cubit._consumers.size).toBeGreaterThan(0);

    // Trigger a state change
    act(() => {
      cubit.increment();
    });

    // State should update properly despite Strict Mode
    expect(result.current[0].count).toBe(1);
    
    // Subscription should still be active
    expect(cubit._consumers.size).toBeGreaterThan(0);
  });

  test('should maintain subscriptions through Strict Mode remounting cycles', () => {
    let renderCount = 0;
    
    const { result, rerender } = renderHook(() => {
      renderCount++;
      return useBloc(StrictModeCounterCubit);
    }, {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const [, cubit] = result.current;
    
    // Force a rerender to simulate Strict Mode behavior
    rerender();
    
    // Should still have active consumers after rerender
    expect(cubit._consumers.size).toBeGreaterThan(0);
    
    // State updates should still work
    act(() => {
      cubit.increment();
    });
    
    expect(result.current[0].count).toBe(1);
  });

  test('should not leak observers during Strict Mode mount/unmount cycles', () => {
    const { result, unmount } = renderHook(() => useBloc(StrictModeCounterCubit), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
    });

    const [, cubit] = result.current;
    const initialObserverCount = cubit._observer._observers.size;

    // Verify observers are properly set up
    expect(initialObserverCount).toBeGreaterThan(0);

    // Unmount component
    unmount();

    // Observers should be cleaned up
    expect(cubit._observer._observers.size).toBe(0);
  });

  test('should handle rapid mount/unmount cycles without breaking', () => {
    for (let i = 0; i < 5; i++) {
      const { result, unmount } = renderHook(() => useBloc(StrictModeCounterCubit), {
        wrapper: ({ children }) => <StrictMode>{children}</StrictMode>
      });

      const [, cubit] = result.current;

      // Each mount should have active subscriptions
      expect(cubit._consumers.size).toBeGreaterThan(0);

      // State updates should work in each cycle
      act(() => {
        cubit.increment();
      });

      expect(result.current[0].count).toBe(1);

      // Clean unmount
      unmount();
      
      // Should be cleaned up
      expect(cubit._consumers.size).toBe(0);
    }
  });
});
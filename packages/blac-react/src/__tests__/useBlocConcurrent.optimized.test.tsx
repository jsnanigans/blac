/**
 * Test useBlocConcurrent with optimized ReactBridge
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlocConcurrent } from '../useBlocConcurrent';
import { Cubit } from '@blac/core';

// Test Cubit
class CounterCubit extends Cubit<{ count: number; name: string }> {
  static isolated = true;

  constructor() {
    super({ count: 0, name: 'test' });
  }

  increment() {
    this.update((current) => ({
      ...current,
      count: current.count + 1,
    }));
  }

  updateName(name: string) {
    this.update((current) => ({
      ...current,
      name,
    }));
  }
}

describe('useBlocConcurrent with Optimized ReactBridge', () => {
  it('should work with basic state updates', () => {
    const { result } = renderHook(() => useBlocConcurrent(CounterCubit));

    const [state, bloc] = result.current;

    expect(state.count).toBe(0);
    expect(state.name).toBe('test');

    act(() => {
      bloc.increment();
    });

    const [newState] = result.current;
    expect(newState.count).toBe(1);
  });

  it('should track dependencies correctly with proxy tracking', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      const [state, bloc] = useBlocConcurrent(CounterCubit);
      // Access count during render to establish tracking
      const _ = state.count;
      return [state, bloc] as const;
    });

    const [, bloc] = result.current;

    // Initial render
    expect(renderCount).toBe(1);

    // Update name - should NOT trigger re-render (not tracked)
    act(() => {
      bloc.updateName('changed');
    });

    // No re-render because name wasn't accessed
    expect(renderCount).toBe(1);

    // Update count - should trigger re-render
    act(() => {
      bloc.increment();
    });

    // Should re-render because count was accessed
    expect(renderCount).toBe(2);

    const [state] = result.current;
    expect(state.count).toBe(1);
    expect(state.name).toBe('changed'); // Name was updated but didn't trigger re-render
  });

  it('should support manual dependencies', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useBlocConcurrent(CounterCubit, {
        dependencies: (state) => [state.count], // Only track count
      });
    });

    const [state, bloc] = result.current;

    // Initial render
    expect(renderCount).toBe(1);

    // Access both properties to verify dependencies work
    expect(state.count).toBe(0);
    expect(state.name).toBe('test');

    // Update name - should NOT trigger re-render (not in dependencies)
    act(() => {
      bloc.updateName('changed');
    });
    expect(renderCount).toBe(1); // No re-render

    // Update count - should trigger re-render (in dependencies)
    act(() => {
      bloc.increment();
    });
    expect(renderCount).toBe(2); // Re-rendered

    const [newState] = result.current;
    expect(newState.count).toBe(1);
    expect(newState.name).toBe('changed'); // Name changed but didn't trigger re-render
  });

  it('should handle lifecycle callbacks', () => {
    let mounted = false;
    let unmounted = false;

    const { unmount } = renderHook(() =>
      useBlocConcurrent(CounterCubit, {
        onMount: () => {
          mounted = true;
        },
        onUnmount: () => {
          unmounted = true;
        },
      }),
    );

    expect(mounted).toBe(true);
    expect(unmounted).toBe(false);

    unmount();

    expect(unmounted).toBe(true);
  });

  it('should handle rapid updates efficiently', () => {
    const { result } = renderHook(() => useBlocConcurrent(CounterCubit));

    const [, bloc] = result.current;

    // Perform many rapid updates
    act(() => {
      for (let i = 0; i < 100; i++) {
        bloc.increment();
      }
    });

    const [state] = result.current;
    expect(state.count).toBe(100);
  });

  it('should work with isolated instances', () => {
    // Create two hooks with the same isolated Cubit class
    const { result: result1 } = renderHook(() =>
      useBlocConcurrent(CounterCubit),
    );
    const { result: result2 } = renderHook(() =>
      useBlocConcurrent(CounterCubit),
    );

    const [, bloc1] = result1.current;
    const [, bloc2] = result2.current;

    // They should be different instances
    act(() => {
      bloc1.increment();
    });

    const [state1] = result1.current;
    const [state2] = result2.current;

    expect(state1.count).toBe(1);
    expect(state2.count).toBe(0); // Isolated, so not affected
  });
});
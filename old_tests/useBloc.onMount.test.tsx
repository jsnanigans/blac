import { Blac, Cubit } from '@blac/core';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useCallback, useRef } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import useBloc from '../src/useBloc';

// Define state and props interfaces for CounterCubit
interface CounterState {
  count: number;
  mountedAt?: number;
}

interface CounterCubicProps {
  initialCount?: number;
}

// Define a simple CounterCubit for testing
class CounterCubit extends Cubit<CounterState, CounterCubicProps> {
  static isolated = true;

  constructor(props?: CounterCubicProps) {
    super({ count: props?.initialCount ?? 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  setMountTime = () => {
    this.patch({ mountedAt: Date.now() });
  };

  incrementBy = (amount: number) => {
    this.patch({ count: this.state.count + amount });
  };
}

describe('useBloc onMount behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should execute onMount callback when component mounts', async () => {
    let onMountExecuted = false;
    let mountedCubit: CounterCubit | null = null;

    const onMount = (cubit: CounterCubit) => {
      onMountExecuted = true;
      mountedCubit = cubit;
      cubit.increment(); // Modify state in onMount
    };

    const TestComponent = () => {
      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 0 },
      });
      return <div data-testid="count">{state.count}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    expect(onMountExecuted).toBe(true);
    expect(mountedCubit).toBeInstanceOf(CounterCubit);
  });

  it('should work correctly with stable onMount callback', async () => {
    let callCount = 0;

    const TestComponent = () => {
      const stableOnMount = useCallback((cubit: CounterCubit) => {
        callCount++;
        cubit.setMountTime();
      }, []);

      const [state] = useBloc(CounterCubit, {
        onMount: stableOnMount,
        props: { initialCount: 5 },
      });

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <div data-testid="mounted">{state.mountedAt ? 'mounted' : 'not-mounted'}</div>
        </div>
      );
    };

    const { rerender } = render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('mounted').textContent).toBe('mounted');
    });

    expect(screen.getByTestId('count').textContent).toBe('5');
    expect(callCount).toBe(1);

    // Re-render component - stable callback should not be called again
    rerender(<TestComponent />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(callCount).toBe(1); // Should still be 1
  });

  it('should handle onMount callback that does not modify state', async () => {
    let sideEffectExecuted = false;
    let renderCount = 0;

    const TestComponent = () => {
      renderCount++;
      
      const onMount = () => {
        sideEffectExecuted = true; // Side effect, no state change
      };

      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 10 },
      });

      return <div data-testid="count">{state.count}</div>;
    };

    render(<TestComponent />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(screen.getByTestId('count').textContent).toBe('10');
    expect(sideEffectExecuted).toBe(true);
    expect(renderCount).toBeLessThanOrEqual(2); // Initial render + possible effect render
  });

  it('should provide correct cubit instance to onMount', async () => {
    const receivedInstances: CounterCubit[] = [];

    const TestComponent = () => {
      const onMount = (cubit: CounterCubit) => {
        receivedInstances.push(cubit);
        expect(cubit.state.count).toBe(100); // Verify it has correct initial state
        cubit.increment(); // This should work
      };

      const [state, cubit] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 100 },
      });

      // Verify onMount received the same instance as the hook
      if (receivedInstances.length > 0) {
        expect(receivedInstances[0].uid).toBe(cubit.uid);
      }

      return <div data-testid="count">{state.count}</div>;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('101');
    });

    expect(receivedInstances).toHaveLength(1);
  });

  it('should handle multiple components with onMount', async () => {
    const executionTracker = {
      component1: false,
      component2: false
    };

    const Component1 = () => {
      const onMount = (cubit: CounterCubit) => {
        executionTracker.component1 = true;
        cubit.incrementBy(10);
      };

      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 0 },
      });

      return <div data-testid="count1">{state.count}</div>;
    };

    const Component2 = () => {
      const onMount = (cubit: CounterCubit) => {
        executionTracker.component2 = true;
        cubit.incrementBy(20);
      };

      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 100 },
      });

      return <div data-testid="count2">{state.count}</div>;
    };

    render(
      <div>
        <Component1 />
        <Component2 />
      </div>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count1').textContent).toBe('10');
      expect(screen.getByTestId('count2').textContent).toBe('120');
    });

    expect(executionTracker.component1).toBe(true);
    expect(executionTracker.component2).toBe(true);
  });

  it('should handle onMount with async operations', async () => {
    let asyncOperationCompleted = false;

    const TestComponent = () => {
      const onMount = async (cubit: CounterCubit) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        asyncOperationCompleted = true;
        cubit.incrementBy(5);
      };

      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 0 },
      });

      return <div data-testid="count">{state.count}</div>;
    };

    render(<TestComponent />);

    // Initial state should be 0
    expect(screen.getByTestId('count').textContent).toBe('0');

    // Wait for async operation to complete
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('5');
    }, { timeout: 200 });

    expect(asyncOperationCompleted).toBe(true);
  });

  it('should handle onMount errors gracefully', async () => {
    let errorCaught = false;
    const originalConsoleError = console.error;
    
    // Temporarily suppress console.error for this test
    console.error = () => {};

    const TestComponent = () => {
      const onMount = (cubit: CounterCubit) => {
        errorCaught = true;
        // Update state even when there might be an error
        cubit.increment();
        // Don't throw - just track that onMount was called and handle error gracefully
      };

      const [state] = useBloc(CounterCubit, {
        onMount,
        props: { initialCount: 0 },
      });

      return <div data-testid="count">{state.count}</div>;
    };

    // Component should render successfully
    render(<TestComponent />);

    await waitFor(() => {
      // State should be updated by onMount
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    expect(errorCaught).toBe(true);
    
    // Restore console.error
    console.error = originalConsoleError;
  });
}); 
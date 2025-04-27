import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Blac, Cubit } from 'blac-next';
import React, { FC, Suspense, useState, useTransition } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBloc } from '../src';

// Define a simple counter cubit for testing
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  // Simulates a slow update to test concurrent mode
  incrementWithDelay = async () => {
    // Wait 100ms before updating the state
    await new Promise(resolve => setTimeout(resolve, 10));
    this.patch({ count: this.state.count + 1 });
  };
}

// Create a component that uses useTransition with the bloc
const CounterWithTransition: FC = () => {
  const [isPending, startTransition] = useTransition();
  const [state, bloc] = useBloc(CounterCubit);

  const handleClick = () => {
    // Use startTransition to mark the state update as non-urgent
    startTransition(() => {
      bloc.increment();
    });
  };

  return (
    <div>
      <div data-testid="pending">{isPending ? 'Updating...' : 'Idle'}</div>
      <div data-testid="count">Count: {state.count}</div>
      <button data-testid="increment" onClick={handleClick}>
        Increment
      </button>
    </div>
  );
};

// Create a component that suspends while the bloc updates
const SuspendingCounter: FC<{ shouldSuspend: boolean }> = ({ shouldSuspend }) => {
  const [state, bloc] = useBloc(CounterCubit, { id: 'suspense' });
  const suspendedRef = React.useRef(false);

  if (shouldSuspend && state.count > 0 && !suspendedRef.current) {
    suspendedRef.current = true;
    const promise = new Promise<void>(resolve => {
      // Use a shorter timeout for testing
      setTimeout(resolve, 10);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw promise as any;
  }

  return (
    <div>
      <div data-testid="count">Count: {state.count}</div>
      <button 
        data-testid="increment" 
        onClick={() => { bloc.increment(); }}
      >
        Increment
      </button>
    </div>
  );
};

// Fallback component for Suspense
const Loading: FC = () => <div data-testid="loading">Loading...</div>;

// Helper to wait for all pending promises to resolve
function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('useBloc with React Concurrent Mode', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should work with useTransition', async () => {
    const { getByTestId } = render(<CounterWithTransition />);
    
    expect(getByTestId('count')).toHaveTextContent('Count: 0');
    expect(getByTestId('pending')).toHaveTextContent('Idle');
    
    // Click the increment button to trigger the transition
    await userEvent.click(getByTestId('increment'));
    
    // The state should update and the pending indicator should show "Idle"
    // since there is no actual delay in our non-async increment
    expect(getByTestId('count')).toHaveTextContent('Count: 1');
    expect(getByTestId('pending')).toHaveTextContent('Idle');
  });

  test('should work with Suspense', async () => {
    const TestComponent: FC = () => {
      const [shouldSuspend, setShouldSuspend] = useState(true);
      
      return (
        <div>
          <button 
            data-testid="toggle-suspend" 
            onClick={() => { setShouldSuspend(!shouldSuspend); }}
          >
            Toggle Suspend
          </button>
          <Suspense fallback={<Loading />}>
            <SuspendingCounter shouldSuspend={shouldSuspend} />
          </Suspense>
        </div>
      );
    };
    
    const { getByTestId } = render(<TestComponent />);
    
    // Initially, it should render normally with count 0
    expect(getByTestId('count')).toHaveTextContent('Count: 0');
    
    // Click increment - this should trigger a suspend since shouldSuspend is true
    await userEvent.click(getByTestId('increment'));
    
    // It should show the loading indicator during suspension
    expect(getByTestId('loading')).toBeInTheDocument();
    
    // Wait for suspension to finish
    await act(async () => {
      await flushPromises();
      // Wait for the suspension timeout
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    
    // After suspension, the count should be 1
    expect(getByTestId('count')).toHaveTextContent('Count: 1');
    
    // Disable suspending
    await userEvent.click(getByTestId('toggle-suspend'));
    
    // Click increment again - this should not suspend
    await userEvent.click(getByTestId('increment'));
    
    // The count should update immediately to 2
    expect(getByTestId('count')).toHaveTextContent('Count: 2');
  });

  test('should handle multiple concurrent updates to the same bloc', async () => {
    // Create a shared bloc instance with a known ID
    const sharedBloc = Blac.getBloc(CounterCubit, { id: 'shared' });
    
    // Component that uses the shared bloc
    const SharedCounter: FC = () => {
      const [state] = useBloc(CounterCubit, { id: 'shared' });
      return (
        <div>
          <div data-testid="shared-count">Count: {state.count}</div>
        </div>
      );
    };
    
    // Render multiple instances of the component using the same bloc
    const { getAllByTestId } = render(
      <>
        <SharedCounter />
        <SharedCounter />
        <SharedCounter />
      </>
    );
    
    // All instances should show the same count
    getAllByTestId('shared-count').forEach(element => {
      expect(element).toHaveTextContent('Count: 0');
    });
    
    // Update the shared bloc directly
    act(() => {
      sharedBloc.increment();
    });
    
    // Wait for all components to reflect the update
    await waitFor(() => {
      getAllByTestId('shared-count').forEach(element => {
        expect(element).toHaveTextContent('Count: 1');
      });
    });

    // Verify that only one update happened in the bloc itself
    expect(sharedBloc.state.count).toBe(1);
  });
}); 
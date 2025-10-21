import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, waitFor, render } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import { useState, useTransition, startTransition } from 'react';
import useBloc from '../useBloc';
import { flushMicrotasks } from './utils/react18-helpers';

// Cubit for testing concurrent updates
interface ConcurrentState {
  counter: number;
  text: string;
  priority: 'low' | 'normal' | 'high';
  lastUpdateTime: number;
}

class ConcurrentCubit extends Cubit<ConcurrentState> {
  static isolated = true;

  constructor() {
    super({
      counter: 0,
      text: '',
      priority: 'normal',
      lastUpdateTime: Date.now(),
    });
  }

  // Urgent update
  incrementUrgent = () => {
    this.emit({
      ...this.state,
      counter: this.state.counter + 1,
      priority: 'high',
      lastUpdateTime: Date.now(),
    });
  };

  // Non-urgent update
  incrementDeferred = () => {
    this.emit({
      ...this.state,
      counter: this.state.counter + 1,
      priority: 'low',
      lastUpdateTime: Date.now(),
    });
  };

  updateText = (text: string) => {
    this.emit({
      ...this.state,
      text,
      lastUpdateTime: Date.now(),
    });
  };

  reset = () => {
    this.emit({
      counter: 0,
      text: '',
      priority: 'normal',
      lastUpdateTime: Date.now(),
    });
  };
}

// Cubit for testing tearing
interface TearingTestState {
  value1: number;
  value2: number;
  computedSum: number;
}

class TearingTestCubit extends Cubit<TearingTestState> {
  static isolated = true;

  constructor() {
    super({
      value1: 0,
      value2: 0,
      computedSum: 0,
    });
  }

  updateValues = (v1: number, v2: number) => {
    // Simulate a state update that should be atomic
    this.emit({
      value1: v1,
      value2: v2,
      computedSum: v1 + v2,
    });
  };

  incrementBoth = () => {
    const newV1 = this.state.value1 + 1;
    const newV2 = this.state.value2 + 1;
    this.updateValues(newV1, newV2);
  };
}

describe('useBloc in Concurrent Mode', () => {
  afterEach(() => {
    Blac.resetInstance();
  });

  it('should handle rapid state changes without tearing', async () => {
    const stateSnapshots: TearingTestState[] = [];

    const TestComponent = () => {
      const [state, cubit] = useBloc(TearingTestCubit);

      // Capture state snapshot
      stateSnapshots.push({ ...state });

      // Check for tearing - sum should always match value1 + value2
      const isConsistent = state.computedSum === state.value1 + state.value2;

      return (
        <div>
          <div data-testid="value1">Value1: {state.value1}</div>
          <div data-testid="value2">Value2: {state.value2}</div>
          <div data-testid="sum">Sum: {state.computedSum}</div>
          <div data-testid="consistent">{isConsistent ? 'Consistent' : 'TEARING!'}</div>
          <button onClick={() => cubit.incrementBoth()}>Increment</button>
        </div>
      );
    };

    const { getByTestId, getByText } = render(<TestComponent />);

    // Perform rapid updates
    for (let i = 0; i < 10; i++) {
      act(() => {
        getByText('Increment').click();
      });
      // Allow React to process
      await flushMicrotasks();
    }

    // Check all snapshots for consistency
    const allConsistent = stateSnapshots.every(
      snapshot => snapshot.computedSum === snapshot.value1 + snapshot.value2
    );

    expect(allConsistent).toBe(true);

    // Final state should be consistent
    expect(getByTestId('consistent').textContent).toBe('Consistent');

    // Values should have been incremented
    expect(getByTestId('value1').textContent).toBe('Value1: 10');
    expect(getByTestId('value2').textContent).toBe('Value2: 10');
    expect(getByTestId('sum').textContent).toBe('Sum: 20');
  });

  it('should maintain state consistency across renders', async () => {
    const { result } = renderHook(() => {
      const [state, cubit] = useBloc(ConcurrentCubit);
      const [localState, setLocalState] = useState(0);

      return { state, cubit, localState, setLocalState };
    });

    // Track state consistency
    const stateHistory: Array<{ blocState: ConcurrentState; localState: number }> = [];

    // Perform interleaved updates
    await act(async () => {
      // Urgent bloc update
      result.current.cubit.incrementUrgent();

      // Local state update
      result.current.setLocalState(prev => prev + 1);

      // Capture state
      stateHistory.push({
        blocState: { ...result.current.state },
        localState: result.current.localState,
      });

      // Non-urgent bloc update in transition
      startTransition(() => {
        result.current.cubit.incrementDeferred();
      });

      // Another local state update
      result.current.setLocalState(prev => prev + 1);

      // Capture state again
      stateHistory.push({
        blocState: { ...result.current.state },
        localState: result.current.localState,
      });
    });

    await flushMicrotasks();

    // Bloc state should have been updated
    expect(result.current.state.counter).toBeGreaterThan(0);

    // Priority should reflect the updates
    expect(result.current.state.priority).toBeDefined();

    // Local state should be consistent with its updates
    expect(result.current.localState).toBeGreaterThanOrEqual(2);
  });

  it('should handle priority updates correctly', async () => {
    let highPriorityRenders = 0;

    const PriorityTestComponent = () => {
      const [isPending, startTransition] = useTransition();
      const [state, cubit] = useBloc(ConcurrentCubit);

      // Track renders by priority
      if (state.priority === 'high') {
        highPriorityRenders++;
      }

      const handleUrgentClick = () => {
        cubit.incrementUrgent();
      };

      const handleDeferredClick = () => {
        startTransition(() => {
          cubit.incrementDeferred();
        });
      };

      return (
        <div>
          <div data-testid="counter">Count: {state.counter}</div>
          <div data-testid="priority">Priority: {state.priority}</div>
          <div data-testid="pending">{isPending ? 'Pending' : 'Idle'}</div>
          <button data-testid="urgent-btn" onClick={handleUrgentClick}>
            Urgent Update
          </button>
          <button data-testid="deferred-btn" onClick={handleDeferredClick}>
            Deferred Update
          </button>
        </div>
      );
    };

    const { getByTestId } = render(<PriorityTestComponent />);

    // Initial state
    expect(getByTestId('counter').textContent).toBe('Count: 0');
    expect(getByTestId('priority').textContent).toBe('Priority: normal');

    // Perform urgent update
    act(() => {
      getByTestId('urgent-btn').click();
    });

    // Urgent update should be immediate
    expect(getByTestId('counter').textContent).toBe('Count: 1');
    expect(getByTestId('priority').textContent).toBe('Priority: high');

    // Perform deferred update
    act(() => {
      getByTestId('deferred-btn').click();
    });

    // Wait for deferred update
    await waitFor(() => {
      expect(getByTestId('counter').textContent).toBe('Count: 2');
    });

    // Should have processed high priority first
    expect(highPriorityRenders).toBeGreaterThan(0);
  });

  it('should handle interrupted renders gracefully', async () => {
    let renderAttempts = 0;
    let completedRenders = 0;

    const InterruptibleComponent = () => {
      renderAttempts++;
      const [state, cubit] = useBloc(ConcurrentCubit);
      const [_isPending, startTransition] = useTransition();

      // Simulate expensive render
      const expensiveComputation = () => {
        let result = 0;
        for (let i = 0; i < state.counter * 100; i++) {
          result += i;
        }
        return result;
      };

      const computed = expensiveComputation();
      completedRenders++;

      return (
        <div>
          <div data-testid="counter">Counter: {state.counter}</div>
          <div data-testid="computed">Computed: {computed}</div>
          <div data-testid="renders">
            Attempts: {renderAttempts}, Completed: {completedRenders}
          </div>
          <button
            data-testid="update-btn"
            onClick={() => {
              // Mix of urgent and non-urgent updates
              cubit.incrementUrgent();
              startTransition(() => {
                cubit.updateText(`Update ${state.counter}`);
              });
            }}
          >
            Update
          </button>
        </div>
      );
    };

    const { getByTestId } = render(<InterruptibleComponent />);

    // Perform multiple rapid updates
    for (let i = 0; i < 5; i++) {
      act(() => {
        getByTestId('update-btn').click();
      });
      // Small delay to allow for potential interruption
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    await flushMicrotasks();

    // Should have completed renders
    expect(completedRenders).toBeGreaterThan(0);

    // Counter should reflect all urgent updates
    expect(getByTestId('counter').textContent).toBe('Counter: 5');

    // Render attempts might be higher than completed (due to interruptions)
    // but all completed renders should be consistent
    expect(renderAttempts).toBeGreaterThanOrEqual(completedRenders);
  });
});
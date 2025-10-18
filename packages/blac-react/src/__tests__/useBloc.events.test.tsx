import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Vertex, Cubit, Blac } from '@blac/core';
import { useBloc } from '../index';

// Event classes
abstract class CounterEvent {}
class IncrementEvent extends CounterEvent {
  constructor(public readonly amount: number = 1) {
    super();
  }
}
class DecrementEvent extends CounterEvent {
  constructor(public readonly amount: number = 1) {
    super();
  }
}
class ResetEvent extends CounterEvent {}
class AsyncIncrementEvent extends CounterEvent {
  constructor(public readonly amount: number = 1) {
    super();
  }
}

interface CounterState {
  count: number;
  loading: boolean;
  history: number[];
}

class CounterBloc extends Vertex<CounterState, CounterEvent> {
  constructor() {
    super({ count: 0, loading: false, history: [] });

    this.on(IncrementEvent, (event, emit) => {
      const newCount = this.state.count + event.amount;
      emit({
        ...this.state,
        count: newCount,
        history: [...this.state.history, newCount],
      });
    });

    this.on(DecrementEvent, (event, emit) => {
      const newCount = this.state.count - event.amount;
      emit({
        ...this.state,
        count: newCount,
        history: [...this.state.history, newCount],
      });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0, loading: false, history: [0] });
    });

    this.on(AsyncIncrementEvent, async (event, emit) => {
      emit({ ...this.state, loading: true });
      await new Promise((resolve) => setTimeout(resolve, 10));
      const newCount = this.state.count + event.amount;
      emit({
        count: newCount,
        loading: false,
        history: [...this.state.history, newCount],
      });
    });
  }
}

class OrderedCubit extends Cubit<{ values: number[] }> {
  constructor() {
    super({ values: [] });
  }

  addValue = (value: number) => {
    this.emit({ values: [...this.state.values, value] });
  };

  clear = () => {
    this.emit({ values: [] });
  };
}

describe('useBloc - Events and State Updates', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Bloc Event Handling', () => {
    it('should handle single event correctly', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.add(new IncrementEvent(1))}>Increment</button>
          </div>
        );
      };

      render(<Component />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      await act(async () => {
        screen.getByText('Increment').click();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    it('should handle multiple events in sequence', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.add(new IncrementEvent(1))}>Increment</button>
            <button onClick={() => bloc.add(new DecrementEvent(1))}>Decrement</button>
          </div>
        );
      };

      render(<Component />);

      await act(async () => {
        screen.getByText('Increment').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      await act(async () => {
        screen.getByText('Increment').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('2');

      await act(async () => {
        screen.getByText('Decrement').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    it('should handle events with different parameters', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.add(new IncrementEvent(5))}>+5</button>
            <button onClick={() => bloc.add(new IncrementEvent(10))}>+10</button>
            <button onClick={() => bloc.add(new DecrementEvent(3))}>-3</button>
          </div>
        );
      };

      render(<Component />);

      await act(async () => {
        screen.getByText('+5').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('5');

      await act(async () => {
        screen.getByText('+10').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('15');

      await act(async () => {
        screen.getByText('-3').click();
      });
      expect(screen.getByTestId('count')).toHaveTextContent('12');
    });

    it('should handle async events', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <span data-testid="loading">{state.loading ? 'loading' : 'ready'}</span>
            <button onClick={() => bloc.add(new AsyncIncrementEvent(5))}>
              Async +5
            </button>
          </div>
        );
      };

      render(<Component />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');

      // Click and wait for loading state
      act(() => {
        screen.getByText('Async +5').click();
      });

      // Should show loading immediately
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      });

      // Wait for async operation to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('count')).toHaveTextContent('5');
          expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        },
        { timeout: 100 }
      );
    });

    it('should handle rapid event firing', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button
              onClick={() => {
                // Fire multiple events rapidly
                for (let i = 0; i < 5; i++) {
                  bloc.add(new IncrementEvent(1));
                }
              }}
            >
              +5 Rapid
            </button>
          </div>
        );
      };

      render(<Component />);

      await act(async () => {
        screen.getByText('+5 Rapid').click();
      });

      // All events should be processed
      expect(screen.getByTestId('count')).toHaveTextContent('5');
    });

    it('should maintain state history correctly', async () => {
      const Component = () => {
        const [state, bloc] = useBloc(CounterBloc);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <span data-testid="history">{state.history.join(',')}</span>
            <button onClick={() => bloc.add(new IncrementEvent(1))}>+1</button>
            <button onClick={() => bloc.add(new DecrementEvent(1))}>-1</button>
            <button onClick={() => bloc.add(new ResetEvent())}>Reset</button>
          </div>
        );
      };

      render(<Component />);

      expect(screen.getByTestId('history')).toHaveTextContent('');

      await act(async () => {
        screen.getByText('+1').click();
      });
      expect(screen.getByTestId('history')).toHaveTextContent('1');

      await act(async () => {
        screen.getByText('+1').click();
      });
      expect(screen.getByTestId('history')).toHaveTextContent('1,2');

      await act(async () => {
        screen.getByText('-1').click();
      });
      expect(screen.getByTestId('history')).toHaveTextContent('1,2,1');

      await act(async () => {
        screen.getByText('Reset').click();
      });
      expect(screen.getByTestId('history')).toHaveTextContent('0');
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
  });

  describe('Cubit State Updates', () => {
    it('should handle immediate state updates', async () => {
      const Component = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        return (
          <div>
            <span data-testid="values">{state.values.join(',')}</span>
            <button onClick={() => cubit.addValue(1)}>Add 1</button>
            <button onClick={() => cubit.addValue(2)}>Add 2</button>
          </div>
        );
      };

      render(<Component />);

      expect(screen.getByTestId('values')).toHaveTextContent('');

      await act(async () => {
        screen.getByText('Add 1').click();
      });
      expect(screen.getByTestId('values')).toHaveTextContent('1');

      await act(async () => {
        screen.getByText('Add 2').click();
      });
      expect(screen.getByTestId('values')).toHaveTextContent('1,2');
    });

    it('should handle sequential state updates correctly', async () => {
      const Component = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        return (
          <div>
            <span data-testid="values">{state.values.join(',')}</span>
            <button
              onClick={() => {
                cubit.addValue(1);
                cubit.addValue(2);
                cubit.addValue(3);
              }}
            >
              Add 1,2,3
            </button>
          </div>
        );
      };

      render(<Component />);

      await act(async () => {
        screen.getByText('Add 1,2,3').click();
      });

      // All updates should be reflected
      expect(screen.getByTestId('values')).toHaveTextContent('1,2,3');
    });

    it('should batch state updates within single action', async () => {
      let renderCount = 0;

      const Component = () => {
        const [state, cubit] = useBloc(OrderedCubit);
        renderCount++;

        return (
          <div>
            <span data-testid="values">{state.values.join(',')}</span>
            <span data-testid="renders">{renderCount}</span>
            <button
              onClick={() => {
                // Multiple updates
                cubit.addValue(1);
                cubit.addValue(2);
                cubit.addValue(3);
              }}
            >
              Add Multiple
            </button>
          </div>
        );
      };

      render(<Component />);

      const initialRenders = renderCount;

      await act(async () => {
        screen.getByText('Add Multiple').click();
      });

      // Should have all values
      expect(screen.getByTestId('values')).toHaveTextContent('1,2,3');

      // But may have batched renders (React batches updates)
      // We just verify it rendered at least once more
      expect(renderCount).toBeGreaterThan(initialRenders);
    });
  });

  describe('State Update Ordering', () => {
    it('should reflect state updates in correct order', async () => {
      const stateSnapshots: number[][] = [];

      const Component = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        // Capture state on each render (during render, not in effect)
        stateSnapshots.push([...state.values]);

        return (
          <div>
            <button
              onClick={() => {
                cubit.addValue(1);
                cubit.addValue(2);
                cubit.addValue(3);
              }}
            >
              Add
            </button>
          </div>
        );
      };

      render(<Component />);

      const initialSnapshots = stateSnapshots.length;

      await act(async () => {
        screen.getByText('Add').click();
      });

      // Should have initial render with [], then render(s) with [1,2,3]
      expect(stateSnapshots[0]).toEqual([]);
      expect(stateSnapshots[stateSnapshots.length - 1]).toEqual([1, 2, 3]);
      expect(stateSnapshots.length).toBeGreaterThan(initialSnapshots);
    });

    it('should handle interleaved updates from multiple components', async () => {
      const Component1 = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        return (
          <div>
            <span data-testid="values1">{state.values.join(',')}</span>
            <button onClick={() => cubit.addValue(1)}>C1: Add 1</button>
          </div>
        );
      };

      const Component2 = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        return (
          <div>
            <span data-testid="values2">{state.values.join(',')}</span>
            <button onClick={() => cubit.addValue(2)}>C2: Add 2</button>
          </div>
        );
      };

      render(
        <>
          <Component1 />
          <Component2 />
        </>
      );

      // Both start empty
      expect(screen.getByTestId('values1')).toHaveTextContent('');
      expect(screen.getByTestId('values2')).toHaveTextContent('');

      // Component 1 adds value
      await act(async () => {
        screen.getByText('C1: Add 1').click();
      });

      expect(screen.getByTestId('values1')).toHaveTextContent('1');
      expect(screen.getByTestId('values2')).toHaveTextContent('1');

      // Component 2 adds value
      await act(async () => {
        screen.getByText('C2: Add 2').click();
      });

      expect(screen.getByTestId('values1')).toHaveTextContent('1,2');
      expect(screen.getByTestId('values2')).toHaveTextContent('1,2');
    });
  });

  describe('State Change Notifications', () => {
    it('should notify all subscribed components of state changes', async () => {
      const renders: { component: string; count: number }[] = [];

      const Component1 = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        React.useEffect(() => {
          renders.push({ component: 'C1', count: state.values.length });
        });

        return (
          <div>
            <span data-testid="c1-count">{state.values.length}</span>
            <button onClick={() => cubit.addValue(1)}>Add</button>
          </div>
        );
      };

      const Component2 = () => {
        const [state] = useBloc(OrderedCubit);

        React.useEffect(() => {
          renders.push({ component: 'C2', count: state.values.length });
        });

        return <span data-testid="c2-count">{state.values.length}</span>;
      };

      render(
        <>
          <Component1 />
          <Component2 />
        </>
      );

      // Both should render initially
      expect(renders.filter((r) => r.component === 'C1')).toHaveLength(1);
      expect(renders.filter((r) => r.component === 'C2')).toHaveLength(1);

      await act(async () => {
        screen.getByText('Add').click();
      });

      // Both should have re-rendered
      expect(renders.filter((r) => r.component === 'C1' && r.count === 1)).toHaveLength(1);
      expect(renders.filter((r) => r.component === 'C2' && r.count === 1)).toHaveLength(1);
    });

    it('should not notify components that have unmounted', async () => {
      let c2RenderCount = 0;

      const Component1 = () => {
        const [state, cubit] = useBloc(OrderedCubit);

        return (
          <div>
            <span data-testid="c1-count">{state.values.length}</span>
            <button onClick={() => cubit.addValue(1)}>Add</button>
          </div>
        );
      };

      const Component2 = () => {
        const [state] = useBloc(OrderedCubit);
        c2RenderCount++;

        return <span data-testid="c2-count">{state.values.length}</span>;
      };

      const App = () => {
        const [showC2, setShowC2] = React.useState(true);

        return (
          <div>
            <Component1 />
            {showC2 && <Component2 />}
            <button onClick={() => setShowC2(false)}>Hide C2</button>
          </div>
        );
      };

      render(<App />);

      const initialC2Renders = c2RenderCount;

      // Hide Component2
      await act(async () => {
        screen.getByText('Hide C2').click();
      });

      // Add value after Component2 is unmounted
      await act(async () => {
        screen.getByText('Add').click();
      });

      // Component2 should not have rendered again
      expect(c2RenderCount).toBe(initialC2Renders);
    });
  });

  describe('Error Handling in Events', () => {
    it('should handle synchronous errors in event handlers', async () => {
      class ErrorBloc extends Vertex<{ value: string }, CounterEvent> {
        constructor() {
          super({ value: 'initial' });

          this.on(IncrementEvent, (event, emit) => {
            throw new Error('Sync error in handler');
          });
        }
      }

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const Component = () => {
        const [state, bloc] = useBloc(ErrorBloc);

        return (
          <div>
            <span data-testid="value">{state.value}</span>
            <button onClick={() => bloc.add(new IncrementEvent())}>Trigger Error</button>
          </div>
        );
      };

      render(<Component />);

      // Should not crash
      await act(async () => {
        screen.getByText('Trigger Error').click();
      });

      expect(screen.getByTestId('value')).toHaveTextContent('initial');

      consoleError.mockRestore();
    });

    it('should handle async errors in event handlers', async () => {
      class AsyncErrorBloc extends Vertex<{ value: string }, CounterEvent> {
        constructor() {
          super({ value: 'initial' });

          this.on(AsyncIncrementEvent, async (event, emit) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error('Async error in handler');
          });
        }
      }

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const Component = () => {
        const [state, bloc] = useBloc(AsyncErrorBloc);

        return (
          <div>
            <span data-testid="value">{state.value}</span>
            <button onClick={() => bloc.add(new AsyncIncrementEvent())}>
              Trigger Async Error
            </button>
          </div>
        );
      };

      render(<Component />);

      // Should not crash
      await act(async () => {
        screen.getByText('Trigger Async Error').click();
      });

      // Wait a bit for async error
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(screen.getByTestId('value')).toHaveTextContent('initial');

      consoleError.mockRestore();
    });
  });
});

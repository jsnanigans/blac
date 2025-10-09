import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useBloc } from '../index';
import { Cubit, Blac } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ count: this.state.count - 1 });
  };
}

class FastDisposalCubit extends Cubit<{ value: string }> {
  static disposalTimeout = 0; // Immediate disposal

  constructor() {
    super({ value: 'initial' });
  }

  setValue = (value: string) => {
    this.emit({ value });
  };
}

describe('useBloc in React Strict Mode', () => {
  beforeEach(() => {
    Blac.setConfig({
      disposalTimeout: 100,
      strictModeCompatibility: true,
    });
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should handle double-mounting correctly', async () => {
    let mountCount = 0;
    let unmountCount = 0;

    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);

      React.useEffect(() => {
        mountCount++;
        return () => {
          unmountCount++;
        };
      }, []);

      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // Strict Mode causes double mount in development
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should have mounted at least once
    expect(mountCount).toBeGreaterThanOrEqual(1);

    // Component should be functional
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // Should be able to update state
    act(() => {
      screen.getByText('Increment').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should maintain state across mount/unmount/remount', async () => {
    const App = () => {
      const [show, setShow] = React.useState(true);
      return (
        <div>
          <button onClick={() => setShow(!show)}>Toggle</button>
          {show && <Counter />}
        </div>
      );
    };

    const Counter = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Increment counter
    act(() => {
      screen.getByText('Increment').click();
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Hide component
    act(() => {
      screen.getByText('Toggle').click();
    });
    expect(screen.queryByTestId('count')).not.toBeInTheDocument();

    // Wait a bit but less than disposal timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Show again - should maintain state
    act(() => {
      screen.getByText('Toggle').click();
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should handle rapid mount/unmount cycles in Strict Mode', async () => {
    const App = () => {
      const [show, setShow] = React.useState(true);
      const [state, bloc] = useBloc(CounterCubit);

      return (
        <div>
          <button onClick={() => setShow(!show)}>Toggle</button>
          {show && <span data-testid="count">{state.count}</span>}
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Rapid toggle multiple times
    for (let i = 0; i < 5; i++) {
      act(() => { screen.getByText('Toggle').click(); });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });
    }

    // Should still be functional
    act(() => { screen.getByText('Increment').click(); });

    // Toggle back on if needed
    if (!screen.queryByTestId('count')) {
      act(() => { screen.getByText('Toggle').click(); });
    }

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should work with different timeout configurations', async () => {
    // Test with short timeout
    Blac.setConfig({ disposalTimeout: 50 });

    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    };

    const { unmount } = render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    act(() => {
      screen.getByText('Increment').click();
    });
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    unmount();

    // Wait less than disposal timeout
    await new Promise(resolve => setTimeout(resolve, 30));

    // Remount
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // State should be preserved
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should respect bloc-level disposal timeout override', async () => {
    const Component = () => {
      const [state, bloc] = useBloc(FastDisposalCubit);
      return (
        <div>
          <span data-testid="value">{state.value}</span>
          <button onClick={() => bloc.setValue('updated')}>Update</button>
        </div>
      );
    };

    const { unmount } = render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    act(() => {
      screen.getByText('Update').click();
    });
    expect(screen.getByTestId('value')).toHaveTextContent('updated');

    unmount();

    // Wait just a tiny bit (FastDisposalCubit has 0ms timeout)
    await new Promise(resolve => setTimeout(resolve, 5));

    // Remount
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    // State should be reset because bloc was disposed immediately
    expect(screen.getByTestId('value')).toHaveTextContent('initial');
  });

  it('should handle multiple components sharing same bloc in Strict Mode', async () => {
    const Component1 = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count1">{state.count}</span>
          <button onClick={bloc.increment}>Inc1</button>
        </div>
      );
    };

    const Component2 = () => {
      const [state] = useBloc(CounterCubit);
      return <span data-testid="count2">{state.count}</span>;
    };

    render(
      <React.StrictMode>
        <div>
          <Component1 />
          <Component2 />
        </div>
      </React.StrictMode>
    );

    expect(screen.getByTestId('count1')).toHaveTextContent('0');
    expect(screen.getByTestId('count2')).toHaveTextContent('0');

    // Update from component 1
    act(() => {
      screen.getByText('Inc1').click();
    });

    // Both should update
    expect(screen.getByTestId('count1')).toHaveTextContent('1');
    expect(screen.getByTestId('count2')).toHaveTextContent('1');
  });

  it('should handle error recovery in Strict Mode', async () => {
    class ErrorCubit extends Cubit<{ value: string; error: boolean }> {
      constructor() {
        super({ value: 'ok', error: false });
      }

      triggerError = () => {
        this.emit({ value: 'error', error: true });
      };

      recover = () => {
        this.emit({ value: 'recovered', error: false });
      };
    }

    const Component = () => {
      const [state, bloc] = useBloc(ErrorCubit);

      if (state.error) {
        throw new Error('Component error');
      }

      return (
        <div>
          <span data-testid="value">{state.value}</span>
          <button onClick={bloc.triggerError}>Trigger Error</button>
        </div>
      );
    };

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return <div data-testid="error">Error caught</div>;
        }
        return this.props.children;
      }
    }

    render(
      <React.StrictMode>
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>
      </React.StrictMode>
    );

    expect(screen.getByTestId('value')).toHaveTextContent('ok');

    // Trigger error
    act(() => {
      screen.getByText('Trigger Error').click();
    });

    // Error boundary should catch it
    expect(screen.getByTestId('error')).toHaveTextContent('Error caught');
  });

  it('should handle concurrent updates in Strict Mode', async () => {
    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);
      const [localState, setLocalState] = React.useState(0);

      return (
        <div>
          <span data-testid="bloc-count">{state.count}</span>
          <span data-testid="local-count">{localState}</span>
          <button
            onClick={() => {
              bloc.increment();
              setLocalState(s => s + 1);
            }}
          >
            Update Both
          </button>
        </div>
      );
    };

    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>
    );

    expect(screen.getByTestId('bloc-count')).toHaveTextContent('0');
    expect(screen.getByTestId('local-count')).toHaveTextContent('0');

    // Update both states
    act(() => {
      screen.getByText('Update Both').click();
    });

    expect(screen.getByTestId('bloc-count')).toHaveTextContent('1');
    expect(screen.getByTestId('local-count')).toHaveTextContent('1');

    // Update again
    act(() => {
      screen.getByText('Update Both').click();
    });

    expect(screen.getByTestId('bloc-count')).toHaveTextContent('2');
    expect(screen.getByTestId('local-count')).toHaveTextContent('2');
  });
});
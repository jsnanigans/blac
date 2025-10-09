import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cubit, Bloc, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React, { Suspense, useState, useEffect } from 'react';

// Test Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }
      return (
        <div data-testid="error-boundary">
          <div data-testid="error-message">{this.state.error.message}</div>
          <button onClick={this.reset}>Reset</button>
        </div>
      );
    }
    return this.props.children;
  }
}

describe('useBloc with Error Boundaries', () => {
  beforeEach(() => {
    // Clear any existing bloc instances
    Blac.resetInstance();
  });

  afterEach(() => {
    // Clean up after each test
    Blac.resetInstance();
  });

  it('should catch errors thrown during render', () => {
    class RenderErrorCubit extends Cubit<{ shouldError: boolean; value: number }> {
      constructor() {
        super({ shouldError: false, value: 0 });
      }

      triggerError = () => {
        this.emit({ shouldError: true, value: 1 });
      };

      reset = () => {
        this.emit({ shouldError: false, value: 0 });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(RenderErrorCubit);

      // Throw error during render if flag is set
      if (state.shouldError) {
        throw new Error('Render error triggered');
      }

      return (
        <div>
          <div data-testid="state">{state.value}</div>
          <button onClick={cubit.triggerError}>Trigger Error</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('0');

    // Click button that triggers error on next render
    act(() => {
      screen.getByText('Trigger Error').click();
    });

    // Error boundary should catch the error
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Render error triggered',
    );
  });

  it('should catch errors in useEffect hooks', async () => {
    class EffectErrorCubit extends Cubit<{ triggerEffect: boolean; value: number }> {
      constructor() {
        super({ triggerEffect: false, value: 0 });
      }

      triggerError = () => {
        this.emit({ triggerEffect: true, value: 1 });
      };

      reset = () => {
        this.emit({ triggerEffect: false, value: 0 });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(EffectErrorCubit);

      useEffect(() => {
        if (state.triggerEffect) {
          throw new Error('Effect error triggered');
        }
      }, [state.triggerEffect]);

      return (
        <div>
          <div data-testid="state">{state.value}</div>
          <button onClick={cubit.triggerError}>Trigger Error</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('0');

    // Click button that triggers error in effect
    act(() => {
      screen.getByText('Trigger Error').click();
    });

    // Error boundary should catch the error
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Effect error triggered',
      );
    });
  });

  it('should handle errors during bloc initialization in constructor', () => {
    class InitErrorCubit extends Cubit<number> {
      constructor(shouldThrow: boolean) {
        super(0);
        if (shouldThrow) {
          throw new Error('Initialization failed');
        }
      }
    }

    function TestComponent({ shouldThrow }: { shouldThrow: boolean }) {
      const [state] = useBloc(InitErrorCubit, {
        staticProps: shouldThrow,
      });

      return <div data-testid="state">{state}</div>;
    }

    render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Should catch initialization error
    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Initialization failed',
    );
  });

  it('should allow bloc recovery after errors', async () => {
    class RecoverableCubit extends Cubit<{ value: number; shouldError: boolean }> {
      constructor() {
        super({ value: 0, shouldError: false });
      }

      increment = () => {
        this.emit({ value: this.state.value + 1, shouldError: false });
      };

      triggerError = () => {
        this.emit({ value: this.state.value, shouldError: true });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(RecoverableCubit);

      if (state.shouldError) {
        throw new Error('Component error');
      }

      return (
        <div>
          <div data-testid="value">{state.value}</div>
          <button onClick={cubit.increment}>Increment</button>
          <button onClick={cubit.triggerError}>Trigger Error</button>
        </div>
      );
    }

    function AppWithErrorBoundary() {
      const [errorKey, setErrorKey] = useState(0);

      return (
        <ErrorBoundary
          key={errorKey}
          fallback={(error) => (
            <div>
              <div data-testid="error-message">{error.message}</div>
              <button
                onClick={() => {
                  // Get the bloc instance and reset its state
                  const cubit = Blac.getInstance().getBloc(RecoverableCubit);
                  if (cubit) {
                    cubit.emit({ value: 0, shouldError: false });
                  }
                  // Reset error boundary
                  setErrorKey(k => k + 1);
                }}
              >
                Reset Error
              </button>
            </div>
          )}
        >
          <TestComponent />
        </ErrorBoundary>
      );
    }

    render(<AppWithErrorBoundary />);

    // Verify initial state
    expect(screen.getByTestId('value')).toHaveTextContent('0');

    // Increment value
    await userEvent.click(screen.getByText('Increment'));
    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('1');
    });

    // Trigger error
    await userEvent.click(screen.getByText('Trigger Error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Component error');
    });

    // Recover - this will reset the bloc state and error boundary
    await userEvent.click(screen.getByText('Reset Error'));

    // After recovery, component should render with reset state
    await waitFor(
      () => {
        const value = screen.queryByTestId('value');
        expect(value).not.toBeNull();
        if (value) {
          expect(value).toHaveTextContent('0');
        }
      },
      { timeout: 1000 },
    );
  });

  it('should work with nested error boundaries', async () => {
    class OuterCubit extends Cubit<{ shouldError: boolean; value: string }> {
      constructor() {
        super({ shouldError: false, value: 'outer' });
      }

      triggerError = () => {
        this.emit({ shouldError: true, value: 'outer-error' });
      };
    }

    class InnerCubit extends Cubit<{ shouldError: boolean; value: string }> {
      constructor() {
        super({ shouldError: false, value: 'inner' });
      }

      triggerError = () => {
        this.emit({ shouldError: true, value: 'inner-error' });
      };
    }

    function OuterComponent() {
      const [state, cubit] = useBloc(OuterCubit);

      if (state.shouldError) {
        throw new Error('Outer error');
      }

      return (
        <div>
          <div data-testid="outer-state">{state.value}</div>
          <button onClick={cubit.triggerError}>Throw Outer Error</button>
          <ErrorBoundary
            fallback={(error) => (
              <div data-testid="inner-error">{error.message}</div>
            )}
          >
            <InnerComponent />
          </ErrorBoundary>
        </div>
      );
    }

    function InnerComponent() {
      const [state, cubit] = useBloc(InnerCubit);

      if (state.shouldError) {
        throw new Error('Inner error');
      }

      return (
        <div>
          <div data-testid="inner-state">{state.value}</div>
          <button onClick={cubit.triggerError}>Throw Inner Error</button>
        </div>
      );
    }

    render(
      <ErrorBoundary
        fallback={(error) => (
          <div data-testid="outer-error">{error.message}</div>
        )}
      >
        <OuterComponent />
      </ErrorBoundary>,
    );

    // Verify initial state
    expect(screen.getByTestId('outer-state')).toHaveTextContent('outer');
    expect(screen.getByTestId('inner-state')).toHaveTextContent('inner');

    // Throw inner error - should be caught by inner boundary
    act(() => {
      screen.getByText('Throw Inner Error').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('inner-error')).toHaveTextContent('Inner error');
      // Outer component should still be rendered
      expect(screen.getByTestId('outer-state')).toHaveTextContent('outer');
    });
  });

  it('should handle component errors based on state', () => {
    class StateDependentCubit extends Cubit<{ value: number; shouldError: boolean }> {
      constructor() {
        super({ value: 0, shouldError: false });
      }

      updateValue = () => {
        this.emit({ value: this.state.value + 1, shouldError: false });
      };

      triggerErrorState = () => {
        // Set a state that will cause component to throw
        this.emit({ value: this.state.value, shouldError: true });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(StateDependentCubit);

      // Component logic that throws based on state
      if (state.shouldError && state.value > 0) {
        throw new Error('Component error: Invalid state combination');
      }

      return (
        <div>
          <div data-testid="value">{state.value}</div>
          <div data-testid="status">{state.shouldError ? 'Error' : 'OK'}</div>
          <button onClick={cubit.updateValue}>Update</button>
          <button onClick={cubit.triggerErrorState}>Break</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('value')).toHaveTextContent('0');
    expect(screen.getByTestId('status')).toHaveTextContent('OK');

    // This should work fine
    act(() => {
      screen.getByText('Update').click();
    });

    expect(screen.getByTestId('value')).toHaveTextContent('1');
    expect(screen.getByTestId('status')).toHaveTextContent('OK');

    // This should trigger error
    act(() => {
      screen.getByText('Break').click();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent(
      'Component error: Invalid state combination',
    );
  });

  it('should integrate with Suspense and Error Boundary', async () => {
    // Simulate lazy loading with potential error
    const LazyComponent = React.lazy(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      return {
        default: function LazyBlocComponent({ shouldError }: { shouldError?: boolean }) {
          class SuspenseCubit extends Cubit<number> {
            constructor() {
              super(0);
              if (shouldError) {
                throw new Error('Lazy component initialization error');
              }
            }

            increment = () => {
              this.emit(this.state + 1);
            };
          }

          const [state, cubit] = useBloc(SuspenseCubit);

          return (
            <div>
              <div data-testid="lazy-state">{state}</div>
              <button onClick={cubit.increment}>Lazy Increment</button>
            </div>
          );
        },
      };
    });

    function TestComponent({ shouldError }: { shouldError?: boolean }) {
      const [showLazy, setShowLazy] = React.useState(false);

      return (
        <div>
          <button onClick={() => setShowLazy(true)}>Load Lazy</button>
          {showLazy && (
            <Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <LazyComponent shouldError={shouldError} />
            </Suspense>
          )}
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent shouldError={false} />
      </ErrorBoundary>,
    );

    // Trigger lazy loading
    await userEvent.click(screen.getByText('Load Lazy'));

    // Should show loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');

    // Wait for lazy component to load
    await waitFor(
      () => {
        expect(screen.getByTestId('lazy-state')).toHaveTextContent('0');
      },
      { timeout: 500 },
    );

    // Verify component works
    await userEvent.click(screen.getByText('Lazy Increment'));
    await waitFor(() => {
      expect(screen.getByTestId('lazy-state')).toHaveTextContent('1');
    });
  });

  it('should handle async errors with error boundaries', async () => {
    class AsyncCubit extends Cubit<{ loading: boolean; data: string | null; error: boolean }> {
      constructor() {
        super({ loading: false, data: null, error: false });
      }

      loadDataWithError = async () => {
        this.emit({ loading: true, data: null, error: false });

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Set error state that will trigger error in component
        this.emit({ loading: false, data: null, error: true });
      };

      loadDataSuccess = async () => {
        this.emit({ loading: true, data: null, error: false });

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 50));

        this.emit({ loading: false, data: 'Success', error: false });
      };

      reset = () => {
        this.emit({ loading: false, data: null, error: false });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(AsyncCubit);

      // Throw error if error flag is set
      if (state.error) {
        throw new Error('Async operation failed');
      }

      return (
        <div>
          <div data-testid="loading">{state.loading ? 'Loading' : 'Idle'}</div>
          <div data-testid="data">{state.data || 'No data'}</div>
          <button onClick={() => cubit.loadDataWithError()}>Load with Error</button>
          <button onClick={() => cubit.loadDataSuccess()}>Load Success</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    // Verify initial state
    expect(screen.getByTestId('loading')).toHaveTextContent('Idle');
    expect(screen.getByTestId('data')).toHaveTextContent('No data');

    // First test successful load
    await userEvent.click(screen.getByText('Load Success'));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Idle');
        expect(screen.getByTestId('data')).toHaveTextContent('Success');
      },
      { timeout: 200 },
    );
  });

  it('should handle error recovery with state reset', async () => {
    class ResettableCubit extends Cubit<{ count: number; maxReached: boolean }> {
      constructor() {
        super({ count: 0, maxReached: false });
      }

      increment = () => {
        const newCount = this.state.count + 1;
        if (newCount >= 3) {
          this.emit({ count: newCount, maxReached: true });
        } else {
          this.emit({ count: newCount, maxReached: false });
        }
      };

      reset = () => {
        this.emit({ count: 0, maxReached: false });
      };
    }

    function TestComponent() {
      const [state, cubit] = useBloc(ResettableCubit);

      if (state.maxReached) {
        throw new Error('Maximum count reached');
      }

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <button onClick={cubit.increment}>Increment</button>
          <button onClick={cubit.reset}>Reset Count</button>
        </div>
      );
    }

    function AppWithResetBoundary() {
      const [errorKey, setErrorKey] = useState(0);

      return (
        <ErrorBoundary
          key={errorKey}
          fallback={(error) => (
            <div data-testid="error-boundary">
              <div data-testid="error-message">{error.message}</div>
              <button
                onClick={() => {
                  // Reset the cubit state
                  const cubit = Blac.getInstance().getBloc(ResettableCubit);
                  if (cubit) {
                    cubit.reset();
                  }
                  // Reset error boundary with new key
                  setErrorKey(k => k + 1);
                }}
              >
                Reset All
              </button>
            </div>
          )}
        >
          <TestComponent />
        </ErrorBoundary>
      );
    }

    render(<AppWithResetBoundary />);

    // Increment to near limit
    await userEvent.click(screen.getByText('Increment'));
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    await userEvent.click(screen.getByText('Increment'));
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });

    // Next increment should trigger error
    await userEvent.click(screen.getByText('Increment'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Maximum count reached',
      );
    });

    // Reset both error boundary and bloc state
    await userEvent.click(screen.getByText('Reset All'));

    // After reset, component should re-render with reset state
    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
  });

  it('should handle errors from bloc event handlers gracefully', async () => {
    class SafeEvent {}
    class ErrorEvent {}

    class EventBloc extends Bloc<{ value: number; error: boolean }, SafeEvent | ErrorEvent> {
      constructor() {
        super({ value: 0, error: false });

        this.on(SafeEvent, (event, emit) => {
          emit({ value: this.state.value + 1, error: false });
        });

        this.on(ErrorEvent, (event, emit) => {
          emit({ value: this.state.value, error: true });
        });
      }

      safeIncrement = () => {
        this.add(new SafeEvent());
      };

      triggerError = () => {
        this.add(new ErrorEvent());
      };
    }

    function TestComponent() {
      const [state, bloc] = useBloc(EventBloc);

      if (state.error) {
        throw new Error('Event handler error state');
      }

      return (
        <div>
          <div data-testid="value">{state.value}</div>
          <button onClick={bloc.safeIncrement}>Safe Increment</button>
          <button onClick={bloc.triggerError}>Trigger Error</button>
        </div>
      );
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    // First do safe increment
    await userEvent.click(screen.getByText('Safe Increment'));
    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('1');
    });

    // Trigger error state through event
    await userEvent.click(screen.getByText('Trigger Error'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Event handler error state',
      );
    });
  });
});
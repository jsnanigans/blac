import { render, screen } from '@testing-library/react';
import { Blac, Cubit } from 'blac-next';
import React, { FC } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBloc } from '../src';

// Mock console.error to prevent error messages during tests
const originalConsoleError = console.error;
const mockConsoleError = vi.fn();

beforeEach(() => {
  console.error = mockConsoleError;
  Blac.resetInstance();
});

afterEach(() => {
  console.error = originalConsoleError;
  vi.clearAllMocks();
});

// Define test cubits
class ErrorThrowingCubit extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
  
  throwInGetter() {
    throw new Error('Error in getter');
  }
  
  get errorGetter() {
    throw new Error('Error in getter');
  }
}

describe('useBloc error handling', () => {
  test('should handle errors in custom dependency selector', () => {
    const ErrorComponent: FC = () => {
      const [state, cubit] = useBloc(ErrorThrowingCubit, {
        dependencySelector: () => {
          throw new Error('Error in dependency selector');
          return [[]];
        },
      });
      
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button 
            data-testid="increment" 
            onClick={cubit.increment}
          >
            Increment
          </button>
        </div>
      );
    };
    
    // This should not throw but log the error
    expect(() => render(<ErrorComponent />)).not.toThrow();
    expect(mockConsoleError).toHaveBeenCalled();
  });
  
  test('should handle errors in component render that uses bloc state', () => {
    const ErrorComponent: FC = () => {
      const [state] = useBloc(ErrorThrowingCubit);
      
      if (state.count > 0) {
        throw new Error('Intentional render error');
      }
      
      return <div data-testid="component">Count: {state.count}</div>;
    };
    
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('component')).toBeInTheDocument();
    
    // This will eventually trigger the error boundary
    const bloc = Blac.getBloc(ErrorThrowingCubit);
    bloc.increment();
    
    // The error boundary should have caught the error
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });
  
  test('should handle errors when accessing getters that throw', () => {
    let renderCount = 0;
    
    const ErrorGetterComponent: FC = () => {
      renderCount++;
      const [, cubit] = useBloc(ErrorThrowingCubit);
      
      return (
        <div>
          <button 
            data-testid="access-error-getter" 
            onClick={() => {
              try {
                // Access the getter that throws
                const value = cubit.errorGetter;
                console.log(value);
              } catch {
                // Intentionally empty
              }
            }}
          >
            Access Error Getter
          </button>
        </div>
      );
    };
    
    render(<ErrorGetterComponent />);
    expect(renderCount).toBe(1);
    
    // Accessing the error getter should not cause a re-render
    const button = screen.getByTestId('access-error-getter');
    button.click();
    
    // Should have logged an error but not caused a re-render
    expect(mockConsoleError).toHaveBeenCalled();
    expect(renderCount).toBe(1);
  });
});

// Error boundary component for testing error handling
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong</div>;
    }

    return this.props.children;
  }
} 
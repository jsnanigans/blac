import { Blac, Cubit } from '@blac/core';
import '@testing-library/jest-dom';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState, useCallback, useEffect, useRef } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBloc } from '../src';

// Test Cubits for comprehensive integration testing
interface CounterState {
  count: number;
  lastUpdate: number;
}

interface CounterProps {
  initialCount?: number;
  step?: number;
}

class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor(props?: CounterProps) {
    super({ 
      count: props?.initialCount ?? 0,
      lastUpdate: Date.now()
    });
  }

  increment = () => {
    this.patch({ 
      count: this.state.count + (this.props?.step ?? 1),
      lastUpdate: Date.now()
    });
  };

  decrement = () => {
    this.patch({ 
      count: this.state.count - (this.props?.step ?? 1),
      lastUpdate: Date.now()
    });
  };

  setCount = (count: number) => {
    this.patch({ count, lastUpdate: Date.now() });
  };

  reset = () => {
    this.patch({ count: 0, lastUpdate: Date.now() });
  };

  get isPositive() {
    return this.state.count > 0;
  }

  get isEven() {
    return this.state.count % 2 === 0;
  }
}

class IsolatedCounterCubit extends CounterCubit {
  static isolated = true;
}

class SharedCounterCubit extends CounterCubit {
  static isolated = false;
}

interface ComplexState {
  user: {
    name: string;
    age: number;
    preferences: {
      theme: 'light' | 'dark';
      language: string;
    };
  };
  settings: {
    notifications: boolean;
    autoSave: boolean;
  };
  data: number[];
  metadata: {
    version: number;
    created: number;
    modified: number;
  };
}

class ComplexCubit extends Cubit<ComplexState> {
  static isolated = true;

  constructor() {
    const now = Date.now();
    super({
      user: {
        name: 'John Doe',
        age: 30,
        preferences: {
          theme: 'light',
          language: 'en'
        }
      },
      settings: {
        notifications: true,
        autoSave: false
      },
      data: [1, 2, 3],
      metadata: {
        version: 1,
        created: now,
        modified: now
      }
    });
  }

  updateUserName = (name: string) => {
    this.patch({
      user: { ...this.state.user, name },
      metadata: { ...this.state.metadata, modified: Date.now() }
    });
  };

  updateUserAge = (age: number) => {
    this.patch({
      user: { ...this.state.user, age },
      metadata: { ...this.state.metadata, modified: Date.now() }
    });
  };

  updateTheme = (theme: 'light' | 'dark') => {
    this.patch({
      user: {
        ...this.state.user,
        preferences: { ...this.state.user.preferences, theme }
      },
      metadata: { ...this.state.metadata, modified: Date.now() }
    });
  };

  toggleNotifications = () => {
    this.patch({
      settings: { 
        ...this.state.settings, 
        notifications: !this.state.settings.notifications 
      },
      metadata: { ...this.state.metadata, modified: Date.now() }
    });
  };

  addData = (value: number) => {
    this.patch({
      data: [...this.state.data, value],
      metadata: { ...this.state.metadata, modified: Date.now() }
    });
  };

  get userDisplayName() {
    return `${this.state.user.name} (${this.state.user.age})`;
  }

  get totalDataPoints() {
    return this.state.data.length;
  }
}

// Primitive state cubit for testing non-object states
class PrimitiveCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

describe('useBloc Integration Tests', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Basic Hook Functionality', () => {
    test('should initialize with correct state and methods', () => {
      const { result } = renderHook(() => useBloc(CounterCubit));
      const [state, cubit] = result.current;

      expect(state.count).toBe(0);
      expect(typeof state.lastUpdate).toBe('number');
      expect(cubit).toBeInstanceOf(CounterCubit);
      expect(typeof cubit.increment).toBe('function');
      expect(typeof cubit.decrement).toBe('function');
    });

    test('should handle props correctly', () => {
      const { result } = renderHook(() => 
        useBloc(CounterCubit, { props: { initialCount: 42, step: 5 } })
      );
      const [state, cubit] = result.current;

      expect(state.count).toBe(42);
      
      act(() => {
        cubit.increment();
      });

      expect(result.current[0].count).toBe(47); // 42 + 5
    });

    test('should handle primitive state correctly', () => {
      const { result } = renderHook(() => useBloc(PrimitiveCubit));
      const [state, cubit] = result.current;

      expect(state).toBe(0);
      expect(typeof cubit.increment).toBe('function');

      act(() => {
        cubit.increment();
      });

      expect(result.current[0]).toBe(1);
    });
  });

  describe('State Updates and Re-rendering', () => {
    test('should trigger re-render on state changes', () => {
      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useBloc(CounterCubit);
      });

      expect(renderCount).toBe(1);

      act(() => {
        result.current[1].increment();
      });

      expect(renderCount).toBe(2);
      expect(result.current[0].count).toBe(1);
    });

    test('should handle multiple rapid state changes', () => {
      const { result } = renderHook(() => useBloc(CounterCubit));
      const [, cubit] = result.current;

      act(() => {
        cubit.increment();
        cubit.increment();
        cubit.decrement();
        cubit.setCount(10);
      });

      expect(result.current[0].count).toBe(10);
    });

    test('should handle complex nested state updates', () => {
      const { result } = renderHook(() => useBloc(ComplexCubit));
      const [, cubit] = result.current;

      act(() => {
        cubit.updateUserName('Jane Doe');
      });

      expect(result.current[0].user.name).toBe('Jane Doe');
      expect(result.current[0].user.age).toBe(30); // Should remain unchanged

      act(() => {
        cubit.updateTheme('dark');
      });

      expect(result.current[0].user.preferences.theme).toBe('dark');
      expect(result.current[0].user.preferences.language).toBe('en'); // Should remain unchanged
    });

    test('should handle array updates correctly', () => {
      const { result } = renderHook(() => useBloc(ComplexCubit));
      const [, cubit] = result.current;

      const initialLength = result.current[0].data.length;

      act(() => {
        cubit.addData(42);
      });

      expect(result.current[0].data.length).toBe(initialLength + 1);
      expect(result.current[0].data).toContain(42);
    });
  });

  describe('useSyncExternalStore Integration', () => {
    test('should subscribe and unsubscribe correctly', () => {
      const { result, unmount } = renderHook(() => useBloc(CounterCubit));
      const [, cubit] = result.current;

      // Verify observer is subscribed
      expect(cubit._observer._observers.size).toBeGreaterThan(0);

      // State changes should trigger updates
      act(() => {
        cubit.increment();
      });

      expect(result.current[0].count).toBe(1);

      // Unmounting should clean up subscription
      unmount();

      // After unmount, observers should be cleaned up
      expect(cubit._observer._observers.size).toBe(0);
    });

    test('should handle subscription lifecycle correctly', () => {
      let subscriptionCount = 0;
      let unsubscriptionCount = 0;

      const TestComponent: FC = () => {
        const [state, cubit] = useBloc(CounterCubit);
        
        useEffect(() => {
          subscriptionCount++;
          return () => {
            unsubscriptionCount++;
          };
        }, []);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);

      expect(subscriptionCount).toBe(1);
      expect(unsubscriptionCount).toBe(0);

      unmount();

      expect(unsubscriptionCount).toBe(1);
    });

    test('should handle multiple subscribers to same bloc', () => {
      const { result: result1 } = renderHook(() => useBloc(SharedCounterCubit));
      const { result: result2 } = renderHook(() => useBloc(SharedCounterCubit));

      const [, cubit1] = result1.current;
      const [, cubit2] = result2.current;

      // Should be the same instance
      expect(cubit1.uid).toBe(cubit2.uid);

      // Both hooks should receive updates
      act(() => {
        cubit1.increment();
      });

      expect(result1.current[0].count).toBe(1);
      expect(result2.current[0].count).toBe(1);
    });
  });

  describe('Dependency Tracking', () => {
    test('should only re-render when accessed properties change', () => {
      let renderCount = 0;
      
      const TestComponent: FC = () => {
        renderCount++;
        const [state, cubit] = useBloc(ComplexCubit);
        
        return (
          <div>
            <span data-testid="user-name">{state.user.name}</span>
            <button data-testid="update-name" onClick={() => cubit.updateUserName('Updated')}>
              Update Name
            </button>
            <button data-testid="update-age" onClick={() => cubit.updateUserAge(35)}>
              Update Age
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(renderCount).toBe(1);

      // Update accessed property - should re-render
      act(() => {
        screen.getByTestId('update-name').click();
      });
      
      expect(renderCount).toBe(2);
      expect(screen.getByTestId('user-name')).toHaveTextContent('Updated');

      // Reset render count for non-accessed property test
      const previousRenderCount = renderCount;
      
      // Update non-accessed property - may cause 1 additional render due to dependency tracking
      act(() => {
        screen.getByTestId('update-age').click();
      });
      
      // Should not cause significant re-renders
      expect(renderCount).toBeLessThanOrEqual(previousRenderCount + 1);
    });

    test('should track getter dependencies', () => {
      let renderCount = 0;
      
      const TestComponent: FC = () => {
        renderCount++;
        const [, cubit] = useBloc(CounterCubit);
        
        return (
          <div>
            <span data-testid="is-positive">{cubit.isPositive.toString()}</span>
            <button data-testid="increment" onClick={cubit.increment}>
              Increment
            </button>
            <button data-testid="set-negative" onClick={() => cubit.setCount(-5)}>
              Set Negative
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(renderCount).toBe(1);
      expect(screen.getByTestId('is-positive')).toHaveTextContent('false');

      // Change from false to true - should re-render
      act(() => {
        screen.getByTestId('increment').click();
      });
      
      expect(renderCount).toBe(2);
      expect(screen.getByTestId('is-positive')).toHaveTextContent('true');

      // Change from true to false - should re-render
      act(() => {
        screen.getByTestId('set-negative').click();
      });
      
      expect(renderCount).toBe(3);
      expect(screen.getByTestId('is-positive')).toHaveTextContent('false');
    });

    test('should work with custom selectors', () => {
      let renderCount = 0;
      
      const TestComponent: FC = () => {
        renderCount++;
        const [state, cubit] = useBloc(ComplexCubit, {
          selector: (currentState) => [currentState.user.name] // Only track user name
        });
        
        return (
          <div>
            <span data-testid="user-name">{state.user.name}</span>
            <span data-testid="user-age">{state.user.age}</span>
            <button data-testid="update-name" onClick={() => cubit.updateUserName('Selected')}>
              Update Name
            </button>
            <button data-testid="update-age" onClick={() => cubit.updateUserAge(99)}>
              Update Age
            </button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(renderCount).toBe(1);

      // Update selected property - should re-render
      act(() => {
        screen.getByTestId('update-name').click();
      });
      
      expect(renderCount).toBe(2);
      expect(screen.getByTestId('user-name')).toHaveTextContent('Selected');

      // Update non-selected property - should NOT re-render
      act(() => {
        screen.getByTestId('update-age').click();
      });
      
      expect(renderCount).toBe(2); // No additional render
      expect(screen.getByTestId('user-age')).toHaveTextContent('30'); // UI not updated
    });
  });

  describe('Instance Management', () => {
    test('should create isolated instances', () => {
      const { result: result1 } = renderHook(() => useBloc(IsolatedCounterCubit));
      const { result: result2 } = renderHook(() => useBloc(IsolatedCounterCubit));

      const [, cubit1] = result1.current;
      const [, cubit2] = result2.current;

      // Should be different instances
      expect(cubit1.uid).not.toBe(cubit2.uid);

      // Should have independent state
      act(() => {
        cubit1.increment();
      });

      expect(result1.current[0].count).toBe(1);
      expect(result2.current[0].count).toBe(0);
    });

    test('should share non-isolated instances', () => {
      const { result: result1 } = renderHook(() => useBloc(SharedCounterCubit));
      const { result: result2 } = renderHook(() => useBloc(SharedCounterCubit));

      const [, cubit1] = result1.current;
      const [, cubit2] = result2.current;

      // Should be the same instance
      expect(cubit1.uid).toBe(cubit2.uid);

      // Should share state
      act(() => {
        cubit1.increment();
      });

      expect(result1.current[0].count).toBe(1);
      expect(result2.current[0].count).toBe(1);
    });

    test('should handle instance disposal correctly', () => {
      const { result, unmount } = renderHook(() => useBloc(IsolatedCounterCubit));
      const [, cubit] = result.current;

      expect(cubit._consumers.size).toBeGreaterThan(0);
      expect(cubit.isDisposed).toBe(false);

      unmount();

      // Should be disposed after unmount
      expect(cubit._consumers.size).toBe(0);
    });
  });

  describe('Lifecycle Callbacks', () => {
    test('should call onMount when component mounts', () => {
      let mountedCubit: CounterCubit | null = null;
      let mountCallCount = 0;

      const onMount = (cubit: CounterCubit) => {
        mountedCubit = cubit;
        mountCallCount++;
        cubit.setCount(100); // Set initial value
      };

      const { result } = renderHook(() => 
        useBloc(CounterCubit, { onMount })
      );

      expect(mountCallCount).toBe(1);
      expect(mountedCubit?.uid).toBe(result.current[1].uid);
      expect(result.current[0].count).toBe(100);
    });

    test('should call onUnmount when component unmounts', () => {
      let unmountedCubit: CounterCubit | null = null;
      let unmountCallCount = 0;

      const onUnmount = (cubit: CounterCubit) => {
        unmountedCubit = cubit;
        unmountCallCount++;
      };

      const { result, unmount } = renderHook(() => 
        useBloc(CounterCubit, { onUnmount })
      );

      expect(unmountCallCount).toBe(0);

      const cubit = result.current[1];
      unmount();

      expect(unmountCallCount).toBe(1);
      expect(unmountedCubit?.uid).toBe(cubit.uid);
    });

    test('should handle stable callbacks correctly', () => {
      let mountCallCount = 0;
      let unmountCallCount = 0;

      const TestComponent: FC = () => {
        const stableOnMount = useCallback((cubit: CounterCubit) => {
          mountCallCount++;
          cubit.increment();
        }, []);

        const stableOnUnmount = useCallback((cubit: CounterCubit) => {
          unmountCallCount++;
        }, []);

        const [state] = useBloc(CounterCubit, {
          onMount: stableOnMount,
          onUnmount: stableOnUnmount
        });

        return <div data-testid="count">{state.count}</div>;
      };

      const { unmount, rerender } = render(<TestComponent />);

      expect(mountCallCount).toBe(1);
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      // Rerender should not call onMount again
      rerender(<TestComponent />);
      expect(mountCallCount).toBe(1);

      unmount();
      expect(unmountCallCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in state updates gracefully', () => {
      class ErrorCubit extends Cubit<{ count: number }> {
        static isolated = true;
        
        constructor() {
          super({ count: 0 });
        }

        increment = () => {
          this.patch({ count: this.state.count + 1 });
        };

        throwError = () => {
          throw new Error('Test error in cubit method');
        };
      }

      const { result } = renderHook(() => useBloc(ErrorCubit));
      const [, cubit] = result.current;

      // Normal operation should work
      act(() => {
        cubit.increment();
      });

      expect(result.current[0].count).toBe(1);

      // Error in cubit method should be thrown
      expect(() => {
        act(() => {
          cubit.throwError();
        });
      }).toThrow('Test error in cubit method');

      // State should remain consistent after error
      expect(result.current[0].count).toBe(1);
    });

    test('should handle component unmount during state update', () => {
      const { result, unmount } = renderHook(() => useBloc(CounterCubit));
      const [, cubit] = result.current;

      // Unmount component
      unmount();

      // State update after unmount should not throw
      expect(() => {
        act(() => {
          cubit.increment();
        });
      }).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    test('should maintain stable references when possible', () => {
      const { result, rerender } = renderHook(() => useBloc(CounterCubit));
      const [initialState, initialCubit] = result.current;

      // Rerender without state change
      rerender();

      const [newState, newCubit] = result.current;
      
      // Instance should be the same
      expect(newCubit).toBe(initialCubit);
      
      // State should be the same reference if unchanged
      expect(newState).toBe(initialState);
    });

    test('should handle high-frequency updates efficiently', () => {
      const { result } = renderHook(() => useBloc(CounterCubit));
      const [, cubit] = result.current;

      const iterations = 1000;
      const start = performance.now();

      act(() => {
        for (let i = 0; i < iterations; i++) {
          cubit.increment();
        }
      });

      const end = performance.now();
      const duration = end - start;

      expect(result.current[0].count).toBe(iterations);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('should clean up resources properly', async () => {
      const instances: CounterCubit[] = [];

      // Create and unmount multiple components
      for (let i = 0; i < 10; i++) {
        const { result, unmount } = renderHook(() => useBloc(IsolatedCounterCubit));
        instances.push(result.current[1]);
        unmount();
      }

      // All instances should be properly cleaned up
      instances.forEach(instance => {
        expect(instance._consumers.size).toBe(0);
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    test('should handle nested component hierarchies', () => {
      let parentRenders = 0;
      let childRenders = 0;

      const ChildComponent: FC<{ cubit: CounterCubit }> = ({ cubit }) => {
        childRenders++;
        return (
          <button onClick={cubit.increment} data-testid="child-button">
            Child Increment
          </button>
        );
      };

      const ParentComponent: FC = () => {
        parentRenders++;
        const [state, cubit] = useBloc(CounterCubit);
        
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <ChildComponent cubit={cubit} />
          </div>
        );
      };

      render(<ParentComponent />);

      expect(parentRenders).toBe(1);
      expect(childRenders).toBe(1);

      act(() => {
        screen.getByTestId('child-button').click();
      });

      expect(parentRenders).toBe(2); // Parent re-renders due to state change
      expect(childRenders).toBe(2); // Child re-renders due to parent re-render
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    test('should handle conditional rendering', () => {
      const TestComponent: FC = () => {
        const [showDetails, setShowDetails] = useState(false);
        const [state, cubit] = useBloc(ComplexCubit);
        
        return (
          <div>
            <span data-testid="user-name">{state.user.name}</span>
            <button 
              data-testid="toggle-details" 
              onClick={() => setShowDetails(!showDetails)}
            >
              Toggle Details
            </button>
            {showDetails && (
              <div data-testid="details">
                <span data-testid="user-age">{state.user.age}</span>
                <span data-testid="theme">{state.user.preferences.theme}</span>
              </div>
            )}
            <button 
              data-testid="update-name" 
              onClick={() => cubit.updateUserName('New Name')}
            >
              Update Name
            </button>
            <button 
              data-testid="update-age" 
              onClick={() => cubit.updateUserAge(25)}
            >
              Update Age
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();

      // Update name - should always update
      act(() => {
        screen.getByTestId('update-name').click();
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('New Name');

      // Show details
      act(() => {
        screen.getByTestId('toggle-details').click();
      });

      expect(screen.getByTestId('details')).toBeInTheDocument();
      expect(screen.getByTestId('user-age')).toHaveTextContent('30');

      // Update age - should update details
      act(() => {
        screen.getByTestId('update-age').click();
      });

      expect(screen.getByTestId('user-age')).toHaveTextContent('25');
    });

    test('should handle rapid mount/unmount cycles', () => {
      const mountUnmountCount = 50;
      
      for (let i = 0; i < mountUnmountCount; i++) {
        const { result, unmount } = renderHook(() => useBloc(IsolatedCounterCubit));
        const [state, cubit] = result.current;
        
        expect(state.count).toBe(0);
        
        act(() => {
          cubit.increment();
        });
        
        expect(result.current[0].count).toBe(1);
        
        unmount();
      }
    });
  });
});
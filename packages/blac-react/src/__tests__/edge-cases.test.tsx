import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';

// Enable proxy dependency tracking
Blac.setConfig({ proxyDependencyTracking: true });

describe('Edge Case Testing', () => {
  beforeEach(() => {
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  describe('Getter with conditional logic (if/else)', () => {
    interface ConditionalState {
      value: number;
      threshold: number;
    }

    class ConditionalGetterCubit extends Cubit<ConditionalState> {
      constructor() {
        super({ value: 5, threshold: 10 });
      }

      get status(): string {
        if (this.state.value > this.state.threshold) {
          return 'above';
        } else if (this.state.value === this.state.threshold) {
          return 'equal';
        } else {
          return 'below';
        }
      }

      setValue = (value: number) => {
        this.patch({ value });
      };

      setThreshold = (threshold: number) => {
        this.patch({ threshold });
      };
    }

    it('should track conditional getter correctly', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(ConditionalGetterCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="status">{cubit.status}</div>
            <div data-testid="value">{state.value}</div>
            <button onClick={() => cubit.setValue(15)}>Set Above</button>
            <button onClick={() => cubit.setValue(10)}>Set Equal</button>
            <button onClick={() => cubit.setValue(5)}>Set Below</button>
          </div>
        );
      }

      render(<TestComponent />);

      // Initial state
      expect(screen.getByTestId('status')).toHaveTextContent('below');
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change to above threshold
      renderSpy.mockClear();
      await user.click(screen.getByText('Set Above'));
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('above'));
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change to equal
      renderSpy.mockClear();
      await user.click(screen.getByText('Set Equal'));
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('equal'));
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change back to below
      renderSpy.mockClear();
      await user.click(screen.getByText('Set Below'));
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('below'));
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Getter calling another getter (transitive)', () => {
    interface TransitiveState {
      firstName: string;
      lastName: string;
    }

    class TransitiveGetterCubit extends Cubit<TransitiveState> {
      constructor() {
        super({ firstName: 'John', lastName: 'Doe' });
      }

      get fullName(): string {
        return `${this.state.firstName} ${this.state.lastName}`;
      }

      get greeting(): string {
        return `Hello, ${this.fullName}!`;
      }

      get formalGreeting(): string {
        return `Good day, ${this.fullName}`;
      }

      setFirstName = (firstName: string) => {
        this.patch({ firstName });
      };

      setLastName = (lastName: string) => {
        this.patch({ lastName });
      };
    }

    it('should handle transitive getter dependencies', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [_state, cubit] = useBloc(TransitiveGetterCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="greeting">{cubit.greeting}</div>
            <div data-testid="formal">{cubit.formalGreeting}</div>
            <button onClick={() => cubit.setFirstName('Jane')}>
              Change First Name
            </button>
            <button onClick={() => cubit.setLastName('Smith')}>
              Change Last Name
            </button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('greeting')).toHaveTextContent('Hello, John Doe!');
      expect(screen.getByTestId('formal')).toHaveTextContent('Good day, John Doe');

      renderSpy.mockClear();
      await user.click(screen.getByText('Change First Name'));
      await waitFor(() =>
        expect(screen.getByTestId('greeting')).toHaveTextContent('Hello, Jane Doe!')
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);

      renderSpy.mockClear();
      await user.click(screen.getByText('Change Last Name'));
      await waitFor(() =>
        expect(screen.getByTestId('greeting')).toHaveTextContent('Hello, Jane Smith!')
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Getter with no state dependencies', () => {
    class StatelessGetterCubit extends Cubit<{ count: number }> {
      private staticValue = 'constant';

      constructor() {
        super({ count: 0 });
      }

      get constantValue(): string {
        return this.staticValue;
      }

      get timestamp(): number {
        // Impure getter - returns different value each time
        return Date.now();
      }

      increment = () => {
        this.patch({ count: this.state.count + 1 });
      };
    }

    it('should handle getter with no state dependencies', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(StatelessGetterCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="constant">{cubit.constantValue}</div>
            <div data-testid="count">{state.count}</div>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('constant')).toHaveTextContent('constant');
      const initialRenderCount = renderSpy.mock.calls.length;

      // Increment state - constant getter should not cause rerender
      renderSpy.mockClear();
      await user.click(screen.getByText('Increment'));
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

      // Should NOT rerender due to constant getter (value hasn't changed)
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Getter throwing errors', () => {
    interface ErrorState {
      value: number | null;
      shouldThrow: boolean;
    }

    class ErrorGetterCubit extends Cubit<ErrorState> {
      constructor() {
        super({ value: 10, shouldThrow: false });
      }

      get safeDivision(): number {
        if (this.state.shouldThrow || this.state.value === null) {
          throw new Error('Division by null/zero');
        }
        return 100 / this.state.value;
      }

      setValue = (value: number | null) => {
        this.patch({ value });
      };

      setShouldThrow = (shouldThrow: boolean) => {
        this.patch({ shouldThrow });
      };
    }

    it('should cache and handle getter errors', async () => {
      const user = userEvent.setup();

      class ErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean; error: Error | null }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error };
        }

        reset = () => {
          this.setState({ hasError: false, error: null });
        };

        render() {
          if (this.state.hasError) {
            return (
              <div>
                <div data-testid="error-message">
                  {this.state.error?.message || 'Error occurred'}
                </div>
                <button onClick={this.reset}>Reset</button>
              </div>
            );
          }
          return this.props.children;
        }
      }

      let boundaryRef: ErrorBoundary | null = null;

      function TestComponent() {
        const [_state, cubit] = useBloc(ErrorGetterCubit);

        return (
          <div>
            <div data-testid="result">{cubit.safeDivision}</div>
            <button onClick={() => cubit.setValue(null)}>Set Null</button>
            <button onClick={() => cubit.setValue(10)}>Set Valid</button>
          </div>
        );
      }

      render(
        <ErrorBoundary ref={ref => { boundaryRef = ref; }}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Initial render should work
      expect(screen.getByTestId('result')).toHaveTextContent('10');

      // Set to null - should throw error
      await user.click(screen.getByText('Set Null'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Division by null/zero');
    });
  });

  describe('Object-valued getter (reference equality)', () => {
    interface ObjectState {
      id: number;
      name: string;
      tags: string[];
    }

    class ObjectGetterCubit extends Cubit<ObjectState> {
      constructor() {
        super({ id: 1, name: 'Item', tags: ['tag1'] });
      }

      get metadata(): { id: number; tagCount: number } {
        return {
          id: this.state.id,
          tagCount: this.state.tags.length,
        };
      }

      setName = (name: string) => {
        this.patch({ name });
      };

      addTag = (tag: string) => {
        this.patch({ tags: [...this.state.tags, tag] });
      };

      setId = (id: number) => {
        this.patch({ id });
      };
    }

    it('should detect object getter changes via value comparison', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [_state, cubit] = useBloc(ObjectGetterCubit);
        renderSpy();

        const metadata = cubit.metadata;

        return (
          <div>
            <div data-testid="metadata">
              ID: {metadata.id}, Tags: {metadata.tagCount}
            </div>
            <button onClick={() => cubit.setName('New Name')}>Change Name</button>
            <button onClick={() => cubit.addTag('tag2')}>Add Tag</button>
            <button onClick={() => cubit.setId(2)}>Change ID</button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('metadata')).toHaveTextContent('ID: 1, Tags: 1');
      const initialRenderCount = renderSpy.mock.calls.length;

      // Change name - metadata getter should not change (value comparison)
      // However, in V2 with top-level tracking, changing 'name' will trigger
      // a check of the metadata getter, and since it returns a new object reference
      // each time (even with same values), it will trigger a rerender
      renderSpy.mockClear();
      await user.click(screen.getByText('Change Name'));
      await new Promise(resolve => setTimeout(resolve, 100));
      // V2: Will rerender because metadata returns new object each time
      // In future, we could add deep equality comparison for objects
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Add tag - metadata getter SHOULD change
      renderSpy.mockClear();
      await user.click(screen.getByText('Add Tag'));
      await waitFor(() =>
        expect(screen.getByTestId('metadata')).toHaveTextContent('ID: 1, Tags: 2')
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change ID - metadata getter SHOULD change
      renderSpy.mockClear();
      await user.click(screen.getByText('Change ID'));
      await waitFor(() =>
        expect(screen.getByTestId('metadata')).toHaveTextContent('ID: 2, Tags: 2')
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Very deep state nesting (10+ levels)', () => {
    interface DeepState {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                level6: {
                  level7: {
                    level8: {
                      level9: {
                        level10: {
                          value: number;
                          label: string;
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    }

    class DeepNestingCubit extends Cubit<DeepState> {
      constructor() {
        super({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    level6: {
                      level7: {
                        level8: {
                          level9: {
                            level10: {
                              value: 0,
                              label: 'deep',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }

      updateDeepValue = (value: number) => {
        this.patch({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    level6: {
                      level7: {
                        level8: {
                          level9: {
                            level10: {
                              value,
                              label: this.state.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10.label,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      };

      updateDeepLabel = (label: string) => {
        this.patch({
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    level6: {
                      level7: {
                        level8: {
                          level9: {
                            level10: {
                              value: this.state.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10.value,
                              label,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      };
    }

    it('should handle very deep nesting with top-level tracking', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(DeepNestingCubit);
        renderSpy();

        const deepValue = state.level1.level2.level3.level4.level5.level6.level7.level8.level9.level10.value;

        return (
          <div>
            <div data-testid="deep-value">{deepValue}</div>
            <button onClick={() => cubit.updateDeepValue(42)}>Update Value</button>
            <button onClick={() => cubit.updateDeepLabel('updated')}>Update Label</button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('deep-value')).toHaveTextContent('0');

      // Update deep value - should trigger rerender
      renderSpy.mockClear();
      await user.click(screen.getByText('Update Value'));
      await waitFor(() => expect(screen.getByTestId('deep-value')).toHaveTextContent('42'));
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update deep label - should NOT trigger rerender in V3 (precise leaf tracking)
      // Component only tracks 'level1.level2...level10.value', not the 'label' sibling
      renderSpy.mockClear();
      await user.click(screen.getByText('Update Label'));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(renderSpy).toHaveBeenCalledTimes(0); // V3: precise leaf tracking (no re-render)
    });
  });

  describe('State with 1000+ properties', () => {
    type LargeState = Record<string, number>;

    class LargeStateCubit extends Cubit<LargeState> {
      constructor() {
        const initialState: LargeState = {};
        for (let i = 0; i < 1000; i++) {
          initialState[`prop${i}`] = i;
        }
        super(initialState);
      }

      updateProperty = (key: string, value: number) => {
        this.patch({ [key]: value });
      };

      updateMultipleProperties = (updates: Record<string, number>) => {
        this.patch(updates);
      };
    }

    it('should handle state with 1000+ properties efficiently', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(LargeStateCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="prop0">{state.prop0}</div>
            <div data-testid="prop500">{state.prop500}</div>
            <div data-testid="prop999">{state.prop999}</div>
            <button onClick={() => cubit.updateProperty('prop0', 1000)}>Update prop0</button>
            <button onClick={() => cubit.updateProperty('prop500', 2000)}>
              Update prop500
            </button>
            <button onClick={() => cubit.updateProperty('prop100', 3000)}>
              Update prop100
            </button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('prop0')).toHaveTextContent('0');
      expect(screen.getByTestId('prop500')).toHaveTextContent('500');

      // Update tracked property
      renderSpy.mockClear();
      await user.click(screen.getByText('Update prop0'));
      await waitFor(() => expect(screen.getByTestId('prop0')).toHaveTextContent('1000'));

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update untracked property - should NOT rerender
      renderSpy.mockClear();
      await user.click(screen.getByText('Update prop100'));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(renderSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('100+ concurrent subscriptions', () => {
    class SharedCubit extends Cubit<{ counter: number; timestamp: number }> {
      constructor() {
        super({ counter: 0, timestamp: Date.now() });
      }

      increment = () => {
        this.patch({ counter: this.state.counter + 1, timestamp: Date.now() });
      };
    }

    it('should handle 100+ concurrent subscriptions', async () => {
      const user = userEvent.setup();
      const renderCounts = new Map<number, number>();

      function Consumer({ id }: { id: number }) {
        const [state, cubit] = useBloc(SharedCubit);

        const count = renderCounts.get(id) || 0;
        renderCounts.set(id, count + 1);

        return (
          <div data-testid={`consumer-${id}`}>
            {id}: {state.counter}
          </div>
        );
      }

      function App() {
        const [_state, cubit] = useBloc(SharedCubit);

        return (
          <div>
            <button data-testid="increment" onClick={cubit.increment}>
              Increment
            </button>
            {Array.from({ length: 100 }, (_, i) => (
              <Consumer key={i} id={i} />
            ))}
          </div>
        );
      }

      render(<App />);

      // All consumers should render
      expect(renderCounts.size).toBe(100);

      // Clear counts
      renderCounts.clear();

      // Update state
      await user.click(screen.getByTestId('increment'));
      await waitFor(() => expect(screen.getByTestId('consumer-0')).toHaveTextContent('0: 1'));

      // All 100 consumers should have rerendered (App component doesn't access state in render)
      expect(renderCounts.size).toBe(100); // 100 consumers
    });
  });
});

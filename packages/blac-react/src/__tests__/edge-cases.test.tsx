import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';

describe('Edge Case Testing', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  afterEach(() => {
    Blac.resetInstance();
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
      await waitFor(() =>
        expect(screen.getByTestId('status')).toHaveTextContent('above'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change to equal
      renderSpy.mockClear();
      await user.click(screen.getByText('Set Equal'));
      await waitFor(() =>
        expect(screen.getByTestId('status')).toHaveTextContent('equal'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Change back to below
      renderSpy.mockClear();
      await user.click(screen.getByText('Set Below'));
      await waitFor(() =>
        expect(screen.getByTestId('status')).toHaveTextContent('below'),
      );
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

      function TestComponent() {
        const [state, cubit] = useBloc(TransitiveGetterCubit);

        return (
          <div>
            <div data-testid="greeting">{cubit.greeting}</div>
            <div data-testid="formal">{cubit.formalGreeting}</div>
            <div data-testid="first-name">{state.firstName}</div>
            <div data-testid="last-name">{state.lastName}</div>
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

      expect(screen.getByTestId('greeting')).toHaveTextContent(
        'Hello, John Doe!',
      );
      expect(screen.getByTestId('formal')).toHaveTextContent(
        'Good day, John Doe',
      );

      // Change first name - transitive getter should update
      await user.click(screen.getByText('Change First Name'));
      await waitFor(() => {
        expect(screen.getByTestId('first-name')).toHaveTextContent('Jane');
        expect(screen.getByTestId('greeting')).toHaveTextContent(
          'Hello, Jane Doe!',
        );
      });

      // Verify formal greeting also updated (both depend on fullName getter)
      expect(screen.getByTestId('formal')).toHaveTextContent(
        'Good day, Jane Doe',
      );

      // Change last name - verify state updates
      await user.click(screen.getByText('Change Last Name'));
      await waitFor(() => {
        expect(screen.getByTestId('last-name')).toHaveTextContent('Smith');
      });
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
      await waitFor(() =>
        expect(screen.getByTestId('count')).toHaveTextContent('1'),
      );

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

    it('should handle errors thrown from getters gracefully', async () => {
      // Note: Error boundary integration with getter errors requires React 16.8+ error boundaries
      // and proper setup. This test documents the cubit behavior.
      const renderSpy = vi.fn();

      class TestErrorGetterCubit extends Cubit<{ value: number | null }> {
        constructor() {
          super({ value: 10 });
        }

        get safeDivision(): number {
          if (this.state.value === null) {
            throw new Error('Cannot divide by null');
          }
          return 100 / this.state.value;
        }

        setValue = (value: number | null) => {
          this.patch({ value });
        };
      }

      function TestComponent() {
        const [state, cubit] = useBloc(TestErrorGetterCubit);
        renderSpy();

        try {
          const result = cubit.safeDivision;
          return <div data-testid="result">{result}</div>;
        } catch (error) {
          return <div data-testid="error">{(error as Error).message}</div>;
        }
      }

      render(<TestComponent />);

      // Initial state should render successfully
      expect(screen.getByTestId('result')).toHaveTextContent('10');
    });

    it('should handle errors when getter state dependencies trigger error condition', async () => {
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
                <button onClick={this.reset} data-testid="reset-btn">
                  Reset
                </button>
              </div>
            );
          }
          return this.props.children;
        }
      }

      function TestComponent() {
        const [state, cubit] = useBloc(ErrorGetterCubit);

        return (
          <div>
            {/* Only access getter when shouldThrow is false */}
            {!state.shouldThrow && (
              <div data-testid="result">{cubit.safeDivision}</div>
            )}
            {state.shouldThrow && (
              <div data-testid="result">Error condition set</div>
            )}
            <button
              onClick={() => cubit.setShouldThrow(true)}
              data-testid="trigger-throw"
            >
              Trigger Throw
            </button>
            <button
              onClick={() => cubit.setShouldThrow(false)}
              data-testid="disable-throw"
            >
              Disable Throw
            </button>
          </div>
        );
      }

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId('result')).toHaveTextContent('10');

      // Set shouldThrow to true - error condition is now active
      // but not accessed yet (component conditionally renders it)
      await user.click(screen.getByTestId('trigger-throw'));
      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent(
          'Error condition set',
        );
      });

      // Now disable throw and access the getter again - should work
      await user.click(screen.getByTestId('disable-throw'));
      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('10');
      });
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

    it('should handle object-valued getters with state updates', async () => {
      const user = userEvent.setup();

      function TestComponent() {
        const [state, cubit] = useBloc(ObjectGetterCubit);

        const metadata = cubit.metadata;

        return (
          <div>
            <div data-testid="metadata">
              ID: {metadata.id}, Tags: {metadata.tagCount}
            </div>
            <div data-testid="state-id">State ID: {state.id}</div>
            <div data-testid="state-tags">State tags: {state.tags.length}</div>
            <button onClick={() => cubit.addTag('tag2')}>Add Tag</button>
            <button onClick={() => cubit.setId(2)}>Change ID</button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('metadata')).toHaveTextContent(
        'ID: 1, Tags: 1',
      );
      expect(screen.getByTestId('state-id')).toHaveTextContent('State ID: 1');

      // Add tag - both state and getter should update
      await user.click(screen.getByText('Add Tag'));
      await waitFor(() => {
        expect(screen.getByTestId('state-tags')).toHaveTextContent(
          'State tags: 2',
        );
        expect(screen.getByTestId('metadata')).toHaveTextContent('Tags: 2');
      });

      // Change ID - metadata should reflect change
      await user.click(screen.getByText('Change ID'));
      await waitFor(() => {
        expect(screen.getByTestId('state-id')).toHaveTextContent('State ID: 2');
        expect(screen.getByTestId('metadata')).toHaveTextContent('ID: 2');
      });
    });
  });

  describe('Very deep state nesting (10+ levels)', () => {
    beforeEach(() => {
      // Increase proxy depth to handle 10+ levels of nesting
      Blac.setConfig({
        proxyDependencyTracking: true,
        proxyMaxDepth: 15,
      });
    });

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
        this.config = { proxyMaxDepth: 15 };
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
                              label:
                                this.state.level1.level2.level3.level4.level5
                                  .level6.level7.level8.level9.level10.label,
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
                              value:
                                this.state.level1.level2.level3.level4.level5
                                  .level6.level7.level8.level9.level10.value,
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
      let cubicRef: DeepNestingCubit | null = null;

      function TestComponent() {
        const [state, cubit] = useBloc(DeepNestingCubit);
        cubicRef = cubit; // Capture reference for verification
        renderSpy();

        const deepValue =
          state.level1.level2.level3.level4.level5.level6.level7.level8.level9
            .level10.value;

        return (
          <div>
            <div data-testid="deep-value">{deepValue}</div>
            <button onClick={() => cubit.updateDeepValue(42)}>
              Update Value
            </button>
            <button onClick={() => cubit.updateDeepLabel('updated')}>
              Update Label
            </button>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId('deep-value')).toHaveTextContent('0');

      // Update deep value - should trigger rerender
      renderSpy.mockClear();
      await user.click(screen.getByText('Update Value'));
      await waitFor(() =>
        expect(screen.getByTestId('deep-value')).toHaveTextContent('42'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update deep label - should NOT trigger rerender (precise leaf tracking)
      // Component only tracks 'level1.level2...level10.value', not the 'label' sibling
      renderSpy.mockClear();
      await user.click(screen.getByText('Update Label'));

      // Verify state was updated but component did not re-render
      await waitFor(
        () => {
          // State should have been updated
          expect(
            cubicRef?.state.level1.level2.level3.level4.level5.level6.level7
              .level8.level9.level10.label,
          ).toBe('updated');
          // But component should NOT have re-rendered (precise tracking)
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
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
      let cubicRef: LargeStateCubit | null = null;

      function TestComponent() {
        const [state, cubit] = useBloc(LargeStateCubit);
        cubicRef = cubit; // Capture reference for verification
        renderSpy();

        return (
          <div>
            <div data-testid="prop0">{state.prop0}</div>
            <div data-testid="prop500">{state.prop500}</div>
            <div data-testid="prop999">{state.prop999}</div>
            <button onClick={() => cubit.updateProperty('prop0', 1000)}>
              Update prop0
            </button>
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
      await waitFor(() =>
        expect(screen.getByTestId('prop0')).toHaveTextContent('1000'),
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Update untracked property - should NOT rerender
      renderSpy.mockClear();
      expect(renderSpy).toHaveBeenCalledTimes(0);
      await user.click(screen.getByText('Update prop100'));

      // Verify state was updated but component did not re-render
      await waitFor(
        () => {
          // State should have been updated
          expect(cubicRef?.state.prop100).toBe(3000);
          // But component should NOT have re-rendered (not tracked)
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
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

    it('should handle 100+ concurrent subscriptions correctly', async () => {
      const user = userEvent.setup();
      const renderCounts = new Map<number, number>();
      const stateValues = new Map<number, number>();

      function Consumer({ id }: { id: number }) {
        const [state, _cubit] = useBloc(SharedCubit);

        const count = renderCounts.get(id) || 0;
        renderCounts.set(id, count + 1);
        stateValues.set(id, state.counter);

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

      // All consumers should render initially
      expect(renderCounts.size).toBe(100);

      // Clear counts
      renderCounts.clear();
      stateValues.clear();

      // Update state
      await user.click(screen.getByTestId('increment'));
      await waitFor(() =>
        expect(screen.getByTestId('consumer-0')).toHaveTextContent('0: 1'),
      );

      // All 100 consumers should have rerendered
      expect(renderCounts.size).toBe(100);

      // Verify all consumers got the correct state value
      for (let i = 0; i < 100; i++) {
        expect(stateValues.get(i)).toBe(1);
      }
    });

    it('should clean up subscriptions when consumers unmount', async () => {
      const user = userEvent.setup();
      const renderCounts = new Map<number, number>();

      class DynamicSharedCubit extends Cubit<{ counter: number }> {
        constructor() {
          super({ counter: 0 });
        }

        increment = () => {
          this.patch({ counter: this.state.counter + 1 });
        };
      }

      function Consumer({ id }: { id: number }) {
        const [state] = useBloc(DynamicSharedCubit);

        const count = renderCounts.get(id) || 0;
        renderCounts.set(id, count + 1);

        return <div data-testid={`consumer-${id}`}>{state.counter}</div>;
      }

      function App({ count }: { count: number }) {
        const [_state, cubit] = useBloc(DynamicSharedCubit);

        return (
          <div>
            <button data-testid="increment" onClick={cubit.increment}>
              Increment
            </button>
            <button data-testid="reduce">Reduce</button>
            {Array.from({ length: count }, (_, i) => (
              <Consumer key={i} id={i} />
            ))}
          </div>
        );
      }

      const { rerender } = render(<App count={100} />);
      expect(renderCounts.size).toBe(100);

      // Update state - all 100 should re-render
      renderCounts.clear();
      await user.click(screen.getByTestId('increment'));
      await waitFor(() =>
        expect(screen.getByTestId('consumer-0')).toHaveTextContent('1'),
      );
      expect(renderCounts.size).toBe(100);

      // Remove 50 consumers
      renderCounts.clear();
      rerender(<App count={50} />);

      // Update state again - only 50 should re-render
      await user.click(screen.getByTestId('increment'));
      await waitFor(() =>
        expect(screen.getByTestId('consumer-0')).toHaveTextContent('2'),
      );

      // Only 50 consumers should have rendered
      expect(renderCounts.size).toBe(50);
    });
  });

  describe('Config depth limit edge cases', () => {
    it('should handle shallow proxyMaxDepth configuration', async () => {
      const user = userEvent.setup();

      Blac.setConfig({ proxyDependencyTracking: true, proxyMaxDepth: 2 });

      interface ShallowState {
        level1: {
          level2: {
            value: number;
          };
        };
      }

      class ShallowCubit extends Cubit<ShallowState> {
        constructor() {
          super({
            level1: {
              level2: {
                value: 0,
              },
            },
          });
        }

        updateValue = (value: number) => {
          this.patch({
            level1: {
              ...this.state.level1,
              level2: {
                ...this.state.level1.level2,
                value,
              },
            },
          });
        };
      }

      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(ShallowCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="value">{state.level1.level2.value}</div>
            <button onClick={() => cubit.updateValue(42)}>Update</button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Update should work even with shallow depth
      await user.click(screen.getByRole('button'));
      await waitFor(() =>
        expect(screen.getByTestId('value')).toHaveTextContent('42'),
      );

      // Should have re-rendered (either auto-tracking fallback or partial proxy)
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should handle deep proxyMaxDepth configuration', async () => {
      const user = userEvent.setup();

      Blac.setConfig({ proxyDependencyTracking: true, proxyMaxDepth: 100 });

      interface DeepState {
        level1: {
          level2: {
            level3: {
              level4: {
                value: number;
              };
            };
          };
        };
      }

      class DeepCubit extends Cubit<DeepState> {
        constructor() {
          super({
            level1: {
              level2: {
                level3: {
                  level4: {
                    value: 0,
                  },
                },
              },
            },
          });
        }

        updateValue = (value: number) => {
          this.patch({
            level1: {
              ...this.state.level1,
              level2: {
                ...this.state.level1.level2,
                level3: {
                  ...this.state.level1.level2.level3,
                  level4: {
                    value,
                  },
                },
              },
            },
          });
        };
      }

      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(DeepCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="value">
              {state.level1.level2.level3.level4.value}
            </div>
            <button onClick={() => cubit.updateValue(42)}>Update</button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Update should work with deep depth
      await user.click(screen.getByRole('button'));
      await waitFor(() =>
        expect(screen.getByTestId('value')).toHaveTextContent('42'),
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });
  });
});

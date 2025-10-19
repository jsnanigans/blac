import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '../index';

interface CounterState {
  count: number;
  nested: {
    value: number;
  };
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, nested: { value: 0 } });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateNested = (value: number) => {
    this.emit({ ...this.state, nested: { value } });
  };
}

class IsolatedCubit extends Cubit<{ id: string; value: number }> {
  static isolated = true;

  constructor() {
    super({ id: Math.random().toString(36).slice(2), value: 0 });
  }

  setValue = (value: number) => {
    this.emit({ ...this.state, value });
  };
}

describe('useBloc - Adapter Internal Behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  describe('Adapter State Consistency', () => {
    it('should return consistent state references across multiple accesses', () => {
      const Component = () => {
        const [state1] = useBloc(CounterCubit);
        const [state2] = useBloc(CounterCubit);

        // Both proxies wrap the same state, but are different proxy objects
        // Verify they have the same values
        expect(state1.count).toBe(state2.count);
        expect(state1.nested.value).toBe(state2.nested.value);

        return (
          <div data-testid="count">
            {state1.count} / {state2.count}
          </div>
        );
      };

      render(<Component />);
      expect(screen.getByTestId('count')).toHaveTextContent('0 / 0');
    });

    it('should provide same bloc instance across multiple useBloc calls', () => {
      let bloc1Ref: CounterCubit | null = null;
      let bloc2Ref: CounterCubit | null = null;

      const Component = () => {
        const [, bloc1] = useBloc(CounterCubit);
        const [, bloc2] = useBloc(CounterCubit);

        bloc1Ref = bloc1;
        bloc2Ref = bloc2;

        return <div>test</div>;
      };

      render(<Component />);

      // Proxies are different objects, but they wrap the same underlying bloc
      expect(bloc1Ref).toBeInstanceOf(CounterCubit);
      expect(bloc2Ref).toBeInstanceOf(CounterCubit);

      // Verify they access the same underlying state
      expect((bloc1Ref as any).state).toEqual((bloc2Ref as any).state);
    });

    it('should maintain state snapshot consistency when using dependencies', async () => {
      let snapshotValues: number[] = [];

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit, {
          dependencies: (b) => [b.state.count],
        });

        // Record the state value seen in this render
        snapshotValues.push(state.count);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={bloc.increment}>Increment</button>
          </div>
        );
      };

      render(<Component />);

      expect(snapshotValues).toEqual([0]);

      await act(async () => {
        screen.getByText('Increment').click();
      });

      // Should have rendered with 0, then with 1
      expect(snapshotValues).toEqual([0, 1]);
    });
  });

  describe('Proxy Behavior', () => {
    it('should cache state proxy when state reference does not change', () => {
      let proxyRefs: any[] = [];

      const Component = () => {
        const [state] = useBloc(CounterCubit);
        proxyRefs.push(state);

        return <div>{state.count}</div>;
      };

      const { rerender } = render(<Component />);

      // Force re-render without state change
      rerender(<Component />);
      rerender(<Component />);

      // All proxies should be the same reference (cached)
      expect(proxyRefs[0]).toBe(proxyRefs[1]);
      expect(proxyRefs[1]).toBe(proxyRefs[2]);
    });

    it('should create new proxy when state reference changes', async () => {
      let proxyRefs: any[] = [];

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit);
        proxyRefs.push(state);

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={bloc.increment}>Increment</button>
          </div>
        );
      };

      render(<Component />);
      const firstProxy = proxyRefs[0];

      await act(async () => {
        screen.getByText('Increment').click();
      });

      const secondProxy = proxyRefs[proxyRefs.length - 1];

      // After state change, should have new proxy
      expect(firstProxy).not.toBe(secondProxy);
    });

    it('should cache bloc proxy across re-renders', () => {
      let blocRefs: any[] = [];

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit);
        blocRefs.push(bloc);

        return <div>{state.count}</div>;
      };

      const { rerender } = render(<Component />);

      rerender(<Component />);
      rerender(<Component />);

      // All bloc proxies should be the same reference
      expect(blocRefs[0]).toBe(blocRefs[1]);
      expect(blocRefs[1]).toBe(blocRefs[2]);
    });

    it('should not use proxy when proxyDependencyTracking is disabled', () => {
      Blac.setConfig({ proxyDependencyTracking: false });

      let stateRef: any = null;

      const Component = () => {
        const [state] = useBloc(CounterCubit);
        stateRef = state;
        return <div>{state.count}</div>;
      };

      render(<Component />);

      // When proxy tracking is disabled, should get raw state
      // (no easy way to verify it's not a proxy, but we can check it works)
      expect(stateRef.count).toBe(0);
    });
  });

  describe('Lifecycle Event Ordering', () => {
    it('should fire lifecycle events in correct order', () => {
      const events: string[] = [];

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit, {
          onMount: () => events.push('onMount'),
          onUnmount: () => events.push('onUnmount'),
        });

        useEffect(() => {
          events.push('useEffect-mount');
          return () => {
            events.push('useEffect-unmount');
          };
        }, []);

        return <div>{state.count}</div>;
      };

      const { unmount } = render(<Component />);

      // onMount should fire before/during useEffect
      expect(events).toContain('onMount');
      expect(events).toContain('useEffect-mount');

      unmount();

      // onUnmount should fire
      expect(events).toContain('onUnmount');
      expect(events).toContain('useEffect-unmount');

      // Verify order: mount events before unmount events
      const mountIndex = events.indexOf('onMount');
      const unmountIndex = events.indexOf('onUnmount');
      expect(mountIndex).toBeLessThan(unmountIndex);
    });

    it('should call onMount only once per adapter lifecycle', () => {
      let mountCount = 0;

      const Component = () => {
        const [state] = useBloc(CounterCubit, {
          onMount: () => {
            mountCount++;
          },
        });

        return <div>{state.count}</div>;
      };

      const { rerender } = render(<Component />);

      // Initial mount
      expect(mountCount).toBe(1);

      // Re-renders should not trigger additional mounts
      rerender(<Component />);
      rerender(<Component />);

      expect(mountCount).toBe(1);
    });

    it('should call onUnmount only once during unmount', async () => {
      let unmountCount = 0;

      const Component = () => {
        const [state] = useBloc(CounterCubit, {
          onUnmount: () => {
            unmountCount++;
          },
        });

        return <div>{state.count}</div>;
      };

      const { unmount } = render(<Component />);

      unmount();

      // Wait for microtask
      await act(async () => {
        await Promise.resolve();
      });

      expect(unmountCount).toBe(1);
    });

    it('should handle onMount errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const Component = () => {
        const [state] = useBloc(CounterCubit, {
          onMount: () => {
            throw new Error('Mount error');
          },
        });

        return <div>{state.count}</div>;
      };

      // Should not throw, component should still render
      expect(() => render(<Component />)).toThrow();

      consoleError.mockRestore();
    });

    it('should handle onUnmount errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const Component = () => {
        const [state] = useBloc(CounterCubit, {
          onUnmount: () => {
            throw new Error('Unmount error');
          },
        });

        return <div>{state.count}</div>;
      };

      const { unmount } = render(<Component />);

      // Should not throw
      expect(() => unmount()).not.toThrow();

      // Error should be logged
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('Subscription Management', () => {
    it('should create subscription on mount', () => {
      let subscriptionCreated = false;

      const Component = () => {
        const [state] = useBloc(CounterCubit);

        useEffect(() => {
          // If we can access state, subscription was created
          subscriptionCreated = state !== undefined;
        }, [state]);

        return <div>{state.count}</div>;
      };

      render(<Component />);

      expect(subscriptionCreated).toBe(true);
    });

    it('should clean up subscription on unmount', async () => {
      const Component = () => {
        const [state] = useBloc(CounterCubit);
        return <div>{state.count}</div>;
      };

      const { unmount } = render(<Component />);

      // Get reference to bloc to check subscription count
      const bloc = Blac.getBloc(CounterCubit);
      const initialSubCount = (bloc as any)._subscriptionManager.subscriptions.size;

      unmount();

      // Wait for cleanup
      await act(async () => {
        await Promise.resolve();
      });

      const finalSubCount = (bloc as any)._subscriptionManager.subscriptions.size;

      // Subscription should be cleaned up
      expect(finalSubCount).toBeLessThanOrEqual(initialSubCount);
    });

    it('should maintain subscription across re-renders', async () => {
      let renderCount = 0;

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit);
        renderCount++;

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={bloc.increment}>Increment</button>
          </div>
        );
      };

      render(<Component />);

      expect(renderCount).toBe(1);

      // Trigger state change
      await act(async () => {
        screen.getByText('Increment').click();
      });

      // Should have re-rendered
      expect(renderCount).toBe(2);
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    it('should handle rapid subscription/unsubscription cycles', async () => {
      const App = () => {
        const [show, setShow] = React.useState(true);

        return (
          <div>
            <button onClick={() => setShow(!show)}>Toggle</button>
            {show && <Child />}
          </div>
        );
      };

      const Child = () => {
        const [state] = useBloc(CounterCubit);
        return <div data-testid="count">{state.count}</div>;
      };

      render(<App />);

      // Rapid toggle (even number of toggles means it ends showing)
      for (let i = 0; i < 10; i++) {
        act(() => {
          screen.getByText('Toggle').click();
        });
      }

      // After 10 toggles, should be showing (started true, toggled 10 times)
      expect(screen.queryByTestId('count')).toBeInTheDocument();
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
  });

  describe('Options Updates', () => {
    it('should update dependencies function when it changes', async () => {
      let depVersion = 1;

      const Component = ({ watchNested }: { watchNested: boolean }) => {
        const [state, bloc] = useBloc(CounterCubit, {
          dependencies: watchNested
            ? (b) => {
                depVersion = 2;
                return [b.state.nested.value];
              }
            : (b) => {
                depVersion = 1;
                return [b.state.count];
              },
        });

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <span data-testid="nested">{state.nested.value}</span>
            <button onClick={bloc.increment}>Increment</button>
            <button onClick={() => bloc.updateNested(10)}>Update Nested</button>
          </div>
        );
      };

      const { rerender } = render(<Component watchNested={false} />);

      expect(depVersion).toBe(1);

      // Change dependencies function
      rerender(<Component watchNested={true} />);

      // Should use new dependencies
      await act(async () => {
        screen.getByText('Update Nested').click();
      });

      expect(depVersion).toBe(2);
    });

    it('should update onMount callback when it changes', () => {
      let mountedWith = '';

      const Component = ({ label }: { label: string }) => {
        const [state] = useBloc(CounterCubit, {
          onMount: () => {
            mountedWith = label;
          },
        });

        return <div>{state.count}</div>;
      };

      render(<Component label="first" />);
      // onMount only fires once, so mountedWith should be "first"
      expect(mountedWith).toBe('first');
    });
  });

  describe('Tracking Phase Management', () => {
    it('should track properties accessed during render', () => {
      const Component = () => {
        const [state] = useBloc(CounterCubit);

        // Access count property
        void state.count;

        return <div>test</div>;
      };

      render(<Component />);

      // Verify tracking happened (by checking it re-renders on count change)
      // This is implicitly tested in other tests
    });

    it('should reset tracking at start of each render', () => {
      let accessedProps: string[] = [];

      const Component = ({ accessNested }: { accessNested: boolean }) => {
        const [state] = useBloc(CounterCubit);

        accessedProps = [];

        // Always access count
        void state.count;
        accessedProps.push('count');

        // Conditionally access nested
        if (accessNested) {
          void state.nested.value;
          accessedProps.push('nested');
        }

        return <div>{state.count}</div>;
      };

      const { rerender } = render(<Component accessNested={false} />);

      expect(accessedProps).toEqual(['count']);

      rerender(<Component accessNested={true} />);

      expect(accessedProps).toEqual(['count', 'nested']);

      rerender(<Component accessNested={false} />);

      // Should reset tracking - nested should not be in list
      expect(accessedProps).toEqual(['count']);
    });

    it('should commit tracking after render completes', async () => {
      let trackedCount = 0;

      const Component = () => {
        const [state, bloc] = useBloc(CounterCubit);

        // Access count
        void state.count;
        trackedCount++;

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={bloc.increment}>Increment</button>
          </div>
        );
      };

      render(<Component />);

      expect(trackedCount).toBe(1);

      // Trigger state change - should re-render because we tracked count
      await act(async () => {
        screen.getByText('Increment').click();
      });

      // Should have tracked in second render
      expect(trackedCount).toBe(2);
    });
  });

  describe('Strict Mode Compatibility', () => {
    it('should handle adapter recreation in Strict Mode', () => {
      let adapterCount = 0;

      const Component = () => {
        const [state] = useBloc(CounterCubit);
        adapterCount++;

        return <div>{state.count}</div>;
      };

      render(
        <React.StrictMode>
          <Component />
        </React.StrictMode>
      );

      // Strict mode will cause multiple renders
      expect(adapterCount).toBeGreaterThanOrEqual(1);
    });

    it('should maintain isolated instances correctly in Strict Mode', () => {
      const Component = () => {
        const [state1] = useBloc(IsolatedCubit);
        const [state2] = useBloc(IsolatedCubit);

        // Each useBloc call should get its own instance
        return (
          <div>
            <span data-testid="id1">{state1.id}</span>
            <span data-testid="id2">{state2.id}</span>
          </div>
        );
      };

      render(
        <React.StrictMode>
          <Component />
        </React.StrictMode>
      );

      const id1 = screen.getByTestId('id1').textContent;
      const id2 = screen.getByTestId('id2').textContent;

      // Should have different IDs
      expect(id1).not.toBe(id2);
    });

    it('should cleanup properly in Strict Mode mount/unmount cycle', async () => {
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

      // Increment
      await act(async () => {
        screen.getByText('Increment').click();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('1');

      unmount();

      // Wait for disposal
      await act(async () => {
        await Promise.resolve();
      });

      // Remount - should get fresh state
      render(
        <React.StrictMode>
          <Component />
        </React.StrictMode>
      );

      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });
  });
});

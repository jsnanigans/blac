/**
 * React 18 Features Integration Tests
 *
 * Tests the adapter's compatibility with React 18 features:
 * - Automatic batching (in event handlers, setTimeout, promises)
 * - Concurrent features (useTransition, useDeferredValue)
 * - Suspense (manual pattern)
 * - Strict Mode compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import useBlocAdapter from '../../useBlocAdapter';
import React, { StrictMode, Suspense, useTransition, useDeferredValue, useState } from 'react';

/**
 * Counter Cubit for batching tests
 */
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  add = (amount: number) => {
    this.emit(this.state + amount);
  };

  reset = () => {
    this.emit(0);
  };
}

/**
 * List Cubit for concurrent features tests
 */
interface ListState {
  items: string[];
  filter: string;
}

class ListCubit extends Cubit<ListState> {
  constructor() {
    super({ items: [], filter: '' });
  }

  addItem = (item: string) => {
    this.emit({
      ...this.state,
      items: [...this.state.items, item],
    });
  };

  setFilter = (filter: string) => {
    this.emit({
      ...this.state,
      filter,
    });
  };

  clear = () => {
    this.emit({
      items: [],
      filter: '',
    });
  };
}

/**
 * Async Data Cubit for Suspense tests (manual pattern)
 */
class AsyncDataCubit extends Cubit<{ data: string | null }> {
  private _promise: Promise<void> | null = null;

  constructor() {
    super({ data: null });
  }

  get promise(): Promise<void> | null {
    return this._promise;
  }

  loadData = () => {
    if (this._promise) return this._promise;

    this._promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.emit({ data: 'Loaded data!' });
        this._promise = null;
        resolve();
      }, 100);
    });

    return this._promise;
  };
}

describe('React 18 Features', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Automatic Batching', () => {
    it('should batch multiple state updates in event handlers', async () => {
      const renderCount = vi.fn();

      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        renderCount();

        return (
          <div>
            <div>Count: {count}</div>
            <button
              onClick={() => {
                // Multiple updates in event handler should batch
                cubit.increment();
                cubit.increment();
                cubit.increment();
              }}
            >
              Add 3
            </button>
          </div>
        );
      }

      const { getByText } = render(<Counter />);

      // Initial render
      expect(renderCount).toHaveBeenCalledTimes(1);
      expect(getByText('Count: 0')).toBeDefined();

      // Click should trigger only ONE re-render (batched)
      await act(async () => {
        getByText('Add 3').click();
      });

      await waitFor(() => {
        expect(getByText('Count: 3')).toBeDefined();
      });

      // Should be 2 total renders (initial + 1 batched update)
      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should batch updates in setTimeout (React 18)', async () => {
      const renderCount = vi.fn();

      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        renderCount();

        const handleClick = () => {
          setTimeout(() => {
            // React 18 batches even in setTimeout
            cubit.increment();
            cubit.increment();
          }, 0);
        };

        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={handleClick}>Add 2</button>
          </div>
        );
      }

      const { getByText } = render(<Counter />);

      expect(renderCount).toHaveBeenCalledTimes(1);

      await act(async () => {
        getByText('Add 2').click();
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(getByText('Count: 2')).toBeDefined();
      });

      // Should be 2 renders (initial + 1 batched update from setTimeout)
      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should batch updates in promises (React 18)', async () => {
      const renderCount = vi.fn();

      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        renderCount();

        const handleClick = () => {
          Promise.resolve().then(() => {
            // React 18 batches in promises
            cubit.increment();
            cubit.increment();
          });
        };

        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={handleClick}>Add 2</button>
          </div>
        );
      }

      const { getByText } = render(<Counter />);

      expect(renderCount).toHaveBeenCalledTimes(1);

      await act(async () => {
        getByText('Add 2').click();
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(getByText('Count: 2')).toBeDefined();
      });

      // Should be 2 renders (initial + 1 batched update from promise)
      expect(renderCount).toHaveBeenCalledTimes(2);
    });

    it('should batch updates in native event handlers', async () => {
      const renderCount = vi.fn();

      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        renderCount();

        React.useEffect(() => {
          const handleNativeClick = () => {
            cubit.increment();
            cubit.increment();
          };

          const button = document.getElementById('native-button');
          button?.addEventListener('click', handleNativeClick);

          return () => {
            button?.removeEventListener('click', handleNativeClick);
          };
        }, [cubit]);

        return (
          <div>
            <div>Count: {count}</div>
            <button id="native-button">Add 2</button>
          </div>
        );
      }

      const { getByText } = render(<Counter />);

      expect(renderCount).toHaveBeenCalledTimes(1);

      const button = document.getElementById('native-button');

      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      await waitFor(() => {
        expect(getByText('Count: 2')).toBeDefined();
      });

      // Should be 2 renders (initial + 1 batched update)
      expect(renderCount).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Features', () => {
    it('should work with useTransition', async () => {
      function SearchList() {
        const [state, cubit] = useBlocAdapter(ListCubit);
        const [isPending, startTransition] = useTransition();

        const handleFilter = (value: string) => {
          // Mark filter update as non-urgent
          startTransition(() => {
            cubit.setFilter(value);
          });
        };

        const filteredItems = state.items.filter(item =>
          item.toLowerCase().includes(state.filter.toLowerCase())
        );

        return (
          <div>
            <input
              data-testid="filter-input"
              onChange={(e) => handleFilter(e.target.value)}
            />
            <div>Pending: {isPending ? 'true' : 'false'}</div>
            <div>Count: {filteredItems.length}</div>
            <button onClick={() => cubit.addItem('Test Item')}>Add Item</button>
          </div>
        );
      }

      const { getByTestId, getByText } = render(<SearchList />);

      // Add some items
      await act(async () => {
        getByText('Add Item').click();
        getByText('Add Item').click();
      });

      expect(getByText('Count: 2')).toBeDefined();

      // Filter should work (transition marks it as non-urgent)
      const input = getByTestId('filter-input') as HTMLInputElement;

      await act(async () => {
        input.value = 'test';
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await waitFor(() => {
        // isPending might briefly be true, but should settle to false
        expect(getByText('Pending: false')).toBeDefined();
      });
    });

    it('should work with useDeferredValue', async () => {
      function DeferredList() {
        const [state, cubit] = useBlocAdapter(ListCubit);
        const deferredFilter = useDeferredValue(state.filter);

        const filteredItems = state.items.filter(item =>
          item.toLowerCase().includes(deferredFilter.toLowerCase())
        );

        return (
          <div>
            <div>Filter: {state.filter}</div>
            <div>Deferred: {deferredFilter}</div>
            <div>Count: {filteredItems.length}</div>
            <button onClick={() => cubit.addItem('Test Item')}>Add Item</button>
            <button onClick={() => cubit.setFilter('test')}>Set Filter</button>
          </div>
        );
      }

      const { getByText } = render(<DeferredList />);

      // Add items
      await act(async () => {
        getByText('Add Item').click();
        getByText('Add Item').click();
      });

      expect(getByText('Count: 2')).toBeDefined();

      // Set filter - deferred value may lag behind
      await act(async () => {
        getByText('Set Filter').click();
      });

      await waitFor(() => {
        expect(getByText('Filter: test')).toBeDefined();
        expect(getByText('Deferred: test')).toBeDefined();
      });
    });

    it('should handle interrupted renders', async () => {
      const renderCount = vi.fn();

      function InterruptibleCounter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        const [isPending, startTransition] = useTransition();
        renderCount();

        const handleUrgent = () => {
          cubit.add(1);
        };

        const handleNonUrgent = () => {
          startTransition(() => {
            cubit.add(10);
          });
        };

        return (
          <div>
            <div>Count: {count}</div>
            <div>Pending: {isPending ? 'true' : 'false'}</div>
            <button onClick={handleUrgent}>Urgent +1</button>
            <button onClick={handleNonUrgent}>Non-Urgent +10</button>
          </div>
        );
      }

      const { getByText } = render(<InterruptibleCounter />);

      // Start non-urgent update
      await act(async () => {
        getByText('Non-Urgent +10').click();
        // Immediately follow with urgent update
        getByText('Urgent +1').click();
      });

      await waitFor(() => {
        // Both updates should complete
        expect(getByText('Count: 11')).toBeDefined();
        expect(getByText('Pending: false')).toBeDefined();
      });

      // Should have multiple renders due to interruption
      expect(renderCount.mock.calls.length).toBeGreaterThan(2);
    });
  });

  describe('Suspense (Manual Pattern)', () => {
    it('should suspend on initial load with manual pattern', async () => {
      // Manual Suspense pattern - user manages promise
      function AsyncComponent() {
        const [state, cubit] = useBlocAdapter(AsyncDataCubit);

        // Manual Suspense: throw promise if data not loaded
        if (!state.data && cubit.promise) {
          throw cubit.promise;
        }

        return <div>Data: {state.data || 'No data'}</div>;
      }

      function App() {
        const [shouldLoad, setShouldLoad] = useState(false);

        return (
          <div>
            <button onClick={() => setShouldLoad(true)}>Load</button>
            {shouldLoad && (
              <Suspense fallback={<div>Loading...</div>}>
                <AsyncComponent />
              </Suspense>
            )}
          </div>
        );
      }

      const { getByText } = render(<App />);

      // Get cubit and start loading
      const cubit = Blac.getBloc(AsyncDataCubit);

      await act(async () => {
        cubit.loadData();
        getByText('Load').click();
      });

      // Should show loading fallback
      expect(getByText('Loading...')).toBeDefined();

      // Wait for data to load
      await waitFor(
        () => {
          expect(getByText('Data: Loaded data!')).toBeDefined();
        },
        { timeout: 500 }
      );
    });

    it('should work with multiple async components', async () => {
      class AsyncUserCubit extends Cubit<{ name: string | null }> {
        private _promise: Promise<void> | null = null;

        constructor() {
          super({ name: null });
        }

        get promise() {
          return this._promise;
        }

        loadUser = () => {
          if (this._promise) return this._promise;

          this._promise = new Promise<void>((resolve) => {
            setTimeout(() => {
              this.emit({ name: 'John Doe' });
              this._promise = null;
              resolve();
            }, 50);
          });

          return this._promise;
        };
      }

      function UserComponent() {
        const [state, cubit] = useBlocAdapter(AsyncUserCubit);

        if (!state.name && cubit.promise) {
          throw cubit.promise;
        }

        return <div>User: {state.name}</div>;
      }

      function DataComponent() {
        const [state, cubit] = useBlocAdapter(AsyncDataCubit);

        if (!state.data && cubit.promise) {
          throw cubit.promise;
        }

        return <div>Data: {state.data}</div>;
      }

      function App() {
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <UserComponent />
            <DataComponent />
          </Suspense>
        );
      }

      // Start loading both
      const userCubit = Blac.getBloc(AsyncUserCubit);
      const dataCubit = Blac.getBloc(AsyncDataCubit);

      await act(async () => {
        userCubit.loadUser();
        dataCubit.loadData();
      });

      const { getByText } = render(<App />);

      // Should show loading initially
      expect(getByText('Loading...')).toBeDefined();

      // Wait for both to load
      await waitFor(
        () => {
          expect(getByText('User: John Doe')).toBeDefined();
          expect(getByText('Data: Loaded data!')).toBeDefined();
        },
        { timeout: 500 }
      );
    });

    it('should handle unmount during suspend without errors', async () => {
      function AsyncComponent() {
        const [state, cubit] = useBlocAdapter(AsyncDataCubit);

        if (!state.data && cubit.promise) {
          throw cubit.promise;
        }

        return <div>Data: {state.data}</div>;
      }

      function App({ show }: { show: boolean }) {
        if (!show) return null;

        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        );
      }

      const cubit = Blac.getBloc(AsyncDataCubit);

      await act(async () => {
        cubit.loadData();
      });

      const { rerender, getByText } = render(<App show={true} />);

      // Should show loading
      expect(getByText('Loading...')).toBeDefined();

      const initialSubscriptions = cubit.subscriptionCount;
      expect(initialSubscriptions).toBeGreaterThan(0);

      // Unmount while loading - should not throw errors
      await act(async () => {
        rerender(<App show={false} />);
      });

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have fewer or no subscriptions (depending on React cleanup timing)
      // The key is it should not crash or leak memory
      expect(cubit.subscriptionCount).toBeLessThanOrEqual(initialSubscriptions);
    });
  });

  describe('StrictMode Compatibility', () => {
    it('should handle double mounting without issues', () => {
      const mountCount = vi.fn();
      const unmountCount = vi.fn();

      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit, {
          onMount: mountCount,
          onUnmount: unmountCount,
        });

        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      }

      const { getByText } = render(
        <StrictMode>
          <Counter />
        </StrictMode>
      );

      expect(getByText('Count: 0')).toBeDefined();

      // In StrictMode, mount may be called twice
      expect(mountCount).toHaveBeenCalled();

      // Should still work correctly
      act(() => {
        getByText('Increment').click();
      });

      expect(getByText('Count: 1')).toBeDefined();
    });

    it('should cleanup properly on double unmount', async () => {
      function Counter() {
        const [count] = useBlocAdapter(CounterCubit);
        return <div>Count: {count}</div>;
      }

      const { unmount } = render(
        <StrictMode>
          <Counter />
        </StrictMode>
      );

      const cubit = Blac.getBloc(CounterCubit);
      const initialSubscriptions = cubit.subscriptionCount;

      expect(initialSubscriptions).toBeGreaterThan(0);

      unmount();

      // Wait for cleanup
      await new Promise(resolve => queueMicrotask(resolve));

      // Should be cleaned up
      expect(cubit.subscriptionCount).toBe(0);
    });

    it('should not cause memory leaks', async () => {
      function Counter() {
        const [count] = useBlocAdapter(CounterCubit);
        return <div>Count: {count}</div>;
      }

      // Mount and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <StrictMode>
            <Counter />
          </StrictMode>
        );

        unmount();
        await new Promise(resolve => queueMicrotask(resolve));
      }

      const cubit = Blac.getBloc(CounterCubit);

      // Should have no subscriptions after all unmounts
      expect(cubit.subscriptionCount).toBe(0);
    });

    it('should maintain consistent state across StrictMode remounts', () => {
      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);

        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      }

      const { getByText } = render(
        <StrictMode>
          <Counter />
        </StrictMode>
      );

      // Initial state should be consistent
      expect(getByText('Count: 0')).toBeDefined();

      // Update state
      act(() => {
        getByText('Increment').click();
      });

      expect(getByText('Count: 1')).toBeDefined();

      // State should remain consistent
      const cubit = Blac.getBloc(CounterCubit);
      expect(cubit.state).toBe(1);
    });
  });
});

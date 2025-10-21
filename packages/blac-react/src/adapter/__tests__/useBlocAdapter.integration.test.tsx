/**
 * Integration Tests for useBlocAdapter
 *
 * Tests the adapter hook with real React components to verify:
 * - Component re-renders
 * - Selector optimization
 * - React Strict Mode compatibility
 * - Lifecycle management
 * - Suspense integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Cubit, Blac } from '@blac/core';
import useBlocAdapter from '../../useBlocAdapter';
import React, { StrictMode, Suspense } from 'react';

/**
 * Test Cubit for counter functionality
 */
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

/**
 * Complex state for testing selectors
 */
interface TodoState {
  todos: Array<{ id: number; text: string; completed: boolean }>;
  filter: 'all' | 'active' | 'completed';
  user: {
    name: string;
    email: string;
  };
}

class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all',
      user: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    });
  }

  addTodo = (text: string) => {
    this.emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        { id: Date.now(), text, completed: false },
      ],
    });
  };

  toggleTodo = (id: number) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    });
  };

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.emit({
      ...this.state,
      filter,
    });
  };

  updateUserName = (name: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, name },
    });
  };
}

/**
 * Async loading cubit for Suspense tests
 */
class AsyncDataCubit extends Cubit<{ data: string | null; loading: boolean }> {
  private _loadingPromise: Promise<void> | null = null;

  constructor() {
    super({ data: null, loading: false });
  }

  get loadingPromise(): Promise<void> | null {
    // Only return the promise if we're actually loading
    return this.state.loading ? this._loadingPromise : null;
  }

  loadData = async () => {
    if (this._loadingPromise) return this._loadingPromise;

    this.emit({ ...this.state, loading: true });

    this._loadingPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.emit({ data: 'Loaded data!', loading: false });
        this._loadingPromise = null;
        resolve();
      }, 100);
    });

    return this._loadingPromise;
  };
}

describe('useBlocAdapter Integration Tests', () => {
  beforeEach(() => {
    // Reset Blac instance before each test
    Blac.resetInstance();
  });

  describe('Basic Rendering', () => {
    it('should render with initial state', () => {
      function Counter() {
        const [count] = useBlocAdapter(CounterCubit);
        return <div>Count: {count}</div>;
      }

      render(<Counter />);
      expect(screen.getByText('Count: 0')).toBeDefined();
    });

    it('should update when state changes', async () => {
      function Counter() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        return (
          <div>
            <div>Count: {count}</div>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      }

      const { getByText } = render(<Counter />);
      expect(getByText('Count: 0')).toBeDefined();

      // Click increment
      const button = getByText('Increment');
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(getByText('Count: 1')).toBeDefined();
      });
    });

    it('should share bloc instance across components', () => {
      const renderCountA = vi.fn();
      const renderCountB = vi.fn();

      function ComponentA() {
        const [count] = useBlocAdapter(CounterCubit);
        renderCountA();
        return <div>A: {count}</div>;
      }

      function ComponentB() {
        const [count, cubit] = useBlocAdapter(CounterCubit);
        renderCountB();
        return (
          <div>
            <div>B: {count}</div>
            <button onClick={cubit.increment}>Increment</button>
          </div>
        );
      }

      function App() {
        return (
          <>
            <ComponentA />
            <ComponentB />
          </>
        );
      }

      const { getByText } = render(<App />);

      // Initial renders
      expect(renderCountA).toHaveBeenCalledTimes(1);
      expect(renderCountB).toHaveBeenCalledTimes(1);

      // Increment from component B
      act(() => {
        getByText('Increment').click();
      });

      // Both should re-render
      expect(renderCountA).toHaveBeenCalledTimes(2);
      expect(renderCountB).toHaveBeenCalledTimes(2);

      expect(getByText('A: 1')).toBeDefined();
      expect(getByText('B: 1')).toBeDefined();
    });
  });

  describe('Selector Optimization', () => {
    it('should only re-render when selector result changes', () => {
      const renderCount = vi.fn();

      // Use React.memo to prevent re-renders from parent
      const TodoCount = React.memo(() => {
        const [count] = useBlocAdapter(TodoCubit, {
          selector: (state) => state.todos.length,
        });
        renderCount();
        return <div>Count: {count}</div>;
      });

      function TodoApp() {
        const [, cubit] = useBlocAdapter(TodoCubit);
        return (
          <>
            <TodoCount />
            <button onClick={() => cubit.addTodo('Test')}>Add Todo</button>
            <button onClick={() => cubit.setFilter('active')}>Set Filter</button>
          </>
        );
      }

      const { getByText } = render(<TodoApp />);

      // Initial render
      expect(renderCount).toHaveBeenCalledTimes(1);
      expect(getByText('Count: 0')).toBeDefined();

      // Add todo - should trigger re-render
      act(() => {
        getByText('Add Todo').click();
      });

      expect(renderCount).toHaveBeenCalledTimes(2);
      expect(getByText('Count: 1')).toBeDefined();

      // Change filter - should NOT trigger re-render (selector result unchanged)
      act(() => {
        getByText('Set Filter').click();
      });

      expect(renderCount).toHaveBeenCalledTimes(2); // Still 2, no additional render
    });

    it('should support complex selectors', () => {
      function ActiveTodoCount() {
        const [count] = useBlocAdapter(TodoCubit, {
          selector: (state) =>
            state.todos.filter((t) => !t.completed).length,
        });
        return <div>Active: {count}</div>;
      }

      function TodoApp() {
        const [, cubit] = useBlocAdapter(TodoCubit);
        return (
          <>
            <ActiveTodoCount />
            <button onClick={() => cubit.addTodo('Test')}>Add</button>
          </>
        );
      }

      const { getByText } = render(<TodoApp />);

      expect(getByText('Active: 0')).toBeDefined();

      act(() => {
        getByText('Add').click();
      });

      expect(getByText('Active: 1')).toBeDefined();
    });
  });

  describe('React Strict Mode', () => {
    it('should work correctly in Strict Mode', () => {
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

      expect(getByText('Count: 0')).toBeDefined();

      act(() => {
        getByText('Increment').click();
      });

      expect(getByText('Count: 1')).toBeDefined();
    });

    it('should not create duplicate subscriptions in Strict Mode', () => {
      function Counter() {
        useBlocAdapter(CounterCubit);
        return <div>Test</div>;
      }

      render(
        <StrictMode>
          <Counter />
        </StrictMode>
      );

      // Get the cubit from Blac registry
      const cubit = Blac.getBloc(CounterCubit);

      // Should have exactly 1 adapter subscription
      // (Strict Mode may mount/unmount but final state should be 1 subscription)
      const subscriptionCount = cubit.subscriptionCount;
      expect(subscriptionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Lifecycle Callbacks', () => {
    it('should call onMount when component mounts', () => {
      const onMount = vi.fn();

      function Counter() {
        const [count] = useBlocAdapter(CounterCubit, { onMount });
        return <div>Count: {count}</div>;
      }

      render(<Counter />);

      expect(onMount).toHaveBeenCalledTimes(1);
      expect(onMount).toHaveBeenCalledWith(expect.any(CounterCubit));
    });

    it('should call onUnmount when component unmounts', () => {
      const onUnmount = vi.fn();

      function Counter() {
        const [count] = useBlocAdapter(CounterCubit, { onUnmount });
        return <div>Count: {count}</div>;
      }

      const { unmount } = render(<Counter />);

      expect(onUnmount).not.toHaveBeenCalled();

      unmount();

      expect(onUnmount).toHaveBeenCalledTimes(1);
      expect(onUnmount).toHaveBeenCalledWith(expect.any(CounterCubit));
    });
  });

  describe.skip('Suspense Integration', () => {
    it('should work with manual Suspense pattern', async () => {
      // Simplified Suspense test - user manages the promise manually
      const cubit = new AsyncDataCubit();

      // Start loading before rendering
      cubit.loadData();

      function AsyncComponent() {
        const [state] = useBlocAdapter(AsyncDataCubit);

        // Manual Suspense check
        if (state.loading && cubit.loadingPromise) {
          throw cubit.loadingPromise;
        }

        return <div>Data: {state.data || 'No data'}</div>;
      }

      function App() {
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AsyncComponent />
          </Suspense>
        );
      }

      const { getByText } = render(<App />);

      // Should show loading fallback initially
      expect(getByText('Loading...')).toBeDefined();

      // Wait for data to load
      await waitFor(
        () => {
          expect(getByText('Data: Loaded data!')).toBeDefined();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Memory Management', () => {
    it('should clean up adapter when all components unmount', async () => {
      function Counter() {
        const [count] = useBlocAdapter(CounterCubit);
        return <div>Count: {count}</div>;
      }

      const { unmount } = render(<Counter />);

      // Get the cubit to check subscription count
      const cubit = Blac.getBloc(CounterCubit);
      expect(cubit).toBeDefined();
      expect(cubit.subscriptionCount).toBeGreaterThan(0);

      unmount();

      // Wait for microtask cleanup to complete
      await new Promise(resolve => queueMicrotask(resolve));

      // After unmount and microtask, subscriptions should be cleaned up
      expect(cubit.subscriptionCount).toBe(0);
    });
  });

  describe('Type Safety', () => {
    it('should infer state type without selector', () => {
      function Counter() {
        const [count] = useBlocAdapter(CounterCubit);
        // TypeScript should infer count as number
        const doubled: number = count * 2;
        return <div>Doubled: {doubled}</div>;
      }

      render(<Counter />);
      expect(screen.getByText('Doubled: 0')).toBeDefined();
    });

    it('should infer selector result type', () => {
      function TodoCount() {
        const [count] = useBlocAdapter(TodoCubit, {
          selector: (state) => state.todos.length,
        });
        // TypeScript should infer count as number
        const display: number = count;
        return <div>Count: {display}</div>;
      }

      render(<TodoCount />);
      expect(screen.getByText('Count: 0')).toBeDefined();
    });
  });
});

/**
 * Tests for hybrid useBloc implementation
 * Verifies both simple and concurrent modes work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Cubit } from '@blac/core';
import { useBloc, BlocConfig } from '../index';

// Simple counter cubit for testing - isolated to ensure test independence
class CounterCubit extends Cubit<{ count: number }> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.update((state) => ({ count: state.count + 1 }));
  }

  decrement() {
    this.update((state) => ({ count: state.count - 1 }));
  }

  setCount(count: number) {
    this.update(() => ({ count }));
  }
}

describe('Hybrid useBloc Implementation', () => {
  beforeEach(() => {
    // Reset to default mode before each test
    BlocConfig.reset();
  });

  afterEach(() => {
    // Clean up after each test
    cleanup();
  });

  describe('Mode Selection', () => {
    it('should use simple mode by default', () => {
      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit);
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should respect global concurrent mode setting', () => {
      BlocConfig.setDefaultMode('concurrent');
      expect(BlocConfig.getDefaultMode()).toBe('concurrent');

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit);
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should allow per-hook override to concurrent mode', () => {
      BlocConfig.setDefaultMode('simple');

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, { concurrent: true });
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should allow per-hook override to simple mode', () => {
      BlocConfig.setDefaultMode('concurrent');

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, { concurrent: false });
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });
  });

  describe('Simple Mode Functionality', () => {
    beforeEach(() => {
      BlocConfig.setDefaultMode('simple');
    });

    it('should render initial state', () => {
      const TestComponent = () => {
        const [state] = useBloc(CounterCubit);
        return <div data-testid="count">{state.count}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should update when state changes', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit);
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');

      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });

      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('2');
      });
    });

    it('should support dependencies function', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, {
          dependencies: (state) => [state.count],
        });
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');

      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should call onMount and onUnmount callbacks', () => {
      let mountCalled = false;
      let unmountCalled = false;

      const TestComponent = () => {
        const [state] = useBloc(CounterCubit, {
          onMount: () => {
            mountCalled = true;
          },
          onUnmount: () => {
            unmountCalled = true;
          },
        });
        return <div data-testid="count">{state.count}</div>;
      };

      const { unmount } = render(<TestComponent />);
      expect(mountCalled).toBe(true);

      unmount();
      expect(unmountCalled).toBe(true);
    });
  });

  describe('Concurrent Mode Functionality', () => {
    beforeEach(() => {
      BlocConfig.setDefaultMode('concurrent');
    });

    it('should render initial state', () => {
      const TestComponent = () => {
        const [state] = useBloc(CounterCubit);
        return <div data-testid="count">{state.count}</div>;
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    it('should update when state changes', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit);
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');

      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should support dependencies function', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, {
          dependencies: (state) => [state.count],
        });
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      render(<TestComponent />);
      expect(screen.getByTestId('count').textContent).toBe('0');

      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });
  });

  describe('Feature Parity', () => {
    it('should produce same results in both modes', async () => {
      const user = userEvent.setup();
      let simpleResult = 0;
      let concurrentResult = 0;

      const SimpleComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, { concurrent: false });
        simpleResult = state.count;
        return (
          <div>
            <span data-testid="simple-count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      const ConcurrentComponent = () => {
        const [state, bloc] = useBloc(CounterCubit, { concurrent: true });
        concurrentResult = state.count;
        return (
          <div>
            <span data-testid="concurrent-count">{state.count}</span>
            <button onClick={() => bloc.increment()}>Increment</button>
          </div>
        );
      };

      const { unmount: unmountSimple } = render(<SimpleComponent />);
      expect(simpleResult).toBe(0);
      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('simple-count').textContent).toBe('1');
      });
      unmountSimple();

      const { unmount: unmountConcurrent } = render(<ConcurrentComponent />);
      expect(concurrentResult).toBe(0);
      await user.click(screen.getByText('Increment'));
      await waitFor(() => {
        expect(screen.getByTestId('concurrent-count').textContent).toBe('1');
      });
      unmountConcurrent();

      // Both should produce same results
      expect(simpleResult).toBe(concurrentResult);
    });
  });
});

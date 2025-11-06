/**
 * Test that useBloc properly infers the bloc type
 * This is a compile-time test - if it compiles, the types are correct
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

interface CounterState {
  count: number;
}

class CounterBloc extends Cubit<CounterState> {
  constructor(initialCount: number = 0) {
    super({ count: initialCount });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

describe('useBloc type inference', () => {
  it('should correctly infer bloc type and methods', () => {
    function TestComponent() {
      const [state, counter] = useBloc(CounterBloc);

      // These should all compile without errors if types are correct
      // If counter is typed as StateContainer<any>, these would fail

      // Method calls should be available
      counter.increment();
      counter.decrement();
      counter.reset();

      // State access
      const value: number = state.count;

      return <div>Count: {value}</div>;
    }

    const { container } = render(<TestComponent />);
    expect(container.textContent).toContain('Count: 0');
  });

  it('should infer types with instanceId option', () => {
    function TestComponent() {
      const [state, counter] = useBloc(CounterBloc, { instanceId: 'test' });

      // All methods should be available
      counter.increment();
      counter.decrement();
      counter.reset();

      return <div>Count: {state.count}</div>;
    }

    const { container } = render(<TestComponent />);
    expect(container.textContent).toContain('Count: 0');
  });

  it('should infer types with staticProps option', () => {
    function TestComponent() {
      const [state, counter] = useBloc(CounterBloc, { staticProps: 10 });

      // All methods should be available
      counter.increment();
      counter.decrement();
      counter.reset();

      return <div>Count: {state.count}</div>;
    }

    const { container } = render(<TestComponent />);
    expect(container.textContent).toContain('Count: 10');
  });

  it('should infer types with all options', () => {
    function TestComponent() {
      const [state, counter] = useBloc(CounterBloc, {
        instanceId: 'test',
        staticProps: 5,
        onMount: (bloc) => {
          // bloc should have correct type here too
          bloc.increment();
        },
        onUnmount: (bloc) => {
          // and here
          bloc.reset();
        },
      });

      // All methods should be available
      counter.increment();
      counter.decrement();
      counter.reset();

      return <div>Count: {state.count}</div>;
    }

    const { container } = render(<TestComponent />);
    expect(container.textContent).toContain('Count: 6');
  });
});

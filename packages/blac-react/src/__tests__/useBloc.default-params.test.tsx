/**
 * Test that useBloc works correctly with default constructor parameters
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor(initialCount: number = 0) {
    super({ count: initialCount });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('useBloc with default constructor parameters', () => {
  it('should use default parameter when no staticProps provided', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit);
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should use default parameter with instanceId but no staticProps', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit, { instanceId: 'test-1' });
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 0')).toBeDefined();
  });

  it('should override default parameter when staticProps provided', () => {
    function TestComponent() {
      const [state] = useBloc(CounterCubit, { staticProps: 10 });
      return <div>Count: {state.count}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Count: 10')).toBeDefined();
  });

  it('should work with explicit undefined default', () => {
    class OptionalCubit extends Cubit<{ value: string }> {
      constructor(value: string = 'default') {
        super({ value });
      }
    }

    function TestComponent() {
      const [state] = useBloc(OptionalCubit);
      return <div>Value: {state.value}</div>;
    }

    render(<TestComponent />);
    expect(screen.getByText('Value: default')).toBeDefined();
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';

// Enable proxy dependency tracking
Blac.setConfig({ proxyDependencyTracking: true });

interface TestState {
  count: number;
  name: string;
  nested: {
    value: number;
    label: string;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      count: 0,
      name: 'initial',
      nested: {
        value: 0,
        label: 'initial',
      },
    });
  }

  incrementCount = () => {
    this.patch({ count: this.state.count + 1 });
  };

  updateName = (name: string) => {
    this.patch({ name });
  };

  updateNestedValue = (value: number) => {
    this.patch({
      nested: {
        ...this.state.nested,
        value,
      },
    });
  };

  updateNestedLabel = (label: string) => {
    this.patch({
      nested: {
        ...this.state.nested,
        label,
      },
    });
  };

  // Getter that depends on state
  get doubleCount(): number {
    return this.state.count * 2;
  }

  get formattedName(): string {
    return this.state.name.toUpperCase();
  }
}

describe('Dependency Tracking Tests (Foundational)', () => {
  // Uses unified tracking by default
  beforeEach(() => {
    Blac.setConfig({ useUnifiedTracking: true });
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should only rerender when accessed state properties change', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(TestCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <button onClick={cubit.incrementCount}>Increment Count</button>
          <button onClick={() => cubit.updateName('new name')}>
            Update Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial render
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // Click increment - should trigger rerender because count is accessed
    await user.click(screen.getByText('Increment Count'));
    await waitFor(() =>
      expect(screen.getByTestId('count')).toHaveTextContent('1'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update name - should NOT trigger rerender because name is not accessed
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Name'));

    // Use waitFor for more reliable assertion
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
  });

  it('should track nested property access correctly', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(TestCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="nested-value">{state.nested.value}</div>
          <button
            onClick={() => cubit.updateNestedValue(state.nested.value + 1)}
          >
            Increment Nested Value
          </button>
          <button onClick={() => cubit.updateNestedLabel('new label')}>
            Update Nested Label
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial render
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('nested-value')).toHaveTextContent('0');

    // Update nested.value - should trigger rerender
    await user.click(screen.getByText('Increment Nested Value'));
    await waitFor(() =>
      expect(screen.getByTestId('nested-value')).toHaveTextContent('1'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Note: Unified tracking tracks at the parent object level
    // Changes to any sibling property in the nested object will also trigger re-render
    // because the entire nested object is tracked (not just the leaf property)
    // This is a trade-off: broader tracking is simpler but less granular
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Nested Label'));

    // With unified tracking, parent object changes trigger re-renders
    // even for sibling properties (acceptable trade-off for simpler implementation)
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(1); // Re-render due to nested object change
      },
      { timeout: 500 },
    );
  });

  it('should track getter access correctly', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, cubit] = useBloc(TestCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="double-count">{cubit.doubleCount}</div>
          <button onClick={cubit.incrementCount}>Increment Count</button>
          <button onClick={() => cubit.updateName('new name')}>
            Update Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial render
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('double-count')).toHaveTextContent('0');

    // Increment count - should trigger rerender because getter depends on count
    await user.click(screen.getByText('Increment Count'));
    await waitFor(() =>
      expect(screen.getByTestId('double-count')).toHaveTextContent('2'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update name - should NOT trigger rerender (getter doesn't depend on name)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Name'));

    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
  });
});

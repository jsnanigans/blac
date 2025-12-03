import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

// Deep dependency chain blocs
class DeepABloc extends Cubit<number> {
  constructor() {
    super(1);
  }

  increment = () => this.emit(this.state + 1);

  get value() {
    return this.state + DeepBBloc.get().value;
  }
}

class DeepBBloc extends Cubit<number> {
  constructor() {
    super(10);
  }

  increment = () => this.emit(this.state + 1);

  get value() {
    return this.state + DeepCBloc.get().value;
  }
}

class DeepCBloc extends Cubit<number> {
  constructor() {
    super(100);
  }

  increment = () => this.emit(this.state + 1);

  get value() {
    return this.state;
  }
}

// Dynamic dependency blocs
class DynamicDepBloc extends Cubit<{ useExternal: boolean; value: number }> {
  constructor() {
    super({ useExternal: false, value: 5 });
  }

  toggleExternal = () => {
    this.emit({ ...this.state, useExternal: !this.state.useExternal });
  };

  get computed() {
    if (this.state.useExternal) {
      return this.state.value + ConditionalBloc.get().state;
    }
    return this.state.value;
  }
}

class ConditionalBloc extends Cubit<number, number> {
  constructor() {
    super(20);
  }

  increment = () => this.emit(this.state + 1);
}

describe('useBloc - cross-bloc edge cases', () => {
  beforeEach(() => {
    // Clear all instances before each test
    DeepABloc.clear();
    DeepBBloc.clear();
    DeepCBloc.clear();
    DynamicDepBloc.clear();
    ConditionalBloc.clear();
  });

  it('should cleanup external subscriptions on unmount', () => {
    // Create external bloc
    ConditionalBloc.resolve('default', { props: 20 });

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [_state, bloc] = useBloc(DynamicDepBloc);

      // Toggle to enable external dependency
      if (renderCount === 1) {
        bloc.toggleExternal();
      }

      return (
        <div>
          <div data-testid="computed">{bloc.computed}</div>
        </div>
      );
    };

    const { unmount } = render(<Component />);

    // Should have 2 renders (initial + toggle)
    expect(renderCount).toBeGreaterThanOrEqual(2);

    // Component should be subscribed to ConditionalBloc
    const initialRenderCount = renderCount;

    // Change ConditionalBloc - should trigger re-render
    act(() => {
      ConditionalBloc.get().increment();
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);

    // Unmount component
    unmount();

    // Change ConditionalBloc again - should NOT trigger re-render now
    const renderCountBeforeUnmount = renderCount;
    act(() => {
      ConditionalBloc.get().increment();
    });

    // Render count should not change after unmount
    expect(renderCount).toBe(renderCountBeforeUnmount);
  });

  it('should handle deep dependency chains (A -> B -> C)', () => {
    let renderCount = 0;

    const Component = () => {
      renderCount++;
      // Create all blocs in the dependency chain
      useBloc(DeepCBloc);
      useBloc(DeepBBloc);
      const [, blocA] = useBloc(DeepABloc);

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="value">{blocA.value}</div>
        </div>
      );
    };

    render(<Component />);

    // Initial render: 1 + 10 + 100 = 111
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('value').textContent).toBe('111');

    // Change DeepCBloc (deepest in chain)
    act(() => {
      DeepCBloc.get().increment();
    });

    // Should trigger re-render through the chain
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('value').textContent).toBe('112'); // 1 + 10 + 101
  });

  it('should handle dynamically changing dependencies', () => {
    // Create ConditionalBloc instance WITHOUT subscribing to it
    // This way we can test that only the getter dependency triggers re-renders
    ConditionalBloc.resolve('default', { props: 20 });

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [state, bloc] = useBloc(DynamicDepBloc);

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="computed">{bloc.computed}</div>
          <div data-testid="use-external">{state.useExternal.toString()}</div>
          <button data-testid="toggle" onClick={bloc.toggleExternal}>
            Toggle
          </button>
        </div>
      );
    };

    render(<Component />);

    // Initial render: not using external, so just value
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('computed').textContent).toBe('5');
    expect(screen.getByTestId('use-external').textContent).toBe('false');

    // Toggle to use external dependency
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });

    // Should re-render with external dependency
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('computed').textContent).toBe('25'); // 5 + 20
    expect(screen.getByTestId('use-external').textContent).toBe('true');

    // Now change ConditionalBloc - should trigger re-render
    act(() => {
      ConditionalBloc.get().increment();
    });

    expect(renderCount).toBe(3);
    expect(screen.getByTestId('computed').textContent).toBe('26'); // 5 + 21

    // Toggle back to not using external
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });

    expect(renderCount).toBe(4);
    expect(screen.getByTestId('computed').textContent).toBe('5');
    expect(screen.getByTestId('use-external').textContent).toBe('false');

    // Change ConditionalBloc again - should NOT trigger re-render now
    const prevRenderCount = renderCount;
    act(() => {
      ConditionalBloc.get().increment();
    });

    // Render count should not change because we're no longer using external dependency
    expect(renderCount).toBe(prevRenderCount);
  });
});

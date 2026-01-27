import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Cubit, acquire, borrow, clear } from '@blac/core';
import { useBloc } from '../useBloc';

// Deep dependency chain blocs
class DeepABloc extends Cubit<{ value: number }> {
  private deepB = this.depend(DeepBBloc);

  constructor() {
    super({ value: 1 });
  }

  increment = () => this.emit({ value: this.state.value + 1 });

  get computed() {
    return this.state.value + this.deepB().computed;
  }
}

class DeepBBloc extends Cubit<{ value: number }> {
  private deepC = this.depend(DeepCBloc);

  constructor() {
    super({ value: 10 });
  }

  increment = () => this.emit({ value: this.state.value + 1 });

  get computed() {
    return this.state.value + this.deepC().computed;
  }
}

class DeepCBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 100 });
  }

  increment = () => this.emit({ value: this.state.value + 1 });

  get computed() {
    return this.state.value;
  }
}

// Dynamic dependency blocs
class DynamicDepBloc extends Cubit<{ useExternal: boolean; value: number }> {
  private conditionalBloc = this.depend(ConditionalBloc);

  constructor() {
    super({ useExternal: false, value: 5 });
  }

  toggleExternal = () => {
    this.emit({ ...this.state, useExternal: !this.state.useExternal });
  };

  get computed() {
    if (this.state.useExternal) {
      return this.state.value + this.conditionalBloc().state.count;
    }
    return this.state.value;
  }
}

class ConditionalBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 20 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
}

describe('useBloc - cross-bloc edge cases', () => {
  beforeEach(() => {
    // Clear all instances before each test
    clear(DeepABloc);
    clear(DeepBBloc);
    clear(DeepCBloc);
    clear(DynamicDepBloc);
    clear(ConditionalBloc);
  });

  it('should cleanup external subscriptions on unmount', () => {
    // Create external bloc with object state
    acquire(ConditionalBloc);

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
      borrow(ConditionalBloc).increment();
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);

    // Unmount component
    unmount();

    // Change ConditionalBloc again - should NOT trigger re-render now
    const renderCountBeforeUnmount = renderCount;
    act(() => {
      borrow(ConditionalBloc).increment();
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
          <div data-testid="value">{blocA.computed}</div>
        </div>
      );
    };

    render(<Component />);

    // Initial render: 1 + 10 + 100 = 111
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('value').textContent).toBe('111');

    // Change DeepCBloc (deepest in chain)
    act(() => {
      borrow(DeepCBloc).increment();
    });

    // Should trigger re-render through the chain
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('value').textContent).toBe('112'); // 1 + 10 + 101
  });

  it('should handle dynamically changing dependencies', () => {
    // Create ConditionalBloc instance WITHOUT subscribing to it
    // This way we can test that only the getter dependency triggers re-renders
    acquire(ConditionalBloc);

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
      borrow(ConditionalBloc).increment();
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
      borrow(ConditionalBloc).increment();
    });

    // Render count should not change because we're no longer using external dependency
    expect(renderCount).toBe(prevRenderCount);
  });

  it('should work with getter tracking when bloc has no dependencies', () => {
    class NoDepsBloc extends Cubit<{ value: number; label: string }> {
      constructor() {
        super({ value: 10, label: 'hello' });
      }

      increment = () =>
        this.emit({ ...this.state, value: this.state.value + 1 });

      get formatted() {
        return `${this.state.label}: ${this.state.value}`;
      }
    }

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [, bloc] = useBloc(NoDepsBloc);

      return <div data-testid="value">{bloc.formatted}</div>;
    };

    render(<Component />);

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('value').textContent).toBe('hello: 10');

    act(() => {
      borrow(NoDepsBloc).increment();
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('value').textContent).toBe('hello: 11');

    clear(NoDepsBloc);
  });

  it('should propagate multiple dependency changes through cached deps', () => {
    let renderCount = 0;

    const Component = () => {
      renderCount++;
      useBloc(DeepCBloc);
      useBloc(DeepBBloc);
      const [, blocA] = useBloc(DeepABloc);

      return <div data-testid="value">{blocA.computed}</div>;
    };

    render(<Component />);
    expect(screen.getByTestId('value').textContent).toBe('111'); // 1 + 10 + 100

    // Multiple sequential changes on the deepest dependency
    act(() => {
      borrow(DeepCBloc).increment(); // 101
    });
    expect(screen.getByTestId('value').textContent).toBe('112');

    act(() => {
      borrow(DeepCBloc).increment(); // 102
    });
    expect(screen.getByTestId('value').textContent).toBe('113');

    // Change a mid-level dependency
    act(() => {
      borrow(DeepBBloc).increment(); // 11
    });
    expect(screen.getByTestId('value').textContent).toBe('114'); // 1 + 11 + 102

    // Change both in same act
    act(() => {
      borrow(DeepCBloc).increment(); // 103
      borrow(DeepBBloc).increment(); // 12
    });
    expect(screen.getByTestId('value').textContent).toBe('116'); // 1 + 12 + 103
  });
});

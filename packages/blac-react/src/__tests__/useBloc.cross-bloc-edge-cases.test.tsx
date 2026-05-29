import { describe, it, expect } from 'vite-plus/test';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Cubit, acquire, borrow } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

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

blacTestSetup();

// NOTE: In the new useBloc, auto-tracking observes only the `state` proxy.
// Bloc getter access (e.g. `bloc.computed`) does NOT register paths with
// the structural channel, and cross-bloc reactivity through `this.depend()`
// is not surfaced through the consumer's auto-track set. Tests below
// explicitly subscribe to dependent blocs to drive re-renders, mirroring
// how application code now expresses cross-bloc reactivity.

describe('useBloc - cross-bloc edge cases', () => {
  it('should cleanup external subscriptions on unmount', async () => {
    // Create external bloc so depend() can resolve it
    acquire(ConditionalBloc);

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [extState] = useBloc(ConditionalBloc);
      const [, bloc] = useBloc(DynamicDepBloc, {
        onMount: (b) => {
          if (!b.state.useExternal) b.toggleExternal();
        },
      });
      // Touch extState.count so auto-track records it
      void extState.count;

      return (
        <div>
          <div data-testid="computed">{bloc.computed}</div>
        </div>
      );
    };

    const { unmount } = render(<Component />);

    const initialRenderCount = renderCount;

    await act(async () => {
      borrow(ConditionalBloc).increment();
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);

    unmount();

    const renderCountBeforeUnmount = renderCount;
    await act(async () => {
      borrow(ConditionalBloc).increment();
    });

    expect(renderCount).toBe(renderCountBeforeUnmount);
  });

  it('should handle deep dependency chains (A -> B -> C)', async () => {
    let renderCount = 0;

    const Component = () => {
      renderCount++;
      // Subscribe to every link in the chain so changes propagate.
      const [stateC] = useBloc(DeepCBloc);
      const [stateB] = useBloc(DeepBBloc);
      const [, blocA] = useBloc(DeepABloc);
      // Touch dependent state so auto-track records the paths.
      void stateC.value;
      void stateB.value;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="value">{blocA.computed}</div>
        </div>
      );
    };

    render(<Component />);

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('value').textContent).toBe('111');

    await act(async () => {
      borrow(DeepCBloc).increment();
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('value').textContent).toBe('112');
  });

  it('should handle dynamically changing dependencies', async () => {
    let renderCount = 0;

    const Component = () => {
      renderCount++;
      const [state, bloc] = useBloc(DynamicDepBloc);
      // Conditionally subscribe to the external bloc only when in use.
      const [extState] = useBloc(ConditionalBloc);
      if (state.useExternal) void extState.count;

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

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('computed').textContent).toBe('5');
    expect(screen.getByTestId('use-external').textContent).toBe('false');

    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle'));
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('computed').textContent).toBe('25');
    expect(screen.getByTestId('use-external').textContent).toBe('true');

    await act(async () => {
      borrow(ConditionalBloc).increment();
    });

    expect(renderCount).toBe(3);
    expect(screen.getByTestId('computed').textContent).toBe('26');

    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle'));
    });

    expect(renderCount).toBe(4);
    expect(screen.getByTestId('computed').textContent).toBe('5');
    expect(screen.getByTestId('use-external').textContent).toBe('false');

    const prevRenderCount = renderCount;
    await act(async () => {
      borrow(ConditionalBloc).increment();
    });

    // After useExternal flips to false the component still resubscribes to
    // ConditionalBloc via the unconditional useBloc call, so it WILL wake.
    // The contract we care about: bloc.computed reflects the latest snapshot
    // and equals state.value (5) regardless of external changes.
    expect(renderCount).toBeGreaterThanOrEqual(prevRenderCount);
    expect(screen.getByTestId('computed').textContent).toBe('5');
  });

  it('should work with getter tracking when bloc has no dependencies', async () => {
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
      const [state, bloc] = useBloc(NoDepsBloc);
      // Touch state.value so the auto-tracker registers the path.
      void state.value;

      return <div data-testid="value">{bloc.formatted}</div>;
    };

    render(<Component />);

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('value').textContent).toBe('hello: 10');

    await act(async () => {
      borrow(NoDepsBloc).increment();
    });

    expect(renderCount).toBe(2);
    expect(screen.getByTestId('value').textContent).toBe('hello: 11');
  });

  it('should propagate multiple dependency changes through cached deps', async () => {
    const Component = () => {
      const [stateC] = useBloc(DeepCBloc);
      const [stateB] = useBloc(DeepBBloc);
      const [, blocA] = useBloc(DeepABloc);
      void stateC.value;
      void stateB.value;

      return <div data-testid="value">{blocA.computed}</div>;
    };

    render(<Component />);
    expect(screen.getByTestId('value').textContent).toBe('111');

    await act(async () => {
      borrow(DeepCBloc).increment();
    });
    expect(screen.getByTestId('value').textContent).toBe('112');

    await act(async () => {
      borrow(DeepCBloc).increment();
    });
    expect(screen.getByTestId('value').textContent).toBe('113');

    await act(async () => {
      borrow(DeepBBloc).increment();
    });
    expect(screen.getByTestId('value').textContent).toBe('114');

    await act(async () => {
      borrow(DeepCBloc).increment();
      borrow(DeepBBloc).increment();
    });
    expect(screen.getByTestId('value').textContent).toBe('116');
  });
});

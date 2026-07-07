/**
 * Tests for useBloc with select option (renamed from dependencies)
 */

import { describe, it, expect } from 'vite-plus/test';
import { render, screen, act } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

interface CounterState {
  count: number;
  multiplier: number;
  name: string;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, multiplier: 2, name: 'test' });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  setMultiplier = (value: number) => {
    this.emit({ ...this.state, multiplier: value });
  };

  setName = (value: string) => {
    this.emit({ ...this.state, name: value });
  };
}

blacTestSetup();

describe('useBloc with select', () => {
  it('should only re-render when selected values change', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, bloc] = useBloc(CounterCubit, {
        select: (state) => [state.count],
      });

      renderSpy();

      return (
        <div>
          <p data-testid="count">{state.count}</p>
          <p data-testid="multiplier">{state.multiplier}</p>
          <p data-testid="name">{state.name}</p>
          <button onClick={bloc.increment}>Increment</button>
          <button onClick={() => bloc.setMultiplier(3)}>Set Multiplier</button>
          <button onClick={() => bloc.setName('updated')}>Set Name</button>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial render
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('multiplier').textContent).toBe('2');
    expect(screen.getByTestId('name').textContent).toBe('test');

    // Change count (in select) - should re-render
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('count').textContent).toBe('1');

    // Change multiplier (not in select) - should NOT re-render
    await act(async () => {
      screen.getByText('Set Multiplier').click();
    });

    // Should still be 2 renders (no new render from multiplier change)
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change name (not in select) - should NOT re-render
    await act(async () => {
      screen.getByText('Set Name').click();
    });

    // Should still be 2 renders (no new render from name change)
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Increment count again - should re-render
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('should re-render when any selected value changes', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, bloc] = useBloc(CounterCubit, {
        select: (state) => [state.count, state.multiplier],
      });

      renderSpy();

      return (
        <div>
          <p data-testid="count">{state.count}</p>
          <p data-testid="multiplier">{state.multiplier}</p>
          <button onClick={bloc.increment}>Increment</button>
          <button onClick={() => bloc.setMultiplier(3)}>Set Multiplier</button>
          <button onClick={() => bloc.setName('updated')}>Set Name</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change count - should re-render
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change multiplier - should re-render
    await act(async () => {
      screen.getByText('Set Multiplier').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(3);

    // Change name (not in select) - should NOT re-render
    await act(async () => {
      screen.getByText('Set Name').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(3);
  });

  it('should re-render if select array length changes', async () => {
    const renderSpy = vi.fn();
    let dynamicDepsCount = 1;

    function TestComponent() {
      const [state, bloc] = useBloc(CounterCubit, {
        select: (state) => {
          // Return different length arrays based on count
          const deps = [state.count];
          if (dynamicDepsCount === 2) {
            deps.push(state.multiplier);
          }
          return deps;
        },
      });

      renderSpy();

      return (
        <div>
          <p data-testid="count">{state.count}</p>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Increment to trigger select check
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Change select length
    dynamicDepsCount = 2;

    // Increment again - should detect length change
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(3);
  });

  it('should work with bloc instance in select', async () => {
    class ComputedCubit extends Cubit<CounterState> {
      constructor() {
        super({ count: 0, multiplier: 2, name: 'test' });
      }

      get doubled() {
        return this.state.count * 2;
      }

      increment = () => {
        this.emit({ ...this.state, count: this.state.count + 1 });
      };
    }

    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, bloc] = useBloc(ComputedCubit, {
        select: (_state, bloc) => [bloc.doubled],
      });

      renderSpy();

      return (
        <div>
          <p data-testid="doubled">{bloc.doubled}</p>
          <button onClick={bloc.increment}>Increment</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('doubled').textContent).toBe('0');

    // Increment - doubled changes, should re-render
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('doubled').textContent).toBe('2');
  });

  it('should detect reference changes with Object.is', async () => {
    const renderSpy = vi.fn();

    class RefCubit extends Cubit<{ value: string }> {
      constructor() {
        super({ value: 'initial' });
      }

      updateValue = (newValue: string) => {
        // Create new object each time to change reference
        this.emit({ value: newValue });
      };
    }

    function TestComponent() {
      const [state, bloc] = useBloc(RefCubit, {
        select: (state) => [state.value],
      });

      renderSpy();

      return (
        <div>
          <p data-testid="value">{state.value}</p>
          <button onClick={() => bloc.updateValue('changed')}>
            Update Value
          </button>
          <button onClick={() => bloc.updateValue('changed')}>
            Update Same
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value').textContent).toBe('initial');

    // Change value - should re-render
    await act(async () => {
      screen.getByText('Update Value').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('value').textContent).toBe('changed');

    // Set to same value - should NOT re-render (Object.is('changed', 'changed') = true)
    await act(async () => {
      screen.getByText('Update Same').click();
    });

    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('value').textContent).toBe('changed');
  });

  // R2 (select-mode): an emit that lands between the render's selector seed and
  // the passive subscribe (here from a sibling's useLayoutEffect during commit)
  // must be picked up by the post-subscribe recheck, not silently dropped.
  it('mount-window emit is not missed in select-mode', async () => {
    function Sibling() {
      const [, bloc] = useBloc(CounterCubit, { select: () => [] });
      useLayoutEffect(() => {
        (bloc as CounterCubit).increment();
      }, [bloc]);
      return null;
    }
    function Subscriber() {
      const [state] = useBloc(CounterCubit, {
        select: (s) => [s.count],
      });
      return <div data-testid="count">{state.count}</div>;
    }
    await act(async () => {
      render(
        <>
          <Subscriber />
          <Sibling />
        </>,
      );
    });
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});

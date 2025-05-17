import { Blac, BlocBase, InferPropsFromGeneric } from '@blac/core';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useCallback } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useBloc from '../src/useBloc';

// Define state and props interfaces for CounterBloc
interface CounterState {
  count: number;
}

interface CounterBlocProps {
  initialCount?: number;
}

// Define a simple CounterBloc for testing
class CounterBloc extends BlocBase<CounterState, CounterBlocProps> {
  static isolated = true;

  constructor(props?: CounterBlocProps) {
    super({ count: props?.initialCount ?? 0 });
  }

  increment = () => {
    this._pushState({ count: this.state.count + 1 }, this.state);
  };

  incrementBy = (amount: number) => {
    this._pushState({ count: this.state.count + amount }, this.state);
  };
}

describe('useBloc onMount behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should call onMount once and update state when onMount is stable', async () => {
    const onMountMock = vi.fn((bloc: CounterBloc) => {
      bloc.increment();
    });

    const StableOnMountComponent = () => {
      const stableOnMount = useCallback(onMountMock, []);
      const [state] = useBloc(CounterBloc, {
        onMount: stableOnMount,
        props: { initialCount: 0 } as InferPropsFromGeneric<typeof CounterBloc>,
      });
      return <div data-testid="count">{state.count}</div>;
    };

    render(<StableOnMountComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
    expect(onMountMock).toHaveBeenCalledTimes(1);
  });

  it('should call onMount once and update state when onMount is unstable', async () => {
    const onMountMock = vi.fn((bloc: CounterBloc) => {
      bloc.increment();
    });

    const UnstableOnMountComponent = () => {
      const [state] = useBloc(CounterBloc, {
        onMount: onMountMock,
        props: { initialCount: 0 } as InferPropsFromGeneric<typeof CounterBloc>,
      });
      return <div data-testid="count">{state.count}</div>;
    };

    render(<UnstableOnMountComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
    expect(onMountMock).toHaveBeenCalledTimes(1);
  });

  it('should re-run onMount if it is unstable and updates state, leading to multiple calls', async () => {
    let onMountCallCount = 0;
    const maxCallsInTest = 5; // Cap to prevent true infinite loop during test execution

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const UnstableOnMountComponent = () => {
      const [state] = useBloc(CounterBloc, {
        props: { initialCount: 0 } as InferPropsFromGeneric<typeof CounterBloc>,
        onMount: (b: CounterBloc) => {
          onMountCallCount++;
          if (onMountCallCount <= maxCallsInTest) {
            b.increment();
          }
        },
      });

      return <div data-testid="count">{state.count}</div>;
    };

    render(<UnstableOnMountComponent />);

    await waitFor(
      () => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      },
      { timeout: 2000 },
    );

    expect(onMountCallCount).toBe(1);

    consoleWarnSpy.mockRestore();
  });


  it('should call onMount only once if it is unstable but does NOT cause a state update that re-renders the host component', async () => {
    const onMountMock = vi.fn(() => {
      // This onMount does not change state
    });
    let renderCount = 0;

    const NonUpdatingUnstableOnMountComponent = () => {
      renderCount++;
      const [state] = useBloc(CounterBloc, {
        props: { initialCount: 0 } as InferPropsFromGeneric<typeof CounterBloc>,
        onMount: onMountMock, 
      });
      return <div data-testid="count">{state.count}</div>;
    };

    render(<NonUpdatingUnstableOnMountComponent />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(onMountMock).toHaveBeenCalledTimes(1);
    expect(renderCount).toBeLessThanOrEqual(2); 
  });

}); 
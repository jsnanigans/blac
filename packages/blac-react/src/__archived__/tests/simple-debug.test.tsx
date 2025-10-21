import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useBloc } from '../index';
import { Cubit, Blac } from '@blac/core';

// Simple counter
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    console.log('[CounterCubit] Before increment:', this.state);
    this.emit(this.state + 1);
    console.log('[CounterCubit] After increment:', this.state);
  };
}

// Isolated counter
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(0);
  }

  increment = () => {
    console.log('[IsolatedCounterCubit] Before increment:', this.state);
    this.emit(this.state + 1);
    console.log('[IsolatedCounterCubit] After increment:', this.state);
  };
}

describe('Simple debug test', () => {
  beforeEach(() => {
    Blac.setConfig({ proxyDependencyTracking: true });
    Blac.resetInstance();
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should increment counter', async () => {
    const Counter: React.FC = () => {
      console.log('[Counter] Rendering');
      const [state, cubit] = useBloc(CounterCubit);
      console.log('[Counter] State:', state);

      return (
        <div>
          <span data-testid="count">{state}</span>
          <button
            onClick={() => {
              console.log('[Button] Clicked');
              cubit.increment();
            }}
            data-testid="inc"
          >
            +
          </button>
        </div>
      );
    };

    console.log('=== Mounting ===');
    render(<Counter />);

    console.log('Initial:', screen.getByTestId('count').textContent);
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('=== Clicking ===');
    act(() => {
      screen.getByTestId('inc').click();
    });

    console.log('After click:', screen.getByTestId('count').textContent);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should increment isolated counter', async () => {
    const Counter: React.FC = () => {
      console.log('[IsolatedCounter] Rendering');
      const [state, cubit] = useBloc(IsolatedCounterCubit);
      console.log('[IsolatedCounter] State:', state);

      return (
        <div>
          <span data-testid="count">{state}</span>
          <button
            onClick={() => {
              console.log('[IsolatedButton] Clicked');
              cubit.increment();
            }}
            data-testid="inc"
          >
            +
          </button>
        </div>
      );
    };

    console.log('=== Mounting Isolated ===');
    render(<Counter />);

    console.log('Initial isolated:', screen.getByTestId('count').textContent);
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('=== Clicking Isolated ===');
    act(() => {
      screen.getByTestId('inc').click();
    });

    console.log(
      'After click isolated:',
      screen.getByTestId('count').textContent,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should work with strict mode and isolated bloc', async () => {
    const Counter: React.FC = () => {
      console.log('[StrictIsolatedCounter] Rendering');
      const [state, cubit] = useBloc(IsolatedCounterCubit);
      console.log(
        '[StrictIsolatedCounter] State:',
        state,
        'Bloc UID:',
        (cubit as any).uid,
      );

      return (
        <div>
          <span data-testid="count">{state}</span>
          <button
            onClick={() => {
              console.log(
                '[StrictIsolatedButton] Clicked, Bloc UID:',
                (cubit as any).uid,
              );
              cubit.increment();
            }}
            data-testid="inc"
          >
            +
          </button>
        </div>
      );
    };

    console.log('=== Mounting Strict Isolated ===');
    render(
      <React.StrictMode>
        <Counter />
      </React.StrictMode>,
    );

    console.log(
      'Initial strict isolated:',
      screen.getByTestId('count').textContent,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('=== Clicking Strict Isolated ===');
    act(() => {
      screen.getByTestId('inc').click();
    });

    console.log(
      'After click strict isolated:',
      screen.getByTestId('count').textContent,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

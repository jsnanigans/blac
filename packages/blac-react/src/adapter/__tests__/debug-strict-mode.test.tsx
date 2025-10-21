/**
 * Debug test to understand Strict Mode behavior
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '../../index';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    console.log('=== INCREMENT CALLED, current state:', this.state);
    this.emit({ count: this.state.count + 1 });
    console.log('=== AFTER INCREMENT, new state:', this.state);
  };
}

describe('Debug Strict Mode', () => {
  it('should work in Strict Mode', async () => {
    Blac.resetInstance();

    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={() => bloc.increment()}>Increment</button>
        </div>
      );
    };

    console.log('\n=== RENDER START ===\n');
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>,
    );
    console.log('\n=== RENDER COMPLETE ===\n');

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('\n=== CLICKING BUTTON ===\n');
    await act(async () => {
      screen.getByText('Increment').click();
    });
    console.log('\n=== CLICK COMPLETE ===\n');

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should work WITHOUT Strict Mode', async () => {
    Blac.resetInstance();

    const Component = () => {
      const [state, bloc] = useBloc(CounterCubit);
      return (
        <div>
          <span data-testid="count">{state.count}</span>
          <button onClick={() => bloc.increment()}>Increment</button>
        </div>
      );
    };

    console.log('\n=== RENDER START (NO STRICT MODE) ===\n');
    render(<Component />);
    console.log('\n=== RENDER COMPLETE (NO STRICT MODE) ===\n');

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('\n=== CLICKING BUTTON (NO STRICT MODE) ===\n');
    await act(async () => {
      screen.getByText('Increment').click();
    });
    console.log('\n=== CLICK COMPLETE (NO STRICT MODE) ===\n');

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

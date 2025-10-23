/**
 * Debug test to trace dependency tracking flow in Strict Mode
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { Cubit, Blac } from '@blac/core';
import { useBloc } from '../../index';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    console.log('\n========== INCREMENT CALLED ==========');
    console.log('Current state:', this.state);
    this.emit({ count: this.state.count + 1 });
    console.log('New state:', this.state);
    console.log('======================================\n');
  };
}

describe('Debug Dependency Tracking Flow', () => {
  it('should track dependencies correctly in Strict Mode', async () => {
    Blac.resetInstance();

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      console.log(`\n========== COMPONENT RENDER #${renderCount} ==========`);

      const [state, bloc] = useBloc(CounterCubit);

      console.log(`Rendering with state:`, state);
      console.log('About to access state.count...');
      const count = state.count;
      console.log(`Accessed state.count:`, count);
      console.log('=========================================\n');

      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => bloc.increment()}>Increment</button>
        </div>
      );
    };

    console.log('\n🔴 ========== RENDERING IN STRICT MODE ==========\n');
    render(
      <React.StrictMode>
        <Component />
      </React.StrictMode>,
    );
    console.log('\n🔴 ========== RENDER COMPLETE ==========\n');

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('\n🔵 ========== CLICKING BUTTON ==========\n');
    await act(async () => {
      screen.getByText('Increment').click();
    });
    console.log('\n🔵 ========== CLICK COMPLETE ==========\n');

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should track dependencies correctly WITHOUT Strict Mode', async () => {
    Blac.resetInstance();

    let renderCount = 0;

    const Component = () => {
      renderCount++;
      console.log(`\n========== COMPONENT RENDER #${renderCount} ==========`);

      const [state, bloc] = useBloc(CounterCubit);

      console.log(`Rendering with state:`, state);
      console.log('About to access state.count...');
      const count = state.count;
      console.log(`Accessed state.count:`, count);
      console.log('=========================================\n');

      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => bloc.increment()}>Increment</button>
        </div>
      );
    };

    console.log('\n🟢 ========== RENDERING WITHOUT STRICT MODE ==========\n');
    render(<Component />);
    console.log('\n🟢 ========== RENDER COMPLETE ==========\n');

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    console.log('\n🟢 ========== CLICKING BUTTON ==========\n');
    await act(async () => {
      screen.getByText('Increment').click();
    });
    console.log('\n🟢 ========== CLICK COMPLETE ==========\n');

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

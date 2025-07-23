import { render, screen, act } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface TestState {
  counter: number;
  text: string;
}

class TestCubit extends Cubit<TestState> {
  static isolated = true; // Use isolated instances to avoid cross-component interference

  constructor() {
    super({ counter: 0, text: 'initial' });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (text: string) => {
    this.patch({ text });
  };

  get textLength(): number {
    return this.state.text.length;
  }
}

describe('ComponentDependencyTracker', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should isolate dependency tracking between components', () => {
    let counterCompRenders = 0;
    let textCompRenders = 0;

    const CounterComponent: React.FC = () => {
      counterCompRenders++;
      const [state, cubit] = useBloc(TestCubit);
      return (
        <div>
          <span data-testid="counter">{state.counter}</span>
          <button data-testid="increment" onClick={cubit.incrementCounter}>
            Increment
          </button>
        </div>
      );
    };

    const TextComponent: React.FC = () => {
      textCompRenders++;
      const [state, cubit] = useBloc(TestCubit);
      return (
        <div>
          <span data-testid="text">{state.text}</span>
          <span data-testid="text-length">{cubit.textLength}</span>
          <button
            data-testid="update-text"
            onClick={() => cubit.updateText('updated')}
          >
            Update Text
          </button>
        </div>
      );
    };

    const App: React.FC = () => (
      <div>
        <CounterComponent />
        <TextComponent />
      </div>
    );

    render(<App />);

    // Initial renders
    expect(counterCompRenders).toBe(1);
    expect(textCompRenders).toBe(1);

    // Increment counter - should only re-render CounterComponent
    act(() => {
      screen.getByTestId('increment').click();
    });

    expect(screen.getByTestId('counter')).toHaveTextContent('1');
    expect(counterCompRenders).toBe(2);
    expect(textCompRenders).toBe(1); // Should NOT re-render

    // Update text - should only re-render TextComponent
    act(() => {
      screen.getByTestId('update-text').click();
    });

    expect(screen.getByTestId('text')).toHaveTextContent('updated');
    expect(screen.getByTestId('text-length')).toHaveTextContent('7');
    expect(counterCompRenders).toBe(2); // Should NOT re-render
    expect(textCompRenders).toBe(2);
  });

  it('should track getter dependencies correctly', () => {
    let renderCount = 0;

    const GetterComponent: React.FC = () => {
      renderCount++;
      const [state, cubit] = useBloc(TestCubit);
      return (
        <div>
          <span data-testid="getter-value">{cubit.textLength}</span>
          <button
            data-testid="increment-counter"
            onClick={cubit.incrementCounter}
          >
            Increment Counter
          </button>
          <button
            data-testid="update-text"
            onClick={() => cubit.updateText(state.text + '!')}
          >
            Update Text
          </button>
        </div>
      );
    };

    render(<GetterComponent />);

    expect(renderCount).toBe(1);

    // Increment counter - should NOT cause re-render since getter doesn't depend on counter
    act(() => {
      screen.getByTestId('increment-counter').click();
    });

    expect(renderCount).toBe(1); // Should NOT re-render

    // Update text - should cause re-render since getter depends on text
    act(() => {
      screen.getByTestId('update-text').click();
    });

    expect(screen.getByTestId('getter-value')).toHaveTextContent('8'); // 'initial!'
    expect(renderCount).toBe(2); // Should re-render
  });
});
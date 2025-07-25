import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';
import { render, screen } from '@testing-library/react';

interface TestState {
  counter: number;
  text: string;
}

describe('useBloc dynamic dependency tracking', () => {
  it.skip('should track dependencies dynamically based on conditional rendering', () => {
    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ counter: 0, text: 'hello' });
      }

      incrementCounter() {
        console.log('Incrementing counter:', this.state.counter + 1);
        this.patch({ counter: this.state.counter + 1 });
      }

      addText(text: string) {
        console.log('Adding text:', text);
        this.patch({ text: `${this.state.text} ${text}` });
      }
    }
    const renderCount = vi.fn();

    const DynamicDependencyComponent: React.FC = () => {
      const [showCounter, setShowCounter] = React.useState(false);
      const [state, cubit, x] = useBloc(TestCubit);

      React.useEffect(() => {
        renderCount();
        console.log(x);
      });

      return (
        <div>
          <button onClick={() => setShowCounter(!showCounter)}>
            Toggle Counter Display
          </button>

          {showCounter && (
            <div data-testid="counter">Counter: {state.counter}</div>
          )}

          <div data-testid="text">Text: {state.text}</div>

          <button onClick={() => cubit.incrementCounter()}>
            Increment Counter
          </button>

          <button onClick={() => cubit.addText('world')}>Update Text</button>
        </div>
      );
    };

    const { getByText } = render(<DynamicDependencyComponent />);

    // Initial render
    expect(renderCount).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('counter')).not.toBeInTheDocument();

    // Update counter when it's not displayed - should NOT re-render
    act(() => {
      getByText('Increment Counter').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(1); // No re-render

    // Update text (which is always displayed) - should re-render
    act(() => {
      getByText('Update Text').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(2); // Re-render for text change
    expect(screen.getByTestId('text')).toHaveTextContent('Text: hello world');

    // Toggle to show counter - should re-render to show toggle state change
    act(() => {
      getByText('Toggle Counter Display').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('counter')).toHaveTextContent('Counter: 1');

    // Now increment counter when it IS displayed - should re-render
    act(() => {
      getByText('Increment Counter').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(4); // Re-render for counter change
    expect(screen.getByTestId('counter')).toHaveTextContent('Counter: 2');

    // Toggle to hide counter again
    act(() => {
      getByText('Toggle Counter Display').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(5);
    expect(screen.queryByTestId('counter')).not.toBeInTheDocument();

    // Increment counter when it's hidden again - should NOT re-render
    act(() => {
      getByText('Increment Counter').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(5); // No re-render
  });

  /*
  it('should handle multiple conditional dependencies', () => {
    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ counter: 0, text: 'hello' });
      }

      incrementCounter() {
        this.patch({ counter: this.state.counter + 1 });
      }

      addText(text: string) {
        this.patch({ text: `${this.state.text} ${text}` });
      }
    }
    const renderCount = vi.fn();

    const MultiConditionalComponent: React.FC = () => {
      const [showA, setShowA] = React.useState(true);
      const [showB, setShowB] = React.useState(false);
      const [state, cubit] = useBloc(TestCubit);

      React.useEffect(() => {
        renderCount();
      });

      return (
        <div>
          <button onClick={() => setShowA(!showA)}>Toggle A</button>
          <button onClick={() => setShowB(!showB)}>Toggle B</button>

          {showA && <div data-testid="show-a">Counter: {state.counter}</div>}
          {showB && <div data-testid="show-b">Text: {state.text}</div>}

          <button onClick={() => cubit.incrementCounter()}>Inc</button>
          <button onClick={() => cubit.addText('changed')}>Text</button>
        </div>
      );
    };

    const { getByText } = render(<MultiConditionalComponent />);

    // Initial render - showA is true, showB is false
    expect(renderCount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('show-a')).toBeInTheDocument();
    expect(screen.queryByTestId('show-b')).not.toBeInTheDocument();

    // Update counter (showA displays it) - should re-render
    act(() => {
      getByText('Inc').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(2);

    // Update text (showB is false, doesn't display it) - should NOT re-render
    act(() => {
      getByText('Text').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(2); // No re-render

    // Toggle B to show text
    act(() => {
      getByText('Toggle B').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('show-b')).toHaveTextContent('Text: changed');

    // Now text updates should cause re-renders
    act(() => {
      getByText('Text').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(4);

    // Toggle A to hide counter
    act(() => {
      getByText('Toggle A').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(5);

    // Counter updates should NOT cause re-renders anymore
    act(() => {
      getByText('Inc').click();
    });
    expect(renderCount).toHaveBeenCalledTimes(5); // No re-render
   }); */
});


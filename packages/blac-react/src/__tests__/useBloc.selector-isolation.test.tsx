import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';
import { render, screen } from '@testing-library/react';

interface TestState {
  counter: number;
  text: string;
  anotherValue: number;
}

describe('useBloc selector isolation', () => {
  it('should not rerender when only accessing methods', () => {
    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ counter: 1, text: '', anotherValue: 0 });
      }

      incrementCounter() {
        this.patch({ counter: this.state.counter + 1 });
      }

      updateText(text: string) {
        this.patch({ text });
      }

      updateAnotherValue(value: number) {
        this.patch({ anotherValue: value });
      }
    }
    const renderCount1 = vi.fn();

    // Component 1: No selector (uses proxy tracking)
    const Component1: React.FC = () => {
      const [, b] = useBloc(TestCubit);
      React.useEffect(() => {
        renderCount1();
      });
      return <button onClick={() => b.incrementCounter()}>Increment</button>;
    };

    // Render all components
    render(<Component1 />);

    // Initial render
    expect(renderCount1).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useBloc(TestCubit));
    const [, cubit] = result.current;

    act(() => {
      cubit.incrementCounter();
    });

    // should not re-render since we only accessed methods
    expect(renderCount1).toHaveBeenCalledTimes(1);
  });

  it('should isolate dependency tracking between components using the same Bloc', () => {
    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ counter: 1, text: '', anotherValue: 0 });
      }

      incrementCounter() {
        this.patch({ counter: this.state.counter + 1 });
      }

      updateText(text: string) {
        this.patch({ text });
      }

      updateAnotherValue(value: number) {
        this.patch({ anotherValue: value });
      }
    }
    const renderCount1 = vi.fn();
    const renderCount2 = vi.fn();
    const renderCount3 = vi.fn();

    // Component 1: No selector (uses proxy tracking)
    const Component1: React.FC = () => {
      const [state] = useBloc(TestCubit);
      React.useEffect(() => {
        renderCount1();
      });
      return <div data-testid="comp1">Counter: {state.counter}</div>;
    };

    // Component 2: Custom selector that only tracks text
    const Component2: React.FC = () => {
      const [state] = useBloc(TestCubit, {
        selector: (state) => [state.text],
      });
      React.useEffect(() => {
        renderCount2();
      });
      return <div data-testid="comp2">Text: {state.text}</div>;
    };

    // Component 3: Custom selector that only tracks anotherValue
    const Component3: React.FC = () => {
      const [state] = useBloc(TestCubit, {
        selector: (state) => [state.anotherValue],
      });
      React.useEffect(() => {
        renderCount3();
      });
      return <div data-testid="comp3">Another: {state.anotherValue}</div>;
    };

    // Render all components
    const { rerender } = render(
      <div>
        <Component1 />
        <Component2 />
        <Component3 />
      </div>,
    );

    // Initial render
    expect(renderCount1).toHaveBeenCalledTimes(1);
    expect(renderCount2).toHaveBeenCalledTimes(1);
    expect(renderCount3).toHaveBeenCalledTimes(1);

    // Get cubit instance to trigger updates
    const { result } = renderHook(() => useBloc(TestCubit));
    const [, cubit] = result.current;

    // Update counter - should only re-render Component1
    act(() => {
      cubit.incrementCounter();
    });

    // only counter changed, so Component1 should re-render
    expect(renderCount1).toHaveBeenCalledTimes(2); // Should re-render (tracks counter via proxy)
    expect(renderCount2).toHaveBeenCalledTimes(1); // Should NOT re-render (tracks text via selector)
    expect(renderCount3).toHaveBeenCalledTimes(1); // Should NOT re-render (tracks anotherValue via selector)

    // Update text - should re-render Component1 and Component2
    act(() => {
      cubit.updateText('hello');
    });

    // text changed, so only Component2 should re-render
    expect(renderCount1).toHaveBeenCalledTimes(2); // Should NOT re-render (tracks counter via proxy)
    expect(renderCount2).toHaveBeenCalledTimes(2); // Should re-render (tracks text via selector)
    expect(renderCount3).toHaveBeenCalledTimes(1); // Should NOT re-render (tracks anotherValue via selector)

    // Update anotherValue - should re-render Component1 and Component3
    act(() => {
      cubit.updateAnotherValue(42);
    });

    // anotherValue changed, so only Component3 should re-render
    expect(renderCount1).toHaveBeenCalledTimes(2); // Should NOT re-render (tracks counter via proxy)
    expect(renderCount2).toHaveBeenCalledTimes(2); // Should NOT re-render (tracks text via selector)
    expect(renderCount3).toHaveBeenCalledTimes(2); // Should re-render (tracks anotherValue via selector)
  });

  it('should not pollute dependency tracking when components mount in sequence', () => {
    class TestCubit extends Cubit<TestState> {
      constructor() {
        super({ counter: 1, text: '', anotherValue: 0 });
      }

      incrementCounter() {
        this.patch({ counter: this.state.counter + 1 });
      }

      updateText(text: string) {
        this.patch({ text });
      }

      updateAnotherValue(value: number) {
        this.patch({ anotherValue: value });
      }
    }
    const renderCounts = {
      parentWithProxyForCount: vi.fn(),
      childWithSelectorForDivBy3: vi.fn(),
      childWithProxyForText: vi.fn(),
      childWithOnlyMethodAccess: vi.fn(),
    };

    // Parent component without selector
    const ParentComponent: React.FC = () => {
      const [state, cubit] = useBloc(TestCubit);
      React.useEffect(() => {
        renderCounts.parentWithProxyForCount();
      });

      const [showChildren, setShowChildren] = React.useState(false);

      return (
        <div>
          <div data-testid="parent">Parent counter: {state.counter}</div>
          <button onClick={() => setShowChildren(true)}>Show children</button>
          <button onClick={() => cubit.incrementCounter()}>Increment</button>
          <button onClick={() => cubit.updateText('test')}>Update text</button>
          {showChildren && (
            <>
              <ChildWithSelector />
              <ChildWithoutSelector />
            </>
          )}
          <ChildWithOnlyMethodAccess />
        </div>
      );
    };

    // Child with custom selector
    const ChildWithSelector: React.FC = React.memo(() => {
      const [state] = useBloc(TestCubit, {
        selector: (state) => {
          console.log('ChildWithSelector selector called', state.counter);
          return [state.counter % 3 === 0]; // Only track if counter is divisible by 3
        },
      });
      React.useEffect(() => {
        renderCounts.childWithSelectorForDivBy3();
      });
      return (
        <div data-testid="child-selector">
          Even: {state.counter % 2 === 0 ? 'yes' : 'no'}
        </div>
      );
    });

    const ChildWithOnlyMethodAccess: React.FC = React.memo(() => {
      const [, b] = useBloc(TestCubit);
      React.useEffect(() => {
        renderCounts.childWithOnlyMethodAccess();
      });
      return <button onClick={() => b.updateText('test')}>Update Text</button>;
    });

    // Child without selector
    const ChildWithoutSelector: React.FC = React.memo(() => {
      const [state] = useBloc(TestCubit);
      React.useEffect(() => {
        renderCounts.childWithProxyForText();
      });
      return <div data-testid="child-no-selector">Text: {state.text}</div>;
    });

    const { getByText } = render(<ParentComponent />);

    // Initial render - only parent
    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(1);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(0);
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(0);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Show children, should render children and parent
    act(() => {
      getByText('Show children').click();
    });

    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(1);
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(1);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Update text - should NOT re-render child with selector for divisibility by 3
    act(() => {
      getByText('Update text').click();
    });

    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(3);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(1); // Should NOT re-render
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Increment counter from 1 to 2 (not div. by 3) same - should not re-render child with selector
    act(() => {
      getByText('Increment').click();
    });
    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(4);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(1); // Should re-render (even/odd changed)
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Increment counter from 2 to 3 (is div. by 3) changed - should re-render child with selector
    act(() => {
      getByText('Increment').click();
    });
    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(5);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(2); // Should re-render (even/odd changed)
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Increment counter from 3 to 4 (not div. by 3) changed - should re-render child with selector
    act(() => {
      getByText('Increment').click();
    });

    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(6);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(3); // Should re-render (even/odd changed)
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Increment counter from 2 to 3 (even to odd) - should re-render child with selector
    act(() => {
      getByText('Increment').click();
    });

    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(7);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(3); // Should re-render (even/odd changed)
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);

    // Increment counter from 3 to 4 (odd to even) - should re-render child with selector
    act(() => {
      getByText('Increment').click();
    });

    expect(renderCounts.parentWithProxyForCount).toHaveBeenCalledTimes(8);
    expect(renderCounts.childWithSelectorForDivBy3).toHaveBeenCalledTimes(4); // Should re-render (even/odd changed)
    expect(renderCounts.childWithProxyForText).toHaveBeenCalledTimes(2);
    expect(renderCounts.childWithOnlyMethodAccess).toHaveBeenCalledTimes(1);
  });
});


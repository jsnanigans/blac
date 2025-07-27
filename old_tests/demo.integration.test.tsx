import { render, screen, act } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface ComplexDemoState {
  counter: number;
  text: string;
  flag: boolean;
  nested: {
    value: number;
    deepValue: string;
  };
}

class DemoComplexStateCubit extends Cubit<ComplexDemoState> {
  // NOT isolated - shared instance like in the real demo
  constructor() {
    super({
      counter: 0,
      text: 'Initial Text',
      flag: false,
      nested: {
        value: 100,
        deepValue: 'Deep initial',
      },
    });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (newText: string) => this.patch({ text: newText });

  toggleFlag = () => this.patch({ flag: !this.state.flag });

  updateNestedValue = (newValue: number) => 
    this.patch({ nested: { ...this.state.nested, value: newValue } });

  get textLength(): number {
    return this.state.text.length;
  }
}

describe('Demo Integration Test', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should replicate demo dependency tracking behavior', () => {
    let counterRenders = 0;
    let textRenders = 0;
    let flagRenders = 0;
    let nestedRenders = 0;
    let getterRenders = 0;

    const DisplayCounter: React.FC = React.memo(() => {
      counterRenders++;
      const [state] = useBloc(DemoComplexStateCubit);
      return <span data-testid="counter">{state.counter}</span>;
    });

    const DisplayText: React.FC = React.memo(() => {
      textRenders++;
      const [state] = useBloc(DemoComplexStateCubit);
      return <span data-testid="text">{state.text}</span>;
    });

    const DisplayFlag: React.FC = React.memo(() => {
      flagRenders++;
      const [state] = useBloc(DemoComplexStateCubit);
      return <span data-testid="flag">{state.flag ? 'TRUE' : 'FALSE'}</span>;
    });

    const DisplayNestedValue: React.FC = React.memo(() => {
      nestedRenders++;
      const [state] = useBloc(DemoComplexStateCubit);
      return <span data-testid="nested">{state.nested.value}</span>;
    });

    const DisplayTextLengthGetter: React.FC = React.memo(() => {
      getterRenders++;
      const [, cubit] = useBloc(DemoComplexStateCubit);
      return <span data-testid="getter">{cubit.textLength}</span>;
    });

    const Controller: React.FC = () => {
      const [, cubit] = useBloc(DemoComplexStateCubit);
      return (
        <>
          <button data-testid="inc-counter" onClick={cubit.incrementCounter}>
            Increment Counter
          </button>
          <button data-testid="update-text" onClick={() => cubit.updateText('Updated!')}>
            Update Text
          </button>
          <button data-testid="toggle-flag" onClick={cubit.toggleFlag}>
            Toggle Flag
          </button>
          <button data-testid="update-nested" onClick={() => cubit.updateNestedValue(200)}>
            Update Nested
          </button>
        </>
      );
    };

    const App: React.FC = () => (
      <div>
        <DisplayCounter />
        <DisplayText />
        <DisplayFlag />
        <DisplayNestedValue />
        <DisplayTextLengthGetter />
        <Controller />
      </div>
    );

    render(<App />);

    // Initial renders
    expect(counterRenders).toBe(1);
    expect(textRenders).toBe(1);
    expect(flagRenders).toBe(1);
    expect(nestedRenders).toBe(1);
    expect(getterRenders).toBe(1);

    // Test 1: Increment counter - should only re-render DisplayCounter
    act(() => {
      screen.getByTestId('inc-counter').click();
    });

    expect(screen.getByTestId('counter')).toHaveTextContent('1');
    expect(counterRenders).toBe(2); // Should re-render
    expect(textRenders).toBe(1);    // Should NOT re-render
    expect(flagRenders).toBe(1);    // Should NOT re-render
    expect(nestedRenders).toBe(1);  // Should NOT re-render
    expect(getterRenders).toBe(1);  // Should NOT re-render

    // Test 2: Update text - should re-render DisplayText and DisplayTextLengthGetter
    act(() => {
      screen.getByTestId('update-text').click();
    });

    expect(screen.getByTestId('text')).toHaveTextContent('Updated!');
    expect(screen.getByTestId('getter')).toHaveTextContent('8'); // 'Updated!' has 8 chars
    expect(counterRenders).toBe(2); // Should NOT re-render
    expect(textRenders).toBe(2);    // Should re-render
    expect(flagRenders).toBe(1);    // Should NOT re-render
    expect(nestedRenders).toBe(1);  // Should NOT re-render
    expect(getterRenders).toBe(2);  // Should re-render (getter depends on text)

    // Test 3: Toggle flag - should only re-render DisplayFlag
    act(() => {
      screen.getByTestId('toggle-flag').click();
    });

    expect(screen.getByTestId('flag')).toHaveTextContent('TRUE');
    expect(counterRenders).toBe(2); // Should NOT re-render
    expect(textRenders).toBe(2);    // Should NOT re-render
    expect(flagRenders).toBe(2);    // Should re-render
    expect(nestedRenders).toBe(1);  // Should NOT re-render
    expect(getterRenders).toBe(2);  // Should NOT re-render

    // Test 4: Update nested value - should only re-render DisplayNestedValue
    act(() => {
      screen.getByTestId('update-nested').click();
    });

    expect(screen.getByTestId('nested')).toHaveTextContent('200');
    expect(counterRenders).toBe(2); // Should NOT re-render
    expect(textRenders).toBe(2);    // Should NOT re-render
    expect(flagRenders).toBe(2);    // Should NOT re-render
    expect(nestedRenders).toBe(2);  // Should re-render
    expect(getterRenders).toBe(2);  // Should NOT re-render
  });
});
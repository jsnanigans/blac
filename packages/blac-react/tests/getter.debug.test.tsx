import { render, screen, act } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface TestState {
  counter: number;
  text: string;
}

class GetterTestCubit extends Cubit<TestState> {
  static isolated = true;

  constructor() {
    super({ counter: 0, text: 'initial' });
  }

  incrementCounter = () => {
    console.log('Incrementing counter from', this.state.counter, 'to', this.state.counter + 1);
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (text: string) => {
    console.log('Updating text from', this.state.text, 'to', text);
    this.patch({ text });
  };

  get textLength(): number {
    console.log('Getting textLength for text:', this.state.text);
    return this.state.text.length;
  }
}

describe('Getter Dependency Debug', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug getter dependency tracking', () => {
    let renderCount = 0;
    let lastTrackedDeps: { state: Set<string>, class: Set<string> } = { state: new Set(), class: new Set() };

    const GetterComponent: React.FC = () => {
      renderCount++;
      console.log(`=== RENDER ${renderCount} ===`);
      
      const [state, cubit] = useBloc(GetterTestCubit);
      
      // Track what dependencies were recorded after this render
      const componentRef = (cubit as any).__componentRef__ || {}; // Hack to get component ref
      if (globalComponentTracker) {
        lastTrackedDeps = {
          state: globalComponentTracker.getStateAccess(componentRef),
          class: globalComponentTracker.getClassAccess(componentRef)
        };
        console.log('Tracked state access:', Array.from(lastTrackedDeps.state));
        console.log('Tracked class access:', Array.from(lastTrackedDeps.class));
      }
      
      console.log('Current state:', state);
      console.log('Accessing textLength getter...');
      const length = cubit.textLength;
      console.log('textLength value:', length);
      
      return (
        <div>
          <span data-testid="getter-value">{length}</span>
          <button
            data-testid="increment-counter"
            onClick={() => {
              console.log('=== CLICKING INCREMENT COUNTER ===');
              cubit.incrementCounter();
            }}
          >
            Increment Counter
          </button>
          <button
            data-testid="update-text"
            onClick={() => {
              console.log('=== CLICKING UPDATE TEXT ===');
              cubit.updateText(state.text + '!');
            }}
          >
            Update Text
          </button>
        </div>
      );
    };

    console.log('=== INITIAL RENDER ===');
    render(<GetterComponent />);

    console.log('Initial render count:', renderCount);
    console.log('Initial tracked deps:', lastTrackedDeps);

    console.log('=== TRIGGERING COUNTER INCREMENT ===');
    act(() => {
      screen.getByTestId('increment-counter').click();
    });

    console.log('After counter increment - render count:', renderCount);
    console.log('After counter increment - tracked deps:', lastTrackedDeps);

    console.log('=== TRIGGERING TEXT UPDATE ===');
    act(() => {
      screen.getByTestId('update-text').click();
    });

    console.log('After text update - render count:', renderCount);
    console.log('Final tracked deps:', lastTrackedDeps);
  });
});
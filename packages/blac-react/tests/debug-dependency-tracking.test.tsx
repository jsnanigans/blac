import { render, screen, act } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface DebugState {
  counter: number;
  text: string;
}

class DebugCubit extends Cubit<DebugState> {
  constructor() {
    super({ counter: 0, text: 'initial' });
  }

  incrementCounter = () => {
    console.log('[DebugCubit] Incrementing counter');
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (newText: string) => {
    console.log('[DebugCubit] Updating text to:', newText);
    this.patch({ text: newText });
  };
}

describe('Debug Dependency Tracking', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug exactly what dependencies are tracked', () => {
    let counterCompRenders = 0;
    let textCompRenders = 0;

    const CounterComponent: React.FC = () => {
      counterCompRenders++;
      console.log(`[CounterComponent] Render #${counterCompRenders}`);
      
      const [state, cubit] = useBloc(DebugCubit);
      
      // Get component reference to inspect tracked dependencies
      const componentRef = (cubit as any).__componentRef__ || {}; // Hack to access internal ref
      
      React.useEffect(() => {
        console.log('[CounterComponent] Component registered, checking tracked deps...');
        const stateAccess = globalComponentTracker.getStateAccess(componentRef);
        const classAccess = globalComponentTracker.getClassAccess(componentRef);
        console.log('[CounterComponent] State access:', Array.from(stateAccess));
        console.log('[CounterComponent] Class access:', Array.from(classAccess));
      });
      
      console.log('[CounterComponent] Accessing state.counter:', state.counter);
      
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
      console.log(`[TextComponent] Render #${textCompRenders}`);
      
      const [state, cubit] = useBloc(DebugCubit);
      
      // Get component reference to inspect tracked dependencies
      const componentRef = (cubit as any).__componentRef__ || {}; // Hack to access internal ref
      
      React.useEffect(() => {
        console.log('[TextComponent] Component registered, checking tracked deps...');
        const stateAccess = globalComponentTracker.getStateAccess(componentRef);
        const classAccess = globalComponentTracker.getClassAccess(componentRef);
        console.log('[TextComponent] State access:', Array.from(stateAccess));
        console.log('[TextComponent] Class access:', Array.from(classAccess));
      });
      
      console.log('[TextComponent] Accessing state.text:', state.text);
      
      return (
        <div>
          <span data-testid="text">{state.text}</span>
          <button data-testid="update-text" onClick={() => cubit.updateText('updated')}>
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

    console.log('=== INITIAL RENDER ===');
    render(<App />);

    console.log('[Test] Initial renders - counter:', counterCompRenders, 'text:', textCompRenders);
    
    // Log global tracker metrics
    const metrics = globalComponentTracker.getMetrics();
    console.log('[Test] Global tracker metrics:', metrics);

    console.log('=== INCREMENTING COUNTER ===');
    act(() => {
      screen.getByTestId('increment').click();
    });

    console.log('[Test] After counter increment - counter:', counterCompRenders, 'text:', textCompRenders);
    console.log('[Test] TextComponent should NOT have re-rendered, but did it?');

    console.log('=== UPDATING TEXT ===');
    act(() => {
      screen.getByTestId('update-text').click();
    });

    console.log('[Test] After text update - counter:', counterCompRenders, 'text:', textCompRenders);
    console.log('[Test] CounterComponent should NOT have re-rendered, but did it?');

    // Final assertions to see what failed
    expect(counterCompRenders).toBe(2); // Should be: initial + counter increment
    expect(textCompRenders).toBe(2);    // Should be: initial + text update
  });

  it('should debug proxy creation and access tracking', () => {
    let renders = 0;

    const ProxyDebugComponent: React.FC = () => {
      renders++;
      console.log(`[ProxyDebugComponent] Render #${renders}`);
      
      const [state] = useBloc(DebugCubit);
      
      console.log('[ProxyDebugComponent] State object:', state);
      console.log('[ProxyDebugComponent] State is proxy?', state !== null && typeof state === 'object' && state.constructor?.name === 'Object');
      
      // Try to access counter and see if tracking works
      console.log('[ProxyDebugComponent] About to access state.counter...');
      const counter = state.counter;
      console.log('[ProxyDebugComponent] Accessed state.counter:', counter);
      
      // Check what was tracked immediately after access
      setTimeout(() => {
        const metrics = globalComponentTracker.getMetrics();
        console.log('[ProxyDebugComponent] Metrics after access:', metrics);
      }, 0);
      
      return <span data-testid="proxy-debug">{counter}</span>;
    };

    console.log('=== PROXY DEBUG RENDER ===');
    render(<ProxyDebugComponent />);
    
    console.log('[Test] Initial renders:', renders);
  });
});
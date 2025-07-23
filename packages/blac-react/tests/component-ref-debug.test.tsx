import { render } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface TestState {
  counter: number;
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({ counter: 0 });
  }
}

describe('Component Reference Debug', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug component reference tracking', () => {
    let componentRefFromHook: any = null;

    const TestComponent: React.FC = () => {
      const [state, cubit] = useBloc(TestCubit);
      
      // Try to get the actual componentRef used internally
      const hookInternals = (cubit as any).__hookInternals;
      componentRefFromHook = hookInternals?.componentRef || 'NOT_FOUND';
      
      console.log('[TestComponent] Hook internals:', hookInternals);
      console.log('[TestComponent] ComponentRef:', componentRefFromHook);
      console.log('[TestComponent] Accessing state.counter:', state.counter);
      
      // Check if the proxy get trap is even being called
      const descriptor = Object.getOwnPropertyDescriptor(state, 'counter');
      console.log('[TestComponent] Property descriptor for counter:', descriptor);
      
      // Check the state object itself
      console.log('[TestComponent] State constructor:', state.constructor.name);
      console.log('[TestComponent] State toString:', state.toString);
      
      return <span>{state.counter}</span>;
    };

    render(<TestComponent />);
    
    // Check what was registered globally
    const metrics = globalComponentTracker.getMetrics();
    console.log('[Test] Global metrics after render:', metrics);
    
    // Try to manually check what was tracked
    if (componentRefFromHook && componentRefFromHook !== 'NOT_FOUND') {
      const stateAccess = globalComponentTracker.getStateAccess(componentRefFromHook);
      const classAccess = globalComponentTracker.getClassAccess(componentRefFromHook);
      console.log('[Test] Direct component tracking check - state:', Array.from(stateAccess));
      console.log('[Test] Direct component tracking check - class:', Array.from(classAccess));
    }
  });

  it('should test proxy trap directly', () => {
    const TestComponent: React.FC = () => {
      const [state] = useBloc(TestCubit);
      
      console.log('[TestComponent] Creating manual proxy to test trap behavior...');
      
      // Create a test proxy to see if the trap logic works
      const testProxy = new Proxy({counter: 42}, {
        get(target, prop) {
          console.log('[TestProxy] GET TRAP CALLED for prop:', prop);
          return target[prop as keyof typeof target];
        }
      });
      
      console.log('[TestComponent] Accessing testProxy.counter:', testProxy.counter);
      console.log('[TestComponent] Now accessing real state.counter:', state.counter);
      
      return <span>{state.counter}</span>;
    };

    render(<TestComponent />);
  });

  it('should test if proxy is actually a proxy', () => {
    const TestComponent: React.FC = () => {
      const [state] = useBloc(TestCubit);
      
      // Check if the state is actually a proxy
      console.log('[TestComponent] State object:', state);
      console.log('[TestComponent] State prototype:', Object.getPrototypeOf(state));
      console.log('[TestComponent] State own keys:', Object.getOwnPropertyNames(state));
      console.log('[TestComponent] State has counter:', 'counter' in state);
      
      // Try to detect if it's a proxy by checking for proxy-specific behavior
      try {
        const handler = (state as any).__handler__;
        console.log('[TestComponent] Proxy handler found:', handler);
      } catch (e) {
        console.log('[TestComponent] No proxy handler found');
      }
      
      // Access the property and see what happens
      console.log('[TestComponent] About to access counter...');
      const counter = state.counter;
      console.log('[TestComponent] Counter value:', counter);
      
      return <span>{counter}</span>;
    };

    render(<TestComponent />);
    
    // Check immediately after render
    const metrics = globalComponentTracker.getMetrics();
    console.log('[Test] Metrics after proxy test:', metrics);
  });
});
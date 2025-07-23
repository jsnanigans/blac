import { render } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface TestState {
  counter: number;
}

class ProxyTestCubit extends Cubit<TestState> {
  constructor() {
    super({ counter: 0 });
  }
}

describe('Proxy Creation Debug', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug the exact proxy creation path in useBloc', () => {
    const TestComponent: React.FC = () => {
      console.log('[TestComponent] About to call useBloc...');
      const [state, cubit] = useBloc(ProxyTestCubit);
      console.log('[TestComponent] useBloc returned');
      
      console.log('[TestComponent] Raw state object:', state);
      console.log('[TestComponent] State type:', typeof state);
      console.log('[TestComponent] State is null?', state === null);
      console.log('[TestComponent] State constructor:', state?.constructor?.name);
      
      // Check if we can determine if this is a proxy
      const isProxy = state !== null && typeof state === 'object' && 
                     !Object.getOwnPropertyDescriptor(state, 'counter')?.value === state.counter;
      console.log('[TestComponent] Likely proxy?', isProxy);
      
      // Test the actual property access
      console.log('[TestComponent] Accessing state.counter via bracket notation:', state['counter']);
      console.log('[TestComponent] Accessing state.counter via dot notation:', state.counter);
      
      return <span>{state.counter}</span>;
    };

    render(<TestComponent />);
    
    console.log('[Test] Global metrics after render:', globalComponentTracker.getMetrics());
  });

  it('should test with options that might affect proxy creation', () => {
    const TestComponent: React.FC = () => {
      console.log('[TestComponent] Testing useBloc with no options...');
      const [state1] = useBloc(ProxyTestCubit);
      console.log('[TestComponent] State1 (no options):', state1);
      
      console.log('[TestComponent] Testing useBloc with empty options...');
      const [state2] = useBloc(ProxyTestCubit, {});
      console.log('[TestComponent] State2 (empty options):', state2);
      
      console.log('[TestComponent] Testing useBloc with custom selector...');
      const [state3] = useBloc(ProxyTestCubit, { selector: (state) => [state.counter] });
      console.log('[TestComponent] State3 (with selector):', state3);
      
      return (
        <div>
          <span>{state1.counter}</span>
          <span>{state2.counter}</span>
          <span>{state3.counter}</span>
        </div>
      );
    };

    render(<TestComponent />);
  });

  it('should manually test the proxy creation logic from useBloc', () => {
    const TestComponent: React.FC = () => {
      const [state] = useBloc(ProxyTestCubit);
      
      // Manually recreate the proxy creation logic from useBloc
      console.log('[TestComponent] Manual proxy test - original state:', state);
      
      if (typeof state !== 'object' || state === null) {
        console.log('[TestComponent] State is not an object or is null - no proxy should be created');
        return <span>{state}</span>;
      }
      
      console.log('[TestComponent] Creating manual proxy...');
      const manualProxy = new Proxy(state, {
        get(target, prop) {
          console.log('[ManualProxy] GET trap called for prop:', prop);
          if (typeof prop === 'string') {
            console.log('[ManualProxy] Tracking access to:', prop);
            // This is what the real proxy should do
            globalComponentTracker.trackStateAccess({}, prop); // Using empty object as component ref for test
          }
          const value = target[prop as keyof typeof target];
          console.log('[ManualProxy] Returning value:', value);
          return value;
        },
        has(target, prop) {
          console.log('[ManualProxy] HAS trap called for prop:', prop);
          return prop in target;
        },
        ownKeys(target) {
          console.log('[ManualProxy] OWNKEYS trap called');
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
          console.log('[ManualProxy] GETOWNPROPERTYDESCRIPTOR trap called for prop:', prop);
          return Reflect.getOwnPropertyDescriptor(target, prop);
        },
      });
      
      console.log('[TestComponent] Manual proxy created:', manualProxy);
      console.log('[TestComponent] Accessing manualProxy.counter:', manualProxy.counter);
      console.log('[TestComponent] Accessing original state.counter:', state.counter);
      
      return <span>{manualProxy.counter}</span>;
    };

    render(<TestComponent />);
  });
});
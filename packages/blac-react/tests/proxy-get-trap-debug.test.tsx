import { render } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface TestState {
  counter: number;
}

class ProxyGetTrapCubit extends Cubit<TestState> {
  constructor() {
    super({ counter: 0 });
  }
}

describe('Proxy GET Trap Debug', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug what happens in the proxy GET trap', () => {
    let actualState: any = null;
    let actualCubit: any = null;
    
    const TestComponent: React.FC = () => {
      console.log('[TestComponent] Render start');
      const [state, cubit] = useBloc(ProxyGetTrapCubit);
      
      actualState = state;
      actualCubit = cubit;
      
      console.log('[TestComponent] Got state:', state);
      console.log('[TestComponent] State type:', typeof state);
      console.log('[TestComponent] State constructor:', state?.constructor?.name);
      
      // Let's instrument the state object to see if it has proxy behavior
      const stateIsExtensible = Object.isExtensible(state);
      const stateKeys = Object.keys(state);
      const stateDescriptor = Object.getOwnPropertyDescriptor(state, 'counter');
      
      console.log('[TestComponent] State is extensible:', stateIsExtensible);
      console.log('[TestComponent] State keys:', stateKeys);
      console.log('[TestComponent] Counter descriptor:', stateDescriptor);
      
      // Try to detect proxy via various methods
      try {
        const proxyToString = Object.prototype.toString.call(state);
        console.log('[TestComponent] State toString:', proxyToString);
      } catch (e) {
        console.log('[TestComponent] toString error:', e.message);
      }
      
      // This is the critical test - accessing the property
      console.log('[TestComponent] About to access state.counter...');
      const counter = state.counter;
      console.log('[TestComponent] Got counter value:', counter);
      
      return <span>{counter}</span>;
    };

    render(<TestComponent />);
    
    // After render, let's check what was tracked
    console.log('[Test] Global metrics after render:', globalComponentTracker.getMetrics());
    
    // Let's also examine the actual objects
    console.log('[Test] Actual state object:', actualState);
    console.log('[Test] Actual cubit object:', actualCubit);
    
    // Check if the proxy is somehow being cached or transformed
    if (actualState) {
      console.log('[Test] State prototype chain:', Object.getPrototypeOf(actualState));
      console.log('[Test] State own property names:', Object.getOwnPropertyNames(actualState));
      
      // Try to access the property from outside the component
      console.log('[Test] Accessing counter from test context:', actualState.counter);
    }
  });

  it('should test if multiple renders affect proxy creation', () => {
    let renderCount = 0;
    let stateInstances: any[] = [];
    
    const TestComponent: React.FC = () => {
      renderCount++;
      console.log(`[TestComponent] Render #${renderCount}`);
      
      const [state] = useBloc(ProxyGetTrapCubit);
      stateInstances.push(state);
      
      console.log(`[TestComponent] State instance #${renderCount}:`, state);
      console.log(`[TestComponent] State same as previous?`, renderCount > 1 ? state === stateInstances[renderCount - 2] : 'N/A');
      
      // Access the property
      const counter = state.counter;
      console.log(`[TestComponent] Counter #${renderCount}:`, counter);
      
      return <span>{counter}</span>;
    };

    // Force multiple renders by re-rendering
    const { rerender } = render(<TestComponent />);
    console.log('[Test] After initial render');
    
    rerender(<TestComponent />);
    console.log('[Test] After rerender');
    
    console.log('[Test] Final metrics:', globalComponentTracker.getMetrics());
    console.log('[Test] State instances same?', stateInstances[0] === stateInstances[1]);
    console.log('[Test] Total state instances:', stateInstances.length);
  });

  it('should manually patch the proxy creation to see if it works', () => {
    // Let's create a component that creates its own proxy to see if that works
    const TestComponent: React.FC = () => {
      const [originalState] = useBloc(ProxyGetTrapCubit);
      
      console.log('[TestComponent] Original state from useBloc:', originalState);
      
      // Create our own proxy with debugging
      const debugProxy = React.useMemo(() => {
        console.log('[TestComponent] Creating debug proxy from original state:', originalState);
        
        if (!originalState || typeof originalState !== 'object') {
          return originalState;
        }
        
        return new Proxy(originalState, {
          get(target, prop) {
            console.log('[DebugProxy] GET trap called for prop:', prop, 'on target:', target);
            
            if (typeof prop === 'string') {
              console.log('[DebugProxy] Tracking string property access:', prop);
              // Manually track the access
              globalComponentTracker.trackStateAccess({componentRefDebug: true}, prop);
            }
            
            const value = target[prop as keyof typeof target];
            console.log('[DebugProxy] Returning value:', value);
            return value;
          }
        });
      }, [originalState]);
      
      console.log('[TestComponent] Debug proxy created:', debugProxy);
      console.log('[TestComponent] Accessing debugProxy.counter:', debugProxy.counter);
      
      return <span>{debugProxy.counter}</span>;
    };

    render(<TestComponent />);
    
    console.log('[Test] Metrics after manual proxy test:', globalComponentTracker.getMetrics());
  });
});
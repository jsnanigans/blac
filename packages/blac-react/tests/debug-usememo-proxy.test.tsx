import { render } from '@testing-library/react';
import { Cubit } from '@blac/core';
import React, { useMemo, useRef } from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';
import useExternalBlocStore from '../src/useExternalBlocStore';
import { useSyncExternalStore } from 'react';

interface TestState {
  counter: number;
}

class DebugUseMemoProxyCubit extends Cubit<TestState> {
  constructor() {
    super({ counter: 0 });
  }
}

describe('Debug useMemo Proxy', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug what happens in the useMemo that creates the proxy', () => {
    const TestComponent: React.FC = () => {
      // Replicate the exact logic from useBloc
      const bloc = DebugUseMemoProxyCubit;
      const options = undefined;

      const {
        externalStore,
        usedKeys,
        usedClassPropKeys,
        instance,
        rid,
        hasProxyTracking,
        componentRef,
      } = useExternalBlocStore(bloc, options);

      const state = useSyncExternalStore(
        externalStore.subscribe,
        () => {
          const snapshot = externalStore.getSnapshot();
          console.log('[useSyncExternalStore] getSnapshot returned:', snapshot);
          return snapshot;
        }
      );

      console.log('[TestComponent] Raw state from useSyncExternalStore:', state);
      console.log('[TestComponent] State type:', typeof state);

      const dependencyTracker = useRef(null);
      if (!dependencyTracker.current) {
        dependencyTracker.current = { trackStateAccess: () => {} };
      }

      const returnState = useMemo(() => {
        console.log('[useMemo] Starting proxy creation...');
        console.log('[useMemo] Input state:', state);
        console.log('[useMemo] options?.selector:', options?.selector);
        
        // If a custom selector is provided, don't use proxy tracking
        if (options?.selector) {
          console.log('[useMemo] Returning early due to custom selector');
          return state;
        }

        hasProxyTracking.current = true;
        console.log('[useMemo] Set hasProxyTracking to true');

        if (typeof state !== 'object' || state === null) {
          console.log('[useMemo] State is not object or is null, returning as-is:', state);
          return state;
        }

        console.log('[useMemo] Creating proxy for state:', state);
        
        // Always create a new proxy for each component to ensure proper tracking
        const proxy = new Proxy(state, {
          get(target, prop) {
            console.log('[PROXY GET TRAP] Called for prop:', prop, 'on target:', target);
            if (typeof prop === 'string') {
              console.log('[PROXY GET TRAP] Tracking string property:', prop);
              // Track access in both legacy and component-aware systems
              usedKeys.current.add(prop);
              dependencyTracker.current?.trackStateAccess(prop);
              globalComponentTracker.trackStateAccess(componentRef.current, prop);
            }
            const value = target[prop as keyof typeof target];
            console.log('[PROXY GET TRAP] Returning value:', value);
            return value;
          },
          has(target, prop) {
            console.log('[PROXY HAS TRAP] Called for prop:', prop);
            return prop in target;
          },
          ownKeys(target) {
            console.log('[PROXY OWNKEYS TRAP] Called');
            return Reflect.ownKeys(target);
          },
          getOwnPropertyDescriptor(target, prop) {
            console.log('[PROXY GETOWNPROPERTYDESCRIPTOR TRAP] Called for prop:', prop);
            return Reflect.getOwnPropertyDescriptor(target, prop);
          },
        });
        
        console.log('[useMemo] Created proxy:', proxy);
        console.log('[useMemo] Proxy === state?', proxy === state);
        console.log('[useMemo] typeof proxy:', typeof proxy);
        console.log('[useMemo] Returning proxy');
        return proxy;
      }, [state]);

      console.log('[TestComponent] returnState from useMemo:', returnState);
      console.log('[TestComponent] returnState === state?', returnState === state);
      console.log('[TestComponent] typeof returnState:', typeof returnState);

      // Test accessing the property
      console.log('[TestComponent] About to access returnState.counter...');
      const counter = returnState.counter;
      console.log('[TestComponent] Got counter:', counter);

      return <span>{counter}</span>;
    };

    render(<TestComponent />);
    
    console.log('[Test] Global metrics after render:', globalComponentTracker.getMetrics());
  });

  it('should test if the issue is with React strict mode or multiple renders', () => {
    let renderCount = 0;
    
    const TestComponent: React.FC = () => {
      renderCount++;
      console.log(`[TestComponent] Render #${renderCount}`);
      
      const testState = { counter: renderCount };
      
      const proxy = useMemo(() => {
        console.log(`[useMemo] Creating proxy for render #${renderCount}:`, testState);
        return new Proxy(testState, {
          get(target, prop) {
            console.log(`[PROXY #${renderCount}] GET trap for prop:`, prop);
            return target[prop as keyof typeof target];
          }
        });
      }, [testState]);
      
      console.log(`[TestComponent] Proxy #${renderCount}:`, proxy);
      console.log(`[TestComponent] Accessing proxy.counter:`, proxy.counter);
      
      return <span>{proxy.counter}</span>;
    };

    const { rerender } = render(<TestComponent />);
    console.log('[Test] After initial render');
    
    rerender(<TestComponent />);
    console.log('[Test] After rerender');
  });
});
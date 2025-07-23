import { render, screen, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';
import useExternalBlocStore from '../src/useExternalBlocStore';
import { useSyncExternalStore } from 'react';
import { DependencyTracker } from '../src/DependencyTracker';

interface TestState {
  counter: number;
  text: string;
}

class FixedTestCubit extends Cubit<TestState> {
  constructor() {
    super({ counter: 0, text: 'initial' });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (newText: string) => {
    this.patch({ text: newText });
  };
}

// Create a fixed version of useBloc to test the fix
function useFixedBloc<B extends new (...args: any[]) => any>(
  bloc: B,
  options?: any
): [InstanceType<B>['state'], InstanceType<B>] {
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
      if (snapshot === undefined) {
        throw new Error(`State snapshot is undefined for bloc ${bloc.name}`);
      }
      return snapshot;
    }
  );

  const dependencyTracker = React.useRef<DependencyTracker | null>(null);
  if (!dependencyTracker.current) {
    dependencyTracker.current = new DependencyTracker({
      enableBatching: true,
      enableMetrics: process.env.NODE_ENV === 'development',
      enableDeepTracking: false,
    });
  }

  const returnState = React.useMemo(() => {
    console.log('[useFixedBloc] Creating state proxy...');
    
    // If a custom selector is provided, don't use proxy tracking
    if (options?.selector) {
      console.log('[useFixedBloc] Custom selector provided, skipping proxy');
      return state;
    }

    hasProxyTracking.current = true;

    if (typeof state !== 'object' || state === null) {
      console.log('[useFixedBloc] State is primitive, returning as-is');
      return state;
    }

    console.log('[useFixedBloc] Creating proxy for state:', state);
    console.log('[useFixedBloc] ComponentRef:', componentRef.current);

    // Always create a new proxy for each component to ensure proper tracking
    const proxy = new Proxy(state, {
      get(target, prop) {
        console.log('[FIXED PROXY] GET trap called for prop:', prop);
        if (typeof prop === 'string') {
          console.log('[FIXED PROXY] Tracking access to:', prop);
          // Track access in both legacy and component-aware systems
          usedKeys.current.add(prop);
          dependencyTracker.current?.trackStateAccess(prop);
          globalComponentTracker.trackStateAccess(componentRef.current, prop);
        }
        const value = target[prop as keyof typeof target];
        console.log('[FIXED PROXY] Returning value:', value);
        return value;
      },
      has(target, prop) {
        return prop in target;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });
    
    console.log('[useFixedBloc] Created proxy:', proxy);
    return proxy;
  }, [state]);

  const returnClass = React.useMemo(() => {
    if (!instance.current) {
      throw new Error(`Bloc instance is null for ${bloc.name}`);
    }

    // Always create a new proxy for each component to ensure proper tracking
    const proxy = new Proxy(instance.current, {
      get(target, prop) {
        if (!target) {
          throw new Error(`Bloc target is null for ${bloc.name}`);
        }
        const value = target[prop as keyof InstanceType<B>];
        if (typeof value !== 'function' && typeof prop === 'string') {
          // Track access in both legacy and component-aware systems
          usedClassPropKeys.current.add(prop);
          dependencyTracker.current?.trackClassAccess(prop);
          globalComponentTracker.trackClassAccess(componentRef.current, prop);
        }
        return value;
      },
    });
    
    return proxy;
  }, [instance.current?.uid]);

  React.useEffect(() => {
    const currentInstance = instance.current;
    if (!currentInstance) return;

    currentInstance._addConsumer(rid, componentRef.current);

    options?.onMount?.(currentInstance);

    return () => {
      if (!currentInstance) {
        return;
      }
      options?.onUnmount?.(currentInstance);
      currentInstance._removeConsumer(rid);

      dependencyTracker.current?.reset();
    };
  }, [instance.current?.uid, rid]);

  if (returnState === undefined) {
    throw new Error(`State is undefined for ${bloc.name}`);
  }
  if (!returnClass) {
    throw new Error(`Instance is null for ${bloc.name}`);
  }

  return [returnState, returnClass];
}

describe('Test with Fixed useBloc', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should properly isolate re-renders with fixed proxy', () => {
    let counterRenders = 0;
    let textRenders = 0;

    const CounterComponent: React.FC = React.memo(() => {
      counterRenders++;
      console.log(`[CounterComponent] Render #${counterRenders}`);
      const [state, cubit] = useFixedBloc(FixedTestCubit);
      console.log('[CounterComponent] Accessing state.counter:', state.counter);
      return (
        <div>
          <span data-testid="counter">{state.counter}</span>
          <button data-testid="increment" onClick={cubit.incrementCounter}>
            Increment
          </button>
        </div>
      );
    });

    const TextComponent: React.FC = React.memo(() => {
      textRenders++;
      console.log(`[TextComponent] Render #${textRenders}`);
      const [state, cubit] = useFixedBloc(FixedTestCubit);
      console.log('[TextComponent] Accessing state.text:', state.text);
      return (
        <div>
          <span data-testid="text">{state.text}</span>
          <button data-testid="update-text" onClick={() => cubit.updateText('updated')}>
            Update Text
          </button>
        </div>
      );
    });

    const App: React.FC = () => (
      <div>
        <CounterComponent />
        <TextComponent />
      </div>
    );

    render(<App />);

    console.log('[Test] Initial renders - counter:', counterRenders, 'text:', textRenders);
    
    // Check what was tracked
    const metrics = globalComponentTracker.getMetrics();
    console.log('[Test] Global metrics after initial render:', metrics);

    // Test incrementing counter - should only re-render CounterComponent
    console.log('[Test] === INCREMENTING COUNTER ===');
    act(() => {
      screen.getByTestId('increment').click();
    });

    console.log('[Test] After increment - counter:', counterRenders, 'text:', textRenders);
    console.log('[Test] Counter component should have re-rendered (2), text component should NOT (1)');

    // Final assertions
    expect(counterRenders).toBe(2); // Should re-render
    expect(textRenders).toBe(1);    // Should NOT re-render
  });
});
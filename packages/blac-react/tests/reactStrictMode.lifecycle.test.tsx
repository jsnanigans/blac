import { render, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Blac, Cubit } from '@blac/core';
import { useBloc } from '../src';

// Test bloc for lifecycle testing
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment() {
    this.emit({ count: this.state.count + 1 });
  }
}

// Component that uses the bloc
function TestComponent() {
  const [state] = useBloc(CounterCubit);
  return <div data-testid="counter">{state.count}</div>;
}

describe('React Lifecycle - Normal Mode vs Strict Mode', () => {
  beforeEach(() => {
    // Reset the Blac instance before each test
    Blac.instance.resetInstance();
  });

  afterEach(() => {
    cleanup();
    // Reset the Blac instance after each test
    Blac.instance.resetInstance();
  });

  it('should handle normal React lifecycle correctly', async () => {
    // Step 1: Component mounts
    const { unmount } = render(<TestComponent />, {
      // Ensure we're not in strict mode
      wrapper: ({ children }) => <>{children}</>,
    });

    // Verify bloc is created and has observers
    const allBlocs = Blac.instance.getAllBlocs(CounterCubit);
    expect(allBlocs.length).toBe(1);
    
    const bloc = allBlocs[0];
    expect(bloc._observer.size).toBe(1); // Should have 1 observer
    expect(bloc.isDisposed).toBe(false);

    // Step 2: Component unmounts
    unmount();

    // After unmount, bloc should be scheduled for disposal but not immediately disposed (microtask delay)
    expect(bloc._observer.size).toBe(0); // No observers
    expect(bloc.isDisposed).toBe(false); // Not immediately disposed due to microtask

    // Wait for microtask to complete disposal  
    await new Promise(resolve => queueMicrotask(resolve));
    
    // Now it should be disposed
    expect(bloc.isDisposed).toBe(true); // Should be disposed after microtask
  });

  it('should recreate the React Strict Mode issue manually', async () => {
    let bloc: CounterCubit;
    let firstListener: (state: any) => void;
    let secondListener: (state: any) => void;

    // Step 1: Simulate first mount (Strict Mode first render)
    const { unmount: firstUnmount } = render(<TestComponent />, {
      wrapper: ({ children }) => <>{children}</>,
    });

    // Get the bloc instance and current observer count
    const allBlocs = Blac.instance.getAllBlocs(CounterCubit);
    bloc = allBlocs[0];
    expect(bloc._observer.size).toBe(1); // First subscription
    expect(bloc.isDisposed).toBe(false);

    // Capture the current listener function (this simulates useSyncExternalStore's listener)
    firstListener = bloc._observer._observers.values().next().value.fn;

    // Step 2: Simulate immediate unmount (Strict Mode cleanup)
    firstUnmount();

    // After first unmount, bloc should be scheduled for disposal but not yet disposed
    expect(bloc._observer.size).toBe(0); // No observers
    // The bloc should not be immediately disposed due to microtask delay
    expect(bloc.isDisposed).toBe(false); // Should still be active initially

    // Step 3: Simulate second mount (Strict Mode remount)
    // This should create a NEW listener function (React behavior)
    const { unmount: secondUnmount } = render(<TestComponent />, {
      wrapper: ({ children }) => <>{children}</>,
    });

    // With the microtask fix, the same bloc should be reused
    const newAllBlocs = Blac.instance.getAllBlocs(CounterCubit);
    const newBloc = newAllBlocs[0];
    
    // The fix should reuse the same bloc instance
    expect(newBloc).toBe(bloc); // Same instance!
    expect(newBloc._observer.size).toBe(1); // New subscription
    expect(newBloc.isDisposed).toBe(false);

    // Wait for microtask to complete to ensure no delayed disposal
    await new Promise(resolve => queueMicrotask(resolve));

    // Capture the new listener function
    secondListener = newBloc._observer._observers.values().next().value.fn;
    
    // Verify listeners are different (React creates new functions)
    expect(secondListener).not.toBe(firstListener);

    secondUnmount();
  });

  it('should demonstrate the fix - using external store subscription reuse', async () => {
    // This test demonstrates how the external store should handle
    // React Strict Mode by reusing subscriptions based on bloc identity
    // rather than listener function identity

    const TestComponentWithExternalStore = () => {
      // Manually create external store to test subscription reuse
      const externalStore = React.useMemo(() => {
        const bloc = Blac.getBloc(CounterCubit);
        
        return {
          subscribe: (listener: (state: any) => void) => {
            // The key insight: subscription should be tied to the bloc instance
            // not the listener function, to survive React Strict Mode
            return bloc._observer.subscribe({
              id: 'test-subscription',
              fn: () => listener(bloc.state),
              dependencyArray: () => [[bloc.state], []]
            });
          },
          getSnapshot: () => {
            const bloc = Blac.getBloc(CounterCubit);
            return bloc.state;
          }
        };
      }, []);

      const state = React.useSyncExternalStore(
        externalStore.subscribe,
        externalStore.getSnapshot
      );

      return <div data-testid="counter">{state.count}</div>;
    };

    // Step 1: First mount
    const { unmount: firstUnmount } = render(<TestComponentWithExternalStore />);
    
    const allBlocs = Blac.instance.getAllBlocs(CounterCubit);
    const bloc = allBlocs[0];
    expect(bloc._observer.size).toBe(1);
    expect(bloc.isDisposed).toBe(false);

    // Step 2: Unmount (Strict Mode cleanup)
    firstUnmount();
    
    // The bloc should NOT be disposed immediately due to microtask delay
    expect(bloc.isDisposed).toBe(false); // Fixed: not immediately disposed

    // Step 3: Remount
    const { unmount: secondUnmount } = render(<TestComponentWithExternalStore />);
    
    // With proper fix, should reuse the same bloc instance
    const newAllBlocs = Blac.instance.getAllBlocs(CounterCubit);
    const newBloc = newAllBlocs[0];
    
    // Fixed implementation reuses the same instance
    expect(newBloc).toBe(bloc); // Same instance due to microtask delay fix!

    secondUnmount();
  });
});
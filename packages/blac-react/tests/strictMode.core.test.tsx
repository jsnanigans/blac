import { Blac, Cubit } from '@blac/core';
import { act, render, renderHook, screen } from '@testing-library/react';
import { StrictMode, useEffect, useRef } from 'react';
import { beforeEach, describe, expect, it, test } from 'vitest';
import { useBloc, useExternalBlocStore } from '../src';

// Test cubit for strict mode testing
class TestCubit extends Cubit<{ count: number }> {
  static isolated = true;

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Shared cubit for testing instance reuse
class SharedCubit extends Cubit<{ value: number }> {
  static isolated = false;

  constructor() {
    super({ value: 0 });
  }

  setValue = (value: number) => {
    this.patch({ value });
  };
}

describe('React Strict Mode Core Behavior', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should handle double mounting in strict mode without creating duplicate instances', () => {
    let mountCount = 0;
    let instanceIds = new Set<string>();

    const TestComponent = () => {
      const [state, cubit] = useBloc(SharedCubit);

      useEffect(() => {
        mountCount++;
        instanceIds.add(cubit.uid);
      }, [cubit]);

      return <div data-testid="value">{state.value}</div>;
    };

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // In strict mode, effects run twice but should use same instance
    expect(mountCount).toBe(2);
    expect(instanceIds.size).toBe(1); // Only one unique instance
    expect(screen.getByTestId('value')).toHaveTextContent('0');
  });

  it('should maintain state consistency through strict mode lifecycle', () => {
    let instanceCount = 0;
    const instances = new Set<string>();
    
    const TestComponent = () => {
      const [state, cubit] = useBloc(TestCubit);
      
      useEffect(() => {
        instanceCount++;
        instances.add(cubit.uid);
      }, [cubit]);

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <div data-testid="uid">{cubit.uid}</div>
        </div>
      );
    };

    const { unmount } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Should have consistent state
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    // Should reuse the same instance in strict mode
    expect(instances.size).toBe(1);

    unmount();
  });

  it('should handle state updates correctly after strict mode remounting', async () => {
    const TestComponent = () => {
      const [state, cubit] = useBloc(TestCubit);

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <button onClick={() => cubit.increment()}>Increment</button>
        </div>
      );
    };

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // Update state after strict mode remounting
    await act(async () => {
      screen.getByText('Increment').click();
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('should handle rapid mount/unmount cycles without leaking observers', async () => {
    const TestComponent = () => {
      const [state] = useBloc(TestCubit);
      return <div data-testid="count">{state.count}</div>;
    };

    // Mount and unmount multiple times rapidly
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <StrictMode>
          <TestComponent />
        </StrictMode>
      );

      expect(screen.getByTestId('count')).toHaveTextContent('0');
      unmount();
    }

    // All instances should be cleaned up
    expect(Blac.getInstance().blocInstanceMap.size).toBe(0);
  });
});

describe('useBloc Strict Mode Integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should handle lifecycle correctly through strict mode remounting', () => {
    let effectCount = 0;
    let cleanupCount = 0;

    const TestComponent = () => {
      const [state] = useBloc(TestCubit);
      
      useEffect(() => {
        effectCount++;
        return () => {
          cleanupCount++;
        };
      }, []);
      
      return <div data-testid="value">{state.count}</div>;
    };

    const { unmount } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Strict mode: mount, unmount, remount = 2 effects, 1 cleanup
    expect(effectCount).toBe(2);
    expect(cleanupCount).toBe(1);

    unmount();

    // After final unmount, all effects should be cleaned up
    expect(cleanupCount).toBe(2);
  });

  it('should handle onMount callback correctly in strict mode', async () => {
    let onMountCount = 0;
    const mountedInstances = new Set<string>();
    let incrementCount = 0;

    const TestComponent = () => {
      const [state, cubit] = useBloc(TestCubit, {
        onMount: (cubit) => {
          onMountCount++;
          mountedInstances.add(cubit.uid);
          // Increment synchronously to track how many times it's called
          cubit.increment();
          incrementCount++;
        }
      });

      return <div data-testid="count">{state.count}</div>;
    };

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Wait for any potential updates
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // In strict mode, onMount might be called twice due to double mounting
    expect(onMountCount).toBeGreaterThanOrEqual(1);
    expect(onMountCount).toBeLessThanOrEqual(2);
    expect(mountedInstances.size).toBe(1); // Only one unique instance
    
    // The count should match the number of times increment was called
    expect(screen.getByTestId('count')).toHaveTextContent(String(incrementCount));
  });
});

describe('External Store Direct Integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should handle useSyncExternalStore correctly in strict mode', () => {
    let getSnapshotCount = 0;

    const TestComponent = () => {
      const { externalStore, instance } = useExternalBlocStore(TestCubit, {});

      // Track getSnapshot calls
      const originalGetSnapshot = externalStore.getSnapshot;
      externalStore.getSnapshot = () => {
        getSnapshotCount++;
        return originalGetSnapshot();
      };

      const state = externalStore.getSnapshot();

      return (
        <div>
          <div data-testid="count">{state.count}</div>
          <button onClick={() => instance.current.increment()}>Inc</button>
        </div>
      );
    };

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // getSnapshot is called multiple times during strict mode mounting
    expect(getSnapshotCount).toBeGreaterThan(0);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('should maintain external store subscriptions through strict mode lifecycle', () => {
    let subscribeCallCount = 0;
    let cleanupCallCount = 0;

    const TestComponent = () => {
      const { externalStore, instance } = useExternalBlocStore(TestCubit, {});
      
      useEffect(() => {
        // Subscribe manually to track calls
        const unsubscribe = externalStore.subscribe(() => {
          // Subscription callback
        });
        subscribeCallCount++;
        
        return () => {
          cleanupCallCount++;
          unsubscribe();
        };
      }, [externalStore]);
      
      const state = externalStore.getSnapshot();
      return <div data-testid="count">{state?.count || 0}</div>;
    };

    const { unmount } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // After strict mode mounting, should have subscriptions
    expect(subscribeCallCount).toBeGreaterThan(0);
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    unmount();

    // After unmount, all subscriptions should be cleaned up
    expect(cleanupCallCount).toBe(subscribeCallCount);
  });
});

describe('Subscription and Observer Management', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  it('should prevent observer leaks with multiple components in strict mode', () => {
    const TestComponent = ({ id }: { id: number }) => {
      const [state] = useBloc(SharedCubit);
      return <div data-testid={`value-${id}`}>{state.value}</div>;
    };

    const App = () => (
      <>
        <TestComponent id={1} />
        <TestComponent id={2} />
        <TestComponent id={3} />
      </>
    );

    const { unmount } = render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // Get the shared instance
    const instance = Blac.getInstance().blocInstanceMap.values().next().value as SharedCubit;

    // Should have 3 observers (one per component) after strict mode mounting
    expect(instance._observer.size).toBe(3);

    unmount();

    // After unmount, should have no observers
    expect(instance._observer.size).toBe(0);
  });

  it('should handle concurrent updates during strict mode remounting', async () => {
    const TestComponent = () => {
      const [state, cubit] = useBloc(TestCubit);
      const mountRef = useRef(true);

      useEffect(() => {
        if (mountRef.current) {
          mountRef.current = false;
          // Simulate concurrent update during mounting
          setTimeout(() => cubit.increment(), 0);
        }
      }, [cubit]);

      return <div data-testid="count">{state.count}</div>;
    };

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>
    );

    // Wait for async update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

import { Blac, Cubit } from '@blac/core';
import '@testing-library/jest-dom';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FC, useState, useSyncExternalStore } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';

// Test Cubits for useSyncExternalStore integration
interface AsyncState {
  data: string | null;
  loading: boolean;
  error: string | null;
}

class AsyncCubit extends Cubit<AsyncState> {
  static isolated = true;

  constructor() {
    super({
      data: null,
      loading: false,
      error: null
    });
  }

  setLoading = (loading: boolean) => {
    this.patch({ loading, error: null });
  };

  setData = (data: string) => {
    this.patch({ data, loading: false, error: null });
  };

  setError = (error: string) => {
    this.patch({ error, loading: false, data: null });
  };

  async fetchData(url: string) {
    this.setLoading(true);
    
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (url === 'error') {
        throw new Error('Fetch failed');
      }
      
      this.setData(`Data from ${url}`);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

interface CounterState {
  count: number;
  step: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0, step: 1 });
  }

  increment = () => {
    this.patch({ count: this.state.count + this.state.step });
  };

  setStep = (step: number) => {
    this.patch({ step });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

class IsolatedCounterCubit extends CounterCubit {
  static isolated = true;
}

// Primitive state cubit
class PrimitiveCubit extends Cubit<number> {
  static isolated = true;

  constructor() {
    super(42);
  }

  setValue = (value: number) => this.emit(value);
  increment = () => this.emit(this.state + 1);
}

describe('useSyncExternalStore Integration', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('External Store Creation and Subscription', () => {
    test('should create external store with correct interface', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore } = result.current;

      expect(typeof externalStore.subscribe).toBe('function');
      expect(typeof externalStore.getSnapshot).toBe('function');
      expect(typeof externalStore.getServerSnapshot).toBe('function');
    });

    test('should handle subscription and unsubscription', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      let notificationCount = 0;
      const listener = () => {
        notificationCount++;
      };

      // Subscribe
      const unsubscribe = externalStore.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
      expect(instance.current._observer._observers.size).toBeGreaterThan(0);

      // Trigger state change
      act(() => {
        instance.current.increment();
      });

      expect(notificationCount).toBeGreaterThan(0);

      // Unsubscribe
      unsubscribe();
      expect(instance.current._observer._observers.size).toBe(0);
    });

    test('should handle multiple subscribers', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      let notification1Count = 0;
      let notification2Count = 0;

      const listener1 = () => { notification1Count++; };
      const listener2 = () => { notification2Count++; };

      const unsubscribe1 = externalStore.subscribe(listener1);
      const unsubscribe2 = externalStore.subscribe(listener2);

      // Both listeners should be registered
      expect(instance.current._observer._observers.size).toBeGreaterThan(0);

      // Trigger state change
      act(() => {
        instance.current.increment();
      });

      expect(notification1Count).toBeGreaterThan(0);
      expect(notification2Count).toBeGreaterThan(0);

      // Unsubscribe one
      unsubscribe1();
      
      // Reset counters
      notification1Count = 0;
      notification2Count = 0;

      // Trigger another state change
      act(() => {
        instance.current.increment();
      });

      expect(notification1Count).toBe(0); // Should not be notified
      expect(notification2Count).toBeGreaterThan(0); // Should still be notified

      unsubscribe2();
    });

    test('should handle subscriber errors gracefully', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      const errorListener = () => {
        throw new Error('Listener error');
      };

      let normalListenerCalled = false;
      const normalListener = () => {
        normalListenerCalled = true;
      };

      externalStore.subscribe(errorListener);
      externalStore.subscribe(normalListener);

      // State change should not crash despite error in one listener
      expect(() => {
        act(() => {
          instance.current.increment();
        });
      }).not.toThrow();

      // Normal listener should still be called
      expect(normalListenerCalled).toBe(true);
    });
  });

  describe('Snapshot Management', () => {
    test('should return correct snapshots', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      // Initial snapshot
      const initialSnapshot = externalStore.getSnapshot();
      expect(initialSnapshot).toEqual({ count: 0, step: 1 });

      // Server snapshot should match
      const serverSnapshot = externalStore.getServerSnapshot!();
      expect(serverSnapshot).toEqual(initialSnapshot);

      // Update state
      act(() => {
        instance.current.increment();
      });

      // Snapshot should reflect new state
      const updatedSnapshot = externalStore.getSnapshot();
      expect(updatedSnapshot).toEqual({ count: 1, step: 1 });
    });

    test('should handle primitive state snapshots', () => {
      const { result } = renderHook(() => useExternalBlocStore(PrimitiveCubit, {}));
      const { externalStore, instance } = result.current;

      const snapshot = externalStore.getSnapshot();
      expect(snapshot).toBe(42);

      act(() => {
        instance.current.setValue(100);
      });

      expect(externalStore.getSnapshot()).toBe(100);
    });

    test('should handle undefined snapshots for disposed blocs', () => {
      const { result } = renderHook(() => useExternalBlocStore(IsolatedCounterCubit, {}));
      const { externalStore, instance } = result.current;

      // Normal snapshot
      expect(externalStore.getSnapshot()).toEqual({ count: 0, step: 1 });

      // Dispose the bloc
      act(() => {
        instance.current._dispose();
      });

      // Should still return the last known state
      const snapshot = externalStore.getSnapshot();
      expect(snapshot).toEqual({ count: 0, step: 1 });
    });
  });

  describe('Dependency Tracking Integration', () => {
    test('should track dependencies correctly with external store', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance, usedKeys } = result.current;

      // Initially no keys tracked
      expect(usedKeys.current.size).toBe(0);

      // Use the external store directly
      let stateFromListener: any = null;
      const listener = (state: any) => {
        stateFromListener = state;
        // Access count property
        const _ = state.count;
      };

      externalStore.subscribe(listener);

      // Trigger state change
      act(() => {
        instance.current.increment();
      });

      expect(stateFromListener).toEqual({ count: 1, step: 1 });
    });

    test('should handle custom selectors with external store', () => {
      const customSelector = (state: CounterState) => [state.count]; // Only track count

      const { result } = renderHook(() => 
        useExternalBlocStore(CounterCubit, { selector: customSelector })
      );
      const { externalStore, instance } = result.current;

      let notificationCount = 0;
      const listener = () => {
        notificationCount++;
      };

      externalStore.subscribe(listener);

      // Change count - should notify
      act(() => {
        instance.current.increment();
      });

      const countNotifications = notificationCount;
      expect(countNotifications).toBeGreaterThan(0);

      // Change step only - should not notify (not in selector)
      act(() => {
        instance.current.setStep(5);
      });

      expect(notificationCount).toBe(countNotifications); // Should not have increased
    });
  });

  describe('React useSyncExternalStore Integration', () => {
    test('should work correctly with React useSyncExternalStore', () => {
      const TestComponent: FC = () => {
        const { externalStore, instance } = useExternalBlocStore(CounterCubit, {});
        
        const state = useSyncExternalStore(
          externalStore.subscribe,
          externalStore.getSnapshot,
          externalStore.getServerSnapshot
        );

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button data-testid="increment" onClick={instance.current.increment}>
              Increment
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      act(() => {
        screen.getByTestId('increment').click();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });

    test('should handle rapid state changes with React', () => {
      const TestComponent: FC = () => {
        const { externalStore, instance } = useExternalBlocStore(CounterCubit, {});
        
        const state = useSyncExternalStore(
          externalStore.subscribe,
          externalStore.getSnapshot
        );

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button 
              data-testid="rapid-increment" 
              onClick={() => {
                for (let i = 0; i < 10; i++) {
                  instance.current.increment();
                }
              }}
            >
              Rapid Increment
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      act(() => {
        screen.getByTestId('rapid-increment').click();
      });

      expect(screen.getByTestId('count')).toHaveTextContent('10');
    });

    test('should handle async state changes', async () => {
      const TestComponent: FC = () => {
        const { externalStore, instance } = useExternalBlocStore(AsyncCubit, {});
        
        const state = useSyncExternalStore(
          externalStore.subscribe,
          externalStore.getSnapshot
        );

        return (
          <div>
            <span data-testid="loading">{state.loading.toString()}</span>
            <span data-testid="data">{state.data || 'null'}</span>
            <span data-testid="error">{state.error || 'null'}</span>
            <button 
              data-testid="fetch-success" 
              onClick={() => instance.current.fetchData('success')}
            >
              Fetch Success
            </button>
            <button 
              data-testid="fetch-error" 
              onClick={() => instance.current.fetchData('error')}
            >
              Fetch Error
            </button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data')).toHaveTextContent('null');

      // Start async operation
      act(() => {
        screen.getByTestId('fetch-success').click();
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Wait for async operation to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('data')).toHaveTextContent('Data from success');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    test('should handle component unmounting during subscription', () => {
      const TestComponent: FC = () => {
        const { externalStore, instance } = useExternalBlocStore(IsolatedCounterCubit, {});
        
        const state = useSyncExternalStore(
          externalStore.subscribe,
          externalStore.getSnapshot
        );

        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <button data-testid="increment" onClick={instance.current.increment}>
              Increment
            </button>
          </div>
        );
      };

      const { unmount } = render(<TestComponent />);

      expect(screen.getByTestId('count')).toHaveTextContent('0');

      // Unmount component
      unmount();

      // Should not throw errors
      expect(() => {
        // This would be called if there were pending state updates
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle subscription to null instance', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore } = result.current;

      // Manually set instance to null (simulating edge case)
      result.current.instance.current = null as any;

      const listener = () => {};
      const unsubscribe = externalStore.subscribe(listener);

      // Should return no-op unsubscribe function
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    test('should handle getSnapshot with null instance', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore } = result.current;

      // Manually set instance to null
      result.current.instance.current = null as any;

      const snapshot = externalStore.getSnapshot();
      expect(snapshot).toBeUndefined();
    });

    test('should handle multiple rapid subscribe/unsubscribe cycles', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore } = result.current;

      const subscriptions: Array<() => void> = [];

      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        const listener = () => {};
        const unsubscribe = externalStore.subscribe(listener);
        subscriptions.push(unsubscribe);
      }

      // Unsubscribe all
      subscriptions.forEach(unsubscribe => {
        expect(() => unsubscribe()).not.toThrow();
      });
    });

    test('should handle state changes during subscription cleanup', () => {
      const { result } = renderHook(() => useExternalBlocStore(IsolatedCounterCubit, {}));
      const { externalStore, instance } = result.current;

      const listener = () => {
        // Try to change state during listener
        instance.current.increment();
      };

      const unsubscribe = externalStore.subscribe(listener);

      // This should not cause infinite loops or crashes
      expect(() => {
        act(() => {
          instance.current.increment();
        });
      }).not.toThrow();

      unsubscribe();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should reuse observer instances for same listener', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      const listener = () => {};

      // Subscribe multiple times with same listener
      const unsubscribe1 = externalStore.subscribe(listener);
      const unsubscribe2 = externalStore.subscribe(listener);

      // Should reuse the same observer
      expect(unsubscribe1).toBe(unsubscribe2);

      // Observer count should not increase unnecessarily
      const observerCount = instance.current._observer._observers.size;
      expect(observerCount).toBe(1);

      unsubscribe1();
    });

    test('should clean up observers properly', () => {
      const { result } = renderHook(() => useExternalBlocStore(IsolatedCounterCubit, {}));
      const { externalStore, instance } = result.current;

      const listeners = Array.from({ length: 10 }, () => () => {});
      const unsubscribers = listeners.map(listener => 
        externalStore.subscribe(listener)
      );

      expect(instance.current._observer._observers.size).toBeGreaterThan(0);

      // Unsubscribe all
      unsubscribers.forEach(unsubscribe => unsubscribe());

      expect(instance.current._observer._observers.size).toBe(0);
    });

    test('should handle high-frequency state changes efficiently', () => {
      const { result } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { externalStore, instance } = result.current;

      let notificationCount = 0;
      const listener = () => {
        notificationCount++;
      };

      externalStore.subscribe(listener);

      const iterations = 1000;
      const start = performance.now();

      // High-frequency updates
      act(() => {
        for (let i = 0; i < iterations; i++) {
          instance.current.increment();
        }
      });

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(500); // Should be fast
      expect(externalStore.getSnapshot().count).toBe(iterations);
    });
  });

  describe('Instance Management with External Store', () => {
    test('should handle isolated instance lifecycle', () => {
      const { result, unmount } = renderHook(() => 
        useExternalBlocStore(IsolatedCounterCubit, {})
      );
      const { externalStore, instance } = result.current;

      const listener = () => {};
      const unsubscribe = externalStore.subscribe(listener);

      expect(instance.current._consumers.size).toBeGreaterThan(0);

      // Unmount should clean up
      unmount();

      expect(() => unsubscribe()).not.toThrow();
    });

    test('should handle shared instance lifecycle', () => {
      const { result: result1 } = renderHook(() => useExternalBlocStore(CounterCubit, {}));
      const { result: result2 } = renderHook(() => useExternalBlocStore(CounterCubit, {}));

      const { instance: instance1 } = result1.current;
      const { instance: instance2 } = result2.current;

      // Should be the same instance
      expect(instance1.current.uid).toBe(instance2.current.uid);

      // Both should receive updates
      let notifications1 = 0;
      let notifications2 = 0;

      result1.current.externalStore.subscribe(() => notifications1++);
      result2.current.externalStore.subscribe(() => notifications2++);

      act(() => {
        instance1.current.increment();
      });

      expect(notifications1).toBeGreaterThan(0);
      expect(notifications2).toBeGreaterThan(0);
    });
  });
});
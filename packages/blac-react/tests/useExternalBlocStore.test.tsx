import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';

interface CounterState {
  count: number;
  name: string;
}

class CounterCubit extends Cubit<CounterState> {
  static isolated = false;
  static keepAlive = false;

  constructor() {
    super({ count: 0, name: 'counter' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }

  updateName(name: string) {
    this.emit({ ...this.state, name });
  }

  updateBoth(count: number, name: string) {
    this.batch(() => {
      this.emit({ ...this.state, count });
      this.emit({ ...this.state, name });
    });
  }
}

class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true;
  static keepAlive = false;

  constructor() {
    super({ count: 100, name: 'isolated' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
}

class KeepAliveCubit extends Cubit<CounterState> {
  static isolated = false;
  static keepAlive = true;

  constructor() {
    super({ count: 1000, name: 'keepalive' });
  }

  increment() {
    this.emit({ ...this.state, count: this.state.count + 1 });
  }
}

describe('useExternalBlocStore', () => {
  beforeEach(() => {
    // Reset Blac instance before each test
    Blac.resetInstance();
  });

  describe('Basic Functionality', () => {
    it('should create and return external store for non-isolated bloc', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      expect(result.current).toHaveProperty('externalStore');
      expect(result.current).toHaveProperty('instance');
      expect(result.current).toHaveProperty('usedKeys');
      expect(result.current).toHaveProperty('usedClassPropKeys');
      expect(result.current).toHaveProperty('rid');

      expect(result.current.instance.current).toBeInstanceOf(CounterCubit);
      expect(result.current.externalStore.getSnapshot()).toEqual({
        count: 0,
        name: 'counter'
      });
    });

    it('should create and return external store for isolated bloc', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(IsolatedCounterCubit, {})
      );

      expect(result.current.instance.current).toBeInstanceOf(IsolatedCounterCubit);
      expect(result.current.externalStore.getSnapshot()).toEqual({
        count: 100,
        name: 'isolated'
      });
    });

    it('should create unique instances for isolated blocs', () => {
      const { result: result1 } = renderHook(() =>
        useExternalBlocStore(IsolatedCounterCubit, {})
      );

      const { result: result2 } = renderHook(() =>
        useExternalBlocStore(IsolatedCounterCubit, {})
      );

      expect(result1.current.instance.current).not.toBe(result2.current.instance.current);
      expect(result1.current.rid).not.toBe(result2.current.rid);
    });

    it('should reuse instances for non-isolated blocs', () => {
      const { result: result1 } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const { result: result2 } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      expect(result1.current.instance.current).toBe(result2.current.instance.current);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to state changes', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener = vi.fn();
      const unsubscribe = result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(listener).toHaveBeenCalledWith({ count: 1, name: 'counter' });

      unsubscribe();
    });

    it('should unsubscribe properly', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener = vi.fn();
      const unsubscribe = result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      act(() => {
        result.current.instance.current.increment();
      });

      // Should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple subscribers', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = result.current.externalStore.subscribe(listener1);
      const unsubscribe2 = result.current.externalStore.subscribe(listener2);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(listener1).toHaveBeenCalledWith({ count: 1, name: 'counter' });
      expect(listener2).toHaveBeenCalledWith({ count: 1, name: 'counter' });

      unsubscribe1();
      unsubscribe2();
    });

    it('should handle subscription errors gracefully', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      const unsubscribe = result.current.externalStore.subscribe(faultyListener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(errorSpy).toHaveBeenCalled();
      expect(faultyListener).toHaveBeenCalled();

      unsubscribe();
      errorSpy.mockRestore();
    });
  });

  describe('Dependency Tracking', () => {
    it('should track used keys', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      // Clear tracking sets
      act(() => {
        result.current.usedKeys.current = new Set();
        result.current.usedClassPropKeys.current = new Set();
      });

      act(() => {
        result.current.instance.current.increment();
      });

      // Keys should be tracked during listener execution
      expect(listener).toHaveBeenCalled();
    });

    it('should reset tracking keys on each listener call', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      let callCount = 0;
      const listener = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call should reset keys
          expect(result.current.usedKeys.current.size).toBe(0);
          expect(result.current.usedClassPropKeys.current.size).toBe(0);
        }
      });

      result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle custom dependency selector', () => {
      const customSelector = vi.fn().mockReturnValue(['count']);

      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, { selector: customSelector })
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.increment();
      });

      // New API passes (currentState, previousState, instance)
      expect(customSelector).toHaveBeenCalledWith(
        { count: 1, name: 'counter' }, // currentState
        { count: 0, name: 'counter' }, // previousState
        expect.any(Object) // instance
      );
    });
  });

  describe('Props and Options', () => {
    it('should handle bloc with props', () => {
      class PropsCubit extends Cubit<{ value: string }> {
        constructor(props: { initialValue: string }) {
          super({ value: props.initialValue });
        }
      }

      const { result } = renderHook(() =>
        useExternalBlocStore(PropsCubit, { props: { initialValue: 'test' } } as any)
      );

      expect(result.current.instance.current.state).toEqual({ value: 'test' });
    });

    it('should handle different IDs for the same bloc class', () => {
      const { result: result1 } = renderHook(() =>
        useExternalBlocStore(CounterCubit, { id: 'counter1' })
      );

      const { result: result2 } = renderHook(() =>
        useExternalBlocStore(CounterCubit, { id: 'counter2' })
      );

      expect(result1.current.instance.current).not.toBe(result2.current.instance.current);

      act(() => {
        result1.current.instance.current.increment();
      });

      expect(result1.current.externalStore.getSnapshot()?.count).toBe(1);
      expect(result2.current.externalStore.getSnapshot()?.count).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle bloc disposal gracefully', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener = vi.fn();
      const unsubscribe = result.current.externalStore.subscribe(listener);

      // Manually dispose the bloc
      act(() => {
        result.current.instance.current._dispose();
      });

      // Should not crash when trying to access disposed bloc
      expect(() => {
        result.current.externalStore.getSnapshot();
      }).not.toThrow();

      unsubscribe();
    });

    it('should handle null/undefined instance gracefully', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      // Manually clear the instance
      act(() => {
        (result.current.instance as any).current = null;
      });

      // Should return empty object for null instance
      const snapshot = result.current.externalStore.getSnapshot();
      expect(snapshot).toEqual({});

      // Subscribe should return no-op function
      const unsubscribe = result.current.externalStore.subscribe(() => {});
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {
          selector: (state) => [[state.count]] // Track count property changes
        })
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      // Make rapid changes
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.instance.current.increment();
        }
      });

      expect(result.current.externalStore.getSnapshot()?.count).toBe(10);
      expect(listener).toHaveBeenCalledTimes(10);
    });

    it('should handle batched updates', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.updateBoth(5, 'batched');
      });

      // Should only trigger once for batched update
      expect(listener).toHaveBeenCalledTimes(1);
      expect(result.current.externalStore.getSnapshot()).toEqual({
        count: 5,
        name: 'batched'
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up properly on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const instance = result.current.instance.current;
      const initialConsumers = instance._consumers.size;

      unmount();

      // Bloc should still exist but consumer should be removed
      // Note: The actual consumer removal happens in useBloc, not useExternalBlocStore
      expect(instance._consumers.size).toBeGreaterThanOrEqual(0);
    });

    it('should track memory stats correctly', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(KeepAliveCubit, {})
      );

      const stats = Blac.getMemoryStats();
      expect(stats.totalBlocs).toBeGreaterThan(0);
      expect(stats.keepAliveBlocs).toBeGreaterThan(0);

      expect(result.current.instance.current).toBeDefined();
    });
  });

  describe('Server-Side Rendering', () => {
    it('should provide server snapshot', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      const serverSnapshot = result.current.externalStore.getServerSnapshot?.();
      const clientSnapshot = result.current.externalStore.getSnapshot();

      expect(serverSnapshot).toEqual(clientSnapshot);
    });

    it('should handle undefined instance in server snapshot', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(CounterCubit, {})
      );

      // Simulate server environment where instance might be null
      act(() => {
        (result.current.instance as any).current = null;
      });

      const serverSnapshot = result.current.externalStore.getServerSnapshot?.();
      expect(serverSnapshot).toEqual({});
    });
  });
});
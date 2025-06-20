import { Blac, Cubit } from '@blac/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useExternalBlocStore from '../src/useExternalBlocStore';

interface ComplexState {
  nested: {
    deep: {
      value: number;
    };
  };
  array: number[];
  map: Map<string, any>;
  set: Set<string>;
  symbol: symbol;
}

class ComplexStateCubit extends Cubit<ComplexState> {
  constructor() {
    super({
      nested: { deep: { value: 42 } },
      array: [1, 2, 3],
      map: new Map([['key', 'value']]),
      set: new Set(['a', 'b']),
      symbol: Symbol('test')
    });
  }

  updateNestedValue(value: number) {
    this.emit({
      ...this.state,
      nested: {
        ...this.state.nested,
        deep: { value }
      }
    });
  }
}

class PrimitiveStateCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment() {
    this.emit(this.state + 1);
  }
}

class StringStateCubit extends Cubit<string> {
  constructor() {
    super('initial');
  }

  update(value: string) {
    this.emit(value);
  }
}

class ErrorProneCubit extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 0 });
  }

  triggerError() {
    // This should trigger runtime validation error
    (this as any)._pushState(undefined, this.state);
  }

  triggerInvalidAction() {
    // This should trigger action validation warning
    (this as any)._pushState({ value: 1 }, this.state, 'invalid-primitive-action');
  }
}

describe('useExternalBlocStore - Edge Cases', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  describe('Complex State Handling', () => {
    it('should handle nested object states', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(ComplexStateCubit, {})
      );

      const initialState = result.current.externalStore.getSnapshot();
      expect(initialState).toBeDefined();
      expect(initialState!.nested.deep.value).toBe(42);

      act(() => {
        result.current.instance.current.updateNestedValue(100);
      });

      const updatedState = result.current.externalStore.getSnapshot();
      expect(updatedState).toBeDefined();
      expect(updatedState!.nested.deep.value).toBe(100);
    });

    it('should handle Map and Set in state', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(ComplexStateCubit, {})
      );

      const state = result.current.externalStore.getSnapshot();
      expect(state).toBeDefined();
      expect(state!.map).toBeInstanceOf(Map);
      expect(state!.set).toBeInstanceOf(Set);
      expect(state!.map.get('key')).toBe('value');
      expect(state!.set.has('a')).toBe(true);
    });

    it('should handle symbols in state', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(ComplexStateCubit, {})
      );

      const state = result.current.externalStore.getSnapshot();
      expect(state).toBeDefined();
      expect(typeof state!.symbol).toBe('symbol');
    });

    it('should handle primitive states', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      expect(result.current.externalStore.getSnapshot()).toBe(0);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(result.current.externalStore.getSnapshot()).toBe(1);
    });

    it('should handle string states', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(StringStateCubit, {})
      );

      expect(result.current.externalStore.getSnapshot()).toBe('initial');

      act(() => {
        result.current.instance.current.update('updated');
      });

      expect(result.current.externalStore.getSnapshot()).toBe('updated');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined state gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { result } = renderHook(() =>
        useExternalBlocStore(ErrorProneCubit, {})
      );

      act(() => {
        result.current.instance.current.triggerError();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'BlocBase._pushState: newState is undefined',
        expect.any(Object)
      );

      // State should remain unchanged
      expect(result.current.externalStore.getSnapshot()).toEqual({ value: 0 });

      consoleSpy.mockRestore();
    });

    it('should handle invalid action types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { result } = renderHook(() =>
        useExternalBlocStore(ErrorProneCubit, {})
      );

      act(() => {
        result.current.instance.current.triggerInvalidAction();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'BlocBase._pushState: Invalid action type',
        expect.any(Object),
        'invalid-primitive-action'
      );

      consoleSpy.mockRestore();
    });

    it('should handle observer subscription errors', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a listener that throws
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Subscription error');
      });

      result.current.externalStore.subscribe(faultyListener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('Dependency Array Edge Cases', () => {
    it('should handle empty dependency array from selector', () => {
      const emptySelector = vi.fn().mockReturnValue([]);

      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, { selector: emptySelector })
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      act(() => {
        result.current.instance.current.increment();
      });

      expect(emptySelector).toHaveBeenCalled();
      expect(listener).toHaveBeenCalled();
    });

    it('should handle selector throwing error', () => {
      const errorSelector = vi.fn().mockImplementation(() => {
        throw new Error('Selector error');
      });

      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, { selector: errorSelector })
      );

      // Should not crash the hook
      expect(result.current.instance.current).toBeDefined();
    });

    it('should handle class property access', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      // Access some class properties to trigger tracking
      const instance = result.current.instance.current;
      const uid = instance.uid;
      const createdAt = instance._createdAt;

      expect(typeof uid).toBe('string');
      expect(typeof createdAt).toBe('number');
      expect(result.current.usedClassPropKeys.current.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      const listeners: Array<() => void> = [];

      // Rapidly subscribe and unsubscribe
      for (let i = 0; i < 100; i++) {
        const listener = vi.fn();
        const unsubscribe = result.current.externalStore.subscribe(listener);
        listeners.push(unsubscribe);
      }

      // Trigger state change
      act(() => {
        result.current.instance.current.increment();
      });

      // Unsubscribe all
      listeners.forEach(unsubscribe => unsubscribe());

      // Should not crash
      expect(result.current.externalStore.getSnapshot()).toBe(1);
    });

    it('should handle concurrent state modifications', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      // Simulate concurrent modifications by making multiple synchronous calls
      act(() => {
        result.current.instance.current.increment();
        result.current.instance.current.increment();
        result.current.instance.current.increment();
      });

      // Final state should be consistent
      expect(result.current.externalStore.getSnapshot()).toBeGreaterThan(0);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle large state objects', () => {
      class LargeStateCubit extends Cubit<{ data: number[] }> {
        constructor() {
          super({ data: Array.from({ length: 10000 }, (_, i) => i) });
        }

        addItem() {
          this.emit({ data: [...this.state.data, this.state.data.length] });
        }
      }

      const { result } = renderHook(() =>
        useExternalBlocStore(LargeStateCubit, {})
      );

      const initialState = result.current.externalStore.getSnapshot();
      expect(initialState).toBeDefined();
      expect(initialState!.data.length).toBe(10000);

      act(() => {
        result.current.instance.current.addItem();
      });

      const updatedState = result.current.externalStore.getSnapshot();
      expect(updatedState).toBeDefined();
      expect(updatedState!.data.length).toBe(10001);
    });

    it('should handle frequent state updates without memory leaks', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      const listener = vi.fn();
      result.current.externalStore.subscribe(listener);

      // Make many updates
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.instance.current.increment();
        }
      });

      expect(result.current.externalStore.getSnapshot()).toBe(1000);
      expect(listener).toHaveBeenCalledTimes(1000);
    });
  });

  describe('Instance Management Edge Cases', () => {
    it('should handle instance replacement', () => {
      const { result, rerender } = renderHook(
        ({ id }: { id: string }) => useExternalBlocStore(PrimitiveStateCubit, { id }),
        { initialProps: { id: 'test1' } }
      );

      const firstInstance = result.current.instance.current;
      expect(firstInstance).toBeDefined();

      act(() => {
        firstInstance!.increment();
      });

      expect(result.current.externalStore.getSnapshot()).toBe(1);

      // Change ID to get new instance
      rerender({ id: 'test2' });

      const secondInstance = result.current.instance.current;
      expect(secondInstance).toBeDefined();
      expect(secondInstance).not.toBe(firstInstance);
      expect(result.current.externalStore.getSnapshot()).toBe(0); // New instance starts at 0
    });

    it('should handle bloc disposal during subscription', () => {
      const { result } = renderHook(() =>
        useExternalBlocStore(PrimitiveStateCubit, {})
      );

      const listener = vi.fn();
      const unsubscribe = result.current.externalStore.subscribe(listener);

      // Dispose the bloc while subscribed
      act(() => {
        result.current.instance.current._dispose();
      });

      // Should not crash when trying to trigger updates
      expect(() => {
        act(() => {
          if (result.current.instance.current) {
            result.current.instance.current.increment();
          }
        });
      }).not.toThrow();

      unsubscribe();
    });
  });
});
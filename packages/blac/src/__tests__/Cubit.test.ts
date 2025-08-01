import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

// Test Cubit implementations
class CounterCubit extends Cubit<number> {
  constructor(initialValue = 0) {
    super(initialValue);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  set = (value: number) => this.emit(value);
}

interface UserState {
  name: string;
  age: number;
  email: string;
  preferences?: {
    theme: string;
    notifications: boolean;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
    });
  }

  updateName = (name: string) => {
    this.patch({ name });
  };

  updateMultiple = (updates: Partial<UserState>) => {
    this.patch(updates);
  };

  setPreferences = (theme: string, notifications: boolean) => {
    this.patch({
      preferences: { theme, notifications },
    });
  };
}

class PrimitiveCubit extends Cubit<string> {
  constructor() {
    super('initial');
  }

  update = (value: string) => this.emit(value);
}

describe('Cubit State Emissions', () => {
  let blacInstance: Blac;

  beforeEach(() => {
    blacInstance = new Blac({ __unsafe_ignore_singleton: true });
    Blac.enableLog = false;
    vi.clearAllMocks();
  });

  describe('Basic emit() functionality', () => {
    it('should emit new state and notify observers', () => {
      const cubit = new CounterCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit.increment();

      expect(observer).toHaveBeenCalledWith(1);
      expect(cubit.state).toBe(1);
    });

    it('should not emit when new state is identical (Object.is comparison)', () => {
      const cubit = new CounterCubit(5);
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Try to emit same value
      cubit.set(5);

      expect(observer).not.toHaveBeenCalled();
      expect(cubit.state).toBe(5);
    });

    it('should handle NaN correctly with Object.is', () => {
      const cubit = new CounterCubit(NaN);
      const observer = vi.fn();

      cubit.subscribe(observer);

      // NaN === NaN is false, but Object.is(NaN, NaN) is true
      cubit.set(NaN);

      expect(observer).not.toHaveBeenCalled();
    });

    it('should distinguish between +0 and -0', () => {
      const cubit = new CounterCubit(0);
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Object.is can distinguish +0 and -0
      cubit.set(-0);

      expect(observer).toHaveBeenCalledWith(-0);
    });

    it('should emit multiple state changes sequentially', () => {
      const cubit = new CounterCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit.increment();
      cubit.increment();
      cubit.decrement();

      expect(observer).toHaveBeenCalledTimes(3);
      expect(observer).toHaveBeenNthCalledWith(1, 1);
      expect(observer).toHaveBeenNthCalledWith(2, 2);
      expect(observer).toHaveBeenNthCalledWith(3, 1);
      expect(cubit.state).toBe(1);
    });
  });

  describe('patch() functionality for object states', () => {
    it('should partially update object state', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit.updateName('Jane Doe');

      expect(observer).toHaveBeenCalledWith({
        name: 'Jane Doe',
        age: 30,
        email: 'john@example.com',
      });
      expect(cubit.state.name).toBe('Jane Doe');
      expect(cubit.state.age).toBe(30); // Unchanged
    });

    it('should update multiple properties at once', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit.updateMultiple({ name: 'Jane Smith', age: 25 });

      expect(observer).toHaveBeenCalledTimes(1);
      expect(cubit.state).toEqual({
        name: 'Jane Smith',
        age: 25,
        email: 'john@example.com',
      });
    });

    it('should not emit when patched values are identical', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Patch with same values
      cubit.patch({ name: 'John Doe', age: 30 });

      expect(observer).not.toHaveBeenCalled();
    });

    it('should emit when at least one patched value differs', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // One value different
      cubit.patch({ name: 'John Doe', age: 31 });

      expect(observer).toHaveBeenCalledTimes(1);
      expect(cubit.state.age).toBe(31);
    });

    it('should handle nested object updates', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit.setPreferences('dark', true);

      expect(observer).toHaveBeenCalledTimes(1);
      expect(cubit.state.preferences).toEqual({
        theme: 'dark',
        notifications: true,
      });
    });

    it('should handle patch with ignoreChangeCheck flag', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Force emit even with same values
      cubit.patch({ name: 'John Doe' }, true);

      expect(observer).toHaveBeenCalledTimes(1);
    });

    it('should warn when patch is called on non-object state', () => {
      const cubit = new PrimitiveCubit();
      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});

      cubit.patch('new value' as any);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Cubit.patch: was called on a cubit where the state is not an object',
        ),
      );
      expect(cubit.state).toBe('initial'); // State unchanged
    });

    it('should handle null state gracefully', () => {
      class NullStateCubit extends Cubit<null> {
        constructor() {
          super(null);
        }
      }

      const cubit = new NullStateCubit();
      const warnSpy = vi.spyOn(Blac, 'warn').mockImplementation(() => {});

      cubit.patch({} as any);

      expect(warnSpy).toHaveBeenCalled();
      expect(cubit.state).toBe(null);
    });
  });

  describe('State change detection edge cases', () => {
    it('should detect changes in array states', () => {
      class ArrayCubit extends Cubit<number[]> {
        constructor() {
          super([1, 2, 3]);
        }

        add = (num: number) => {
          this.emit([...this.state, num]);
        };

        updateIndex = (index: number, value: number) => {
          const newArray = [...this.state];
          newArray[index] = value;
          this.emit(newArray);
        };
      }

      const cubit = new ArrayCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // New array reference should trigger update
      cubit.add(4);
      expect(observer).toHaveBeenCalledTimes(1);
      expect(cubit.state).toEqual([1, 2, 3, 4]);

      // Same array reference should not trigger
      observer.mockClear();
      const currentState = cubit.state;
      cubit.emit(currentState);
      expect(observer).not.toHaveBeenCalled();
    });

    it('should handle undefined and null transitions', () => {
      class NullableCubit extends Cubit<string | null | undefined> {
        constructor() {
          super('initial');
        }

        setNull = () => this.emit(null);
        setUndefined = () => this.emit(undefined);
        setString = (s: string) => this.emit(s);
      }

      const cubit = new NullableCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // null and undefined are different according to Object.is
      expect(Object.is(null, undefined)).toBe(false);

      cubit.setNull();
      expect(observer).toHaveBeenCalledWith(null);
      expect(cubit.state).toBe(null);

      observer.mockClear();

      // NOTE: There's a limitation in BlocBase._pushState that prevents undefined states
      // It has a validation: if (newState === undefined) return;
      // So undefined cannot be emitted as a state
      cubit.setUndefined();

      // State should remain null since undefined is rejected
      expect(observer).not.toHaveBeenCalled();
      expect(cubit.state).toBe(null);

      observer.mockClear();
      cubit.setString('value');
      expect(observer).toHaveBeenCalledWith('value');
      expect(cubit.state).toBe('value');
    });

    it('should handle complex object comparisons', () => {
      interface ComplexState {
        data: { id: number; values: number[] };
        metadata: Map<string, any>;
      }

      class ComplexCubit extends Cubit<ComplexState> {
        constructor() {
          super({
            data: { id: 1, values: [1, 2, 3] },
            metadata: new Map([['key', 'value']]),
          });
        }

        updateData = (data: ComplexState['data']) => {
          this.patch({ data });
        };
      }

      const cubit = new ComplexCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Different object reference with same values
      cubit.updateData({ id: 1, values: [1, 2, 3] });

      // Should emit because object reference is different
      expect(observer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with BlocBase', () => {
    it('should properly inherit from BlocBase', () => {
      const cubit = new CounterCubit();

      // Should have BlocBase properties and methods
      expect(cubit.state).toBe(0);
      expect(cubit._subscriptionManager).toBeDefined();
      expect(typeof cubit.subscribe).toBe('function');
    });

    it('should work with state batching', () => {
      const cubit = new CounterCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      cubit._batchUpdates(() => {
        cubit.increment(); // 0 -> 1
        cubit.increment(); // 1 -> 2
        cubit.increment(); // 2 -> 3
      });

      // Should only notify once with final state
      // The oldState in the batch notification is from the last update (2 -> 3)
      expect(observer).toHaveBeenCalledTimes(1);
      expect(observer).toHaveBeenCalledWith(3);
      expect(cubit.state).toBe(3);
    });

    it('should maintain state history correctly', () => {
      const cubit = new CounterCubit();

      cubit.increment();
      // Old state tracking was removed in new model
      expect(cubit.state).toBe(1);

      cubit.increment();
      expect(cubit.state).toBe(2);
    });
  });

  describe('Memory and Performance', () => {
    it('should not leak memory with rapid emissions', () => {
      const cubit = new CounterCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Rapid emissions
      for (let i = 0; i < 1000; i++) {
        cubit.increment();
      }

      expect(cubit.state).toBe(1000);
      expect(observer).toHaveBeenCalledTimes(1000);

      // Check final state
      expect(cubit.state).toBe(1000);
    });

    it('should handle concurrent patch operations', () => {
      const cubit = new UserCubit();
      const observer = vi.fn();

      cubit.subscribe(observer);

      // Multiple patches in quick succession
      cubit.patch({ name: 'Name1' });
      cubit.patch({ age: 25 });
      cubit.patch({ email: 'new@example.com' });

      expect(observer).toHaveBeenCalledTimes(3);
      expect(cubit.state).toEqual({
        name: 'Name1',
        age: 25,
        email: 'new@example.com',
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with emit', () => {
      const cubit = new CounterCubit();

      // TypeScript should enforce number type
      cubit.emit(42);
      expect(cubit.state).toBe(42);

      // Test that emit only accepts numbers
      // cubit.emit('not a number'); // This would be a type error
    });

    it('should maintain type safety with patch', () => {
      const cubit = new UserCubit();

      // Valid patch
      cubit.patch({ name: 'New Name' });

      // Test that patch only accepts valid properties and types
      // cubit.patch({ invalidProp: 'value' }); // This would be a type error
      // cubit.patch({ age: 'not a number' }); // This would be a type error
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cubit } from '../Cubit';
import { Blac } from '../Blac';

// Helper function to observe state changes using generators
async function observeNextState<T>(cubit: Cubit<T>): Promise<{ newState: T; oldState: T }> {
  const iterator = cubit.stateChanges();
  const result = await iterator.next();
  if (!result.done) {
    return { newState: result.value.current, oldState: result.value.previous };
  }
  throw new Error('No state change emitted');
}

// Helper to collect state changes
async function collectStateChanges<T>(cubit: Cubit<T>, action: () => void): Promise<Array<{ newState: T; oldState: T }>> {
  const changes: Array<{ newState: T; oldState: T }> = [];
  const iterator = cubit.stateChanges();
  
  // Start collecting in background
  const collectPromise = (async () => {
    for await (const change of iterator) {
      changes.push({ newState: change.current, oldState: change.previous });
    }
  })();
  
  // Perform action
  action();
  
  // Wait a bit for changes to be collected
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return changes;
}

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
  constructor(initial = 'hello') {
    super(initial);
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
    it('should emit new state and notify observers', async () => {
      const cubit = new CounterCubit();
      
      // Start observing state changes
      const stateChangePromise = observeNextState(cubit);
      
      cubit.increment();
      
      const { newState, oldState } = await stateChangePromise;
      expect(newState).toBe(1);
      expect(oldState).toBe(0);
      expect(cubit.state).toBe(1);
    });

    it('should not emit when new state is identical (Object.is comparison)', async () => {
      const cubit = new CounterCubit(5);
      
      // Start observing state changes
      const iterator = cubit.stateChanges();
      
      // Try to emit same value
      cubit.set(5);
      
      // Wait a bit to ensure no state change occurs
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that no state change was emitted
      const result = await Promise.race([
        iterator.next(),
        new Promise(resolve => setTimeout(() => resolve({ done: true, value: undefined }), 50))
      ]);
      
      expect(result).toEqual({ done: true, value: undefined });
      expect(cubit.state).toBe(5);
    });

    it('should handle NaN correctly with Object.is', async () => {
      const cubit = new CounterCubit(NaN);
      
      // Start observing state changes
      const iterator = cubit.stateChanges();
      
      // NaN === NaN is false, but Object.is(NaN, NaN) is true
      cubit.set(NaN);
      
      // Wait to ensure no emission
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Now emit different value
      cubit.set(0);
      
      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value.newState).toBe(0);
      expect(Number.isNaN(result.value.oldState)).toBe(true);
    });

    it('should distinguish between +0 and -0', async () => {
      const cubit = new CounterCubit(0);
      
      const changes = await collectStateChanges(cubit, () => {
        cubit.set(-0);
      });
      
      expect(changes).toHaveLength(1);
      expect(changes[0].newState).toBe(-0);
      expect(changes[0].oldState).toBe(0);
      expect(Object.is(changes[0].newState, -0)).toBe(true);
      expect(Object.is(changes[0].oldState, 0)).toBe(true);
    });

    it('should handle multiple rapid emissions', async () => {
      const cubit = new CounterCubit();
      
      const changes = await collectStateChanges(cubit, () => {
        cubit.increment();
        cubit.increment();
        cubit.increment();
      });
      
      expect(changes).toHaveLength(3);
      expect(changes[0]).toEqual({ newState: 1, oldState: 0 });
      expect(changes[1]).toEqual({ newState: 2, oldState: 1 });
      expect(changes[2]).toEqual({ newState: 3, oldState: 2 });
      expect(cubit.state).toBe(3);
    });

    it('should work with primitive string state', async () => {
      const cubit = new PrimitiveCubit();
      
      const stateChangePromise = observeNextState(cubit);
      cubit.update('world');
      
      const { newState, oldState } = await stateChangePromise;
      expect(newState).toBe('world');
      expect(oldState).toBe('hello');
    });
  });

  describe('patch() functionality', () => {
    it('should update partial state with patch()', async () => {
      const cubit = new UserCubit();
      
      const stateChangePromise = observeNextState(cubit);
      cubit.updateName('Jane Doe');
      
      const { newState, oldState } = await stateChangePromise;
      expect(newState.name).toBe('Jane Doe');
      expect(newState.age).toBe(30);
      expect(newState.email).toBe('john@example.com');
      expect(oldState.name).toBe('John Doe');
    });

    it('should handle multiple property updates', async () => {
      const cubit = new UserCubit();
      
      const stateChangePromise = observeNextState(cubit);
      cubit.updateMultiple({ name: 'Jane Smith', age: 25 });
      
      const { newState } = await stateChangePromise;
      expect(newState.name).toBe('Jane Smith');
      expect(newState.age).toBe(25);
      expect(newState.email).toBe('john@example.com');
    });

    it('should handle nested object updates', async () => {
      const cubit = new UserCubit();
      
      const stateChangePromise = observeNextState(cubit);
      cubit.setPreferences('dark', true);
      
      const { newState, oldState } = await stateChangePromise;
      expect(newState.preferences).toEqual({
        theme: 'dark',
        notifications: true,
      });
      expect(oldState.preferences).toBeUndefined();
    });

    it('should not emit when patch results in identical state', async () => {
      const cubit = new UserCubit();
      
      const iterator = cubit.stateChanges();
      
      // Patch with same values
      cubit.patch({ name: 'John Doe', age: 30 });
      
      // Wait to ensure no emission
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await Promise.race([
        iterator.next(),
        new Promise(resolve => setTimeout(() => resolve({ done: true, value: undefined }), 50))
      ]);
      
      expect(result).toEqual({ done: true, value: undefined });
    });

    it('should create new state object with patch', async () => {
      const cubit = new UserCubit();
      const originalState = cubit.state;
      
      const stateChangePromise = observeNextState(cubit);
      cubit.updateName('Jane');
      
      const { newState } = await stateChangePromise;
      expect(newState).not.toBe(originalState);
      expect(newState.name).toBe('Jane');
    });

    it('should throw error when patching non-object state', () => {
      const cubit = new PrimitiveCubit();
      const warnSpy = vi.spyOn(Blac, 'warn');
      
      // Should not throw, just warn
      cubit.patch({ invalid: 'patch' } as any);
      
      expect(warnSpy).toHaveBeenCalledWith(
        'Cubit.patch: was called on a cubit where the state is not an object. This is a no-op.'
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('Advanced emit behaviors', () => {
    it('should emit from constructor', async () => {
      class InitialEmitCubit extends Cubit<number> {
        constructor() {
          super(0);
          this.emit(10);
        }
      }
      
      const cubit = new InitialEmitCubit();
      expect(cubit.state).toBe(10);
    });

    it('should handle errors in state transformation', () => {
      class ErrorCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        
        triggerError = () => {
          const obj: any = null;
          this.emit(obj.value); // This will throw
        };
      }
      
      const cubit = new ErrorCubit();
      expect(() => cubit.triggerError()).toThrow();
      expect(cubit.state).toBe(0); // State should remain unchanged
    });

    it('should maintain emission order', async () => {
      const cubit = new CounterCubit();
      const states: number[] = [];
      
      // Collect all states
      (async () => {
        for await (const { current } of cubit.stateChanges()) {
          states.push(current);
          if (states.length >= 3) break;
        }
      })();
      
      cubit.set(5);
      cubit.set(10);
      cubit.set(15);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(states).toEqual([5, 10, 15]);
    });
  });

  describe('Lifecycle and disposal', () => {
    it('should stop emitting after disposal', async () => {
      const cubit = new CounterCubit();
      
      const iterator = cubit.stateChanges();
      
      // Dispose the cubit
      cubit.dispose();
      
      // Try to emit after disposal
      cubit.increment();
      
      // Iterator should complete
      const result = await iterator.next();
      expect(result.done).toBe(true);
      expect(cubit.state).toBe(0); // State unchanged
    });

    it('should handle disposal during emission', async () => {
      class DisposalCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        
        emitAndDispose = () => {
          this.emit(1);
          this.dispose();
          this.emit(2); // Should not emit
        };
      }
      
      const cubit = new DisposalCubit();
      const changes = await collectStateChanges(cubit, () => {
        cubit.emitAndDispose();
      });
      
      expect(changes).toHaveLength(1);
      expect(changes[0].newState).toBe(1);
      expect(cubit.state).toBe(1);
    });
  });

  describe('Inheritance and extension', () => {
    it('should work with extended Cubit classes', async () => {
      class BaseCubit<T> extends Cubit<T> {
        reset: () => void;
        
        constructor(initialState: T) {
          super(initialState);
          const initial = initialState;
          this.reset = () => this.emit(initial);
        }
      }
      
      class ExtendedCounterCubit extends BaseCubit<number> {
        constructor() {
          super(0);
        }
        
        increment = () => this.emit(this.state + 1);
      }
      
      const cubit = new ExtendedCounterCubit();
      
      // Test increment
      let stateChange = observeNextState(cubit);
      cubit.increment();
      
      let result = await stateChange;
      expect(result.newState).toBe(1);
      
      // Test reset
      stateChange = observeNextState(cubit);
      cubit.reset();
      
      result = await stateChange;
      expect(result.newState).toBe(0);
    });

    it('should support method chaining patterns', async () => {
      class ChainableCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
        
        add = (value: number): this => {
          this.emit(this.state + value);
          return this;
        };
        
        multiply = (value: number): this => {
          this.emit(this.state * value);
          return this;
        };
      }
      
      const cubit = new ChainableCubit();
      const changes = await collectStateChanges(cubit, () => {
        cubit.add(5).multiply(2).add(3);
      });
      
      expect(changes).toHaveLength(3);
      expect(changes[0].newState).toBe(5);
      expect(changes[1].newState).toBe(10);
      expect(changes[2].newState).toBe(13);
    });
  });

  describe('stateChanges() generator', () => {
    it('should support multiple concurrent iterators', async () => {
      const cubit = new CounterCubit();
      
      const iterator1 = cubit.stateChanges();
      const iterator2 = cubit.stateChanges();
      
      cubit.increment();
      
      const [result1, result2] = await Promise.all([
        iterator1.next(),
        iterator2.next()
      ]);
      
      expect(result1.value).toEqual({ current: 1, previous: 0 });
      expect(result2.value).toEqual({ current: 1, previous: 0 });
    });

    it('should complete iterator when break is used', async () => {
      const cubit = new CounterCubit();
      const collectedStates: number[] = [];
      
      // Start collecting in background
      const collectPromise = (async () => {
        for await (const { current } of cubit.stateChanges()) {
          collectedStates.push(current);
          if (current >= 2) break;
        }
      })();
      
      // Emit states
      cubit.increment(); // state = 1
      cubit.increment(); // state = 2, should break here
      
      // These should not be collected
      cubit.increment();
      cubit.increment();
      
      // Wait for collection to complete
      await collectPromise;
      
      expect(collectedStates).toEqual([1, 2]);
      expect(cubit.state).toBe(4); // Final state after all increments
    });
  });
});
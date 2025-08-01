import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Bloc } from '../Bloc';
import { Cubit } from '../Cubit';
import { BlocStreams } from '../streams';

// Test classes
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

// Event classes for Bloc
class IncrementEvent {}
class DecrementEvent {}
class SetValueEvent {
  constructor(public value: number) {}
}

class CounterBloc extends Bloc<
  number,
  IncrementEvent | DecrementEvent | SetValueEvent
> {
  constructor() {
    super(0);

    this.on(IncrementEvent, (_, emit) => {
      emit(this.state + 1);
    });

    this.on(DecrementEvent, (_, emit) => {
      emit(this.state - 1);
    });

    this.on(SetValueEvent, (event, emit) => {
      emit(event.value);
    });
  }
}

describe('Generator Integration Tests', () => {
  describe('BlocBase.stateStream()', () => {
    it('should yield initial state immediately', async () => {
      const cubit = new CounterCubit();
      const states: number[] = [];

      const iterator = cubit.stateStream();
      const firstResult = await iterator.next();

      expect(firstResult.value).toBe(0);
      expect(firstResult.done).toBe(false);
    });

    it('should yield subsequent state changes', async () => {
      const cubit = new CounterCubit();
      const states: number[] = [];

      const collectStates = async () => {
        for await (const state of cubit.stateStream()) {
          states.push(state);
          if (states.length === 4) break;
        }
      };

      const collectionPromise = collectStates();

      // Give the generator time to set up
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit state changes
      cubit.increment();
      cubit.increment();
      cubit.decrement();

      await collectionPromise;

      expect(states).toEqual([0, 1, 2, 1]);
    });

    it('should clean up when iteration stops', async () => {
      const cubit = new CounterCubit();
      const states: number[] = [];

      // Use for-await-of and break early
      const iterator = cubit.stateStream()[Symbol.asyncIterator]();

      // Get first state
      let result = await iterator.next();
      states.push(result.value!);

      // Emit a change
      setTimeout(() => cubit.increment(), 10);

      // Get second state
      result = await iterator.next();
      states.push(result.value!);

      // Explicitly stop iteration
      await iterator.return?.();

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Emit more changes - these should not affect our closed iterator
      cubit.increment();
      cubit.increment();

      // Wait to ensure no more values come through
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(states).toEqual([0, 1]);
    });

    it('should handle multiple concurrent generators', async () => {
      const cubit = new CounterCubit();
      const states1: number[] = [];
      const states2: number[] = [];

      const collect1 = async () => {
        for await (const state of cubit.stateStream()) {
          states1.push(state);
          if (states1.length === 3) break;
        }
      };

      const collect2 = async () => {
        for await (const state of cubit.stateStream()) {
          states2.push(state);
          if (states2.length === 3) break;
        }
      };

      const promise1 = collect1();
      const promise2 = collect2();

      await new Promise((resolve) => setTimeout(resolve, 10));

      cubit.increment();
      cubit.increment();

      await Promise.all([promise1, promise2]);

      expect(states1).toEqual([0, 1, 2]);
      expect(states2).toEqual([0, 1, 2]);
    });

    it('should complete when bloc is disposed', async () => {
      const cubit = new CounterCubit();
      const states: number[] = [];
      let completed = false;

      const collectStates = async () => {
        for await (const state of cubit.stateStream()) {
          states.push(state);
        }
        completed = true;
      };

      const promise = collectStates();

      await new Promise((resolve) => setTimeout(resolve, 10));

      cubit.increment();
      cubit.dispose();

      await promise;

      expect(states).toEqual([0, 1]);
      expect(completed).toBe(true);
    });
  });

  describe('BlocBase.stateChanges()', () => {
    it('should only yield state changes, not initial state', async () => {
      const cubit = new CounterCubit();
      const changes: Array<{ newState: number; oldState: number }> = [];

      const collectChanges = async () => {
        for await (const change of cubit.stateChanges()) {
          changes.push({ newState: change.current, oldState: change.previous });
          if (changes.length === 3) break;
        }
      };

      const promise = collectChanges();

      await new Promise((resolve) => setTimeout(resolve, 10));

      cubit.increment();
      cubit.increment();
      cubit.decrement();

      await promise;

      expect(changes).toEqual([
        { newState: 1, oldState: 0 },
        { newState: 2, oldState: 1 },
        { newState: 1, oldState: 2 },
      ]);
    });

    it('should not yield for identical state emissions', async () => {
      const cubit = new CounterCubit();
      const changes: Array<{ newState: number; oldState: number }> = [];

      const collectChanges = async () => {
        for await (const change of cubit.stateChanges()) {
          changes.push({ newState: change.current, oldState: change.previous });
        }
      };

      const promise = collectChanges();

      await new Promise((resolve) => setTimeout(resolve, 10));

      cubit.increment(); // 0 -> 1
      cubit.setValue(1); // 1 -> 1 (no change)
      cubit.increment(); // 1 -> 2

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cancel the generator
      cubit.dispose();
      await promise;

      expect(changes).toEqual([
        { newState: 1, oldState: 0 },
        { newState: 2, oldState: 1 },
      ]);
    });
  });

  describe('Bloc.events()', () => {
    it('should yield all events added to bloc', async () => {
      const bloc = new CounterBloc();
      const events: any[] = [];

      const collectEvents = async () => {
        for await (const event of bloc.events()) {
          events.push(event);
          if (events.length === 3) break;
        }
      };

      const promise = collectEvents();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event1 = new IncrementEvent();
      const event2 = new SetValueEvent(10);
      const event3 = new DecrementEvent();

      await bloc.add(event1);
      await bloc.add(event2);
      await bloc.add(event3);

      await promise;

      expect(events).toEqual([event1, event2, event3]);
    });

    it('should complete when bloc is disposed', async () => {
      const bloc = new CounterBloc();
      const events: any[] = [];
      let completed = false;

      const collectEvents = async () => {
        for await (const event of bloc.events()) {
          events.push(event);
        }
        completed = true;
      };

      const promise = collectEvents();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event1 = new IncrementEvent();
      await bloc.add(event1);

      bloc.dispose();

      await promise;

      expect(events).toEqual([event1]);
      expect(completed).toBe(true);
    });
  });

  describe('BlocStreams Utility', () => {
    describe('combineStates()', () => {
      it('should combine multiple bloc states', async () => {
        const cubit1 = new CounterCubit();
        const cubit2 = new CounterCubit();
        cubit2.setValue(100);

        const states: Array<{counter1: number; counter2: number}> = [];

        const collectStates = async () => {
          for await (const state of BlocStreams.combineStates({
            counter1: cubit1,
            counter2: cubit2,
          })) {
            states.push(state);
            if (states.length === 4) break;
          }
        };

        const promise = collectStates();

        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit1.increment(); // 0 -> 1
        cubit2.increment(); // 100 -> 101
        cubit1.increment(); // 1 -> 2

        await promise;

        expect(states[0]).toEqual({ counter1: 0, counter2: 100 }); // Initial
        expect(states[1]).toEqual({ counter1: 1, counter2: 100 });
        expect(states[2]).toEqual({ counter1: 1, counter2: 101 });
        expect(states[3]).toEqual({ counter1: 2, counter2: 101 });
      });
    });

    describe('deriveState()', () => {
      it('should derive state using selector', async () => {
        const cubit = new CounterCubit();
        const derived: Array<boolean> = [];

        const collectDerived = async () => {
          for await (const isEven of BlocStreams.deriveState(
            cubit,
            state => state % 2 === 0
          )) {
            derived.push(isEven);
            if (derived.length === 4) break;
          }
        };

        const promise = collectDerived();

        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit.increment(); // 0 -> 1
        cubit.increment(); // 1 -> 2
        cubit.increment(); // 2 -> 3

        await promise;

        expect(derived).toEqual([true, false, true, false]); // 0=even, 1=odd, 2=even, 3=odd
      });
    });

    describe('filter()', () => {
      it('should filter state values', async () => {
        const cubit = new CounterCubit();
        const evenStates: number[] = [];

        const collectEven = async () => {
          for await (const state of BlocStreams.filter(
            cubit,
            (state) => state % 2 === 0,
          )) {
            evenStates.push(state);
            if (evenStates.length === 3) break;
          }
        };

        const promise = collectEven();

        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit.increment(); // 0 -> 1 (filtered out)
        cubit.increment(); // 1 -> 2 (included)
        cubit.increment(); // 2 -> 3 (filtered out)
        cubit.increment(); // 3 -> 4 (included)

        await promise;

        expect(evenStates).toEqual([0, 2, 4]);
      });
    });

    describe('map()', () => {
      it('should transform state values', async () => {
        const cubit = new CounterCubit();
        const doubled: number[] = [];

        const collectDoubled = async () => {
          for await (const value of BlocStreams.map(
            cubit,
            (state) => state * 2,
          )) {
            doubled.push(value);
            if (doubled.length === 4) break;
          }
        };

        const promise = collectDoubled();

        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit.increment(); // 0 -> 1
        cubit.increment(); // 1 -> 2
        cubit.increment(); // 2 -> 3

        await promise;

        expect(doubled).toEqual([0, 2, 4, 6]);
      });
    });

    describe('debounce()', () => {
      it('should debounce rapid state changes', async () => {
        const cubit = new CounterCubit();
        const states: number[] = [];

        const collectDebounced = async () => {
          const debounced = BlocStreams.debounce(cubit, 30);

          for await (const state of debounced) {
            states.push(state);
            if (states.length === 3) break;
          }
        };

        const promise = collectDebounced();

        await new Promise((resolve) => setTimeout(resolve, 10));

        // Rapid changes
        cubit.increment(); // 0 -> 1
        cubit.increment(); // 1 -> 2
        cubit.increment(); // 2 -> 3

        // Wait for debounce
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Another change after debounce
        cubit.increment(); // 3 -> 4

        // Wait for collection
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Cancel collection
        cubit.dispose();
        await promise;

        // Should have initial (0), debounced value (3), and final (4)
        expect(states).toEqual([0, 3, 4]);
      });
    });

    describe('throttle()', () => {
      it('should throttle state changes', async () => {
        const cubit = new CounterCubit();
        const states: number[] = [];

        const collectThrottled = async () => {
          const throttled = BlocStreams.throttle(cubit, 30);

          for await (const state of throttled) {
            states.push(state);
            if (states.length === 3) break;
          }
        };

        const promise = collectThrottled();

        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit.increment(); // 0 -> 1 (first in window)
        cubit.increment(); // 1 -> 2 (throttled)
        cubit.increment(); // 2 -> 3 (throttled)

        await new Promise((resolve) => setTimeout(resolve, 40));

        cubit.increment(); // 3 -> 4 (first in new window)

        await promise;

        // Should have initial (0), first change (1), and first after throttle (4)
        expect(states).toEqual([0, 1, 4]);
      });
    });

    describe('take()', () => {
      it('should take only specified number of values', async () => {
        const cubit = new CounterCubit();
        const states: number[] = [];

        for await (const state of BlocStreams.take(cubit, 3)) {
          states.push(state);
        }

        // Try to emit more - should be ignored
        cubit.increment();
        cubit.increment();

        expect(states).toEqual([0]); // Only initial state since we didn't emit before taking

        // Test with emissions
        const cubit2 = new CounterCubit();
        const states2: number[] = [];

        const collectStates = async () => {
          for await (const state of BlocStreams.take(
            cubit2,
            3,
          )) {
            states2.push(state);
          }
        };

        const promise = collectStates();
        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit2.increment();
        cubit2.increment();
        cubit2.increment();
        cubit2.increment(); // This should be ignored

        await promise;

        expect(states2).toEqual([0, 1, 2]); // Initial + 2 changes
      });
    });

    describe('skip()', () => {
      it('should skip specified number of values', async () => {
        const cubit = new CounterCubit();
        const states: number[] = [];

        const collectStates = async () => {
          for await (const state of BlocStreams.skip(cubit, 2)) {
            states.push(state);
            if (states.length === 2) break;
          }
        };

        const promise = collectStates();
        await new Promise((resolve) => setTimeout(resolve, 10));

        cubit.increment(); // 0 -> 1 (skipped)
        cubit.increment(); // 1 -> 2 (first collected)
        cubit.increment(); // 2 -> 3 (second collected)

        await promise;

        expect(states).toEqual([2, 3]);
      });
    });

  });

  describe('Memory and Performance', () => {
    it('should not leak memory when generators are abandoned', async () => {
      const cubit = new CounterCubit();

      // Create and abandon multiple generators
      for (let i = 0; i < 10; i++) {
        const iterator = cubit.stateStream()[Symbol.asyncIterator]();
        await iterator.next(); // Get initial value
        // Abandon without proper cleanup
      }

      // Force garbage collection opportunity
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still work correctly
      const finalStates: number[] = [];
      for await (const state of cubit.stateStream()) {
        finalStates.push(state);
        if (finalStates.length === 2) break;
      }

      cubit.increment();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(cubit.state).toBe(1);
    });

    it('should handle rapid generator creation and disposal', async () => {
      const cubit = new CounterCubit();
      const allStates: number[][] = [];

      // Create many generators rapidly
      const promises = Array.from({ length: 20 }, async (_, i) => {
        const states: number[] = [];
        const iterator = cubit.stateStream()[Symbol.asyncIterator]();

        const result = await iterator.next();
        states.push(result.value!);

        if (i % 2 === 0) {
          // Half of them wait for one more state
          setTimeout(() => cubit.increment(), 10);
          const next = await iterator.next();
          states.push(next.value!);
        }

        await iterator.return?.();
        allStates.push(states);
      });

      await Promise.all(promises);

      // All generators should have gotten at least the initial state
      expect(allStates.every((states) => states.length >= 1)).toBe(true);
    });
  });
});
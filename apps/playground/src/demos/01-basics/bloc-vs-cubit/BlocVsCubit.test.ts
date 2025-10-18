import { describe, it, expect, beforeEach } from 'vitest';
import { Cubit, Vertex } from '@blac/core';

// ===== CUBIT IMPLEMENTATION =====
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}

// ===== BLOC IMPLEMENTATION =====
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

class CounterBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0 });

    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0 });
    });
  }

  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    return this.add(new DecrementEvent(amount));
  };

  reset = () => {
    return this.add(new ResetEvent());
  };
}

describe('Cubit vs Bloc Comparison', () => {
  describe('CounterCubit', () => {
    let cubit: CounterCubit;

    beforeEach(() => {
      cubit = new CounterCubit();
    });

    it('should initialize with count 0', () => {
      expect(cubit.state.count).toBe(0);
    });

    it('should increment count', () => {
      cubit.increment();
      expect(cubit.state.count).toBe(1);

      cubit.increment();
      expect(cubit.state.count).toBe(2);
    });

    it('should decrement count', () => {
      cubit.increment();
      cubit.increment();
      expect(cubit.state.count).toBe(2);

      cubit.decrement();
      expect(cubit.state.count).toBe(1);
    });

    it('should reset count to 0', () => {
      cubit.increment();
      cubit.increment();
      expect(cubit.state.count).toBe(2);

      cubit.reset();
      expect(cubit.state.count).toBe(0);
    });

    it('should handle negative counts', () => {
      cubit.decrement();
      expect(cubit.state.count).toBe(-1);
    });

    it('should handle multiple operations in sequence', () => {
      cubit.increment(); // 1
      cubit.increment(); // 2
      cubit.decrement(); // 1
      cubit.increment(); // 2
      cubit.reset(); // 0

      expect(cubit.state.count).toBe(0);
    });
  });

  describe('CounterBloc', () => {
    let bloc: CounterBloc;

    beforeEach(() => {
      bloc = new CounterBloc();
    });

    it('should initialize with count 0', () => {
      expect(bloc.state.count).toBe(0);
    });

    it('should increment count via event', async () => {
      await bloc.add(new IncrementEvent());
      expect(bloc.state.count).toBe(1);

      await bloc.add(new IncrementEvent());
      expect(bloc.state.count).toBe(2);
    });

    it('should increment by custom amount', async () => {
      await bloc.add(new IncrementEvent(5));
      expect(bloc.state.count).toBe(5);

      await bloc.add(new IncrementEvent(3));
      expect(bloc.state.count).toBe(8);
    });

    it('should decrement count via event', async () => {
      await bloc.add(new IncrementEvent(10));
      await bloc.add(new DecrementEvent());
      expect(bloc.state.count).toBe(9);
    });

    it('should decrement by custom amount', async () => {
      await bloc.add(new IncrementEvent(10));
      await bloc.add(new DecrementEvent(3));
      expect(bloc.state.count).toBe(7);
    });

    it('should reset count to 0 via event', async () => {
      await bloc.add(new IncrementEvent(5));
      expect(bloc.state.count).toBe(5);

      await bloc.add(new ResetEvent());
      expect(bloc.state.count).toBe(0);
    });

    it('should handle negative counts', async () => {
      await bloc.add(new DecrementEvent());
      expect(bloc.state.count).toBe(-1);
    });

    it('should handle multiple events in sequence', async () => {
      await bloc.increment(); // 1
      await bloc.increment(); // 2
      await bloc.decrement(); // 1
      await bloc.increment(); // 2
      await bloc.reset(); // 0

      expect(bloc.state.count).toBe(0);
    });

    it('should process events in order', async () => {
      // Queue multiple events
      await Promise.all([
        bloc.add(new IncrementEvent(1)),
        bloc.add(new IncrementEvent(2)),
        bloc.add(new DecrementEvent(1)),
      ]);

      // 0 + 1 + 2 - 1 = 2
      expect(bloc.state.count).toBe(2);
    });
  });

  describe('Feature Parity', () => {
    it('both implementations should produce same results for same operations', async () => {
      const cubit = new CounterCubit();
      const bloc = new CounterBloc();

      // Perform same operations on both
      cubit.increment();
      await bloc.increment();
      expect(cubit.state.count).toBe(bloc.state.count);

      cubit.increment();
      await bloc.increment();
      expect(cubit.state.count).toBe(bloc.state.count);

      cubit.decrement();
      await bloc.decrement();
      expect(cubit.state.count).toBe(bloc.state.count);

      cubit.reset();
      await bloc.reset();
      expect(cubit.state.count).toBe(bloc.state.count);
    });

    it('both should handle edge cases identically', async () => {
      const cubit = new CounterCubit();
      const bloc = new CounterBloc();

      // Test negative numbers
      cubit.decrement();
      cubit.decrement();
      await bloc.decrement();
      await bloc.decrement();
      expect(cubit.state.count).toBe(bloc.state.count);
      expect(cubit.state.count).toBe(-2);

      // Test reset from negative
      cubit.reset();
      await bloc.reset();
      expect(cubit.state.count).toBe(bloc.state.count);
      expect(cubit.state.count).toBe(0);
    });
  });

  describe('Implementation Differences', () => {
    it('Cubit uses direct method calls (synchronous)', () => {
      const cubit = new CounterCubit();

      cubit.increment();
      // State updated immediately
      expect(cubit.state.count).toBe(1);
    });

    it('Bloc uses event queue (asynchronous)', async () => {
      const bloc = new CounterBloc();

      const promise = bloc.add(new IncrementEvent());
      // State might not be updated yet (event in queue)

      await promise;
      // State guaranteed to be updated after promise resolves
      expect(bloc.state.count).toBe(1);
    });

    it('Cubit has simpler API surface', () => {
      const cubit = new CounterCubit();

      // Direct methods
      expect(typeof cubit.increment).toBe('function');
      expect(typeof cubit.decrement).toBe('function');
      expect(typeof cubit.reset).toBe('function');

      // No event-related APIs
      expect((cubit as any).add).toBeUndefined();
      expect((cubit as any).on).toBeUndefined();
    });

    it('Bloc exposes event handling APIs', () => {
      const bloc = new CounterBloc();

      // Has event APIs
      expect(typeof bloc.add).toBe('function');
      expect(typeof (bloc as any).on).toBe('function');

      // Also has helper methods
      expect(typeof bloc.increment).toBe('function');
      expect(typeof bloc.decrement).toBe('function');
      expect(typeof bloc.reset).toBe('function');
    });
  });

  describe('State Notifications', () => {
    it('Cubit notifies subscribers on state change', () => {
      const cubit = new CounterCubit();
      const states: number[] = [];

      cubit.subscribe(() => {
        states.push(cubit.state.count);
      });

      cubit.increment();
      cubit.increment();
      cubit.decrement();

      expect(states).toEqual([1, 2, 1]);
    });

    it('Bloc notifies subscribers on state change', async () => {
      const bloc = new CounterBloc();
      const states: number[] = [];

      bloc.subscribe(() => {
        states.push(bloc.state.count);
      });

      await bloc.increment();
      await bloc.increment();
      await bloc.decrement();

      expect(states).toEqual([1, 2, 1]);
    });
  });
});

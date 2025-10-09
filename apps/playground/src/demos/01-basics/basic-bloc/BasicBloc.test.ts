import { describe, it, expect, beforeEach } from 'vitest';
import { Bloc } from '@blac/core';

// Event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

// Counter state
interface CounterState {
  count: number;
}

// ClickBloc - Event-driven counter
class ClickBloc extends Bloc<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
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

describe('ClickBloc', () => {
  let bloc: ClickBloc;

  beforeEach(() => {
    bloc = new ClickBloc();
  });

  it('should initialize with count 0', () => {
    expect(bloc.state.count).toBe(0);
  });

  it('should increment count when IncrementEvent is dispatched', async () => {
    await bloc.add(new IncrementEvent(1));
    expect(bloc.state.count).toBe(1);
  });

  it('should increment by custom amount', async () => {
    await bloc.add(new IncrementEvent(5));
    expect(bloc.state.count).toBe(5);
  });

  it('should decrement count when DecrementEvent is dispatched', async () => {
    // First increment to have a positive count
    await bloc.add(new IncrementEvent(5));
    expect(bloc.state.count).toBe(5);

    // Then decrement
    await bloc.add(new DecrementEvent(1));
    expect(bloc.state.count).toBe(4);
  });

  it('should decrement by custom amount', async () => {
    await bloc.add(new IncrementEvent(10));
    await bloc.add(new DecrementEvent(3));
    expect(bloc.state.count).toBe(7);
  });

  it('should reset count to 0 when ResetEvent is dispatched', async () => {
    await bloc.add(new IncrementEvent(5));
    expect(bloc.state.count).toBe(5);

    await bloc.add(new ResetEvent());
    expect(bloc.state.count).toBe(0);
  });

  it('should handle multiple events in sequence', async () => {
    await bloc.increment(2);
    expect(bloc.state.count).toBe(2);

    await bloc.increment(3);
    expect(bloc.state.count).toBe(5);

    await bloc.decrement(1);
    expect(bloc.state.count).toBe(4);

    await bloc.reset();
    expect(bloc.state.count).toBe(0);
  });

  it('should handle helper methods', async () => {
    await bloc.increment();
    expect(bloc.state.count).toBe(1);

    await bloc.decrement();
    expect(bloc.state.count).toBe(0);

    await bloc.reset();
    expect(bloc.state.count).toBe(0);
  });

  it('should allow negative counts', async () => {
    await bloc.decrement(5);
    expect(bloc.state.count).toBe(-5);

    await bloc.increment(3);
    expect(bloc.state.count).toBe(-2);
  });

  it('should process events in order', async () => {
    // Queue multiple events
    await Promise.all([
      bloc.add(new IncrementEvent(1)),
      bloc.add(new IncrementEvent(2)),
      bloc.add(new IncrementEvent(3)),
    ]);

    expect(bloc.state.count).toBe(6); // 0 + 1 + 2 + 3
  });
});

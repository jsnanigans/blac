import { Bloc } from '@blac/core';

// 1. Define your events as classes (must extend BlocEvent)
class CounterIncremented {
  constructor(public readonly amount: number = 1) {
  }
}

class CounterDecremented {
  constructor(public readonly amount: number = 1) {
  }
}

class CounterReset {}

type CounterState = {
  count: number;
};

// 2. Create your Bloc with registered events
export default class CounterBloc extends Bloc<CounterState> {
  constructor() {
    super({ count: 0 }); // Initial state

    // Register event handlers
    this.on(CounterIncremented, this.handleIncrement);
    this.on(CounterDecremented, this.handleDecrement);
    this.on(CounterReset, this.handleReset);
  }

  // Event handlers
  private handleIncrement = (
    event: CounterIncremented,
    emit: (state: CounterState) => void,
  ) => {
    emit({ count: this.state.count + event.amount });
  };

  private handleDecrement = (
    event: CounterDecremented,
    emit: (state: CounterState) => void,
  ) => {
    emit({ count: this.state.count - event.amount });
  };

  private handleReset = (
    _event: CounterReset,
    emit: (state: CounterState) => void,
  ) => {
    emit({ count: 0 });
  };

  // Public methods for convenience
  increment = (amount = 1) => this.add(new CounterIncremented(amount));
  decrement = (amount = 1) => this.add(new CounterDecremented(amount));
  reset = () => this.add(new CounterReset());
}

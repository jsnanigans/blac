import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
  incrementCount: number;
  decrementCount: number;
  lastAction: string;
}

export class CounterBloc extends Cubit<CounterState> {
  constructor(initialCount: number = 0) {
    super({
      count: initialCount,
      incrementCount: 0,
      decrementCount: 0,
      lastAction: 'initialized',
    });
  }

  increment = () => {
    this.patch({
      count: this.state.count + 1,
      incrementCount: this.state.incrementCount + 1,
      lastAction: 'increment',
    });
  };

  decrement = () => {
    this.patch({
      count: this.state.count - 1,
      decrementCount: this.state.decrementCount + 1,
      lastAction: 'decrement',
    });
  };

  reset = () => {
    this.emit({
      count: 0,
      incrementCount: 0,
      decrementCount: 0,
      lastAction: 'reset',
    });
  };

  setValue = (value: number) => {
    this.patch({
      count: value,
      lastAction: `set to ${value}`,
    });
  };
}

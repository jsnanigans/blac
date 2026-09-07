import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
  incrementCount: number;
  decrementCount: number;
  lastAction: string;
}

export type CounterArgs = { id?: string; start?: number };

const initialState = (start = 0): CounterState => ({
  count: start,
  incrementCount: 0,
  decrementCount: 0,
  lastAction: 'initialized',
});

export class CounterBloc extends Cubit<CounterState, CounterArgs> {
  static key = (a?: CounterArgs) => a?.id ?? 'default';

  private start = 0;

  constructor() {
    super(initialState());
  }

  // The framework constructs every bloc with `new Type()`, so seed values
  // arrive through `init(args)` — never through constructor parameters.
  protected override init(args?: CounterArgs): void {
    this.start = args?.start ?? 0;
    if (this.start !== 0) this.emit(initialState(this.start));
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
    this.emit(initialState(this.start));
  };

  setValue = (value: number) => {
    this.patch({ count: value, lastAction: `set to ${value}` });
  };
}

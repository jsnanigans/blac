import { Cubit } from '@blac/core';

export interface CounterState {
  count: number;
}
export type CounterArgs = { id?: string };

export class CounterBloc extends Cubit<CounterState, CounterArgs> {
  static key = (a?: CounterArgs) => a?.id ?? 'shared';

  constructor() {
    super({ count: 0 });
  }

  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
  reset = () => this.emit({ count: 0 });
}

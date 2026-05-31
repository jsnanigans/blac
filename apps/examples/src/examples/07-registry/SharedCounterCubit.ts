import { Cubit } from '@blac/core';

interface SharedCounterState {
  count: number;
}

export type SharedCounterArgs = { id?: string };

export class SharedCounterCubit extends Cubit<
  SharedCounterState,
  SharedCounterArgs
> {
  static key = (a?: SharedCounterArgs) => a?.id ?? 'default';

  constructor() {
    super({ count: 0 });
  }

  increment = () => this.patch({ count: this.state.count + 1 });
  decrement = () => this.patch({ count: this.state.count - 1 });
}

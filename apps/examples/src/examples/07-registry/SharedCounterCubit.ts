import { Cubit } from '@blac/core';

interface SharedCounterState {
  count: number;
}

export class SharedCounterCubit extends Cubit<SharedCounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => this.patch({ count: this.state.count + 1 });
  decrement = () => this.patch({ count: this.state.count - 1 });
}

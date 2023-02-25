import { Bloc } from "../Bloc";
import { BlocOptions } from "../BlocBase";

export type CounterState = number;

export enum CounterAction {
  increment = 'increment',
  decrement = 'decrement',
}

export class CounterBloc extends Bloc<CounterState, CounterAction> {
  constructor(options: BlocOptions = {}) {
    super(0, options);
  }

  reducer(action: CounterAction, state: CounterState) {
    const actions = Object.values(CounterAction);
    if (!actions.includes(action)) {
      throw new Error(`unknown action: ${action}`);
    }

    switch (action) {
      case CounterAction.increment:
        return state + 1;
      case CounterAction.decrement:
        return state - 1;
    }
  }
}

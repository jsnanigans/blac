import React, { FC } from 'react';
import { Bloc } from 'blac';
import { useBloc } from '../../src';

type CounterState = number;

enum CounterActions {
  increment = 'increment',
  decrement = 'decrement',
}

type CounterAction = CounterActions;

class CounterBloc extends Bloc<CounterState, CounterAction> {
  constructor() {
    super(0);
  }

  reducer(action: CounterAction, state: CounterState) {
    const actions = Object.values(CounterActions);
    if (!actions.includes(action)) {
      throw new Error(`unknown action: ${action}`);
    }

    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}

const CounterWithBloc: FC = () => {
  const [count, { emit }] = useBloc(CounterBloc, { create: true });

  return (
    <div>
      <button onClick={() => emit(CounterActions.decrement)}>-</button>: {count}{' '}
      :<button onClick={() => emit(CounterActions.increment)}>+</button>
    </div>
  );
};

export default CounterWithBloc;

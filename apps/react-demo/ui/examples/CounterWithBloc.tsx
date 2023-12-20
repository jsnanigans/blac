import { useBloc } from '@blac/react';
import { Bloc } from 'blac';
import React, { FC } from 'react';

type CounterState = number;

enum CounterActions {
  increment = 'increment',
  decrement = 'decrement',
}

class CounterBloc extends Bloc<CounterState, CounterActions> {
  static create = () => new CounterBloc(0);

  reducer(action: CounterActions, state: CounterState) {
    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}

const CounterWithBloc: FC = () => {
  const [count, { emit }] = useBloc(CounterBloc);

  return (
    <>
      <button onClick={() => emit(CounterActions.decrement)}>-</button>
      &nbsp;{count}&nbsp;
      <button onClick={() => emit(CounterActions.increment)}>+</button>
    </>
  );
};

export default CounterWithBloc;

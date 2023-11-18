import { useBloc } from '@blac/react/src';
import { Blac, Bloc } from 'blac/src';
import React, { FC, useState } from 'react';

type CounterState = number;

enum CounterActions {
  increment = 'increment',
  decrement = 'decrement',
}

class CounterBloc extends Bloc<CounterState, CounterActions> {
  static create = () => {
    console.log('NEWQ');
    console.log(Blac.getInstance());
    return new CounterBloc(0);
  };

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
  const [c2, setc2] = useState(0);

  return (
    <>
      <button
        onClick={() => {
          emit(CounterActions.decrement);
          setc2(c2 - 1);
        }}
      >
        -
      </button>
      {` blac: ${count} `}
      {` state: ${c2} `}
      <button
        onClick={() => {
          emit(CounterActions.increment);
          setc2(c2 + 1);
        }}
      >
        +
      </button>
    </>
  );
};

export default CounterWithBloc;

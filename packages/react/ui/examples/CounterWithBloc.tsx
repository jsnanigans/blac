import React, { FC } from 'react';
import { Bloc } from 'blac';
import { useBloc } from '../../src';

const codeAsString = `
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
    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}

const CounterWithBloc: FC = () => {
  const [count, { emit }] = useBloc(() => new CounterBloc());

  return (
    <div>
      <>
        <button onClick={() => emit(CounterActions.decrement)}>-</button>:{' '}
        {count} :
        <button onClick={() => emit(CounterActions.increment)}>+</button>
      </>
    </div>
  );
};
`;

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
    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}

const CounterWithBloc: FC = () => {
  const [count, { emit }] = useBloc(() => new CounterBloc());

  return (
    <div>
      <>
        <button onClick={() => emit(CounterActions.decrement)}>-</button>:{' '}
        {count} :
        <button onClick={() => emit(CounterActions.increment)}>+</button>
      </>

      <pre>
        <code>{codeAsString.trim()}</code>
      </pre>
    </div>
  );
};

export default CounterWithBloc;

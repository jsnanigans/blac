import React, { FC } from "react";
import { Bloc } from "blac";
import { useBloc } from "@blac/react/src";

type CounterState = number;

enum CounterActions {
  increment = "increment",
  decrement = "decrement",
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

  return <>
    <button onClick={() => emit(CounterActions.decrement)}>-</button>
    {` ${count} `}
    <button onClick={() => emit(CounterActions.increment)}>+</button>
  </>;
};

export default CounterWithBloc;

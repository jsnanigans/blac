import { Cubit } from "blac";
import React, { FC } from "react";
import { useBloc } from "../../src";

class CounterCubit extends Cubit<number> {
  static create = () => new CounterCubit(0);

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}


const CounterWithCubit: FC = () => {
  const [count, { increment, decrement }] = useBloc(CounterCubit);

  return (
    <>
      <button onClick={decrement}>-</button>
      {` ${count} `}
      <button onClick={increment}>+</button>
    </>
  );
};

export default CounterWithCubit;

import React, { FC } from "react";
import { Cubit } from "blac/src";
import { useBloc } from "../../src";

class CounterGlobalBloc extends Cubit<number> {
  static keepAlive = true;
  static create = () => {
    return new CounterGlobalBloc(0);
  };

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };
}

const Counter: FC = () => {
  const [count, { increment, decrement }] = useBloc(CounterGlobalBloc);

  return (
    <>
      <button onClick={decrement}>-</button>
      {` ${count} `}
      <button onClick={increment}>+</button>
    </>
  );
};

const CounterWithCubitGlobal: FC = () => {
  return (
    <>
      <Counter />
      <hr />
      <Counter />
    </>
  );
};

export default CounterWithCubitGlobal;

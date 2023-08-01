import React, { FC } from "react";
import { Cubit } from "blac";
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
  const [showDynamic, setShowDynamic] = React.useState(true);
  return (
    <>
      <Counter />
      <hr />
      <button onClick={() => setShowDynamic(!showDynamic)}>
        {showDynamic ? "Hide" : "Show"}
      </button>
      <br />
      {showDynamic && <Counter />}
    </>
  );
};

export default CounterWithCubitGlobal;

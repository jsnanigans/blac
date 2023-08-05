import React, { FC } from "react";
import { Cubit } from "blac/src";
import { useBloc } from "@blac/react/src";

class CounterGlobalBloc extends Cubit<number> {
  static keepAlive = true;
  static create = () => new CounterGlobalBloc(0);

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
}

const ComponentA: FC = () => {
  const [count, { increment, decrement }] = useBloc(CounterGlobalBloc);

  return <>
    <button onClick={decrement}>-</button>
    {` ${count} `}
    <button onClick={increment}>+</button>
  </>;
};

const ComponentB: FC = () => {
  const [count, { increment, decrement }] = useBloc(CounterGlobalBloc);

  return <>
    <button onClick={decrement}>-</button>
    {` ${count} `}
    <button onClick={increment}>+</button>
  </>;
};

const CounterWithCubitGlobal: FC = () => {
  const [showDynamic, setShowDynamic] = React.useState(true);
  return <>
    <ComponentA />
    <hr />
    <p className="read">When the component mounts again, it will re-use the same instance, even when all components that
      use the Bloc are unmounted, the instance is preserved</p>
    <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
      {showDynamic ? "Hide" : "Show"}
    </button>
    {showDynamic && <ComponentB />}
  </>;
};

export default CounterWithCubitGlobal;

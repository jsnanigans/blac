import { Cubit } from "blac/src";
import React, { FC, useState } from "react";
import { useBloc } from "@blac/react/src";

export class CounterMultiInstanceBloc extends Cubit<number> {
  static create = () => new CounterMultiInstanceBloc(0);

  increment = () => this.emit(this.state + 1);
}

const ComponentA: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc, "a");
  return <button onClick={increment}>A: {count} - Increment</button>;
};

const ComponentB: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc, "b");
  return <button onClick={increment}>B: {count} - Increment</button>;
};

const ComponentA2: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc, "a");
  return <button onClick={increment}>A - 2: {count} - Increment</button>;
};


const CounterMultiInstance: FC = () => {
  const [showDynamic, setShowDynamic] = useState(true);
  return <div>
    <ComponentA />

    <hr />
    <p className="read">When the component mounts again, it gets a fresh instance</p>
    <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
      {showDynamic ? "Hide" : "Show"}
    </button>

    {showDynamic && <ComponentB />}

    <p>Same instance as A from a different component:</p>
    <ComponentA2 />
  </div>;
};

export default CounterMultiInstance;

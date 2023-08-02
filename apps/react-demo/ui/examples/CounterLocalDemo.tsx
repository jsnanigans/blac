import { Cubit } from "blac";
import React, { FC, useState } from "react";
import { useBloc } from "@blac/react/src";

export class CounterMultiInstanceBloc extends Cubit<number> {
  static allowMultipleInstances = true;
  static create = () => new CounterMultiInstanceBloc(0);

  increment = () => this.emit(this.state + 1);
}

const ComponentA: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc);
  return <button onClick={increment}>A: {count} - Increment</button>;
};

const ComponentB: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc);
  return <button onClick={increment}>B: {count} - Increment</button>;
};


const CounterLocalDemo: FC = () => {
  const [showDynamic, setShowDynamic] = useState(true);
  return <div>
    <ComponentA />

    <hr />
    <p className="read">When the component mounts again, it gets a fresh instance</p>
    <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
      {showDynamic ? "Hide" : "Show"}
    </button>

    {showDynamic && <ComponentB />}
  </div>;
};

export default CounterLocalDemo;

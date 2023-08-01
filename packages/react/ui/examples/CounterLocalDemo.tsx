import { Cubit } from "blac";
import React, { FC, useState } from "react";
import { useBloc } from "../../src";

export class CounterMultiInstanceBloc extends Cubit<number> {
  static allowMultipleInstances = true;
  static create = () => new CounterMultiInstanceBloc(0);

  increment = () => {
    this.emit(this.state + 1);
  };
}

const ComponentA: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc);
  return (
    <>
      <strong>A: </strong>
      <button onClick={increment}>{`${count} - Increment`}</button>
    </>
  );
};

const ComponentB: FC = () => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc);
  return (
    <>
      <strong>B: </strong>
      <button onClick={increment}>{`${count} - Increment`}</button>
    </>
  );
};


const CounterLocalDemo: FC = () => {
  const [showDynamic, setShowDynamic] = useState(true);
  return (
    <div>
      <ComponentA />
      <hr />
      <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
        {showDynamic ? "Hide" : "Show"}
      </button>
      {showDynamic && <ComponentB />}
    </div>
  );
};

export default CounterLocalDemo;

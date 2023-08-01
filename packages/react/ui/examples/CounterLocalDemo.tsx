import { Cubit } from "blac";
import React, { FC, useState } from "react";
import { useBloc } from "../../src";
import Scope from "./Scope";


export class CounterMultiInstanceBloc extends Cubit<number> {
  static allowMultipleInstances = true;
  static create = () => new CounterMultiInstanceBloc(0);

  increment = () => {
    this.emit(this.state + 1);
  };
}

const LocalCounter: FC<{ name: string; cubit?: any }> = ({ name }) => {
  const [count, { increment }] = useBloc(CounterMultiInstanceBloc);


  return (
    <div>
      <strong>{`${name}: `}</strong>
      <button onClick={increment}>{`${count} - Increment`}</button>
    </div>
  );
};


const CounterLocalDemo: FC = () => {
  const [showDynamic, setShowDynamic] = useState(true);
  return (
    <div>
      <Scope name="Stanadlone">
        <LocalCounter name="A" />
      </Scope>

      <Scope name="Dynamic">
        <button onClick={() => setShowDynamic(!showDynamic)}>
          {showDynamic ? "Hide" : "Show"}
        </button>
        {showDynamic && <LocalCounter name="B" />}
      </Scope>
    </div>
  );
};

export default CounterLocalDemo;

import { Cubit } from "blac";
import React, { FC } from "react";
import { useBloc } from "../../src";
import Scope from "./Scope";


export class CounterMultipleConsumerBloc extends Cubit<number> {
  static create = () => new CounterMultipleConsumerBloc(0);

  increment = () => {
    this.emit(this.state + 1);
  };
}

const LocalCounter: FC<{ name: string; }> = ({ name }) => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return (
    <>
      <strong>{`${name}: `}</strong>
      <button onClick={increment}>
        {`${count} - Increment`}
      </button>
    </>
  );
};


const CounterMultipleConsumers: FC = () => {
  const [showDynamic, setShowDynamic] = React.useState(true);
  return (
    <div>
      <Scope name="Consumer A">
        <LocalCounter name="A" />
      </Scope>

      <Scope name="Consumer B">
        <button onClick={() => setShowDynamic(!showDynamic)}>
          {showDynamic ? "Hide" : "Show"}
        </button>
        <br />
        {showDynamic && <LocalCounter name="B" />}
      </Scope>
    </div>
  );
};

export default CounterMultipleConsumers;

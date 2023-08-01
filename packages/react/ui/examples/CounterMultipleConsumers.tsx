import { Cubit } from "blac";
import React, { FC } from "react";
import { useBloc } from "../../src";

export class CounterMultipleConsumerBloc extends Cubit<number> {
  static create = () => new CounterMultipleConsumerBloc(0);

  increment = () => {
    this.emit(this.state + 1);
  };
}

const ComponentA: FC = () => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return (
    <>
      <strong>A: </strong>
      <button onClick={increment}>
        {`${count} - Increment`}
      </button>
    </>
  );
};

const ComponentB: FC = () => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return (
    <>
      <strong>B: </strong>
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
      <ComponentA />

      <hr />
      <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
        {showDynamic ? "Hide" : "Show"}
      </button>
      {showDynamic && <ComponentA />}
    </div>
  );
};

export default CounterMultipleConsumers;

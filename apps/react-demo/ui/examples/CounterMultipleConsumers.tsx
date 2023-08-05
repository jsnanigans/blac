import { Cubit } from "blac/src";
import React, { FC } from "react";
import { useBloc } from "@blac/react/src";

export class CounterMultipleConsumerBloc extends Cubit<number> {
  static create = () => new CounterMultipleConsumerBloc(0);

  increment = () => this.emit(this.state + 1);
}

const ComponentA: FC = () => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return <button onClick={increment}>A: {count} - Increment</button>;
};

const ComponentB: FC = () => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return <button onClick={increment}>B: {count} - Increment</button>;
};

const CounterMultipleConsumers: FC = () => {
  const [showDynamic, setShowDynamic] = React.useState(true);
  return <div>
    <ComponentA />

    <hr />
    <p className="read">When the component mounts again, it will re-use the same instance. Only when all components that
      use the Bloc are unmounted the instance is closed</p>
    <button className="lead" onClick={() => setShowDynamic(!showDynamic)}>
      {showDynamic ? "Hide" : "Show"}
    </button>

    {showDynamic && <ComponentA />}
  </div>;
};

export default CounterMultipleConsumers;

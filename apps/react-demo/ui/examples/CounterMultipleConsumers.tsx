import { Cubit } from "blac/src";
import React, { FC } from "react";
import { useBloc } from "@blac/react/src";

interface CounterMultipleConsumerState {
  count: number;
  showDynamic: boolean;
}

export class CounterMultipleConsumerBloc extends Cubit<CounterMultipleConsumerState> {
  static create = () => new CounterMultipleConsumerBloc({
    count: 0,
    showDynamic: true
  });

  increment = () => this.patch({ count: this.state.count + 1 });
  toggleDynamic = () => this.patch({ showDynamic: !this.state.showDynamic });
}

const ComponentA: FC = () => {
  const [{ count }, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return <button onClick={increment}>A: {count} - Increment</button>;
};

const ComponentB: FC = () => {
  const [{ count }, { increment }] = useBloc(CounterMultipleConsumerBloc);
  return <button onClick={increment}>B: {count} - Increment</button>;
};

const CounterMultipleConsumers: FC = () => {
  const [{ showDynamic }, { toggleDynamic }] = useBloc(CounterMultipleConsumerBloc);
  return <div>
    <ComponentA />

    <hr />
    <p className="read">When the component mounts again, it will re-use the same instance. Only when all components that
      use the Bloc are unmounted the instance is closed</p>
    <button className="lead" onClick={toggleDynamic}>
      {showDynamic ? "Hide" : "Show"}
    </button>

    {showDynamic && <ComponentA />}
  </div>;
};

export default CounterMultipleConsumers;

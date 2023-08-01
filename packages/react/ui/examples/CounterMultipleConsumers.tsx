import { Cubit } from "blac/src";
import React, { FC, ReactNode } from "react";
import { useBloc } from "../../src";
import Scope from "./Scope";


export class CounterMultipleConsumerBloc extends Cubit<number> {
  static create = () => new CounterMultipleConsumerBloc(0);

  increment = () => {
    this.emit(this.state + 1);
  };
}

const LocalCounter: FC<{
  children?: ReactNode; name: string; cubit?: any
}> = ({ children, name }) => {
  const [count, { increment }] = useBloc(CounterMultipleConsumerBloc);

  return (
    <div>
      <strong>{`${name}: `}</strong>
      <button onClick={increment}>
        {`${count} - Increment`}
      </button>
      {children}
    </div>
  );
};


const CounterMultipleConsumers: FC = () => {
  return (
    <div>
      <Scope name="Consumer A">
        <LocalCounter name="A" />
      </Scope>

      <Scope name="Consumer B">
        <LocalCounter name="B" />
      </Scope>
    </div>
  );
};

export default CounterMultipleConsumers;

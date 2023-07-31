import { Cubit } from 'blac';
import React, { FC } from 'react';
import { useBloc } from '../../src';

const codeAsString = `
class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
  decrement = () => {
    this.emit(this.state - 1);
  };
}

const CounterWithCubit: FC = () => {
  const [count, { increment, decrement }] = useBloc(() => new CounterCubit(0));

  return (
    <div>
      <>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
      </>
    </div>
  );
};
`;

class CounterCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
  decrement = () => {
    this.emit(this.state - 1);
  };
}

const CounterWithCubit: FC = () => {
  const [count, { increment, decrement }] = useBloc(() => new CounterCubit(0));

  return (
    <div>
      <>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
      </>

      <pre>
        <code>{codeAsString.trim()}</code>
      </pre>
    </div>
  );
};

export default CounterWithCubit;

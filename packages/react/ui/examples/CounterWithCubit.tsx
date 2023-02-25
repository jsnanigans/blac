import { Cubit } from 'blac';
import React, { FC } from 'react';
import { useBloc } from '../../src';

type CounterState = number;
class CounterCubit extends Cubit<CounterState> {
  increment = () => {
    this.emit(this.state + 1);
  };
  decrement = () => {
    this.emit(this.state - 1);
  };
}

const CounterWithCubit: FC = () => {
  console.log('CounterWithCubit')
  const [count, { increment, decrement }] = useBloc(() => new CounterCubit(0));

  return (
    <div>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
    </div>
  );
};

export default CounterWithCubit;

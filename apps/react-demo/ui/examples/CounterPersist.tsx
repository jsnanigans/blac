import { Cubit, Persist } from 'blac';
import React, { FC } from 'react';
import { useBloc } from '@blac/react';

class CounterPersistCubit extends Cubit<number> {
  static addons = [
    Persist({
      defaultValue: 0,
    }),
  ];
  add = (amount: number) => () => this.emit(this.state + amount);
}

const CounterWithCubitPersist: FC = () => {
  const [count, { add }] = useBloc(CounterPersistCubit);

  return (
    <>
      <button onClick={add(-1)}>-</button>
      {` ${count} `}
      <button onClick={add(1)}>+</button>
    </>
  );
};

export default CounterWithCubitPersist;

import React, { FC } from 'react';
import { useBloc } from '../../src';
import { CounterGlobalCubit } from './state';

const CounterWithCubitGlobal: FC = () => {
  const [count, { increment, decrement }] = useBloc(CounterGlobalCubit);

  return (
    <div>
      <button onClick={decrement}>-</button>: {count} :
      <button onClick={increment}>+</button>
    </div>
  );
};

export default CounterWithCubitGlobal;

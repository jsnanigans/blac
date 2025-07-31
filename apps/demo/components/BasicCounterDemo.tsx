import { useBloc } from '@blac/react';
import React from 'react';
import { CounterCubit } from '../blocs/CounterCubit';
import { Button } from './ui/Button';

const BasicCounterDemo: React.FC = () => {
  // Uses the global/shared instance of CounterCubit by default (no id, not static isolated)
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium">
        Shared Count:{' '}
        <span className="text-primary font-bold text-xl">{state.count}</span>
      </p>
      <div className="flex space-x-2">
        <Button onClick={cubit.increment} variant="default" size="sm">
          Increment
        </Button>
        <Button onClick={cubit.decrement} variant="secondary" size="sm">
          Decrement
        </Button>
      </div>
    </div>
  );
};

export default BasicCounterDemo;

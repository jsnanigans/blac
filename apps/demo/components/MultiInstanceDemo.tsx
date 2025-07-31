import { useBloc } from '@blac/react';
import React from 'react';
import { CounterCubit } from '../blocs/CounterCubit'; // Using the standard, non-isolated-by-default cubit
import { Button } from './ui/Button';

const CounterInstance: React.FC<{ id: string; initialCount?: number }> = ({ id, initialCount }) => {
  const [state, cubit] = useBloc(CounterCubit, {
    instanceId: `multiInstanceDemo-${id}`,
    staticProps: { initialCount: initialCount ?? 0 },
  });

  return (
    <div className="p-3 border border-dashed border-muted-foreground rounded-md space-y-2">
      <p className="text-md font-medium">Instance "{id}" Count: <span className="text-primary font-bold text-lg">{state.count}</span></p>
      <div className="flex space-x-2">
        <Button onClick={cubit.increment} variant="default" size="sm">Increment</Button>
        <Button onClick={cubit.decrement} variant="outline" size="sm">Decrement</Button>
      </div>
    </div>
  );
};

const MultiInstanceDemo: React.FC = () => {
  return (
    <div className="space-y-4">
      <CounterInstance id="alpha" initialCount={5} />
      <CounterInstance id="beta" initialCount={55} />
      <CounterInstance id="gamma" />
      <CounterInstance id="gamma" />
      <p className="text-xs text-muted-foreground mt-2">
        Each counter above uses the same `CounterCubit` class but is provided a unique `instanceId` 
        via `useBloc(CounterCubit, &#123; instanceId: 'unique-id' &#125;)`. This ensures they maintain separate states.
      </p>
    </div>
  );
};

export default MultiInstanceDemo; 
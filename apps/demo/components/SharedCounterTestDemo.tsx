import { useBloc } from '@blac/react';
import React from 'react';
import { CounterCubit } from '../blocs/CounterCubit';
import { Button } from './ui/Button';

const SharedCounterComponentA: React.FC = () => {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '1rem', marginBottom: '1rem' }}>
      <h4>Component A</h4>
      <p>Count: <strong>{state.count}</strong></p>
      <Button onClick={cubit.increment} size="sm">Increment from A</Button>
    </div>
  );
};

const SharedCounterComponentB: React.FC = () => {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div style={{ border: '1px solid #e0e0e0', padding: '1rem', marginBottom: '1rem' }}>
      <h4>Component B</h4>
      <p>Count: <strong>{state.count}</strong></p>
      <Button onClick={cubit.decrement} size="sm">Decrement from B</Button>
    </div>
  );
};

const SharedCounterTestDemo: React.FC = () => {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Both components below use <code>useBloc(CounterCubit)</code> without any ID. 
        Since CounterCubit doesn't have <code>static isolated = true</code>, they should share the same instance.
      </p>
      <SharedCounterComponentA />
      <SharedCounterComponentB />
      <p className="text-xs text-muted-foreground mt-2">
        Try incrementing from Component A or decrementing from Component B - both should update the same counter.
      </p>
    </div>
  );
};

export default SharedCounterTestDemo;
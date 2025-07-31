import { useBloc } from '@blac/react';
import React from 'react';
import { IsolatedCounterCubit } from '../blocs/CounterCubit'; // Using the explicitly isolated one
import { Button } from './ui/Button';

interface IsolatedCounterDemoProps {
  initialCount?: number;
  idSuffix?: string;
}

const IsolatedCounterDemo: React.FC<IsolatedCounterDemoProps> = ({
  initialCount = 0,
  idSuffix,
}) => {
  // Each instance of this component will get its own IsolatedCounterCubit instance
  // because IsolatedCounterCubit has `static isolated = true;`
  const [state, cubit] = useBloc(IsolatedCounterCubit, {
    props: { initialCount },
    // No need to pass 'id' for isolation if `static isolated = true` is set on the Cubit.
    // If we were using the non-static `CounterCubit` and wanted isolation per component instance,
    // we would need a unique ID here, often derived from React.useId().
  });

  const title = idSuffix ? `Isolated Count ${idSuffix}` : 'Isolated Count';

  return (
    <div className="space-y-3 p-3 border border-dashed border-muted-foreground rounded-md mt-2">
      <p className="text-lg font-medium">
        {title}:{' '}
        <span className="text-secondary font-bold text-xl">{state.count}</span>
      </p>
      <div className="flex space-x-2">
        <Button onClick={cubit.increment} variant="default" size="sm">
          Increment
        </Button>
        <Button onClick={cubit.decrement} variant="outline" size="sm">
          Decrement
        </Button>
      </div>
    </div>
  );
};

export default IsolatedCounterDemo;

import { useBloc } from '@blac/react';
import React from 'react';
import {
  ComplexDemoState,
  ComplexStateCubit,
} from '../blocs/ComplexStateCubit';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const CustomSelectorDisplay: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit, {
    selector: (state: ComplexDemoState) => {
      // This component only cares if the counter is divisible by 3
      // and the first character of the text.
      // It also uses a getter directly in the selector's dependency array.
      const db3 = state.counter % 3 === 0;
      const firstChar = state.text.length > 0 ? state.text[0] : '';
      return [db3, firstChar];
    },
  });

  const db3 = state.counter % 3 === 0;
  const firstChar = state.text.length > 0 ? state.text[0] : '';

  const renderCountRef = React.useRef(0);
  React.useEffect(() => {
    renderCountRef.current += 1;
  });

  return (
    <div className="p-4 bg-lcars-gray-medium rounded-default text-foreground space-y-2">
      <p className="text-base text-muted-foreground">
        Render Count: {renderCountRef.current}
      </p>
      <p className="text-base text-foreground">
        Counter Value:{' '}
        <span className="font-bold text-lcars-beige-panel font-body normal-case">
          {state.counter}
        </span>
      </p>
      <p className="text-base text-foreground">
        Is Counter Even?{' '}
        <span className="font-bold text-lcars-blue-light font-body normal-case">
          {db3 ? 'Yes' : 'No'}
        </span>
      </p>
      <p className="text-base text-foreground">
        Text Value:{' '}
        <span className="font-bold text-lcars-beige-panel font-body normal-case">
          {state.text}
        </span>
      </p>
      <p className="text-base text-foreground">
        First Char of Text:{' '}
        <span className="font-bold text-lcars-orange-panel font-body normal-case">
          ‘{firstChar}’
        </span>
      </p>
      <p className="text-base text-foreground">
        Uppercased Text (from getter, tracked by selector):{' '}
        <span className="font-bold text-lcars-orange-panel font-body normal-case">
          {cubit.uppercasedText}
        </span>
      </p>
      <p className="text-sm italic mt-2 text-muted-foreground">
        This component re-renders only when the even/odd status of the counter
        changes, or when the first character of the text changes, or when
        `cubit.uppercasedText` changes.
      </p>
    </div>
  );
};

const ShowAnotherCount: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit);
  return <span className="font-bold text-primary">{state.anotherCounter}</span>;
};

const CustomSelectorDemo: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit); // For controlling the cubit

  return (
    <div className="space-y-4">
      <CustomSelectorDisplay />
      <div className="space-y-3 mt-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={cubit.incrementCounter} variant="default" size="sm">
            Increment Counter
          </Button>
          <Button
            onClick={cubit.incrementAnotherCounter}
            variant="outline"
            size="sm"
          >
            INC OTHER COUNT (NO RE-RENDER) [<ShowAnotherCount />]
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Input
            type="text"
            value={state.text}
            onChange={(e) => cubit.updateText(e.target.value)}
            placeholder="Update text"
            className="flex-grow"
          />
        </div>
      </div>
      <Button
        onClick={cubit.resetState}
        variant="destructive"
        size="sm"
        className="mt-4"
      >
        Reset Entire State
      </Button>
      <p className="text-sm text-muted-foreground mt-4">
        The `CustomSelectorDisplay` component uses a `dependencySelector` to
        fine-tune its re-renders. It only re-renders if specific derived
        conditions from the state or getter values change, not just any change
        to `counter` or `text`.
      </p>
    </div>
  );
};

export default CustomSelectorDemo;


import { useBloc } from '@blac/react';
import React from 'react';
import { ComplexStateCubit } from '../blocs/ComplexStateCubit';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

const ShowCount: React.FC = () => {
  const [state] = useBloc(ComplexStateCubit);
  return <span className="font-bold text-primary">{state.counter}</span>;
};

const GetterDemo: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit);
  // This component specifically uses cubit.textLength and cubit.uppercasedText

  const renderCountRef = React.useRef(0);
  React.useEffect(() => {
    renderCountRef.current += 1;
  });

  return (
    <div className="space-y-4">
      <p className="text-base text-muted-foreground">Component render count: {renderCountRef.current}</p>
      
      <div>
        <Label htmlFor="textInputGetter">Edit Text:</Label>
        <Input 
          id="textInputGetter"
          type="text" 
          value={state.text} 
          onChange={(e) => cubit.updateText(e.target.value)} 
          className="w-full md:w-3/4 mt-2"
        />
      </div>

      <p className="text-base text-foreground">Current Text: <span className="font-bold text-lcars-beige-panel font-body normal-case">{state.text}</span></p>
      <p className="text-base text-foreground">Text Length (from getter): <span className="text-primary font-bold font-body normal-case">{cubit.textLength}</span></p>
      <p className="text-base text-foreground">Uppercased Text (from getter): <span className="text-secondary font-bold font-body normal-case">{cubit.uppercasedText}</span></p>

      <div className="flex flex-wrap gap-3 mt-4">
        <Button onClick={cubit.incrementCounter} variant="outline" size="sm">
          INC COUNT (NO RE-RENDER) [<ShowCount />]
        </Button>
         <Button onClick={() => cubit.updateText(state.text + '!')} variant="default" size="sm">
          Append '!' (Should re-render)
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        This component primarily displays values derived from getters (`textLength`, `uppercasedText`). 
        It should re-render when `state.text` changes (as the getters depend on it). 
        Changing other parts of `ComplexStateCubit` state (like `counter`) should not cause a re-render here if those parts are not directly used or via a getter that changes.
      </p>
    </div>
  );
};

export default GetterDemo; 
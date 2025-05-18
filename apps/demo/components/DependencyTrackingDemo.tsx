import { useBloc } from '@blac/react';
import React from 'react';
import { ComplexStateCubit } from '../blocs/ComplexStateCubit';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const DisplayCounter: React.FC = React.memo(() => {
    // no need to add a dependency selector, it will be determined automatically
  const [state] = useBloc(ComplexStateCubit);
  const renderCountRef = React.useRef(0);
  React.useEffect(() => { renderCountRef.current += 1; });
  return <p>Counter: <span className="font-bold text-primary">{state.counter}</span> (Renders: {renderCountRef.current})</p>;
});

const DisplayText: React.FC = React.memo(() => {
    // no need to add a dependency selector, it will be determined automatically
  const [state] = useBloc(ComplexStateCubit);
  const renderCountRef = React.useRef(0);
  React.useEffect(() => { renderCountRef.current += 1; });
  return <p>Text: <span className="font-bold text-secondary">{state.text}</span> (Renders: {renderCountRef.current})</p>;
});

const DisplayFlag: React.FC = React.memo(() => {
    // no need to add a dependency selector, it will be determined automatically
  const [state] = useBloc(ComplexStateCubit);
  const renderCountRef = React.useRef(0);
  React.useEffect(() => { renderCountRef.current += 1; });
  return <p>Flag: <span className="font-bold">{state.flag ? 'TRUE' : 'FALSE'}</span> (Renders: {renderCountRef.current})</p>;
});

const DisplayNestedValue: React.FC = React.memo(() => {
    // no need to add a dependency selector, it will be determined automatically
  const [state] = useBloc(ComplexStateCubit);
  const renderCountRef = React.useRef(0);
  React.useEffect(() => { renderCountRef.current += 1; });
  return <p>Nested Value: <span className="font-bold text-green-600">{state.nested.value}</span> (Renders: {renderCountRef.current})</p>;
});

const DisplayTextLengthGetter: React.FC = React.memo(() => {
    // no need to add a dependency selector, it will be determined automatically
    const [, cubit] = useBloc(ComplexStateCubit);
    const renderCountRef = React.useRef(0);
    React.useEffect(() => { renderCountRef.current += 1; });
    return <p>Text Length (Getter): <span className="font-bold text-purple-600">{cubit.textLength}</span> (Renders: {renderCountRef.current})</p>;
});

const DependencyTrackingDemo: React.FC = () => {
  const [state, cubit] = useBloc(ComplexStateCubit); // Main controller, might not need all state here.

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
        <DisplayCounter />
        <DisplayText />
        <DisplayFlag />
        <DisplayNestedValue />
        <DisplayTextLengthGetter />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
            <Button onClick={cubit.incrementCounter} variant="default" size="sm">Increment Counter</Button>
            <Button onClick={cubit.toggleFlag} variant="default" size="sm">Toggle Flag</Button>
            <Button onClick={() => cubit.updateNestedValue(state.nested.value + 1)} variant="default" size="sm">Inc. Nested Val</Button>
        </div>
        <div className="flex items-center gap-2">
            <Input 
                type="text" 
                value={state.text} 
                onChange={(e) => cubit.updateText(e.target.value)} 
                placeholder="Update text"
                className="flex-grow"
            />
            <Button onClick={() => cubit.updateText('Reset Text')} variant="outline" size="sm">Reset Text</Button>
        </div>
      </div>
      <Button onClick={cubit.resetState} variant="destructive" size="sm" className="mt-4">Reset Entire State</Button>
      <p className="text-xs text-muted-foreground mt-2">
        Each displayed piece of state above is in its own component that subscribes to only that specific part of the `ComplexDemoState` (or a getter).
        Only the component whose subscribed state (or getter result) changes should re-render.
      </p>
    </div>
  );
};

export default DependencyTrackingDemo; 
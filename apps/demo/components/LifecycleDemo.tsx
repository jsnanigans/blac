import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { LifecycleCubit } from '../blocs/LifecycleCubit';
import { Button } from './ui/Button';

const LifecycleComponent: React.FC = () => {
  const [state, cubit] = useBloc(LifecycleCubit, {
    onMount: (c) => c.setMounted(),
    onUnmount: (c) => c.setUnmounted(),
  });

  const renderCountRef = React.useRef(0);
  React.useEffect(() => {
    renderCountRef.current += 1;
  });

  return (
    <div className="p-3 border border-dashed border-accent rounded-md space-y-2 bg-accent/10">
      <p className="text-sm ">Render Count: {renderCountRef.current}</p>
      <p>Status: <span className="font-semibold text-primary">{state.status}</span></p>
      <p>Data: <span className="italic text-accent-foreground">{state.data || 'N/A'}</span></p>
      <p>Mounted at: <span className="text-xs">{state.mountTime ? state.mountTime.toLocaleTimeString() : 'N/A'}</span></p>
      <p>Unmounted at: <span className="text-xs">{state.unmountTime ? state.unmountTime.toLocaleTimeString() : 'N/A'}</span></p>
      <Button onClick={cubit.reset} variant="ghost" size="sm">Reset Cubit State</Button>
    </div>
  );
};

const LifecycleDemo: React.FC = () => {
  const [show, setShow] = useState(true);

  return (
    <div className="space-y-4">
      <Button onClick={() => setShow(!show)} variant="secondary">
        {show ? 'Hide' : 'Show'} Lifecycle Component
      </Button>
      {show && <LifecycleComponent />}
      <p className="text-xs text-muted-foreground mt-2">
        The component above uses `onMount` and `onUnmount` callbacks with `useBloc`.
        `onMount` is called when the component mounts and `onUnmount` when it unmounts.
        The `LifecycleCubit` itself is `static isolated = true`.
      </p>
    </div>
  );
};

export default LifecycleDemo; 
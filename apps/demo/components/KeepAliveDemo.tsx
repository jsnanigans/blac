import { Blac } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect, useState } from 'react';
import { KeepAliveCounterCubit } from '../blocs/KeepAliveCounterCubit';
import { Button } from './ui/Button';

interface CounterDisplayProps {
  id: string;
}

const CounterDisplayComponent: React.FC<CounterDisplayProps> = ({ id }) => {
  // Since KeepAliveCounterCubit is shared (not isolated by default, but keepAlive=true)
  // all instances of CounterDisplayComponent will use the same Cubit instance.
  const [state, cubit] = useBloc(KeepAliveCounterCubit);

  useEffect(() => {
    console.log(`CounterDisplayComponent (${id}) MOUNTED. Cubit instanceId: ${state.instanceId}, Count: ${state.count}`);
    return () => {
      console.log(`CounterDisplayComponent (${id}) UNMOUNTED. Cubit instanceId: ${state.instanceId}, Count: ${state.count}`);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Effect logs on mount/unmount of this specific display component

  return (
    <div style={{ border: '1px dashed #999', padding: '1rem', margin: '0.5rem 0' }}>
      <h4>Display Component (ID: {id})</h4>
      <p>Connected to Cubit Instance ID: <strong>{state.instanceId}</strong></p>
      <p>Current Count: <strong>{state.count}</strong></p>
      <Button onClick={cubit.increment} variant="default">Increment from Display</Button>
    </div>
  );
};

const KeepAliveDemo: React.FC = () => {
  const [showDisplay1, setShowDisplay1] = useState(true);
  const [showDisplay2, setShowDisplay2] = useState(false);

  // We can also get the cubit in the parent to control it, or use Blac.getBloc()
  const [, cubitDirectAccess] = useBloc(KeepAliveCounterCubit); 
  // Note: calling useBloc here ensures the Cubit is initialized if not already.

  const handleResetGlobalKeepAliveCounter = () => {
    // Example of getting the bloc instance directly if not already held from useBloc
    try {
      const cubit = Blac.getBloc(KeepAliveCounterCubit);
      if (cubit) {
        cubit.reset();
        console.log('KeepAliveCounterCubit RESET triggered from parent via Blac.getBloc().');
      } else {
        console.warn('KeepAliveCounterCubit not found via Blac.getBloc() for reset. May not be initialized yet.');
      }
    } catch (e) {
        console.error('Error getting KeepAliveCounterCubit via Blac.getBloc()', e);
    }
  };
  
  const handleIncrementGlobalKeepAliveCounter = () => {
    cubitDirectAccess.increment(); // Using instance from parent's useBloc
    console.log('KeepAliveCounterCubit INCREMENT triggered from parent via useBloc instance.');
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p className="text-sm text-muted-foreground">
        <code>KeepAliveCounterCubit</code> has <code>static keepAlive = true</code>. 
        Its instance persists even if no components are using it. 
        (Check console logs for construction/disposal messages - disposal won't happen until Blac is reset or a specific dispose call).
      </p>
      
      <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
        <Button onClick={() => setShowDisplay1(!showDisplay1)} variant="outline">
          {showDisplay1 ? 'Hide' : 'Show'} Display 1
        </Button>
        <Button onClick={() => setShowDisplay2(!showDisplay2)} variant="outline">
          {showDisplay2 ? 'Hide' : 'Show'} Display 2
        </Button>
      </div>

      {showDisplay1 && <CounterDisplayComponent id="Display_1" />}
      {showDisplay2 && <CounterDisplayComponent id="Display_2" />}

      {!showDisplay1 && !showDisplay2 && (
        <p style={{color: 'orange', marginTop: '1rem'}}>
          Both display components are unmounted. The <code>KeepAliveCounterCubit</code> instance should still exist in memory with its current state.
        </p>
      )}

      <div style={{marginTop: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem'}}>
        <h4>Parent Controls for Global KeepAlive Cubit:</h4>
        <Button onClick={handleIncrementGlobalKeepAliveCounter} variant="secondary" style={{marginRight: '0.5rem'}}>
            Increment (via parent's useBloc)
        </Button>
        <Button onClick={handleResetGlobalKeepAliveCounter} variant="destructive">
            Reset Counter (via Blac.getBloc)
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Toggle the display components. When they remount, they should connect to the same 
        <code>KeepAliveCounterCubit</code> instance and reflect its preserved state. 
        The instance ID should remain the same across mounts/unmounts of display components. 
        Console logs provide more insight into Cubit lifecycle.
      </p>
    </div>
  );
};

export default KeepAliveDemo; 
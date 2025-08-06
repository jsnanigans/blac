import React, { useState, useEffect } from 'react';
import { useExternalBlocStore } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from './ui/Button';

// External store that can be used outside React
class ExternalCounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  reset = () => this.emit(0);
}

// Create instance outside React
const externalCounter = new ExternalCounterCubit();

// Non-React function that can manipulate the store
const incrementFromOutside = () => {
  externalCounter.increment();
};

// Component that subscribes to external store
const ExternalSubscriber: React.FC = () => {
  const state = useExternalBlocStore(externalCounter);

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <p>
        Subscriber sees: <strong>{state}</strong>
      </p>
    </div>
  );
};

const ExternalStoreDemo: React.FC = () => {
  const [manualState, setManualState] = useState(externalCounter.state);

  // Example of manual subscription outside the hook
  useEffect(() => {
    const unsubscribe = externalCounter.subscribe((state) => {
      console.log('Manual subscription received:', state);
      setManualState(state);
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h4>External Store Instance</h4>
        <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
          This Cubit instance exists outside React and can be accessed anywhere
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <Button onClick={() => externalCounter.increment()}>
            Increment (from component)
          </Button>
          <Button onClick={() => externalCounter.decrement()}>
            Decrement (from component)
          </Button>
          <Button onClick={incrementFromOutside}>
            Increment (from outside function)
          </Button>
          <Button onClick={() => externalCounter.reset()} variant="outline">
            Reset
          </Button>
        </div>
      </div>

      <div>
        <h4>Multiple Subscribers</h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <ExternalSubscriber />
          <ExternalSubscriber />
        </div>
      </div>

      <div>
        <h4>Manual Subscription</h4>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Using direct subscribe() method: <strong>{manualState}</strong>
        </p>
      </div>

      <div
        style={{
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em',
        }}
      >
        <strong>Use Cases:</strong>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>Sharing state between React and non-React code</li>
          <li>Global singletons that persist across component lifecycles</li>
          <li>Integration with external libraries or vanilla JS</li>
          <li>Server-side state hydration</li>
        </ul>
      </div>
    </div>
  );
};

export default ExternalStoreDemo;

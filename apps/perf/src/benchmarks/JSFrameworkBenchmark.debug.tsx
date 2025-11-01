import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React, { useEffect } from 'react';

/**
 * Minimal debug version to test emit behavior
 */

interface DataItem {
  id: number;
  label: string;
}

class DemoBloc extends Cubit<{
  data: DataItem[];
  selected: number | null;
}> {
  constructor() {
    super({
      data: [],
      selected: null,
    }, {
      debug: true,  // Enable debug logging
    });
    console.log('[DemoBloc] Constructor called, instance:', this.instanceId);
  }

  run = (): void => {
    console.log('[DemoBloc.run] Before emit, current state:', this.state);
    console.log('[DemoBloc.run] Listeners count:', (this as any).listeners.size);

    const data = [
      { id: 1, label: 'item 1' },
      { id: 2, label: 'item 2' },
    ];

    const newState = {
      data,
      selected: null,
    };

    console.log('[DemoBloc.run] Emitting new state:', newState);
    this.emit(newState);
    console.log('[DemoBloc.run] After emit, current state:', this.state);
  };
}

export const JSFrameworkBenchmarkDebug: React.FC = () => {
  const [state, bloc] = useBloc(DemoBloc);

  useEffect(() => {
    console.log('[Component] Mounted, bloc instance:', bloc.instanceId);
    console.log('[Component] Initial state:', state);
  }, []);

  useEffect(() => {
    console.log('[Component] State changed:', state);
  }, [state]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug JSFramework Benchmark</h1>
      <button onClick={() => {
        console.log('[Button] Calling bloc.run()');
        bloc.run();
      }}>
        Run (Create 2 rows)
      </button>
      <div>
        <h2>State:</h2>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </div>
      <div>
        <h2>Data count: {state.data.length}</h2>
        {state.data.map((item) => (
          <div key={item.id}>{item.label}</div>
        ))}
      </div>
    </div>
  );
};

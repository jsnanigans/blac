import React from 'react';
import { Blac, Cubit, RenderLoggingPlugin } from '@blac/core';
import useBloc from '@blac/react';

// Example: Configuring render logging with the plugin system

// Option 1: Configure via Blac.setConfig (automatic plugin setup)
Blac.setConfig({
  rerenderLogging: {
    enabled: true,
    level: 'detailed',
    filter: ({ componentName }) => !componentName.includes('Ignore'),
    includeStackTrace: true,
    groupRerenders: true,
  },
});

// Option 2: Manually add the plugin (for advanced use cases)
const customPlugin = new RenderLoggingPlugin({
  enabled: true,
  level: 'normal',
  filter: ({ blocName }) => blocName === 'CounterCubit',
});
// Blac.getInstance().plugins.add(customPlugin);

// Example Cubit
class CounterCubit extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'Counter' });
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  changeName = (name: string) => {
    this.emit({ ...this.state, name });
  };

  reset = () => {
    this.emit({ count: 0, name: 'Counter' });
  };
}

// Demo component
function CounterDemo() {
  const [counter, counterCubit] = useBloc(CounterCubit);

  return (
    <div>
      <h3>Render Logging Plugin Demo</h3>
      <p>Count: {counter.count}</p>
      <p>Name: {counter.name}</p>

      <button onClick={counterCubit.increment}>
        Increment (logs property change)
      </button>

      <button onClick={() => counterCubit.changeName('Updated')}>
        Change Name (logs property change)
      </button>

      <button onClick={counterCubit.reset}>
        Reset (logs entire state change)
      </button>

      <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        <p>Open browser console to see render logs</p>
        <p>The plugin tracks:</p>
        <ul>
          <li>Component mount</li>
          <li>State property changes</li>
          <li>Dependency changes</li>
          <li>Render counts and timing</li>
        </ul>
      </div>
    </div>
  );
}

export default CounterDemo;

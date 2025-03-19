import { useBloc } from '@blac/react';
import { FeatureBloc } from './FeatureBloc';

// Isolated counter component that gets its own state instance
function IsolatedCounter({ id }: { id: string }) {
  const [state, featureBloc] = useBloc(FeatureBloc);
  const counter = state.counters[id];

  return (
    <div className="p-4 bg-white dark:bg-gray-700 rounded-md shadow">
      <h3 className="text-sm font-medium mb-2">Isolated Counter {id}</h3>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold">{counter.value}</span>
        <button
          onClick={() => featureBloc.incrementCounter(id)}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 text-sm"
        >
          +
        </button>
        <button
          onClick={() => featureBloc.resetCounter(id)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function IsolatedDemo() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <IsolatedCounter id="isolated1" />
        <IsolatedCounter id="isolated2" />
      </div>

      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
        <h3 className="text-lg font-semibold mb-2">Shared vs Isolated State</h3>
        <div className="space-y-2">
          <p>
            <strong>Shared State:</strong> The counters above are isolated, meaning each instance maintains
            its own independent state. Changes to one counter don't affect the other.
          </p>
          <p>
            <strong>When to Use:</strong> Use isolated state when you need component-specific state that
            shouldn't be shared with other instances of the same component.
          </p>
        </div>
      </div>

      <p className="text-sm bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-md">
        <strong>Key Point:</strong> With Blac, you can easily choose between shared and isolated state
        by setting the <code>isolated</code> flag on your bloc. This gives you fine-grained control
        over state sharing without complex configuration.
      </p>
    </div>
  );
} 
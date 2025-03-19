import { useBloc } from '@blac/react';
import { FeatureBloc } from './FeatureBloc';

export function DirectAccessDemo() {
  const [state, featureBloc] = useBloc(FeatureBloc);
  const counter = state.counters.shared1;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Direct State Access Demo</h3>
      
      <div className="flex items-center space-x-4 mb-4">
        <div className="px-4 py-2 bg-white dark:bg-gray-700 rounded-md shadow text-center min-w-[100px]">
          <span className="text-2xl font-bold">{counter.value}</span>
        </div>
        
        <div className="space-x-2">
          <button
            onClick={() => featureBloc.decrementCounter('shared1')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            −
          </button>
          <button
            onClick={() => featureBloc.incrementCounter('shared1')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
          >
            +
          </button>
          <button
            onClick={() => featureBloc.resetCounter('shared1')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 ml-2"
          >
            Reset
          </button>
        </div>
      </div>
      
      <p className="text-sm bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md">
        <strong>Key Point:</strong> This component directly accesses the counter state without any props
        being passed down. Any component can access the same state from anywhere in your app.
      </p>
    </div>
  );
} 
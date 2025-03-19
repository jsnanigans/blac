import { useBloc } from '@blac/react';
import { FeatureBloc } from './FeatureBloc';

export function ComputedDemo() {
  const [state, featureBloc] = useBloc(FeatureBloc);
  const { counters } = state;
  const totalCount = featureBloc.totalCount;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-gray-700 rounded-md shadow">
          <h3 className="text-sm font-medium mb-2">Counter 1</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">{counters.shared1.value}</span>
            <button
              onClick={() => featureBloc.incrementCounter('shared1')}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 text-sm"
            >
              +
            </button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-700 rounded-md shadow">
          <h3 className="text-sm font-medium mb-2">Counter 2</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold">{counters.shared2.value}</span>
            <button
              onClick={() => featureBloc.incrementCounter('shared2')}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
        <h3 className="text-lg font-semibold mb-2">Total Count</h3>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalCount}</p>
        <p className="text-sm mt-2">
          This total is automatically computed and only updates when the individual counters change.
          No manual recalculation needed!
        </p>
      </div>

      <p className="text-sm bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 p-3 rounded-md">
        <strong>Key Point:</strong> The total count is a computed property that automatically updates
        when its dependencies (the individual counters) change. This is handled efficiently by Blac's
        dependency tracking system.
      </p>
    </div>
  );
} 
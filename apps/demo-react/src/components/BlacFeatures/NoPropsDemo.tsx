import { useBloc } from '@blac/react';
import { FeatureBloc } from './FeatureBloc';

// Deeply nested component that would traditionally need props passed down
function NestedCounter() {
  const [state, featureBloc] = useBloc(FeatureBloc);
  const counter = state.counters.shared2;

  return (
    <div className="p-4 bg-white dark:bg-gray-700 rounded-md shadow">
      <h4 className="text-sm font-medium mb-2">Deeply Nested Counter</h4>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold">{counter.value}</span>
        <button
          onClick={() => featureBloc.incrementCounter('shared2')}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 text-sm"
        >
          Increment
        </button>
      </div>
    </div>
  );
}

// Middle component that would traditionally need to pass props
function MiddleComponent() {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
      <h3 className="text-sm font-medium mb-2">Middle Component</h3>
      <NestedCounter />
    </div>
  );
}

// Top-level component that would traditionally need to pass props
function TopComponent() {
  return (
    <div className="p-4 bg-gray-200 dark:bg-gray-900 rounded-md">
      <h2 className="text-sm font-medium mb-2">Top Component</h2>
      <MiddleComponent />
    </div>
  );
}

export function NoPropsDemo() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This demo shows three nested components. Traditionally, you would need to pass state and methods
        through each level. With Blac, each component can access what it needs directly.
      </p>
      <TopComponent />
      <p className="text-sm bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded-md">
        <strong>Key Point:</strong> Notice how the deeply nested counter component can access and modify
        state without any props being passed through the component hierarchy.
      </p>
    </div>
  );
} 
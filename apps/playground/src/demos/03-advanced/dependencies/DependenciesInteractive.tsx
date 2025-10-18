import React from 'react';
import { AutomaticTrackingCard } from './components/AutomaticTrackingCard';
import { ManualDependenciesCard } from './components/ManualDependenciesCard';
import { GetterTrackingCard } from './components/GetterTrackingCard';
import { BroadTrackingCard } from './components/BroadTrackingCard';
import { UnoptimizedCard } from './components/UnoptimizedCard';
import { ControlPanel } from './components/ControlPanel';

export function DependenciesInteractive() {
  return (
    <div className="my-8 space-y-6">
      {/* Introduction */}
      <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
        <p className="text-sm text-gray-700">
          <strong>Interactive Demo:</strong> Click the buttons below to update
          different parts of the state. Watch the render counters to see which
          components re-render based on their dependency tracking strategy.
        </p>
      </div>

      {/* Control Panel */}
      <ControlPanel />

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AutomaticTrackingCard />
        <ManualDependenciesCard />
        <GetterTrackingCard />
        <BroadTrackingCard />
        <UnoptimizedCard />
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2">📚 Legend</h4>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Green badge (1-3 renders): Highly optimized
          </li>
          <li className="flex items-center">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Yellow badge (4-10 renders): Moderately optimized
          </li>
          <li className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Red badge (10+ renders): Not optimized
          </li>
          <li className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Blue border flash: Component just re-rendered
          </li>
        </ul>
      </div>

      {/* CSS for flash animation */}
      <style>{`
        @keyframes flash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(59, 130, 246, 0.1); }
        }
      `}</style>
    </div>
  );
}

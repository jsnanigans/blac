import { createFileRoute } from '@tanstack/react-router';
import Counter from '../../components/Counter';
import CounterIsolated from '../../components/CounterIsolated';
import { useState } from 'react';

export const Route = createFileRoute('/demo/counter')({
  component: RouteComponent,
});

function RouteComponent() {
  const [showShared, setShowShared] = useState(true);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-6 text-foreground dark:text-gray-100">Counter Demo</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This demo shows how blac handles state management with a simple counter example.
        </p>
        <div className="flex justify-center my-6">
          <Counter />
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground dark:text-gray-100">Shared State</h2>
          <button
            className="btn btn-outline text-sm"
            onClick={() => setShowShared((prev) => !prev)}
          >
            {showShared ? 'Hide Counters' : 'Show Counters'}
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          These counters share the same state. Clicking any of them will update all of them.
        </p>
        
        {showShared && (
          <div className="flex flex-wrap gap-4 justify-center py-4">
            <Counter />
            <Counter />
            <Counter />
            <Counter />
            <Counter />
          </div>
        )}
      </section>

      <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-border dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-foreground dark:text-gray-100">Isolated Counters</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          These counters have isolated state. Each counter maintains its own count.
        </p>
        <div className="flex flex-wrap gap-4 justify-center py-4">
          <CounterIsolated />
          <CounterIsolated />
          <CounterIsolated />
          <CounterIsolated />
          <CounterIsolated />
        </div>
      </section>
    </div>
  );
}

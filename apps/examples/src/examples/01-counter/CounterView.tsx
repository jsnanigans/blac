import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';

interface CounterViewProps {
  label: string;
  instanceKey?: string;
}

/**
 * Counter display component.
 *
 * Demonstrates:
 * - Using useBloc to access state
 * - Automatic dependency tracking (only re-renders when accessed props change)
 * - Instance management via instanceKey
 */
export function CounterView({ label, instanceKey }: CounterViewProps) {
  const [state, counter] = useBloc(CounterBloc, { instanceId: instanceKey });

  // This component will ONLY re-render when count changes,
  // not when incrementCount, decrementCount, or lastAction change!
  console.log(`[CounterView ${label}] Rendering with count:`, state.count);

  return (
    <div className="card counter-card">
      <div className="flex-between">
        <h3>{label}</h3>
        <span className="badge badge-outline">
          {instanceKey ? 'Isolated' : 'Shared'}
        </span>
      </div>
      <div className="counter-controls">
        <button onClick={counter.decrement} className="button-square">
          −
        </button>
        <div className="counter-value">{state.count}</div>
        <button onClick={counter.increment} className="button-square">
          +
        </button>
        <button onClick={counter.reset} className="button-ghost">
          Reset
        </button>
      </div>
      <p className="meta-line">
        Instance: {instanceKey || 'default (shared)'}
      </p>
    </div>
  );
}

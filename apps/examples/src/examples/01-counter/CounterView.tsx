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
    <div className="card">
      <h3>{label}</h3>
      <div className="flex gap-2 mb-2" style={{ alignItems: 'center' }}>
        <button onClick={counter.decrement}>-</button>
        <div
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: 'var(--primary)',
            minWidth: '60px',
            textAlign: 'center',
          }}
        >
          {state.count}
        </div>
        <button onClick={counter.increment}>+</button>
        <button onClick={counter.reset} className="secondary">
          Reset
        </button>
      </div>
      <p className="text-small text-muted">
        Instance: {instanceKey || 'default (shared)'}
      </p>
    </div>
  );
}

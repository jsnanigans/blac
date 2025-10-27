import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';

interface CounterStatsProps {
  instanceKey?: string;
}

/**
 * Component that shows counter statistics.
 *
 * Demonstrates granular dependency tracking:
 * - This component accesses incrementCount, decrementCount, and lastAction
 * - It will NOT re-render when count changes (only CounterView will)
 * - This is automatic - no manual optimization needed!
 */
export function CounterStats({ instanceKey }: CounterStatsProps) {
  const [state] = useBloc(CounterBloc, { instanceId: instanceKey });

  console.log(
    `[CounterStats] Rendering - increments: ${state.incrementCount}, decrements: ${state.decrementCount}`
  );

  return (
    <div className="card" style={{ background: 'var(--gray-50)' }}>
      <h4>Statistics</h4>
      <div className="text-small">
        <p>Increments: {state.incrementCount}</p>
        <p>Decrements: {state.decrementCount}</p>
        <p>Last action: {state.lastAction}</p>
      </div>
      <p className="text-small text-muted mt-2">
        💡 This component only re-renders when increment/decrement counts or
        lastAction change, not when the count itself changes!
      </p>
    </div>
  );
}

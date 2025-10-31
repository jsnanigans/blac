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
    `[CounterStats] Rendering - increments: ${state.incrementCount}, decrements: ${state.decrementCount}`,
  );

  return (
    <div className="card card-subtle">
      <h4>Signal Readout</h4>
      <div className="stats-grid">
        <div className="stat-block">
          <span className="stat-value">{state.incrementCount}</span>
          <span className="stat-label">Increments</span>
        </div>
        <div className="stat-block">
          <span className="stat-value">{state.decrementCount}</span>
          <span className="stat-label">Decrements</span>
        </div>
        <div className="stat-block">
          <span className="stat-value">{state.lastAction}</span>
          <span className="stat-label">Last Action</span>
        </div>
      </div>
      <p className="meta-line">
        💡 Only re-renders when increment / decrement counts or lastAction
        mutate.
      </p>
    </div>
  );
}

import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';
import { Card, StatCard } from '../../shared/components';

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
    <Card>
      <h4>Statistics</h4>
      <div className="stats-grid">
        <StatCard label="Increments" value={state.incrementCount} />
        <StatCard label="Decrements" value={state.decrementCount} />
        <StatCard label="Last Action" value={state.lastAction} />
      </div>
      <p className="text-xs text-muted">
        💡 Only re-renders when increment/decrement counts or lastAction change
      </p>
    </Card>
  );
}

import { useBloc } from '@blac/react';
import { CounterBloc } from './CounterBloc';
import { Card, StatCard, RenderCounter } from '../../shared/components';

interface CounterStatsProps {
  instanceKey?: string;
}

export function CounterStats({ instanceKey }: CounterStatsProps) {
  const [state] = useBloc(CounterBloc, { instanceId: instanceKey });

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="CounterStats" />
        <h4>Statistics</h4>
        <div className="stats-grid">
          <StatCard label="Increments" value={state.incrementCount} />
          <StatCard label="Decrements" value={state.decrementCount} />
          <StatCard label="Last Action" value={state.lastAction} />
        </div>
        <p className="text-xs text-muted">
          Only re-renders when increment/decrement counts or lastAction change
        </p>
      </div>
    </Card>
  );
}

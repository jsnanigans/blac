import { useBloc } from '@blac/react';
import { TodoCubit } from './TodoCubit';
import { Card, RenderCounter, StatCard } from '../../shared/components';

export function TodoStats() {
  const [, bloc] = useBloc(TodoCubit, {
    dependencies: (_state, b) => [b.activeCount, b.completedCount],
  });

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="TodoStats" />
        <h4>Statistics</h4>
        <div className="stats-grid">
          <StatCard label="Active" value={bloc.activeCount} />
          <StatCard label="Completed" value={bloc.completedCount} />
          <StatCard label="Total" value={bloc.activeCount + bloc.completedCount} />
        </div>
      </div>
    </Card>
  );
}

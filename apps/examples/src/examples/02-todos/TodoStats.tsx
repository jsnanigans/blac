import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';
import { useMemo } from 'react';
import { Card, StatCard, Button } from '../../shared/components';

interface TodoStatsProps {
  instanceKey?: string;
}

/**
 * Display todo statistics.
 *
 * Demonstrates:
 * - Only re-renders when todos array changes (to recompute counts)
 * - Does NOT re-render when filter changes
 */
export function TodoStats({ instanceKey }: TodoStatsProps) {
  const [state, todoBloc] = useBloc(TodoBloc, { instanceId: instanceKey });

  // Compute counts - only depends on todos array
  const counts = useMemo(() => {
    const todos = state.todos;
    return {
      total: todos.length,
      active: todos.filter((todo) => !todo.completed).length,
      completed: todos.filter((todo) => todo.completed).length,
    };
  }, [state.todos]);

  console.log('[TodoStats] Rendering -', counts);

  return (
    <Card>
      <div className="stats-grid">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Active" value={counts.active} />
        <StatCard label="Completed" value={counts.completed} />
      </div>
      {counts.completed > 0 && (
        <Button
          onClick={() => todoBloc.clearCompleted()}
          variant="danger"
          className="mt-2"
        >
          Clear Completed ({counts.completed})
        </Button>
      )}
      <p className="text-xs text-muted">
        💡 Only re-renders when todos change, not when filter changes
      </p>
    </Card>
  );
}

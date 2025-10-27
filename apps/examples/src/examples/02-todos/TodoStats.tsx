import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';
import { useMemo } from 'react';

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
    <div className="card card-subtle">
      <div className="stats-grid">
        <div className="stat-block">
          <span className="stat-value">{counts.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-block">
          <span className="stat-value highlight">{counts.active}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-block">
          <span className="stat-value">{counts.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>
      {counts.completed > 0 && (
        <div className="mt-2 text-center">
          <button onClick={() => todoBloc.clearCompleted()} className="danger button-block">
            Clear Completed
          </button>
        </div>
      )}
    </div>
  );
}

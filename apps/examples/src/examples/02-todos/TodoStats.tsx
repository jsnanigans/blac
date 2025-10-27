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
    <div className="card" style={{ background: 'var(--gray-50)' }}>
      <div className="flex gap-3" style={{ justifyContent: 'space-around' }}>
        <div className="text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {counts.total}
          </div>
          <div className="text-small text-muted">Total</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {counts.active}
          </div>
          <div className="text-small text-muted">Active</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
            {counts.completed}
          </div>
          <div className="text-small text-muted">Completed</div>
        </div>
      </div>
      {counts.completed > 0 && (
        <div className="mt-2 text-center">
          <button
            onClick={() => todoBloc.clearCompleted()}
            className="danger"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            Clear Completed
          </button>
        </div>
      )}
    </div>
  );
}

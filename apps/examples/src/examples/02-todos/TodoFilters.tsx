import { useBloc } from '@blac/react';
import { TodoBloc, FilterType } from './TodoBloc';

interface TodoFiltersProps {
  instanceKey?: string;
}

/**
 * Filter buttons for the todo list.
 *
 * Demonstrates:
 * - Only re-renders when filter changes
 * - Does NOT re-render when todos array changes
 */
export function TodoFilters({ instanceKey }: TodoFiltersProps) {
  const [state, todoBloc] = useBloc(TodoBloc, { instanceId: instanceKey });

  console.log(`[TodoFilters] Rendering - current filter: ${state.filter}`);

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className="flex gap-2 mb-2">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => todoBloc.setFilter(value)}
          className={state.filter === value ? '' : 'secondary'}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

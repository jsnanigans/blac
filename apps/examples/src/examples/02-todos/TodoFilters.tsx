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
    <div className="filter-row">
      {filters.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => todoBloc.setFilter(value)}
          className={state.filter === value ? 'button-active' : 'button-ghost'}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

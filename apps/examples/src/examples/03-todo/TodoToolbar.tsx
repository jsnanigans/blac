import { useBloc } from '@blac/react';
import { TodoCubit, type TodoFilter } from './TodoCubit';
import { Button, RenderCounter } from '../../shared/components';

const FILTERS: TodoFilter[] = ['all', 'active', 'completed'];

/**
 * Filter tabs + "clear completed" action.
 *
 * Reads only `state.filter` and the `completedCount` getter via its own
 * `useBloc` call, so toggling a todo or switching filters re-renders just this
 * toolbar — never the surrounding TodoDemo shell or the lifecycle log.
 */
export function TodoToolbar() {
  const [state, bloc] = useBloc(TodoCubit);

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="TodoToolbar" />
      <div className="flex-between">
        <div className="todo-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`ghost ${state.filter === f ? 'active' : ''}`}
              onClick={() => bloc.setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        {bloc.completedCount > 0 && (
          <Button
            variant="ghost"
            onClick={bloc.clearCompleted}
            style={{ fontSize: '0.8125rem' }}
          >
            Clear completed
          </Button>
        )}
      </div>
    </div>
  );
}

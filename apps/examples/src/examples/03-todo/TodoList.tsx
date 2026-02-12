import { useBloc } from '@blac/react';
import { TodoCubit } from './TodoCubit';
import { RenderCounter } from '../../shared/components';
import { Button } from '../../shared/components';

export function TodoList() {
  const [, bloc] = useBloc(TodoCubit, {
    dependencies: (_state, b) => [b.filteredItems],
  });

  const items = bloc.filteredItems;

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="TodoList" />
      <div className="stack-sm">
        {items.length === 0 && (
          <p
            className="text-muted text-small"
            style={{ padding: '1rem', textAlign: 'center' }}
          >
            No items to show
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`todo-item ${item.completed ? 'completed' : ''}`}
          >
            <input
              type="checkbox"
              className="todo-checkbox"
              checked={item.completed}
              onChange={() => bloc.toggleTodo(item.id)}
            />
            <span className="todo-text">{item.text}</span>
            <Button
              variant="ghost"
              onClick={() => bloc.removeTodo(item.id)}
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            >
              x
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

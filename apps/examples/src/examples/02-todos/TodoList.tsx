import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';
import { useMemo } from 'react';

interface TodoListProps {
  instanceKey?: string;
}

/**
 * Displays the filtered list of todos.
 *
 * Demonstrates:
 * - Only re-renders when todos array or filter changes
 * - Does NOT re-render when unrelated state changes
 * - Filtering happens here to maintain proper dependency tracking
 */
export function TodoList({ instanceKey }: TodoListProps) {
  const [state, todoBloc] = useBloc(TodoBloc, { instanceId: instanceKey });

  // Compute filtered todos - this ensures proper dependency tracking
  const filteredTodos = useMemo(() => {
    const { todos, filter } = state;
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'completed':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }, [state.todos, state.filter]);

  console.log(
    `[TodoList] Rendering - ${filteredTodos.length} todos (filter: ${state.filter})`
  );

  if (filteredTodos.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: '2rem' }}>
        No todos to display
      </div>
    );
  }

  return (
    <div>
      {filteredTodos.map((todo) => (
        <div
          key={todo.id}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
          }}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => todoBloc.toggleTodo(todo.id)}
            style={{ width: '20px', height: '20px' }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? 'var(--gray-600)' : 'inherit',
            }}
          >
            {todo.text}
          </span>
          <button
            onClick={() => todoBloc.deleteTodo(todo.id)}
            className="danger"
            style={{ padding: '0.5rem 1rem' }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

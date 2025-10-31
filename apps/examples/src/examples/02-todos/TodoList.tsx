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
  const { todos, filter } = state;

  // Compute filtered todos - this ensures proper dependency tracking
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'completed':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  console.log(
    `[TodoList] Rendering - ${filteredTodos.length} todos (filter: ${filter})`,
  );

  if (filteredTodos.length === 0) {
    return <div className="empty-panel text-center">No todos to display</div>;
  }

  return (
    <div className="todo-list">
      {filteredTodos.map((todo) => (
        <div
          key={todo.id}
          className={`todo-item${todo.completed ? ' completed' : ''}`}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => todoBloc.toggleTodo(todo.id)}
          />
          <span className="todo-item-text">{todo.text}</span>
          <button
            onClick={() => todoBloc.deleteTodo(todo.id)}
            className="danger button-compact"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

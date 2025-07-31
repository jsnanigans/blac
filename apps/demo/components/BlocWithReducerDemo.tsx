import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { Todo, TodoBloc } from '../blocs/TodoBloc';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const TodoItem: React.FC<{
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}> = ({ todo, onToggle, onRemove }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #eee',
        opacity: todo.completed ? 0.6 : 1,
      }}
    >
      <span
        onClick={() => onToggle(todo.id)}
        style={{
          textDecoration: todo.completed ? 'line-through' : 'none',
          cursor: 'pointer',
          flexGrow: 1,
        }}
      >
        {todo.text}
      </span>
      <Button
        onClick={() => onRemove(todo.id)}
        variant="destructive"
        style={{ padding: '2px 6px', fontSize: '0.8em' }}
      >
        Remove
      </Button>
    </div>
  );
};

const TodoBlocDemo: React.FC = () => {
  const [state, bloc] = useBloc(TodoBloc);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      bloc.addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const activeTodosCount = state.todos.filter((todo) => !todo.completed).length;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <form
        onSubmit={handleAddTodo}
        style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
      >
        <Input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
          style={{ flexGrow: 1 }}
        />
        <Button type="submit" variant="default">
          Add Todo
        </Button>
      </form>

      <div>
        {bloc.filteredTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={bloc.toggleTodo}
            onRemove={bloc.removeTodo}
          />
        ))}
      </div>

      {state.todos.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9em',
            color: '#555',
          }}
        >
          <span>
            {activeTodosCount} item{activeTodosCount !== 1 ? 's' : ''} left
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['all', 'active', 'completed'] as const).map((filter) => (
              <Button
                key={filter}
                onClick={() => bloc.setFilter(filter)}
                variant={state.filter === filter ? 'default' : 'outline'}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
          {state.todos.some((todo) => todo.completed) && (
            <Button onClick={bloc.clearCompleted} variant="ghost">
              Clear Completed
            </Button>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-4">
        This demo showcases a <code>Bloc</code> using the new event-handler
        pattern (<code>this.on(EventType, handler)</code>) to manage a todo
        list. Actions (which are now classes like <code>AddTodoAction</code>,{' '}
        <code>ToggleTodoAction</code>, etc.) are dispatched via{' '}
        <code>bloc.add(new EventType())</code>, often through helper methods on
        the <code>TodoBloc</code> itself (e.g., <code>bloc.addTodo(text)</code>
        ). The <code>TodoBloc</code> then processes these events with registered
        handlers to produce new state.
      </p>
    </div>
  );
};

export default TodoBlocDemo;

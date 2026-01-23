import { useState } from 'preact/hooks';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/preact';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
}

class TodoCubit extends Cubit<TodoState> {
  private nextId = 1;

  constructor() {
    super({ todos: [], filter: 'all' });
  }

  addTodo = (text: string) => {
    if (!text.trim()) return;
    this.emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        { id: this.nextId++, text: text.trim(), completed: false },
      ],
    });
  };

  toggleTodo = (id: number) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  removeTodo = (id: number) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== id),
    });
  };

  setFilter = (filter: TodoState['filter']) => {
    this.emit({ ...this.state, filter });
  };

  clearCompleted = () => {
    this.emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  get filteredTodos() {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter((t) => !t.completed);
      case 'completed':
        return this.state.todos.filter((t) => t.completed);
      default:
        return this.state.todos;
    }
  }

  get activeCount() {
    return this.state.todos.filter((t) => !t.completed).length;
  }
}

export function TodoDemo() {
  const [state, todos] = useBloc(TodoCubit);
  const [newTodo, setNewTodo] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    todos.addTodo(newTodo);
    setNewTodo('');
  };

  return (
    <div className="demo-section">
      <h2>Todo List Example</h2>
      <p>
        A todo list demonstrating computed properties and array state
        management.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} className="todo-form">
          <input
            type="text"
            value={newTodo}
            onInput={(e) => setNewTodo((e.target as HTMLInputElement).value)}
            placeholder="What needs to be done?"
          />
          <button type="submit" className="primary">
            Add
          </button>
        </form>

        <div className="todo-filters">
          <button
            className={state.filter === 'all' ? 'active' : 'ghost'}
            onClick={() => todos.setFilter('all')}
          >
            All
          </button>
          <button
            className={state.filter === 'active' ? 'active' : 'ghost'}
            onClick={() => todos.setFilter('active')}
          >
            Active
          </button>
          <button
            className={state.filter === 'completed' ? 'active' : 'ghost'}
            onClick={() => todos.setFilter('completed')}
          >
            Completed
          </button>
        </div>

        <ul className="todo-list">
          {todos.filteredTodos.map((todo) => (
            <li key={todo.id} className={todo.completed ? 'completed' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => todos.toggleTodo(todo.id)}
                />
                <span>{todo.text}</span>
              </label>
              <button
                className="ghost"
                onClick={() => todos.removeTodo(todo.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {state.todos.length > 0 && (
          <div className="todo-footer">
            <span>{todos.activeCount} items left</span>
            <button className="ghost" onClick={todos.clearCompleted}>
              Clear completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

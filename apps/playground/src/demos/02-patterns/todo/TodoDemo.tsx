import { useBloc } from '@blac/react';
import React, { useState } from 'react';
import { Todo, TodoBloc } from './TodoBloc';

const TodoItem: React.FC<{
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}> = ({ todo, onToggle, onRemove }) => {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span
          className={`flex-1 ${
            todo.completed
              ? 'line-through text-gray-500 dark:text-gray-400'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onRemove(todo.id)}
        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 text-sm"
      >
        Remove
      </button>
    </div>
  );
};

export const TodoDemo: React.FC = () => {
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
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Add Todo
        </button>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {bloc.filteredTodos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {state.filter === 'all'
              ? 'No todos yet. Add one above!'
              : `No ${state.filter} todos.`}
          </div>
        ) : (
          bloc.filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={bloc.toggleTodo}
              onRemove={bloc.removeTodo}
            />
          ))
        )}
      </div>

      {state.todos.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {activeTodosCount} item{activeTodosCount !== 1 ? 's' : ''} left
          </span>
          <div className="flex gap-1">
            {(['all', 'active', 'completed'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => bloc.setFilter(filter)}
                className={`px-3 py-1 rounded transition-colors ${
                  state.filter === filter
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          {state.todos.some((todo) => todo.completed) && (
            <button
              onClick={bloc.clearCompleted}
              className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear Completed
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Export code snippets for the playground
export const todoDemoCode = {
  usage: `import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';

function TodoApp() {
  const [state, bloc] = useBloc(TodoBloc);
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = (e) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      bloc.addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  return (
    <div>
      <form onSubmit={handleAddTodo}>
        <input
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add Todo</button>
      </form>

      {bloc.filteredTodos.map((todo) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => bloc.toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button onClick={() => bloc.removeTodo(todo.id)}>
            Remove
          </button>
        </div>
      ))}

      <div>
        {(['all', 'active', 'completed']).map((filter) => (
          <button
            key={filter}
            onClick={() => bloc.setFilter(filter)}
            className={state.filter === filter ? 'active' : ''}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}`,
  bloc: `import { Bloc } from '@blac/core';

// Define your state interface
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}

// Define action classes
class AddTodoAction {
  constructor(public readonly text: string) {}
}

class ToggleTodoAction {
  constructor(public readonly id: number) {}
}

// Create your Bloc
export class TodoBloc extends Bloc<TodoState, TodoActions> {
  constructor() {
    super(initialState);

    // Register event handlers
    this.on(AddTodoAction, this.handleAddTodo);
    this.on(ToggleTodoAction, this.handleToggleTodo);
  }

  private handleAddTodo = (action, emit) => {
    if (!action.text.trim()) return;
    
    emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        { 
          id: this.state.nextId, 
          text: action.text, 
          completed: false 
        },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  private handleToggleTodo = (action, emit) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === action.id 
          ? { ...todo, completed: !todo.completed } 
          : todo
      ),
    });
  };

  // Helper methods
  addTodo = (text: string) => this.add(new AddTodoAction(text));
  toggleTodo = (id: number) => this.add(new ToggleTodoAction(id));

  // Computed getter
  get filteredTodos() {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter(t => !t.completed);
      case 'completed':
        return this.state.todos.filter(t => t.completed);
      default:
        return this.state.todos;
    }
  }
}`,
};

import { Cubit } from '@blac/core';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type FilterType = 'all' | 'active' | 'completed';

export interface TodoState {
  todos: Todo[];
  filter: FilterType;
}

/**
 * Todo list Cubit with filtering and persistence.
 *
 * Demonstrates:
 * - Array state management
 * - Computed filtering (happens in component, not here)
 * - LocalStorage persistence via lifecycle
 * - Granular dependency tracking
 */
export class TodoBloc extends Cubit<TodoState> {
  private storageKey: string;

  constructor(storageKey: string = 'blac-todos') {
    // Load from localStorage if available
    const saved = localStorage.getItem(storageKey);
    const initialState: TodoState = saved
      ? JSON.parse(saved)
      : { todos: [], filter: 'all' };

    super(initialState);
    this.storageKey = storageKey;

    // Subscribe to state changes to save to localStorage
    this.subscribe((state) => {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    });

    // Lifecycle hook for cleanup
    this.onDispose = () => {
      console.log(`[TodoBloc] Disposed - todos persisted to localStorage`);
    };
  }

  /**
   * Add a new todo
   */
  addTodo = (text: string) => {
    if (!text.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    this.emit({
      ...this.state,
      todos: [...this.state.todos, newTodo],
    });
  };

  /**
   * Toggle a todo's completed status
   */
  toggleTodo = (id: string) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  /**
   * Delete a todo
   */
  deleteTodo = (id: string) => {
    this.emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== id),
    });
  };

  /**
   * Clear all completed todos
   */
  clearCompleted = () => {
    this.emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  /**
   * Change the current filter
   */
  setFilter = (filter: FilterType) => {
    this.emit({
      ...this.state,
      filter,
    });
  };

  /**
   * Get filtered todos (computed property pattern)
   * Note: In a real app, you'd compute this in the component for better dependency tracking
   */
  getFilteredTodos = (): Todo[] => {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter((todo) => !todo.completed);
      case 'completed':
        return this.state.todos.filter((todo) => todo.completed);
      default:
        return this.state.todos;
    }
  };

  /**
   * Get todo counts
   */
  getCounts = () => {
    const total = this.state.todos.length;
    const active = this.state.todos.filter((todo) => !todo.completed).length;
    const completed = this.state.todos.filter((todo) => todo.completed).length;
    return { total, active, completed };
  };
}

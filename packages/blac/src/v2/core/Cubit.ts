/**
 * Cubit - Simple state container with direct state emission
 *
 * This validates that our StateContainer design can support
 * the simple Cubit pattern from the original BlaC.
 */

import { StateContainer } from './StateContainer';
import { StateContainerConfig } from './StateContainer';

/**
 * Cubit is a simple state container that allows direct state emission
 */
export abstract class Cubit<S> extends StateContainer<S> {
  /**
   * Create a new Cubit
   * @param initialState Initial state value
   * @param config Configuration options
   */
  constructor(initialState: S, config?: StateContainerConfig) {
    super(initialState, config);
  }

  /**
   * Emit a new state (public API for Cubit)
   * Arrow function to maintain correct 'this' binding in React
   */
  protected emitState = (state: S): void => {
    this.emit(state);
  };

  /**
   * Update state with an updater function (public API for Cubit)
   * Arrow function to maintain correct 'this' binding in React
   */
  protected updateState = (updater: (current: S) => S): void => {
    this.update(updater);
  };
}

/**
 * Example: Counter Cubit
 */
export class CounterCubit extends Cubit<number> {
  constructor() {
    super(0, { name: 'CounterCubit' });
  }

  increment = (): void => {
    this.emitState(this.state + 1);
  };

  decrement = (): void => {
    this.emitState(this.state - 1);
  };

  reset = (): void => {
    this.emitState(0);
  };

  addAmount = (amount: number): void => {
    this.emitState(this.state + amount);
  };
}

/**
 * Example: Complex State Cubit
 */
export interface TodoState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  filter: 'all' | 'active' | 'completed';
  isLoading: boolean;
}

export class TodoCubit extends Cubit<TodoState> {
  private nextId = 0;

  constructor() {
    super(
      {
        todos: [],
        filter: 'all',
        isLoading: false,
      },
      { name: 'TodoCubit', keepAlive: true }
    );
  }

  addTodo = (text: string): void => {
    this.updateState(state => ({
      ...state,
      todos: [
        ...state.todos,
        { id: `todo-${Date.now()}-${this.nextId++}`, text, done: false }
      ],
    }));
  };

  toggleTodo = (id: string): void => {
    this.updateState(state => ({
      ...state,
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ),
    }));
  };

  removeTodo = (id: string): void => {
    this.updateState(state => ({
      ...state,
      todos: state.todos.filter(todo => todo.id !== id),
    }));
  };

  setFilter = (filter: TodoState['filter']): void => {
    this.updateState(state => ({ ...state, filter }));
  };

  setLoading = (isLoading: boolean): void => {
    this.updateState(state => ({ ...state, isLoading }));
  };

  get visibleTodos() {
    const todos = this.state.todos;
    const filter = this.state.filter;

    switch (filter) {
      case 'active':
        return todos.filter(t => !t.done);
      case 'completed':
        return todos.filter(t => t.done);
      case 'all':
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter(t => !t.done).length;
  }
}
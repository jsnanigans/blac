/**
 * Cubit - Simple state container with direct state emission
 *
 * This validates that our StateContainer design can support
 * the simple Cubit pattern from the original BlaC.
 */

import { StateContainer } from './StateContainer';

/**
 * Cubit is a simple state container that allows direct state emission
 *
 * Unlike StateContainer (where emit is protected), Cubit exposes emit and update
 * as public methods to allow direct state management.
 */
export abstract class Cubit<S> extends StateContainer<S> {
  /**
   * Create a new Cubit
   * @param initialState Initial state value
   */
  constructor(initialState: S) {
    super(initialState);
  }

  /**
   * Emit a new state (public override of protected parent method)
   */
  public emit(newState: S): void {
    super['emit'](newState);
  }

  /**
   * Update state using a function (public override of protected parent method)
   */
  public update(updater: (current: S) => S): void {
    super['update'](updater);
  }

  /**
   * Patch state with partial updates (shallow merge)
   * Only available when state is an object type
   * Arrow function to maintain correct 'this' binding in React
   *
   * @example
   * ```typescript
   * // Update single field
   * this.patch({ count: 5 });
   *
   * // Update multiple fields
   * this.patch({ count: 5, name: 'Updated' });
   * ```
   */
  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    this.update((current) => ({ ...current, ...partial }) as S);
  }) as S extends object ? (partial: Partial<S>) => void : never;
}

/**
 * Example: Counter Cubit
 */
export class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = (): void => {
    this.emit(this.state + 1);
  };

  decrement = (): void => {
    this.emit(this.state - 1);
  };

  reset = (): void => {
    this.emit(0);
  };

  addAmount = (amount: number): void => {
    this.emit(this.state + amount);
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
  static keepAlive = true;
  private nextId = 0;

  constructor() {
    super({
      todos: [],
      filter: 'all',
      isLoading: false,
    });
  }

  addTodo = (text: string): void => {
    this.update((state) => ({
      ...state,
      todos: [
        ...state.todos,
        { id: `todo-${Date.now()}-${this.nextId++}`, text, done: false },
      ],
    }));
  };

  toggleTodo = (id: string): void => {
    this.update((state) => ({
      ...state,
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      ),
    }));
  };

  removeTodo = (id: string): void => {
    this.update((state) => ({
      ...state,
      todos: state.todos.filter((todo) => todo.id !== id),
    }));
  };

  setFilter = (filter: TodoState['filter']): void => {
    this.patch({ filter }); // Using patch() for simple field update
  };

  setLoading = (isLoading: boolean): void => {
    this.patch({ isLoading }); // Using patch() for simple field update
  };

  get visibleTodos() {
    const todos = this.state.todos;
    const filter = this.state.filter;

    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.done);
      case 'completed':
        return todos.filter((t) => t.done);
      case 'all':
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter((t) => !t.done).length;
  }
}

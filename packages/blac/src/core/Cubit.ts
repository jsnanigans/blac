import { StateContainer } from './StateContainer';

export abstract class Cubit<S, P = undefined> extends StateContainer<S, P> {
  constructor(initialState: S) {
    super(initialState);
  }

  public emit(newState: S): void {
    super['emit'](newState);
  }

  public update(updater: (current: S) => S): void {
    super['update'](updater);
  }

  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    this.update((current) => ({ ...current, ...partial }) as S);
  }) as S extends object ? (partial: Partial<S>) => void : never;
}

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

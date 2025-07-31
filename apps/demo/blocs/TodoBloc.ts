import { Bloc } from '@blac/core';

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  nextId: number;
}

const initialState: TodoState = {
  todos: [
    { id: 1, text: 'Learn Blac (new API)', completed: true },
    { id: 2, text: 'Update demo app', completed: false },
    { id: 3, text: 'Update documentation', completed: false },
  ],
  filter: 'all',
  nextId: 4,
};

// --- Action Classes ---
export class AddTodoAction {
  constructor(public readonly text: string) {}
}
export class ToggleTodoAction {
  constructor(public readonly id: number) {}
}
export class RemoveTodoAction {
  constructor(public readonly id: number) {}
}
export class SetFilterAction {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}
export class ClearCompletedAction {}

// --- Union type for all possible actions (optional but can be useful) ---
export type TodoActions =
  | AddTodoAction
  | ToggleTodoAction
  | RemoveTodoAction
  | SetFilterAction
  | ClearCompletedAction;

export class TodoBloc extends Bloc<TodoState, TodoActions> {
  constructor() {
    super(initialState);

    // Register event handlers
    this.on(AddTodoAction, this.handleAddTodo);
    this.on(ToggleTodoAction, this.handleToggleTodo);
    this.on(RemoveTodoAction, this.handleRemoveTodo);
    this.on(SetFilterAction, this.handleSetFilter);
    this.on(ClearCompletedAction, this.handleClearCompleted);
  }

  // --- Event Handlers ---
  private handleAddTodo = (
    action: AddTodoAction,
    emit: (newState: TodoState) => void,
  ) => {
    if (!action.text.trim()) return; // No change if text is empty
    const newState = {
      ...this.state,
      todos: [
        ...this.state.todos,
        { id: this.state.nextId, text: action.text, completed: false },
      ],
      nextId: this.state.nextId + 1,
    };
    emit(newState);
  };

  private handleToggleTodo = (
    action: ToggleTodoAction,
    emit: (newState: TodoState) => void,
  ) => {
    const newState = {
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === action.id ? { ...todo, completed: !todo.completed } : todo,
      ),
    };
    emit(newState);
  };

  private handleRemoveTodo = (
    action: RemoveTodoAction,
    emit: (newState: TodoState) => void,
  ) => {
    const newState = {
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== action.id),
    };
    emit(newState);
  };

  private handleSetFilter = (
    action: SetFilterAction,
    emit: (newState: TodoState) => void,
  ) => {
    const newState = {
      ...this.state,
      filter: action.filter,
    };
    emit(newState);
  };

  private handleClearCompleted = (
    _action: ClearCompletedAction,
    emit: (newState: TodoState) => void,
  ) => {
    const newState = {
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    };
    emit(newState);
  };

  // --- Helper methods to dispatch actions ---
  addTodo = (text: string) => this.add(new AddTodoAction(text));
  toggleTodo = (id: number) => this.add(new ToggleTodoAction(id));
  removeTodo = (id: number) => this.add(new RemoveTodoAction(id));
  setFilter = (filter: 'all' | 'active' | 'completed') =>
    this.add(new SetFilterAction(filter));
  clearCompleted = () => this.add(new ClearCompletedAction());

  // Getter for filtered todos
  get filteredTodos(): Todo[] {
    switch (this.state.filter) {
      case 'active':
        return this.state.todos.filter((todo) => !todo.completed);
      case 'completed':
        return this.state.todos.filter((todo) => todo.completed);
      case 'all':
      default:
        return this.state.todos;
    }
  }
}

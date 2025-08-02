# Todo List Example

A comprehensive todo list application demonstrating real-world BlaC patterns including state management, filtering, persistence, and optimistic updates.

## Basic Todo List

Let's start with a simple todo list using a Cubit:

### State Definition

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  inputText: string;
}
```

### Todo Cubit

```typescript
import { Cubit } from '@blac/core';

export class TodoCubit extends Cubit<TodoState> {
  constructor() {
    super({
      todos: [],
      filter: 'all',
      inputText: '',
    });
  }

  // Input management
  setInputText = (text: string) => {
    this.patch({ inputText: text });
  };

  // Todo operations
  addTodo = () => {
    const { inputText } = this.state;
    if (!inputText.trim()) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      completed: false,
      createdAt: new Date(),
    };

    this.patch({
      todos: [...this.state.todos, newTodo],
      inputText: '',
    });
  };

  toggleTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  deleteTodo = (id: string) => {
    this.patch({
      todos: this.state.todos.filter((todo) => todo.id !== id),
    });
  };

  editTodo = (id: string, text: string) => {
    this.patch({
      todos: this.state.todos.map((todo) =>
        todo.id === id ? { ...todo, text } : todo,
      ),
    });
  };

  // Filter operations
  setFilter = (filter: TodoState['filter']) => {
    this.patch({ filter });
  };

  clearCompleted = () => {
    this.patch({
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  // Computed properties
  get filteredTodos() {
    const { todos, filter } = this.state;
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'completed':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter((todo) => !todo.completed).length;
  }

  get completedTodoCount() {
    return this.state.todos.filter((todo) => todo.completed).length;
  }

  get allCompleted() {
    return this.state.todos.length > 0 && this.activeTodoCount === 0;
  }
}
```

### React Components

```tsx
import { useBloc } from '@blac/react';
import { TodoCubit } from './TodoCubit';

export function TodoApp() {
  return (
    <div className="todo-app">
      <header className="header">
        <h1>todos</h1>
        <TodoInput />
      </header>
      <section className="main">
        <ToggleAllCheckbox />
        <TodoList />
      </section>
      <TodoFooter />
    </div>
  );
}

function TodoInput() {
  const [state, cubit] = useBloc(TodoCubit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cubit.addTodo();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        value={state.inputText}
        onChange={(e) => cubit.setInputText(e.target.value)}
        autoFocus
      />
    </form>
  );
}

function ToggleAllCheckbox() {
  const [state, cubit] = useBloc(TodoCubit);

  if (state.todos.length === 0) return null;

  const handleToggleAll = () => {
    const shouldComplete = cubit.activeTodoCount > 0;
    cubit.patch({
      todos: state.todos.map((todo) => ({
        ...todo,
        completed: shouldComplete,
      })),
    });
  };

  return (
    <>
      <input
        id="toggle-all"
        className="toggle-all"
        type="checkbox"
        checked={cubit.allCompleted}
        onChange={handleToggleAll}
      />
      <label htmlFor="toggle-all">Mark all as complete</label>
    </>
  );
}

function TodoList() {
  const [_, cubit] = useBloc(TodoCubit);
  const todos = cubit.filteredTodos;

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const [_, cubit] = useBloc(TodoCubit);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleSave = () => {
    if (editText.trim()) {
      cubit.editTodo(todo.id, editText.trim());
      setIsEditing(false);
    } else {
      cubit.deleteTodo(todo.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
    }
  };

  return (
    <li
      className={`${todo.completed ? 'completed' : ''} ${isEditing ? 'editing' : ''}`}
    >
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={() => cubit.toggleTodo(todo.id)}
        />
        <label onDoubleClick={() => setIsEditing(true)}>{todo.text}</label>
        <button className="destroy" onClick={() => cubit.deleteTodo(todo.id)} />
      </div>
      {isEditing && (
        <input
          className="edit"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      )}
    </li>
  );
}

function TodoFooter() {
  const [state, cubit] = useBloc(TodoCubit);

  if (state.todos.length === 0) return null;

  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{cubit.activeTodoCount}</strong> item
        {cubit.activeTodoCount !== 1 ? 's' : ''} left
      </span>
      <FilterButtons />
      {cubit.completedTodoCount > 0 && (
        <button className="clear-completed" onClick={cubit.clearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  );
}

function FilterButtons() {
  const [state, cubit] = useBloc(TodoCubit);
  const filters: Array<TodoState['filter']> = ['all', 'active', 'completed'];

  return (
    <ul className="filters">
      {filters.map((filter) => (
        <li key={filter}>
          <a
            className={state.filter === filter ? 'selected' : ''}
            onClick={() => cubit.setFilter(filter)}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

## Advanced: Event-Driven Todo List with Bloc

For more complex scenarios, use the event-driven Bloc pattern:

### Events

```typescript
// Base event class
abstract class TodoEvent {
  constructor(public readonly timestamp = Date.now()) {}
}

// Specific events
class TodoAdded extends TodoEvent {
  constructor(public readonly text: string) {
    super();
  }
}

class TodoToggled extends TodoEvent {
  constructor(public readonly id: string) {
    super();
  }
}

class TodoDeleted extends TodoEvent {
  constructor(public readonly id: string) {
    super();
  }
}

class TodoEdited extends TodoEvent {
  constructor(
    public readonly id: string,
    public readonly text: string,
  ) {
    super();
  }
}

class FilterChanged extends TodoEvent {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {
    super();
  }
}

class CompletedCleared extends TodoEvent {}

class AllToggled extends TodoEvent {
  constructor(public readonly completed: boolean) {
    super();
  }
}

type TodoEventType =
  | TodoAdded
  | TodoToggled
  | TodoDeleted
  | TodoEdited
  | FilterChanged
  | CompletedCleared
  | AllToggled;
```

### Todo Bloc

```typescript
import { Bloc } from '@blac/core';

export class TodoBloc extends Bloc<TodoState, TodoEventType> {
  constructor() {
    super({
      todos: [],
      filter: 'all',
      inputText: '',
    });

    // Register event handlers
    this.on(TodoAdded, this.handleTodoAdded);
    this.on(TodoToggled, this.handleTodoToggled);
    this.on(TodoDeleted, this.handleTodoDeleted);
    this.on(TodoEdited, this.handleTodoEdited);
    this.on(FilterChanged, this.handleFilterChanged);
    this.on(CompletedCleared, this.handleCompletedCleared);
    this.on(AllToggled, this.handleAllToggled);
  }

  // Event handlers
  private handleTodoAdded = (
    event: TodoAdded,
    emit: (state: TodoState) => void,
  ) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: event.text,
      completed: false,
      createdAt: new Date(),
    };

    emit({
      ...this.state,
      todos: [...this.state.todos, newTodo],
      inputText: '',
    });
  };

  private handleTodoToggled = (
    event: TodoToggled,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, completed: !todo.completed } : todo,
      ),
    });
  };

  private handleTodoDeleted = (
    event: TodoDeleted,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== event.id),
    });
  };

  private handleTodoEdited = (
    event: TodoEdited,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, text: event.text } : todo,
      ),
    });
  };

  private handleFilterChanged = (
    event: FilterChanged,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      filter: event.filter,
    });
  };

  private handleCompletedCleared = (
    _: CompletedCleared,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  private handleAllToggled = (
    event: AllToggled,
    emit: (state: TodoState) => void,
  ) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) => ({
        ...todo,
        completed: event.completed,
      })),
    });
  };

  // Public methods (convenience wrappers)
  addTodo = (text: string) => {
    if (text.trim()) {
      this.add(new TodoAdded(text.trim()));
    }
  };

  toggleTodo = (id: string) => this.add(new TodoToggled(id));
  deleteTodo = (id: string) => this.add(new TodoDeleted(id));
  editTodo = (id: string, text: string) => this.add(new TodoEdited(id, text));
  setFilter = (filter: TodoState['filter']) =>
    this.add(new FilterChanged(filter));
  clearCompleted = () => this.add(new CompletedCleared());
  toggleAll = (completed: boolean) => this.add(new AllToggled(completed));

  // Computed properties (same as Cubit version)
  get filteredTodos() {
    const { todos, filter } = this.state;
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'completed':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }

  get activeTodoCount() {
    return this.state.todos.filter((todo) => !todo.completed).length;
  }

  get completedTodoCount() {
    return this.state.todos.filter((todo) => todo.completed).length;
  }
}
```

## Persistent Todo List

Add persistence to automatically save and restore todos:

```typescript
import { PersistencePlugin } from '@blac/plugin-persistence';

export class PersistentTodoCubit extends TodoCubit {
  constructor() {
    super();

    // Add persistence plugin
    this.addPlugin(
      new PersistencePlugin({
        key: 'todos-state',
        storage: localStorage,
        // Optional: transform state before saving
        serialize: (state) => ({
          ...state,
          // Don't persist input text
          inputText: '',
        }),
      }),
    );
  }
}
```

## Async Todo List with API

Handle server synchronization with optimistic updates:

```typescript
interface AsyncTodoState extends TodoState {
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
}

export class AsyncTodoCubit extends Cubit<AsyncTodoState> {
  constructor(private api: TodoAPI) {
    super({
      todos: [],
      filter: 'all',
      inputText: '',
      isLoading: false,
      isSyncing: false,
      error: null,
      lastSyncedAt: null,
    });

    // Load todos on init
    this.loadTodos();
  }

  loadTodos = async () => {
    this.patch({ isLoading: true, error: null });

    try {
      const todos = await this.api.getTodos();
      this.patch({
        todos,
        isLoading: false,
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      this.patch({
        isLoading: false,
        error: error.message,
      });
    }
  };

  addTodo = async () => {
    const { inputText } = this.state;
    if (!inputText.trim()) return;

    const tempTodo: Todo = {
      id: `temp-${Date.now()}`,
      text: inputText.trim(),
      completed: false,
      createdAt: new Date(),
    };

    // Optimistic update
    this.patch({
      todos: [...this.state.todos, tempTodo],
      inputText: '',
      isSyncing: true,
    });

    try {
      // Create on server
      const savedTodo = await this.api.createTodo({
        text: tempTodo.text,
        completed: tempTodo.completed,
      });

      // Replace temp todo with saved one
      this.patch({
        todos: this.state.todos.map((todo) =>
          todo.id === tempTodo.id ? savedTodo : todo,
        ),
        isSyncing: false,
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      // Revert on error
      this.patch({
        todos: this.state.todos.filter((todo) => todo.id !== tempTodo.id),
        isSyncing: false,
        error: `Failed to add todo: ${error.message}`,
      });
    }
  };

  toggleTodo = async (id: string) => {
    const todo = this.state.todos.find((t) => t.id === id);
    if (!todo) return;

    // Optimistic update
    this.patch({
      todos: this.state.todos.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
      isSyncing: true,
    });

    try {
      await this.api.updateTodo(id, { completed: !todo.completed });
      this.patch({
        isSyncing: false,
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      // Revert on error
      this.patch({
        todos: this.state.todos.map((t) => (t.id === id ? todo : t)),
        isSyncing: false,
        error: `Failed to update todo: ${error.message}`,
      });
    }
  };

  // Batch sync for offline support
  syncTodos = async () => {
    if (this.state.isSyncing) return;

    this.patch({ isSyncing: true, error: null });

    try {
      // Get latest from server
      const serverTodos = await this.api.getTodos();

      // Merge with local changes (simplified - real app would handle conflicts)
      this.patch({
        todos: serverTodos,
        isSyncing: false,
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      this.patch({
        isSyncing: false,
        error: `Sync failed: ${error.message}`,
      });
    }
  };
}
```

## Testing

Testing todo functionality is straightforward:

```typescript
import { TodoCubit } from './TodoCubit';

describe('TodoCubit', () => {
  let cubit: TodoCubit;

  beforeEach(() => {
    cubit = new TodoCubit();
  });

  describe('adding todos', () => {
    it('should add a new todo', () => {
      cubit.setInputText('Test todo');
      cubit.addTodo();

      expect(cubit.state.todos).toHaveLength(1);
      expect(cubit.state.todos[0].text).toBe('Test todo');
      expect(cubit.state.inputText).toBe('');
    });

    it('should not add empty todos', () => {
      cubit.setInputText('   ');
      cubit.addTodo();

      expect(cubit.state.todos).toHaveLength(0);
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      cubit.setInputText('Todo 1');
      cubit.addTodo();
      cubit.setInputText('Todo 2');
      cubit.addTodo();
      cubit.toggleTodo(cubit.state.todos[0].id);
    });

    it('should filter active todos', () => {
      cubit.setFilter('active');
      expect(cubit.filteredTodos).toHaveLength(1);
      expect(cubit.filteredTodos[0].text).toBe('Todo 2');
    });

    it('should filter completed todos', () => {
      cubit.setFilter('completed');
      expect(cubit.filteredTodos).toHaveLength(1);
      expect(cubit.filteredTodos[0].text).toBe('Todo 1');
    });
  });

  describe('computed properties', () => {
    it('should calculate counts correctly', () => {
      cubit.setInputText('Todo 1');
      cubit.addTodo();
      cubit.setInputText('Todo 2');
      cubit.addTodo();
      cubit.toggleTodo(cubit.state.todos[0].id);

      expect(cubit.activeTodoCount).toBe(1);
      expect(cubit.completedTodoCount).toBe(1);
    });
  });
});
```

## Key Patterns Demonstrated

1. **State Structure**: Well-organized state with clear types
2. **Computed Properties**: Derived values using getters
3. **Optimistic Updates**: Update UI immediately, sync in background
4. **Error Handling**: Graceful error states with rollback
5. **Event-Driven Architecture**: Clear audit trail with Bloc pattern
6. **Persistence**: Automatic save/restore with plugins
7. **Testing**: Easy unit tests for business logic
8. **Performance**: Automatic optimization with BlaC's proxy system

## Next Steps

- [Authentication Example](/examples/authentication) - User auth flows
- [Form Management](/examples/forms) - Complex form handling
- [Real-time Updates](/examples/real-time) - WebSocket integration
- [API Reference](/api/core/cubit) - Complete API documentation

import { useBloc } from '@blac/react';
import { Vertex } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { Plus, Check, X, Trash2, Filter } from 'lucide-react';
import { useState } from 'react';

// Todo item interface
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

// State interface
interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  sortBy: 'createdAt' | 'priority';
  nextId: number;
}

// Event classes - Using event-driven design
class AddTodoEvent {
  constructor(
    public readonly text: string,
    public readonly priority: 'low' | 'medium' | 'high'
  ) {}
}

class ToggleTodoEvent {
  constructor(public readonly id: number) {}
}

class DeleteTodoEvent {
  constructor(public readonly id: number) {}
}

class UpdateTodoTextEvent {
  constructor(
    public readonly id: number,
    public readonly text: string
  ) {}
}

class SetFilterEvent {
  constructor(public readonly filter: 'all' | 'active' | 'completed') {}
}

class SetSortByEvent {
  constructor(public readonly sortBy: 'createdAt' | 'priority') {}
}

class ClearCompletedEvent {}

class ToggleAllEvent {}

// Union type for all events
type TodoEvent =
  | AddTodoEvent
  | ToggleTodoEvent
  | DeleteTodoEvent
  | UpdateTodoTextEvent
  | SetFilterEvent
  | SetSortByEvent
  | ClearCompletedEvent
  | ToggleAllEvent;

/**
 * TodoBloc - A comprehensive example of event-driven state management
 * Demonstrates:
 * - Event-driven architecture with typed events
 * - Computed properties for derived state
 * - Filtering and sorting
 * - CRUD operations with immutability
 * - Flat state for optimal dependency tracking
 */
class TodoBloc extends Vertex<TodoState, TodoEvent> {
  constructor() {
    super({
      todos: [
        { id: 1, text: 'Learn BlaC fundamentals', completed: true, priority: 'high', createdAt: Date.now() - 3600000 },
        { id: 2, text: 'Build a Todo app with Bloc pattern', completed: false, priority: 'high', createdAt: Date.now() - 1800000 },
        { id: 3, text: 'Read event design best practices', completed: false, priority: 'medium', createdAt: Date.now() - 900000 },
      ],
      filter: 'all',
      sortBy: 'createdAt',
      nextId: 4,
    });

    // Register event handlers
    this.on(AddTodoEvent, this.handleAddTodo);
    this.on(ToggleTodoEvent, this.handleToggleTodo);
    this.on(DeleteTodoEvent, this.handleDeleteTodo);
    this.on(UpdateTodoTextEvent, this.handleUpdateTodoText);
    this.on(SetFilterEvent, this.handleSetFilter);
    this.on(SetSortByEvent, this.handleSetSortBy);
    this.on(ClearCompletedEvent, this.handleClearCompleted);
    this.on(ToggleAllEvent, this.handleToggleAll);
  }

  // Event handlers (private, arrow functions for proper `this` binding)

  private handleAddTodo = (event: AddTodoEvent, emit: (state: TodoState) => void) => {
    if (!event.text.trim()) return; // Validation

    emit({
      ...this.state,
      todos: [
        ...this.state.todos,
        {
          id: this.state.nextId,
          text: event.text.trim(),
          completed: false,
          priority: event.priority,
          createdAt: Date.now(),
        },
      ],
      nextId: this.state.nextId + 1,
    });
  };

  private handleToggleTodo = (event: ToggleTodoEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, completed: !todo.completed } : todo
      ),
    });
  };

  private handleDeleteTodo = (event: DeleteTodoEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => todo.id !== event.id),
    });
  };

  private handleUpdateTodoText = (event: UpdateTodoTextEvent, emit: (state: TodoState) => void) => {
    if (!event.text.trim()) return;

    emit({
      ...this.state,
      todos: this.state.todos.map((todo) =>
        todo.id === event.id ? { ...todo, text: event.text.trim() } : todo
      ),
    });
  };

  private handleSetFilter = (event: SetFilterEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      filter: event.filter,
    });
  };

  private handleSetSortBy = (event: SetSortByEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      sortBy: event.sortBy,
    });
  };

  private handleClearCompleted = (event: ClearCompletedEvent, emit: (state: TodoState) => void) => {
    emit({
      ...this.state,
      todos: this.state.todos.filter((todo) => !todo.completed),
    });
  };

  private handleToggleAll = (event: ToggleAllEvent, emit: (state: TodoState) => void) => {
    const allCompleted = this.state.todos.every((todo) => todo.completed);

    emit({
      ...this.state,
      todos: this.state.todos.map((todo) => ({
        ...todo,
        completed: !allCompleted,
      })),
    });
  };

  // Public API methods (dispatch events)

  addTodo = (text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    this.add(new AddTodoEvent(text, priority));
  };

  toggleTodo = (id: number) => {
    this.add(new ToggleTodoEvent(id));
  };

  deleteTodo = (id: number) => {
    this.add(new DeleteTodoEvent(id));
  };

  updateTodoText = (id: number, text: string) => {
    this.add(new UpdateTodoTextEvent(id, text));
  };

  setFilter = (filter: 'all' | 'active' | 'completed') => {
    this.add(new SetFilterEvent(filter));
  };

  setSortBy = (sortBy: 'createdAt' | 'priority') => {
    this.add(new SetSortByEvent(sortBy));
  };

  clearCompleted = () => {
    this.add(new ClearCompletedEvent());
  };

  toggleAll = () => {
    this.add(new ToggleAllEvent());
  };

  // Computed properties (derive data on-demand)

  get filteredAndSortedTodos(): Todo[] {
    // Apply filter
    let filtered = this.state.todos;
    switch (this.state.filter) {
      case 'active':
        filtered = filtered.filter((t) => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.completed);
        break;
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      if (this.state.sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.createdAt - a.createdAt; // Newest first
    });

    return sorted;
  }

  get stats() {
    return {
      total: this.state.todos.length,
      active: this.state.todos.filter((t) => !t.completed).length,
      completed: this.state.todos.filter((t) => t.completed).length,
    };
  }
}

/**
 * Interactive TodoBloc demo component
 */
export function TodoBlocInteractive() {
  const [state, todoBloc] = useBloc(TodoBloc);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      todoBloc.addTodo(newTodoText, newTodoPriority);
      setNewTodoText('');
      setNewTodoPriority('medium');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return '';
    }
  };

  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Todo app UI */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold">Todo App with Bloc</h3>

            {/* Add todo form */}
            <form onSubmit={handleAddTodo} className="space-y-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background text-sm"
              />
              <div className="flex gap-2">
                <select
                  value={newTodoPriority}
                  onChange={(e) => setNewTodoPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="flex-1 px-3 py-2 border-2 border-border rounded-lg bg-background text-sm"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <Button type="submit" size="sm" className="px-4">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </form>

            {/* Filter buttons */}
            <div className="flex gap-2 items-center border-y border-border py-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(['all', 'active', 'completed'] as const).map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => todoBloc.setFilter(filter)}
                    variant={state.filter === filter ? 'primary' : 'outline'}
                    size="sm"
                    className="text-xs px-2 py-1 capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
              <div className="ml-auto">
                <select
                  value={state.sortBy}
                  onChange={(e) => todoBloc.setSortBy(e.target.value as 'createdAt' | 'priority')}
                  className="px-2 py-1 border-2 border-border rounded-lg bg-background text-xs"
                >
                  <option value="createdAt">Sort by Date</option>
                  <option value="priority">Sort by Priority</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total: {todoBloc.stats.total}</span>
              <span>Active: {todoBloc.stats.active}</span>
              <span>Completed: {todoBloc.stats.completed}</span>
            </div>

            {/* Todo list */}
            {todoBloc.filteredAndSortedTodos.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-sm">
                  {state.filter === 'all' ? 'No todos yet. Add one above!' : `No ${state.filter} todos`}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {todoBloc.filteredAndSortedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-surface"
                  >
                    <button
                      onClick={() => todoBloc.toggleTodo(todo.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        todo.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-border hover:border-brand'
                      }`}
                    >
                      {todo.completed && <Check className="h-3 w-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          todo.completed
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {todo.text}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-xs rounded font-medium ${getPriorityColor(
                        todo.priority
                      )}`}
                    >
                      {todo.priority}
                    </span>

                    <button
                      onClick={() => todoBloc.deleteTodo(todo.id)}
                      className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bulk actions */}
            {state.todos.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={todoBloc.toggleAll}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {state.todos.every((t) => t.completed) ? 'Uncheck All' : 'Check All'}
                </Button>
                {todoBloc.stats.completed > 0 && (
                  <Button
                    onClick={todoBloc.clearCompleted}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Clear Completed ({todoBloc.stats.completed})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: State viewer */}
        <div className="space-y-4">
          <StateViewer
            bloc={TodoBloc}
            title="TodoBloc State"
            defaultCollapsed={false}
            maxDepth={3}
          />
        </div>
      </div>
    </div>
  );
}
